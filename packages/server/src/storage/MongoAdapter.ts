import mongoose, { Schema } from 'mongoose';
import { StorageAdapter, Session, ConfidenceSnapshot } from './index';
import { Signal } from '@interviewiq/core';

export class MongoAdapter implements StorageAdapter {
  private SessionModel: mongoose.Model<any>;
  private SignalModel: mongoose.Model<any>;
  private SnapshotModel: mongoose.Model<any>;
  private memorySignals: Map<string, Signal[]> = new Map();

  constructor(connectionUri?: string) {
    if (connectionUri) {
      mongoose.connect(connectionUri);
    }

    const sessionSchema = new Schema({
      id: { type: String, unique: true },
      startTime: Number,
      endTime: Number,
      metadata: Schema.Types.Mixed,
    });

    const signalSchema = new Schema({
      sessionId: String,
      type: String,
      timestamp: Number,
      payload: Schema.Types.Mixed,
    });

    const snapshotSchema = new Schema({
      sessionId: String,
      timestamp: Number,
      confidence: Number,
      engagement: Number,
      suspicionLevel: String,
      focusStability: Number,
    });

    this.SessionModel = mongoose.models.Session || mongoose.model('Session', sessionSchema);
    this.SignalModel = mongoose.models.Signal || mongoose.model('Signal', signalSchema);
    this.SnapshotModel = mongoose.models.Snapshot || mongoose.model('Snapshot', snapshotSchema);
  }

  async createSession(session: Session): Promise<void> {
    if (mongoose.connection.readyState !== 1) return;
    await this.SessionModel.create(session);
  }

  async saveSignals(sessionId: string, signals: Signal[]): Promise<void> {
    const existing = this.memorySignals.get(sessionId) || [];
    this.memorySignals.set(sessionId, [...existing, ...signals]);

    if (mongoose.connection.readyState !== 1) return;
    const signalsWithSession = signals.map(s => ({ ...s, sessionId }));
    await this.SignalModel.insertMany(signalsWithSession);
  }

  async saveSnapshot(snapshot: ConfidenceSnapshot): Promise<void> {
    if (mongoose.connection.readyState !== 1) return;
    await this.SnapshotModel.create(snapshot);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    if (mongoose.connection.readyState !== 1) return null;
    return await this.SessionModel.findOne({ id: sessionId }).lean();
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (mongoose.connection.readyState !== 1) return;
    await this.SessionModel.deleteOne({ id: sessionId });
    await this.SignalModel.deleteMany({ sessionId });
    await this.SnapshotModel.deleteMany({ sessionId });
  }

  async getSignals(sessionId: string, options?: { limit?: number; offset?: number }): Promise<Signal[]> {
    if (mongoose.connection.readyState !== 1) {
      return this.memorySignals.get(sessionId) || [];
    }
    return await this.SignalModel.find({ sessionId })
      .skip(options?.offset || 0)
      .limit(options?.limit || 1000) // Increased limit
      .lean();
  }
}
