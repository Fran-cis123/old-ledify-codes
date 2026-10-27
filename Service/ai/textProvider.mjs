import Anthropic from '@anthropic-ai/sdk';
import {jsonSchemaOutputFormat} from '@anthropic-ai/sdk/helpers/json-schema';

const failure=(code,message,status)=>Object.assign(new Error(message),{code,...(status?{status}:{})});
export function textProvider(env=process.env){
 const provider=env.AI_TEXT_PROVIDER||'anthropic';
 if(provider==='anthropic')return provider;
 if(provider==='google-rollback'&&env.AI_ALLOW_GOOGLE_ROLLBACK==='true')return provider;
 throw failure('AI_TEXT_PROVIDER_NOT_CONFIGURED','Select Anthropic, or explicitly authorize the disabled Google rollback option.');
}
export function textModel(stage='',env=process.env){
 if(textProvider(env)==='anthropic')return env.CLAUDE_MODEL||'claude-opus-5-5';
 const name=stage.startsWith('document-')?'DOCUMENT':stage==='webpage-planning'?'WEBPAGE_PLAN':stage==='webpage-content'?'WEBPAGE_CONTENT':stage==='presentation-outline'?'OUTLINE':stage==='presentation-quality-review'?'REVIEW':stage==='visual-diagram-planning'?'DIAGRAM':'SLIDE';
 return env['GEMINI_'+name+'_MODEL']||(name==='SLIDE'||name==='WEBPAGE_CONTENT'||name==='DIAGRAM'?'gemini-3.5-flash':'gemini-3.7-flash');
}
export function normalizeSchema(value){
 if(Array.isArray(value))return value.map(normalizeSchema);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='type'&&typeof child==='string'?child.toLowerCase():normalizeSchema(child)]));
 return value;
}
export function anthropicOutputSchema(schema){
 // The official SDK strips constraints unsupported by its grammar and puts
 // them in descriptions. The ORIGINAL full schema is still checked locally.
 return jsonSchemaOutputFormat(normalizeSchema(schema)).schema;
}
export function structuredOutputPlan(original){
 const schema=anthropicOutputSchema(original);let optional=0,unions=0;
 function visit(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}if(node.properties)optional+=Object.keys(node.properties).filter(key=>!node.required?.includes(key)).length;if(node.anyOf||Array.isArray(node.type))unions++;Object.values(node).forEach(value=>{if(value&&typeof value==='object')visit(value);});}visit(schema);
 if(optional<=24&&unions<=16)return {schema,mode:'native-schema'};
 // The envelope avoids provider grammar limits. Every original constraint
 // remains mandatory in the existing local validation and repair loop.
 return {mode:'validated-json-envelope',schema:{type:'object',properties:{payload:{type:'string',description:'A JSON-encoded object satisfying the complete requested payload schema.'}},required:['payload'],additionalProperties:false}};
}
export function createAnthropicService({env=process.env,sdk,now=Date.now}={}){
 let client=sdk,verified,checking;
 const model=env.CLAUDE_MODEL||'claude-opus-5-5';
 function transport(){
  if(!client){if(!env.ANTHROPIC_API_KEY)throw failure('ANTHROPIC_NOT_CONFIGURED','Configure ANTHROPIC_API_KEY securely before generating content.');client=new Anthropic({apiKey:env.ANTHROPIC_API_KEY,maxRetries:0,timeout:90000});}
  return client;
 }
 async function verifyModel(){
  if(verified&&verified.expires>now())return verified.info;
  if(checking)return checking;
  checking=(async()=>{
   let info;try{info=await transport().models.retrieve(model,{}, {timeout:15000,maxRetries:0});}
   catch(error){if(error.status===404)throw failure('CLAUDE_MODEL_UNAVAILABLE','The exact configured Claude model is unavailable to this API account. No replacement model was selected.',404);throw error;}
   if(!info?.id)throw failure('CLAUDE_MODEL_VERIFICATION_FAILED','The Models API did not confirm the configured identifier.');
   if(info.capabilities?.structured_outputs?.supported===false)throw failure('CLAUDE_STRUCTURED_OUTPUT_UNSUPPORTED','The selected model does not support the required structured output capability.');
   verified={info,expires:now()+300000};return info;
  })();
  try{return await checking;}finally{checking=undefined;}
 }
 return {provider:'anthropic',model,verifyModel,async generateStructured(request){
  if(request.model!==model)throw failure('CLAUDE_MODEL_MISMATCH','Every stage must use the exact configured Claude model.');
  const info=await verifyModel(),configured=Number(env.CLAUDE_MAX_OUTPUT_TOKENS||16384);
  if(!Number.isInteger(configured)||configured<256||configured>64000)throw failure('CLAUDE_TOKEN_CONFIGURATION','CLAUDE_MAX_OUTPUT_TOKENS must be an integer from 256 to 64000.');
  const maxTokens=Math.min(configured,request.config?.maxOutputTokens||8192,info.max_tokens||64000);
  const plan=structuredOutputPlan(request.config.responseJsonSchema),schema=plan.schema;
  const effort=env.CLAUDE_EFFORT||'medium';if(!['low','medium','high','xhigh','max'].includes(effort))throw failure('CLAUDE_EFFORT_CONFIGURATION','Unsupported configured Claude effort.');
  const response=await transport().messages.create({model,max_tokens:maxTokens,
   messages:[{role:'user',content:plan.mode==='native-schema'?request.contents:request.contents+'\nReturn the complete JSON object as the JSON-encoded string in payload. Required payload schema: '+JSON.stringify(normalizeSchema(request.config.responseJsonSchema))}],
   output_config:{format:{type:'json_schema',schema},...(info.capabilities?.effort?.supported?{effort}:{})}
  },{maxRetries:0,timeout:90000});
  let text=response.content?.filter(block=>block.type==='text').map(block=>block.text).join('')||'';
  if(plan.mode==='validated-json-envelope'&&response.stop_reason!=='max_tokens'&&response.stop_reason!=='refusal'){try{const envelope=JSON.parse(text);if(typeof envelope.payload==='string')text=envelope.payload;}catch{ /* The original parser reports failures and bounds repairs. */ }}
  const usage=response.usage||{},prompt=usage.input_tokens||0,output=usage.output_tokens||0;
  return {text,provider:'anthropic',model:response.model||model,schemaMode:plan.mode,providerRequestId:response._request_id,
   candidates:[{finishReason:response.stop_reason==='max_tokens'?'MAX_TOKENS':response.stop_reason==='refusal'?'SAFETY':'STOP'}],
   usageMetadata:{promptTokenCount:prompt,candidatesTokenCount:output,totalTokenCount:prompt+output+(usage.cache_read_input_tokens||0)+(usage.cache_creation_input_tokens||0),cacheReadInputTokens:usage.cache_read_input_tokens||0,cacheCreationInputTokens:usage.cache_creation_input_tokens||0}};
 }};
}
let activeClient,activeIdentity;
export function getTextClient(env=process.env){
 const identity=[textProvider(env),env.CLAUDE_MODEL||'',env.ANTHROPIC_API_KEY||''].join(':');
 if(activeIdentity!==identity){activeIdentity=identity;activeClient=textProvider(env)==='anthropic'?createAnthropicService({env}):{provider:'google-rollback',async generateStructured(request){const {GoogleGenAI}=await import('@google/genai');return new GoogleGenAI({apiKey:env.GEMINI_API_KEY}).models.generateContent(request);}};}
 return activeClient;
}
export function invokeText(client,request){
 if(client?.generateStructured)return client.generateStructured(request);
 // Retain injected deterministic test transports and the explicit legacy adapter.
 if(client?.models?.generateContent)return client.models.generateContent(request);
 throw failure('AI_TEXT_CLIENT_INVALID','A configured structured text client is required.');
}
