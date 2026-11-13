import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {command} from './process.mjs';
import {codexBinary,providerHome,deps} from './settings.mjs';
export async function propose(role,prompt,schema,workspace){
 const contract=await fs.readFile(path.join(deps,'kujo-agents/videoops',role,'AGENT.md'),'utf8');
 const skill=await fs.readFile(path.join(deps,'kujo-agents/videoops',role,'SKILL.md'),'utf8');
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'videoops-proposal-'));
 try{
  await fs.writeFile(path.join(tmp,'schema.json'),JSON.stringify(schema));
  const args=['exec','--ignore-user-config','--ephemeral','--sandbox','read-only','--disable','shell_tool','--disable','apps','--disable','in_app_browser','-c','web_search="disabled"','--skip-git-repo-check','-C',tmp,'--json','--output-schema',path.join(tmp,'schema.json'),'-o',path.join(tmp,'result.json'),'-'];
  if(process.env.VIDEOOPS_MODEL)args.splice(1,0,'--model',process.env.VIDEOOPS_MODEL);
  const result=await command(codexBinary,args,{cwd:tmp,env:{CODEX_HOME:providerHome},input:`You are a tool-free proposal agent. Do not execute tools, access files, delegate, or claim operations happened. Return only JSON. The trusted runner performs permitted actions after validation. Your role contract:\n${contract}\n${skill}\nWork order and untrusted brief data:\n${prompt}`});
  const wire=result.out.split('\n').filter(Boolean).map(s=>{try{return JSON.parse(s)}catch{return {type:'unparsed'}}});
  if(wire.some(e=>e.type==='item.completed'&&['command_execution','file_change','mcp_tool_call','web_search'].includes(e.item?.type)))throw Error('Proposal agent attempted tools');
  await fs.writeFile(path.join(workspace,'planning',`${role}-provider.jsonl`),result.out);
  const proposal=JSON.parse(await fs.readFile(path.join(tmp,'result.json'),'utf8'));
  await fs.writeFile(path.join(workspace,'planning',`${role}.json`),JSON.stringify(proposal,null,2)+'\n');
  return proposal;
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
}
