import fs from 'node:fs/promises';
import {renderProject} from '/factory/src/render.mjs';
import {serve} from '/factory/src/server.mjs';
const workspace='/factory/.runtime/onboarding-probe';
await fs.mkdir(workspace+'/assets',{recursive:true});
await fs.copyFile('/factory/assets/DepartureMono-Regular.woff2',workspace+'/assets/font.woff2');
await fs.copyFile('/factory/assets/kujo-logo.svg',workspace+'/assets/logo.svg');
const result=await renderProject({workspace,plan:{title:'Onboarding qualification',width:1920,height:1080,fps:30,duration:3,cta:'Build your next factory with Kujo',scenes:[{id:'a',start:0,duration:1,headline:'Ready to create.',body:'',assetId:'',theme:'ink'},{id:'b',start:1,duration:1,headline:'A real render.',body:'',assetId:'',theme:'paper'},{id:'c',start:2,duration:1,headline:'Kujo',body:'',assetId:'kujo-logo',theme:'paper'}]},assets:[{id:'departure-mono',path:'assets/font.woff2',kind:'font'},{id:'kujo-logo',path:'assets/logo.svg',kind:'image'}]});
const server=await serve({port:0});try{const base='http://127.0.0.1:'+server.address().port;for(const url of ['','/api/runs']){const response=await fetch(base+url);if(response.status!==200)throw Error('Viewer failed '+url);await response.text();}}finally{await new Promise(r=>server.close(r));}
await fs.writeFile('/evidence/readiness.json',JSON.stringify({renderSha256:result.metadata.sha256,duration:result.metadata.format.duration,viewer:true,technical:true,providerAuthenticationChecked:false,perceptualApproval:false},null,2));
