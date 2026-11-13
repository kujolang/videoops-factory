import path from 'node:path';
import {createRequire} from 'node:module';
export const root=path.resolve(import.meta.dirname,'..');
export const runsRoot=path.join(root,'.runtime/runs');
export const providerHome=path.join(root,'.runtime/provider');
export const deps=path.join(root,'.runtime/deps');
export const codexBinary=path.join(root,'node_modules/.bin/codex');
export const kujoBinary=()=>createRequire(import.meta.url)('@kujolang/kujo-runtime').resolveKujoBinary();
export const videoopsBinary=path.join(root,'.runtime/venv/bin/videoops');
