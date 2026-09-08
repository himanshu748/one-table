import { describe, it, expect } from 'vitest';
import { Webhook } from 'svix';
import { verifiedWebhookPayload } from '../convex/lib/webhook';
const secret = 'whsec_' + Buffer.from('fictional-unit-test-secret-only').toString('base64');
const id = 'unit-test-message';
const timestamp = new Date();
const body = JSON.stringify({event_type:'message.received',message:{text:'Fixture'}});
const headers = {'svix-id':id,'svix-timestamp':String(Math.floor(timestamp.getTime()/1000)),'svix-signature':new Webhook(secret).sign(id,timestamp,body)};
describe('signed webhook decoding', () => {
 it('returns parsed data after successful verification', () => expect(verifiedWebhookPayload(secret,body,headers)).toEqual(JSON.parse(body)));
 it('rejects changed bodies', () => expect(() => verifiedWebhookPayload(secret,body+' ',headers)).toThrow());
 it('rejects unsigned requests', () => expect(() => verifiedWebhookPayload(secret,body,{})).toThrow());
});
