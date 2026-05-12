import { AuthService } from '../src/auth/AuthService';

const auth = new AuthService('test-secret');
const token = auth.issueKey({
  tenantId: 'test-tenant-1',
  enabledTrackers: ['mouse', 'keyboard', 'integrity'],
  rateLimit: 1000,
  retentionDays: 30
});

console.log('--- TEST API KEY ---');
console.log(token);
console.log('--------------------');
