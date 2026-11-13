import fs from 'node:fs';
import path from 'node:path';
export const object=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const str={type:'string'};
export const judgmentSchema=object({decision:{type:'string',enum:['ACCEPT','BLOCK']},reason:str});
export const planSchema=object({title:str,width:{type:'integer'},height:{type:'integer'},fps:{type:'integer'},duration:{type:'number'},cta:str,scenes:{type:'array',items:object({id:str,start:{type:'number'},duration:{type:'number'},headline:str,body:str,assetId:str,theme:{type:'string',enum:['ink','paper']}})}});
export function validateBrief(b){
 if(!b||b.schema!=='kujo.videoops.brief/v1'||!/^[-a-z0-9]{1,64}$/.test(b.id))throw Error('Invalid brief schema or ID');
 if(typeof b.title!=='string'||!b.title.trim()||b.title.length>180||typeof b.request!=='string'||b.request.length>12000)throw Error('Invalid title/request');
 if(![[1920,1080],[1080,1920]].some(([w,h])=>b.width===w&&b.height===h)||b.fps!==30||!Number.isFinite(b.duration)||b.duration<3||b.duration>60)throw Error('Use 16:9 or 9:16, 30fps, 3–60 seconds');
 if(typeof b.cta!=='string'||!b.cta.trim()||b.cta.length>120)throw Error('CTA must be 1–120 characters');
 if(b.assetIds?.some(a=>['narration','music'].includes(a)))throw Error('Silent briefs cannot request audio');
 if(b.audio!=='silent')throw Error('Automated briefs currently support intentional silent output; voiced production uses the canonical media workflow');
 if(!Array.isArray(b.facts)||!b.facts.length||b.facts.length>30||b.facts.some(f=>typeof f.text!=='string'||typeof f.source!=='string'))throw Error('Facts with provenance required');
 if(!Array.isArray(b.assetIds)||!b.assetIds.includes('departure-mono')||!b.assetIds.includes('kujo-logo')||b.assetIds.some(a=>!/^[-a-z0-9]{1,64}$/.test(a)))throw Error('Invalid asset IDs');
 return b;
}
export function containedFile(base,relative){
 if(typeof relative!=='string'||path.isAbsolute(relative)||relative.split(/[\\/]/).some(p=>p==='..')||relative.includes('\0'))throw Error('Unsafe asset path');
 const target=path.resolve(base,relative);let current=base;
 for(const part of path.relative(base,target).split(path.sep)){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw Error('Symlink rejected');}
 if(!fs.statSync(target).isFile())throw Error('Expected regular file');return target;
}
export function validatePlan(plan,brief){
 if(plan.cta!==brief.cta)throw Error('Plan changed requested CTA');
 for(const k of ['width','height','fps','duration'])if(plan[k]!==brief[k])throw Error('Plan changed brief '+k);
 if(!Array.isArray(plan.scenes)||plan.scenes.length<3||plan.scenes.length>5)throw Error('Expected 3–5 scenes');
 let end=0;for(const s of plan.scenes){if(!Number.isFinite(s.start)||!Number.isFinite(s.duration)||s.duration<0.8||Math.abs(s.start-end)>0.001)throw Error('Invalid scene timing');end=s.start+s.duration;if(s.assetId&&!brief.assetIds.includes(s.assetId))throw Error('Unregistered scene asset');if(!['ink','paper'].includes(s.theme))throw Error('Invalid theme');for(const k of ['headline','body'])if(typeof s[k]!=='string'||s[k].length>180)throw Error('Excess scene copy');}
 if(Math.abs(end-brief.duration)>0.001)throw Error('Scene duration mismatch');
 if(plan.scenes.at(-1).theme!=='paper')throw Error('Dark logo requires a paper bumper');return plan;
}
