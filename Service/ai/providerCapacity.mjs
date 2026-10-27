// All models share a bounded call budget; cooldowns are scoped by model.
export function createAiCapacity({limit=6,maxWaiting=32,waitMs=90000,now=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 if(!Number.isInteger(limit)||limit<1||limit>12||!Number.isInteger(maxWaiting)||maxWaiting<1||!Number.isFinite(waitMs)||waitMs<1)throw new Error('Invalid AI capacity configuration');
 let active=0;const waiting=[],cooldowns=new Map();
 const busy=()=>Object.assign(new Error('AI request capacity is occupied'),{code:'AI_PROVIDER_BUSY'});
 const release=()=>{const next=waiting.shift();if(next){clearTimeout(next.timer);next.resolve();}else active--;};
 async function acquire(){
  if(active<limit){active++;return;}
  if(waiting.length>=maxWaiting)throw busy();
  await new Promise((resolve,reject)=>{const entry={resolve,timer:setTimeout(()=>{const index=waiting.indexOf(entry);if(index>=0)waiting.splice(index,1);reject(busy());},waitMs)};waiting.push(entry);});
 }
 return {stats:()=>({active,queued:waiting.length,limit}),defer(error,scope=''){
  const status=Number(error.status||error.statusCode||error.providerStatus);if(![429,503,529].includes(status))return;
  const headers=error.headers||error.response?.headers,value=headers?.get?.('retry-after')??headers?.['retry-after'];
  const retryInfo=(error.details||error.error?.details||[]).find?.(detail=>typeof detail.retryDelay==='string')?.retryDelay;
  const hint=value==null?(retryInfo&&/^\d+(?:\.\d+)?s$/.test(retryInfo)?parseFloat(retryInfo)*1000:1000):/^\d+(?:\.\d+)?$/.test(String(value))?Number(value)*1000:Date.parse(value)-now();
  const delay=Math.min(300000,Math.max(1000,Number.isFinite(hint)?hint:1000));
  cooldowns.set(scope,Math.max(cooldowns.get(scope)||0,now()+delay));
 },async run(invoke,scope=''){
  const deadline=now()+waitMs;
  for(;;){
   const delay=(cooldowns.get(scope)||0)-now();if(delay>0){if(now()+delay>=deadline)throw busy();await sleep(delay);}
   await acquire();
   if((cooldowns.get(scope)||0)>now()){release();continue;}
   try{return await invoke();}finally{release();}
  }
 }};
}
const parsed=Number(process.env.LEDIFY_AI_CONCURRENCY);
const limit=Number.isInteger(parsed)&&parsed>0?Math.min(12,parsed):6;
const capacity=createAiCapacity({limit});
export const withAiCapacity=(invoke,{scope=''}={})=>capacity.run(invoke,scope);
export const noteAiRateLimit=(error,scope)=>capacity.defer(error,scope);
