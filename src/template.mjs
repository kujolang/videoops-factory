/** Trusted source compiler: user strings are HTML text, never executable source. */
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

export function compileTemplate(plan, assets) {
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const font = byId.get('departure-mono');
  if (!font) throw new Error('Required departure-mono font is missing');
  const portrait = plan.height > plan.width;
  const fontFace = `@font-face{font-family:Departure;src:url('${escapeHtml(font.src)}')} `;
  const files = {};
  const hosts = plan.scenes.map((scene, index) => {
    // Generated identifiers avoid placing plan identifiers in CSS or JavaScript.
    const id = `shot-${index + 1}`;
    const asset = byId.get(scene.assetId);
    const bumper = index === plan.scenes.length - 1 && byId.has('kujo-logo');
    const ink = scene.theme !== 'paper';
    const color = ink ? '#f5f5f2' : '#080808';
    const background = ink ? '#080808' : '#f5f5f2';
    const text = escapeHtml(scene.headline);
    const body = escapeHtml(scene.body);
    const media = asset && ['image','video'].includes(asset.kind) && !bumper ? `<${asset.kind === 'video' ? 'video' : 'img'} id="${id}-media" class="clip evidence" data-start="0" data-duration="${scene.duration}" data-track-index="1" src="${escapeHtml(asset.src)}" ${asset.kind === 'video' ? 'muted playsinline' : 'alt="Product evidence"'}>` : '';
    const logo = bumper ? `<img id="${id}-logo" class="brand-logo" src="${escapeHtml(byId.get('kujo-logo').src)}" alt="Kujo">` : '';
    files[`compositions/${id}.html`] = `<template>
<style>
${fontFace}
#root{position:absolute;inset:0;font-family:Departure,monospace;color:${color}}
#${id}-surface{position:absolute;inset:0;background:${background};overflow:hidden}
#${id}-content{position:absolute;inset:10%;display:flex;flex-direction:column;justify-content:center;gap:${portrait ? 42 : 28}px}
#${id}-title{font-size:${portrait ? 76 : 96}px;line-height:1.12;font-weight:400;letter-spacing:-3px;margin:0;max-width:100%;overflow-wrap:break-word}
#${id}-body{font-size:${portrait ? 32 : 30}px;line-height:1.5;margin:0;max-width:${portrait ? '100%' : '85%'}}
#${id}-media{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:${background}}
#${id}-logo{width:${portrait ? 170 : 120}px;height:${portrait ? 170 : 120}px;object-fit:contain}
#${id}-brand{display:flex;align-items:center;gap:36px;font-size:${portrait ? 116 : 140}px;line-height:1.15}
#${id}-cta{font-size:${portrait ? 38 : 44}px;line-height:1.4;margin:25px 0 0}
</style>
<div id="root" data-composition-id="${id}" data-width="${plan.width}" data-height="${plan.height}" data-duration="${scene.duration}">
<div id="${id}-surface">${media}${bumper ? `<div id="${id}-content"><div id="${id}-brand">${logo}<span>Kujo</span></div><p id="${id}-cta">${escapeHtml(plan.cta || scene.headline)}</p><p id="${id}-body">kujolang.ai</p></div>` : !media ? `<div id="${id}-content"><h1 id="${id}-title">${text}</h1>${body ? `<p id="${id}-body">${body}</p>` : ''}</div>` : ''}</div>
</div>
<script>
{
const tl = gsap.timeline({paused:true});
${media ? `tl.fromTo('#${id}-media',{scale:0.97},{scale:1,duration:${Math.min(scene.duration - 0.05, 2.2)},ease:'power2.out'},0);` : `tl.fromTo('#${id}-content',{y:44,opacity:0},{y:0,opacity:1,duration:0.55,ease:'power3.out'},0.05);`}
tl.to({}, {duration:${scene.duration}}, 0);
window.__timelines = window.__timelines || {};
window.__timelines['${id}'] = tl;
}
</script>
</template>`;
    return `<div id="${id}" class="clip" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${scene.start}" data-duration="${scene.duration}" data-width="${plan.width}" data-height="${plan.height}" data-track-index="${index+1}" data-track-kind="graphics"></div>`;
  }).join('\n');
  const audio = ['narration','music'].filter(id => byId.has(id)).map(id => `<audio id="${id}" class="clip" src="${escapeHtml(byId.get(id).src)}" data-start="0" data-duration="${plan.duration}" data-track-index="${plan.scenes.length + (id === 'narration' ? 1 : 2)}" data-volume="${id === 'music' ? 0.12 : 1}" data-fade-out="0.4"></audio>`).join('\n');
  files['index.html'] = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(plan.title)}</title><script src="assets/gsap.min.js"></script><style>html,body{margin:0;background:#080808}#root{position:relative;width:${plan.width}px;height:${plan.height}px;overflow:hidden}</style></head><body><div id="root" data-composition-id="main" data-width="${plan.width}" data-height="${plan.height}" data-fps="${plan.fps}" data-duration="${plan.duration}">${hosts}${audio}</div><script>window.__timelines=window.__timelines||{};window.__timelines.main=gsap.timeline({paused:true}).to({}, {duration:${plan.duration}});</script></body></html>`;
  return files;
}
