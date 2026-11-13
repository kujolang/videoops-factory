#!/usr/bin/env node
/** Assemble a showcase from actual factory artifacts. This does not approve a candidate. */
import {parseArgs} from 'node:util';
import {mkdir,realpath,readFile,writeFile,copyFile,open,access,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {renderProject} from '../src/render.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {values}=parseArgs({options:Object.fromEntries(['launch','social','floor','review','narration','music'].map(key=>[key,{type:'string'}]))});
for (const key of ['launch','social','floor','review','narration','music']) if (!values[key]) throw new Error(`Missing --${key}`);
for (const kind of ['launch','social']) {
 const run=await realpath(path.resolve(root,values[kind]));
 if(!run.startsWith(root+path.sep))throw new Error('Run outside project');
 const state=JSON.parse(await readFile(path.join(run,'state.json'),'utf8'));
 if(state.status!=='REVIEW_INCOMPLETE' || !state.finishedAt)throw new Error(`${kind} run must have a complete candidate and pending review`);
}
const workspace=path.join(root,'.runtime/demo');
await mkdir(workspace,{recursive:true});
const lockPath=path.join(workspace,'.build.lock');
const lock=await open(lockPath,'wx');
try {
for (const existing of ['plan.json','output/draft.mp4']) {
 let found=false;
 try { await access(path.join(workspace,existing)); found=true; } catch(error) { if(error.code!=='ENOENT') throw error; }
 if(found)throw new Error(`Refusing to overwrite existing demo evidence: ${existing}`);
}
await mkdir(path.join(workspace,'assets'),{recursive:true});
const sources=[
 {id:'floor',source:values.floor,kind:'image'},
 {id:'launch',source:path.join(values.launch,'output/draft.mp4'),kind:'video'},
 {id:'social',source:path.join(values.social,'output/draft.mp4'),kind:'video'},
 {id:'review',source:values.review,kind:'image'},
 {id:'narration',source:values.narration,kind:'audio'},
 {id:'music',source:values.music,kind:'audio'},
 {id:'departure-mono',source:'assets/DepartureMono-Regular.woff2',kind:'font'},
 {id:'kujo-logo',source:'assets/kujo-logo.svg',kind:'image'},
];
const assets=[];
for (const asset of sources) {
 const source=await realpath(path.resolve(root,asset.source));
 if (!source.startsWith(root+path.sep)) throw new Error(`Source outside project: ${asset.id}`);
 const relative=`assets/${asset.id}${path.extname(source)}`;
 await copyFile(source,path.join(workspace,relative));
 assets.push({id:asset.id,path:relative,kind:asset.kind,source:path.relative(root,source),sha256:createHash('sha256').update(await readFile(path.join(workspace,relative))).digest('hex')});
}
const plan={title:'Kujo VideoOps Factory',width:1920,height:1080,fps:30,duration:40,cta:'Build your next factory with Kujo.',scenes:[
 {id:'floor',start:0,duration:12,headline:'Give your video team a clear brief.',body:'',assetId:'floor',theme:'ink'},
 {id:'launch',start:12,duration:8,headline:'One campaign. A landscape launch.',body:'',assetId:'launch',theme:'ink'},
 {id:'social',start:20,duration:8,headline:'A portrait cutdown.',body:'',assetId:'social',theme:'ink'},
 {id:'review',start:28,duration:8,headline:'Review the exact candidate.',body:'',assetId:'review',theme:'ink'},
 {id:'bumper',start:36,duration:4,headline:'Build your next factory with Kujo.',body:'kujolang.ai',assetId:null,theme:'paper'},
]};
const startedAt=new Date().toISOString();
await writeFile(path.join(workspace,'plan.json'),JSON.stringify(plan,null,2)+'\n');
await writeFile(path.join(workspace,'assets.json'),JSON.stringify(assets,null,2)+'\n');
await writeFile(path.join(workspace,'SOURCE-NOTES.md'),'# Showcase source\n\nThe floor and review shots are held captures of the actual running application. The two candidate shots play the actual example renders. This is an edited showcase, not an uninterrupted recording or a claim of production approval. No captions or scene labels are added.\n\nNarration uses the locally recovered Siren v4 master; its provider alignment was unavailable. The original failed provider receipt and successful local import remain under `.runtime/demo-media/`. Listening and exact-artifact review remain pending.\n');
const result=await renderProject({workspace,plan,assets,onProgress:event=>process.stdout.write(JSON.stringify(event)+'\n')});
const qaLog=path.join(workspace,'review/evidence/audio-measurements.log');
const qa=await new Promise((resolve,reject)=>{
 const child=spawn('ffmpeg',['-hide_banner','-i',result.video,'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],{stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('error',reject);child.on('close',code=>resolve({code,output}));
});
await writeFile(qaLog,qa.output);
if(qa.code!==0)throw new Error(`Audio measurement failed; inspect ${qaLog}`);
const receipt={startedAt,finishedAt:new Date().toISOString(),...result,audioQA:{measurements:qaLog,listening:'not_performed'},reviewStatus:'pending'};
await writeFile(path.join(workspace,'demo-result.json'),JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify({video:result.video,reviewStatus:'pending',frames:result.frames})+'\n');

} finally {
 await lock.close();
 await rm(lockPath);
}
