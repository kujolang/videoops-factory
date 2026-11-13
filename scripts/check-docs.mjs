import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','.runtime','node_modules'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.md'))files.push(p);}}
walk(root);let broken=0;for(const file of files){for(const m of fs.readFileSync(file,'utf8').matchAll(/\]\(([^)]+)\)/g)){const link=m[1].split('#')[0];if(!link||/^[a-z]+:/i.test(link))continue;if(!fs.existsSync(path.resolve(path.dirname(file),link))){console.error(path.relative(root,file)+': '+link);broken++;}}}if(broken)process.exitCode=1;else console.log(`${files.length} Markdown files: local links valid`);
