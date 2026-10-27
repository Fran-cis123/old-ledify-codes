import fs from 'node:fs/promises';
const number=value=>value==='max'||value==null?null:Number(value);
export async function containerResources({platform=process.platform,read=file=>fs.readFile(file,'utf8')}={}){
 if(platform!=='linux')return {available:false,platform};
 try{
  const [memory,limit,cpu,max,io]=await Promise.all(['memory.current','memory.max','cpu.stat','cpu.max','io.stat'].map(file=>read('/sys/fs/cgroup/'+file).catch(()=>null)));
  if(memory===null&&cpu===null)return {available:false,platform};
  const counters=Object.fromEntries((cpu||'').trim().split('\n').filter(Boolean).map(line=>{const [name,value]=line.split(/\s+/);return [name,Number(value)];}));
  const [quota,period]=(max||'').trim().split(/\s+/);let readBytes=0,writeBytes=0;
  for(const line of (io||'').split('\n'))for(const token of line.split(/\s+/)){const [key,value]=token.split('=');if(key==='rbytes')readBytes+=Number(value);if(key==='wbytes')writeBytes+=Number(value);}
  return {available:true,platform,memoryBytes:number(memory?.trim()),memoryLimitBytes:number(limit?.trim()),cpuUsageUsec:counters.usage_usec??null,cpuThrottledUsec:counters.throttled_usec??null,cpuQuotaCores:quota&&quota!=='max'&&Number(period)>0?Number(quota)/Number(period):null,ioReadBytes:io===null?null:readBytes,ioWriteBytes:io===null?null:writeBytes};
 }catch{return {available:false,platform};}
}
