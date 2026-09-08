// Controlled signed transport check, distinct from provider-delivered email.
import { execFileSync } from 'node:child_process';
import { Webhook } from 'svix';
const get = name => execFileSync('npx', ['convex','env','get',name], {encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const secret=get('AGENTMAIL_WEBHOOK_SECRET');
const id='qa-webhook:'+crypto.randomUUID();
const timestamp=new Date();
const payload=JSON.stringify({event_type:'message.received',message:{
 message_id:id,thread_id:'1e40dafa-c71d-461c-851b-3a3f95472895',
 inbox_id:'one-table-himanshu@agentmail.to',from:'one-table-himanshu@agentmail.to',
 subject:'Signed webhook QA fixture — not provider delivery',
 text:'CONTROLLED FICTIONAL WEBHOOK TEST. Vegetarian rate INR 1250 per guest including all taxes. Minimum guarantee 100 guests. Confirm 10 days before the event. This is not a real venue offer.',
 timestamp:timestamp.toISOString()
}});
const url='https://wooden-dogfish-387.convex.site/agentmail/inbound';
const unsigned=await fetch(url,{method:'POST',body:payload});
if(unsigned.status!==401) throw new Error('Unsigned request was not rejected');
const headers={'content-type':'application/json','svix-id':id,'svix-timestamp':String(Math.floor(timestamp.getTime()/1000)),'svix-signature':new Webhook(secret).sign(id,timestamp,payload)};
for(let i=0;i<2;i++) {
 const r=await fetch(url,{method:'POST',headers,body:payload});
 if(r.status!==200) throw new Error('Signed request status '+r.status);
}
console.log('Unsigned request rejected; signed fixture and duplicate accepted. Synthetic message ID:',id);
