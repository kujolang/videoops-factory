import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,copyFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileTemplate} from './template.mjs';
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repository,'node_modules/.bin/hyperframes');

function validate(plan) {
  if (![[1920,1080],[1080,1920]].some(([w,h]) => plan.width === w && plan.height === h)) throw new Error('Unsupported frame dimensions');
  if (![24,25,30,60].includes(plan.fps) || !Number.isFinite(plan.duration) || plan.duration < 1 || plan.duration > 180) throw new Error('Invalid FPS or duration');
  if (!Array.isArray(plan.scenes) || plan.scenes.length < 3 || plan.scenes.length > 5) throw new Error('Expected three to five scenes');
  let end = 0;
  for (const scene of plan.scenes) {
    if (!Number.isFinite(scene.start) || !Number.isFinite(scene.duration) || scene.duration < 0.8 || Math.abs(scene.start-end) > 0.001) throw new Error('Scene timing must be finite, contiguous, and ordered');
    if (!['ink','paper'].includes(scene.theme)) throw new Error('Unknown scene theme');
    if (typeof scene.headline !== 'string' || scene.headline.length > 180 || (scene.body && (typeof scene.body !== 'string' || scene.body.length > 360))) throw new Error('Invalid scene copy');
    end = scene.start + scene.duration;
  }
  if (Math.abs(end - plan.duration) > 0.001) throw new Error('Scenes do not cover declared duration');
}

/** Compile data through the trusted template; never execute model-authored source. */
export async function renderProject({workspace,plan,assets,onProgress = () => {}}) {
  validate(plan);
  workspace = await realpath(workspace);
  const composition = path.join(workspace,'production/hyperframes');
  const output = path.join(workspace,'output');
  const evidence = path.join(workspace,'review/evidence');
  const logDir = path.join(workspace,'production/logs');
  for (const dir of [composition,path.join(composition,'assets'),path.join(composition,'compositions'),output,evidence,logDir]) await mkdir(dir,{recursive:true});
  const checks = {commands:[], semanticApproval:false};
  async function run(command,args,name,{allowFailure=false}={}) {
    onProgress({stage:'render',step:name});
    const started = Date.now();
    const result = await new Promise((resolve,reject) => {
      const child = spawn(command,args,{cwd:composition,env:{...process.env,HYPERFRAMES_SKIP_SKILLS:'1',HYPERFRAMES_NO_UPDATE_CHECK:'1'},stdio:['ignore','pipe','pipe']});
      let stdout='',stderr='';
      child.stdout.on('data',b=>stdout+=b); child.stderr.on('data',b=>stderr+=b);
      const timeout=setTimeout(()=>child.kill('SIGTERM'),30*60*1000);
      child.on('error',e=>{clearTimeout(timeout);reject(e)});
      child.on('close',code=>{clearTimeout(timeout);resolve({code,stdout,stderr})});
    });
    const log = path.join(logDir,`${name}.log`);
    await writeFile(log,JSON.stringify({command,args,code:result.code,elapsedMs:Date.now()-started})+'\n'+result.stdout+'\n'+result.stderr);
    checks.commands.push({command,args,code:result.code,log,elapsedMs:Date.now()-started});
    if (result.code !== 0 && !allowFailure) throw new Error(`${name} failed (${result.code}); inspect ${log}`);
    return result;
  }
  const copied=[];
  const ids=new Set();
  for (const [index,asset] of assets.entries()) {
    if (ids.has(asset.id)) throw new Error(`Duplicate asset ${asset.id}`);
    ids.add(asset.id);
    if (!['image','video','font','audio'].includes(asset.kind)) throw new Error('Unknown asset kind');
    const source = await realpath(path.resolve(workspace,asset.path));
    if (!source.startsWith(workspace+path.sep)) throw new Error('Asset escapes workspace');
    const ext = path.extname(source).toLowerCase();
    if (!/^\.(png|jpe?g|webp|svg|mp4|webm|mov|woff2?|ttf|otf|wav|mp3|m4a|ogg)$/.test(ext)) throw new Error('Unsupported asset extension');
    const src=`assets/asset-${index}${ext}`;
    await copyFile(source,path.join(composition,src));
    copied.push({...asset,src});
  }
  for (const scene of plan.scenes) if (scene.assetId && !ids.has(scene.assetId)) throw new Error(`Missing scene asset ${scene.assetId}`);
  await copyFile(path.join(repository,'node_modules/gsap/dist/gsap.min.js'),path.join(composition,'assets/gsap.min.js'));
  for (const [name,html] of Object.entries(compileTemplate(plan,copied))) await writeFile(path.join(composition,name),html);
  checks.version=(await run(cli,['--version'],'version')).stdout.trim();
  checks.lint = JSON.parse((await run(cli,['lint',composition,'--json'],'lint')).stdout);
  checks.check = JSON.parse((await run(cli,['check',composition,'--json'],'check')).stdout);
  if (!checks.lint.ok || !checks.check.ok || checks.check.browserSkipped) throw new Error('HyperFrames technical checks did not pass');
  try {
  const preview=await run(cli,['preview',composition,'--background','--no-open','--json'],'preview');
  checks.preview = preview.stdout;
  const url=preview.stdout.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/)?.[0];
  if (!url) throw new Error('Preview did not return a local URL');
  checks.previewUrl=url;
  const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('Preview HTTP check failed');
  const video=path.join(output,'draft.mp4');
  await run(cli,['render',composition,'--output',video,'--fps',String(plan.fps),'--quality','delivery','--workers','2','--strict'],'render');
  const probe=await run('ffprobe',['-v','error','-show_format','-show_streams','-of','json',video],'ffprobe');
  const metadata=JSON.parse(probe.stdout);
  const stream=metadata.streams.find(s=>s.codec_type==='video');
  const [num,den]=stream.r_frame_rate.split('/').map(Number);
  if (stream.width!==plan.width || stream.height!==plan.height || Math.abs(num/den-plan.fps)>0.001 || Math.abs(Number(metadata.format.duration)-plan.duration)>1/plan.fps+0.03) throw new Error('Rendered metadata does not match plan');
  if (ids.has('narration') && !metadata.streams.some(s=>s.codec_type==='audio')) throw new Error('Narration audio stream missing');
  await run('ffmpeg',['-v','error','-i',video,'-f','null','-'],'decode');
  metadata.sha256=createHash('sha256').update(await readFile(video)).digest('hex');
  await writeFile(path.join(output,'metadata.json'),JSON.stringify(metadata,null,2)+'\n');
  const frames=[];
  for (const [index,scene] of plan.scenes.entries()) {
    const frame=path.join(evidence,`shot-${index+1}.jpg`);
    await run('ffmpeg',['-v','error','-y','-ss',String(scene.start+scene.duration/2),'-i',video,'-frames:v','1','-q:v','2',frame],`frame-${index+1}`);
    frames.push(frame);
  }
  await writeFile(path.join(evidence,'technical-checks.json'),JSON.stringify(checks,null,2)+'\n');
  return {video,metadata,frames,composition,checks};
  } finally {
    // Stop only this project's preview; other editing sessions remain open.
    await run(cli,['preview',composition,'--stop','--json'],'preview-stop',{allowFailure:true}).catch(()=>{});
  }
}
