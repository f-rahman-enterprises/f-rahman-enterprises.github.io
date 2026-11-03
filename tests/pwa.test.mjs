import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,stat} from 'node:fs/promises';
test('PWA manifest and offline shell support GitHub Pages subdirectories',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./#catalogue');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons)assert.ok((await stat(new URL('../'+icon.src,import.meta.url))).size>0);
 const listeners={};let shell;
 const savedPage={body:'cached catalogue'};
 const context={URL,console,caches:{open:async()=>({addAll:async urls=>{shell=urls;}}),match:async()=>savedPage},fetch:async()=>{throw Error('offline');},self:{location:new URL('https://example.github.io/project/sw.js'),addEventListener:(name,handler)=>listeners[name]=handler}};
 vm.runInNewContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),context);
 let install;listeners.install({waitUntil:p=>install=p});await install;
 for(const path of shell)assert.ok((await stat(new URL('../'+(path==='./'?'index.html':path.slice(2)),import.meta.url))).isFile());
 assert.ok(shell.every(p=>!p.includes('docs/')&&!p.includes('outputs/')));
 let response;listeners.fetch({request:{method:'GET',url:'https://example.github.io/project/',mode:'navigate'},respondWith:p=>response=p});
 assert.equal(await response,savedPage);
 let externalHandled=false;listeners.fetch({request:{method:'GET',url:'https://docs.google.com/published.csv'},respondWith:()=>externalHandled=true});assert.equal(externalHandled,false);
});
