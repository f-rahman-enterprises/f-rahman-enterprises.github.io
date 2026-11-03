import { createHash } from 'node:crypto';
import { mkdir, cp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const target = new URL('dist/', root);
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const path of ['index.html', 'styles.css', 'app.js', 'components.js', 'catalogue.js', 'config.js', 'assets', 'data', 'manifest.webmanifest', '.nojekyll']) {
  await cp(new URL(path, root), new URL(path, target), { recursive: true, filter:source=>!source.replaceAll('\\','/').includes('assets/products')||!source.match(/\.(jpg|jpeg|png)$/i) });
}
console.log('Static website built in dist/');

const hash=createHash('sha256');
async function hashTree(dir){for(const item of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const url=new URL(item.name+(item.isDirectory()?'/':''),dir);if(item.isDirectory())await hashTree(url);else hash.update(await readFile(url));}}
await hashTree(target);
const worker=(await readFile(new URL('sw.js',root),'utf8')).replace("fre-v1",'fre-'+hash.digest('hex').slice(0,12));
await writeFile(new URL('sw.js',target),worker);
