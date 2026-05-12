import jwt from 'jsonwebtoken';

export interface ApiKeyPayload {
  tenantId: string;
  enabledTrackers: string[];
  rateLimit: number;
  retentionDays: number;
}

export class AuthService {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  issueKey(payload: ApiKeyPayload): string {
    return jwt.sign(payload, this.secret);
  }

  verifyKey(token: string): ApiKeyPayload {
    return jwt.verify(token, this.secret) as ApiKeyPayload;
  }
}
