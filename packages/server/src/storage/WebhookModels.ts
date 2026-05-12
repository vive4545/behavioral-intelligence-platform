import mongoose, { Schema } from 'mongoose';

const webhookSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  url: { type: String, required: true },
  events: [{ type: String }],
  signingSecret: { type: String, required: true },
  signingSecretHash: { type: String, required: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

const webhookAttemptSchema = new Schema({
  webhookId: { type: Schema.Types.ObjectId, ref: 'Webhook', index: true },
  tenantId: String,
  event: String,
  payload: Schema.Types.Mixed,
  attemptCount: { type: Number, default: 0 },
  nextRetryAt: { type: Date, index: true },
  status: { type: String, enum: ['pending', 'failed', 'succeeded'], default: 'pending' },
});

export const WebhookModel = mongoose.model('Webhook', webhookSchema);
export const WebhookAttemptModel = mongoose.model('WebhookAttempt', webhookAttemptSchema);
