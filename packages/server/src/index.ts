import express, { Express } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { StorageAdapter } from './storage';
import { ScoringEngine, ScoringWeights } from './scoring/ScoringEngine';
import { Signal } from '@interviewiq/core';

import { AuthService, ApiKeyPayload } from './auth/AuthService';
import { WebhookService } from './webhooks/WebhookService';
import cron from 'node-cron';
import { WebhookAttemptModel, WebhookModel } from './storage/WebhookModels';

export interface ServerConfig {
  storage: StorageAdapter;
  secret: string; // For JWT signing
  port?: number;
  weights?: ScoringWeights;
  snapshotInterval?: number;
}

export class InterviewServer {
  private app: Express;
  private httpServer: HttpServer;
  private io: SocketServer;
  private storage: StorageAdapter;
  private scoring: ScoringEngine;
  private auth: AuthService;
  private webhooks: WebhookService;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.storage = config.storage;
    this.scoring = new ScoringEngine(config.weights);
    this.auth = new AuthService(config.secret);
    this.webhooks = new WebhookService();
    this.app = express();
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', '*');
      res.header('Access-Control-Allow-Methods', '*');
      if (req.method === 'OPTIONS') return res.sendStatus(200);
      next();
    });
    this.httpServer = createServer(this.app);
    this.io = new SocketServer(this.httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    this.setupAuthMiddleware();
    this.setupRoutes();
    this.setupSocket();
    this.setupCronJobs();
  }

  private setupCronJobs() {
    // A.3: Webhook retry job every 30s
    cron.schedule('*/30 * * * * *', async () => {
      const pendingAttempts = await WebhookAttemptModel.find({
        status: 'pending',
        nextRetryAt: { $lte: new Date() },
      }).populate('webhookId');

      for (const attempt of pendingAttempts) {
        if (!attempt.webhookId) continue;
        await this.webhooks.deliver(
          attempt.webhookId,
          attempt.event!,
          attempt.payload,
          attempt.attemptCount!
        );
        // Mark previous attempt as failed so we don't pick it up again
        attempt.status = 'failed';
        await attempt.save();
      }
    });

    // B.2: Auto-purge cron at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('[InterviewIQ] Starting auto-purge job...');
      // In a real app, we'd query all tenants or use a default retention
      // For demo, we'll use a fixed 30 days
      const retentionDays = 30;
      const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      // This is a simplified check for demo purposes
      const SignalModel = (this.storage as any).SignalModel;
      if (SignalModel) {
        const expiredSessions = await SignalModel.aggregate([
          { $group: { _id: '$sessionId', lastSeen: { $max: '$timestamp' } } },
          { $match: { lastSeen: { $lt: cutoff } } }
        ]);

        for (const s of expiredSessions) {
          await this.storage.deleteSession(s._id);
          console.log(`[InterviewIQ] Auto-purged session ${s._id}`);
        }
      }
    });
  }

  private setupAuthMiddleware() {
    this.app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401);
      
      try {
        const token = authHeader.split(' ')[1]!;
        (req as any).tenant = this.auth.verifyKey(token);
        next();
      } catch (err) {
        res.sendStatus(403);
      }
    });
  }

  private setupRoutes() {
    this.app.use(express.json());

    this.app.post('/sessions', async (req, res) => {
      const { id, metadata } = req.body;
      const tenantId = (req as any).tenant.tenantId;
      const session = { id, startTime: Date.now(), metadata };
      await this.storage.createSession(session);
      
      this.webhooks.trigger(tenantId, 'session.started', { sessionId: id, metadata });
      res.json(session);
    });

    this.app.post('/sessions/:id/signals', async (req, res) => {
      const { signals } = req.body;
      const tenantId = (req as any).tenant.tenantId;
      await this.handleSignals(req.params.id, signals, tenantId);
      res.sendStatus(202);
    });

    this.app.get('/sessions/:id', async (req, res) => {
      const session = await this.storage.getSession(req.params.id);
      if (!session) return res.sendStatus(404);
      res.json(session);
    });

    // B.1: GDPR purge endpoint
    this.app.delete('/sessions/:id', async (req, res) => {
      const tenantId = (req as any).tenant.tenantId;
      const session = await this.storage.getSession(req.params.id);
      
      if (!session) return res.sendStatus(404);
      // In a real app, verify session belongs to tenantId
      
      await this.storage.deleteSession(req.params.id);
      await WebhookAttemptModel.deleteMany({ tenantId, 'payload.sessionId': req.params.id });
      
      res.json({ deleted: true, sessionId: req.params.id });
    });

    // A.1: Webhook registration
    this.app.post('/webhooks', async (req, res) => {
      const { url, events } = req.body;
      const tenantId = (req as any).tenant.tenantId;
      const { webhook, signingSecret } = await this.webhooks.register(tenantId, url, events);
      res.json({ id: webhook._id, signingSecret });
    });

    this.app.get('/health', (req, res) => res.json({ status: 'ok' }));
  }

  private setupSocket() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication error'));

      try {
        const payload = this.auth.verifyKey(token);
        (socket as any).tenant = payload;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      const sessionId = socket.handshake.query.sessionId as string;
      if (!sessionId) return socket.disconnect();

      socket.join(sessionId);

      socket.on('signals', async (signals: Signal[]) => {
        const tenant = (socket as any).tenant as ApiKeyPayload;
        const filteredSignals = signals.filter(s => {
          const trackerType = s.type.split(':')[0];
          return !trackerType || tenant.enabledTrackers.includes(trackerType) || trackerType === 'core';
        });

        await this.handleSignals(sessionId, filteredSignals, tenant.tenantId);
      });
    });
  }

  private async handleSignals(sessionId: string, signals: Signal[], tenantId: string) {
    await this.storage.saveSignals(sessionId, signals);
    
    // Get all signals for this session to calculate accurate historical score
    const allSignals = await this.storage.getSignals(sessionId);
    
    // Run scoring on full history
    const snapshot = this.scoring.calculate(sessionId, allSignals);
    await this.storage.saveSnapshot(snapshot);

    // A.4: Webhook triggers
    if (snapshot.suspicionLevel === 'high') {
      this.webhooks.trigger(tenantId, 'suspicion.high', { sessionId, snapshot });
    }
    
    if (snapshot.confidence < 0.5) {
      this.webhooks.trigger(tenantId, 'confidence.threshold', { sessionId, snapshot });
    }

    if (signals.some(s => s.type === 'core:consent_revoked')) {
      this.webhooks.trigger(tenantId, 'consent.revoked', { sessionId });
    }

    // Broadcast to React clients
    this.io.to(sessionId).emit('snapshot', snapshot);
  }

  listen() {
    const port = this.config.port || 3000;
    this.httpServer.listen(port, '0.0.0.0', () => {
      console.log(`[InterviewIQ] Server listening on http://127.0.0.1:${port}`);
    });
  }
}
