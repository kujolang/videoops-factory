import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root,runsRoot,deps,kujoBinary,videoopsBinary} from './settings.mjs';
import {command} from './process.mjs';
import {propose} from './agent.mjs';
import {validateBrief,validatePlan,containedFile,judgmentSchema,planSchema} from './contracts.mjs';
import {renderProject} from './render.mjs';
const save=async(p,v)=>{await fs.writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await fs.rename(p+'.tmp',p)};
export async function runFactory(briefPath){
 const brief=validateBrief(JSON.parse(await fs.readFile(briefPath,'utf8')));
 const id=brief.id+'-'+new Date().toISOString().replace(/[:.]/g,'-');
 const workspace=path.join(runsRoot,id);await fs.mkdir(workspace,{recursive:true});
 const started=Date.now();const state={id,title:brief.title,status:'INTAKE_READY',startedAt:new Date(started).toISOString(),finishedAt:null,elapsedMs:0,stage:'producer',brief,stages:[],output:null};
 const stateFile=path.join(workspace,'state.json');await save(stateFile,state);
 const event=async(role,status,message)=>{await fs.appendFile(path.join(workspace,'events.jsonl'),JSON.stringify({at:new Date().toISOString(),role,status,message})+'\n');state.elapsedMs=Date.now()-started;await save(stateFile,state);console.log(`${role}: ${message}`)};
 async function stage(role,status,fn,next){
  state.stage=role;state.status=status;const entry={role,status:'running',startedAt:new Date().toISOString()};state.stages.push(entry);await event(role,'started',status);
  const value=await fn();entry.status='completed';entry.finishedAt=new Date().toISOString();entry.elapsedMs=Date.parse(entry.finishedAt)-Date.parse(entry.startedAt);
  await save(path.join(workspace,'planning',`${role}-handoff.json`),{schema:'kujo.handoff/v1',assignment:brief.id,currentOwner:role,nextOwner:next,goal:brief.title,scope:'Local registered-media composition',artifacts:[`planning/${role}.json`],evidence:[`planning/${role}.json`],decisions:[value?.reason||'Validated stage output'],unresolvedQuestions:[],allowedNextActions:[next],stopCondition:'Required artifact or review capability missing'});
  await event(role,'completed',`${role} completed in ${(entry.elapsedMs/1000).toFixed(1)}s`);return value;
 }
 try{
  await fs.writeFile(path.join(workspace,'request.md'),brief.request+'\n');
  await command(path.join(deps,'kujo-workflows/videoops-production/bin/run'),['--workspace',workspace,'--request',path.join(workspace,'request.md'),'--agents-root',path.join(deps,'kujo-agents'),'--run-id',id],{cwd:path.join(deps,'kujo-workflows/videoops-production'),env:{KUJO_BIN:kujoBinary()}});
  await save(path.join(workspace,'intake/brief.json'),brief);
  const context=JSON.stringify(brief);
  const judge=async(role,task)=>{const r=await propose(role,task,judgmentSchema,workspace);if(r.decision!=='ACCEPT')throw Error(`${role} blocked: ${r.reason}`);return r};
  await stage('producer','PLANNING',()=>judge('producer',`Check this brief fits our bounded silent, 3–60second screenshot-led launch video. It is a local review candidate, never automatic publication. Decide ACCEPT or BLOCK. Facts are supplied source assertions, not independent web verification. ${context}`),'creative-director');
  const plan=await stage('creative-director','PLANNING',async()=>validatePlan(await propose('creative-director',`Create the full plan for this brief. Exactly match dimensions, fps, duration. Three to five contiguous scenes. assetId empty string for text-only hook; choose only brief asset IDs for evidence. Final bumper theme paper, assetId kujo-logo. Copy brief.cta exactly. All other themes ink or paper. Maximum headline/body180 chars each. Evidence asset scenes fill screen, so put no critical text in their headline/body. No captions or persistent labels. Return plan only. ${context}`,planSchema,workspace),brief),'asset-scout');
  await save(path.join(workspace,'planning/plan.json'),plan);
  const catalog=JSON.parse(await fs.readFile(path.join(root,'assets/catalog.json'),'utf8'));
  const assets=[];
  for(const id of brief.assetIds){const a=catalog.assets.find(a=>a.id===id);if(!a)throw Error('Unknown registered asset: '+id);if(a.kind==='audio')throw Error('Silent briefs cannot use audio assets');const source=containedFile(path.join(root,'assets'),a.file);const bytes=await fs.readFile(source);if(createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw Error('Asset checksum mismatch: '+id);const destination='assets/'+path.basename(source);await fs.copyFile(source,path.join(workspace,destination));assets.push({...a,path:destination});}
  await stage('asset-scout','ASSETING',()=>judge('asset-scout',`Review supplied provenance and plan fit. Files and hashes already verified deterministically. Do not claim visual inspection. Only rights/source suitability based on registry. ${JSON.stringify({assets,plan,facts:brief.facts})}`),'media-generator');
  await save(path.join(workspace,'assets/registry.json'),assets);
  await stage('media-generator','GENERATING',async()=>{const result={decision:'NOT_REQUIRED',reason:'Brief explicitly requests silent output using registered local assets; no provider call or spend.'};await save(path.join(workspace,'planning/media-generator.json'),result);return result},'hyperframes-editor');
  const rendered=await stage('hyperframes-editor','EDITING',async()=>{await judge('hyperframes-editor',`Review this JSON plan for bounded trusted rendering. Three to five contiguous scenes; screenshots fill frame, last scene Kujo bumper; no arbitrary HTML/JS accepted. Technical rendering is executed by trusted adapter after this proposal, not by you. ${JSON.stringify({brief,plan})}`);return renderProject({workspace,plan,assets,onProgress:p=>console.log('renderer: '+p.step)})},'video-critic');
  if(rendered.metadata.streams.some(s=>s.codec_type==='audio'))throw Error('Silent output unexpectedly contains audio');
  state.output='output/draft.mp4';
  await command(videoopsBinary,['review','render-attempt','--workspace',workspace,'--attempt-id','render-1','--outcome','succeeded']);
  await command(videoopsBinary,['review','submit-candidate','--workspace',workspace,'--candidate','output/draft.mp4','--render-attempt-id','render-1']);
  await stage('video-critic','REVIEWING',async()=>{
   const proposal=await judge('video-critic',`Check technical report and plan compliance only. You cannot watch or listen in this text-only call. ACCEPT means technical handoff accepted, NEVER perceptual approval. State missing full playback/listening and retain REVIEW_INCOMPLETE. ${JSON.stringify({plan,metadata:rendered.metadata,checks:rendered.checks})}`);
   const decision={version:'videoops-review-decision/v1',id:'technical-1',candidate_sha256:rendered.metadata.sha256,technical:'PASS',perceptual:'REVIEW_INCOMPLETE',reviewer:{identity:'videoops-factory deterministic renderer',type:'technical_tool',capabilities_exercised:['deterministic_validation']},evidence:['review/evidence/technical-checks.json','output/metadata.json','planning/video-critic.json'],defects:[],reviewed_at:new Date().toISOString()};
   await save(path.join(workspace,'review/decision.json'),decision);await command(videoopsBinary,['review','record','--workspace',workspace,'--decision',path.join(workspace,'review/decision.json'),'--authorize-local']);return proposal;
  },'human-review');
  state.status='REVIEW_INCOMPLETE';state.finishedAt=new Date().toISOString();await event('producer','pending','Candidate rendered and technically verified. Full playback review is required before promotion.');
 }catch(error){state.status='BLOCKED';state.error=error.message;state.finishedAt=new Date().toISOString();const active=state.stages.find(s=>s.status==='running');if(active){active.status='failed';active.finishedAt=state.finishedAt;}await event(state.stage,'failed',error.message);throw error;}
 return {workspace,state};
}
