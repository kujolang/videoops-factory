#!/usr/bin/env node
import {runFactory} from '../src/runner.mjs';
const [action,...args]=process.argv.slice(2);
try{
 if(action==='run'&&args.length===1){console.log(JSON.stringify(await runFactory(args[0]),null,2));}
 else if(action==='serve'&&args.length===0){const {serve}=await import('../src/server.mjs');await serve();}
 else throw Error('Usage: npm run factory -- run examples/launch-brief.json | serve');
}catch(error){console.error(error.message);process.exitCode=1;}
