import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const EXCLUDE = new Set(['.git','.githooks','dist','node_modules','includes','docs','deliverables','api','scripts','css','js','assets','snapshots']);
function walk(dir, cb){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name.startsWith('.')) continue;
    if(EXCLUDE.has(e.name)) continue;
    const f=path.join(dir,e.name);
    if(e.isDirectory()) walk(f,cb);
    else if(/\.(html|css|js|json)$/.test(e.name)) cb(f);
  }
}
const emojiRe = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu;
const counts = new Map();
const byFile = new Map();
walk(ROOT,(f)=>{
  const t=fs.readFileSync(f,'utf8');
  const hits=t.match(emojiRe)||[];
  if(hits.length){ byFile.set(path.relative(ROOT,f),hits.length); for(const h of hits) counts.set(h,(counts.get(h)||0)+1); }
});
const sorted=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
console.log('DISTINCT EMOJI COUNT:',sorted.length);
for(const [e,c] of sorted) console.log(JSON.stringify(e), c);
console.log('--- FILES WITH EMOJI (count, file) ---');
for(const [f,c] of [...byFile.entries()].sort((a,b)=>b[1]-a[1])) console.log(c, f);
