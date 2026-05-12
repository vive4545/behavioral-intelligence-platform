import crypto from 'crypto';
import { WebhookModel, WebhookAttemptModel } from '../storage/WebhookModels';

export class WebhookService {
  private static RETRY_SCHEDULE = [10000, 30000, 120000, 600000, 3600000]; // 10s, 30s, 2m, 10m, 1h

  async register(tenantId: string, url: string, events: string[]) {
    const signingSecret = crypto.randomBytes(32).toString('hex');
    const signingSecretHash = crypto.createHash('sha256').update(signingSecret).digest('hex');

    const webhook = await WebhookModel.create({
      tenantId,
      url,
      events,
      signingSecret,
      signingSecretHash,
    });

    return { webhook, signingSecret };
  }

  async trigger(tenantId: string, event: string, payload: any) {
    const webhooks = await WebhookModel.find({ tenantId, events: event, status: 'active' });
    
    for (const webhook of webhooks) {
      this.deliver(webhook, event, payload).catch(err => {
        console.error(`[InterviewIQ] Webhook delivery trigger failed: ${err.message}`);
      });
    }
  }

  async deliver(webhook: any, event: string, payload: any, attemptCount = 0) {
    const deliveryId = crypto.randomUUID();
    const body = this.deterministicStringify(payload);
    
    const signature = crypto.createHmac('sha256', webhook.signingSecret) 
      .update(body)
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-InterviewIQ-Signature': `sha256=${signature}`,
          'X-InterviewIQ-Event': event,
          'X-InterviewIQ-Delivery': deliveryId,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      await WebhookAttemptModel.create({
        webhookId: webhook._id,
        event,
        payload,
        status: 'succeeded',
      });
    } catch (err) {
      await this.handleFailure(webhook, event, payload, attemptCount);
    }
  }

  private async handleFailure(webhook: any, event: string, payload: any, attemptCount: number) {
    if (attemptCount >= WebhookService.RETRY_SCHEDULE.length) {
      await WebhookModel.findByIdAndUpdate(webhook._id, { status: 'suspended' });
      return;
    }

    const nextRetryAt = new Date(Date.now() + WebhookService.RETRY_SCHEDULE[attemptCount]!);
    await WebhookAttemptModel.create({
      webhookId: webhook._id,
      event,
      payload,
      attemptCount: attemptCount + 1,
      nextRetryAt,
      status: 'pending',
    });
  }

  private deterministicStringify(obj: any): string {
    const allKeys: string[] = [];
    JSON.stringify(obj, (k, v) => { allKeys.push(k); return v; });
    allKeys.sort();
    return JSON.stringify(obj, allKeys);
  }
}
