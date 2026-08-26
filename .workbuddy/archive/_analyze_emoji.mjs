import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const EXCLUDE = new Set(['.git','.githooks','dist','node_modules','includes','docs','deliverables','api','scripts','css','js','assets','snapshots','_Careate.Program']);
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
// categorize
const dirs = {};
walk(ROOT,(f)=>{
  const rel = path.relative(ROOT,f);
  const t=fs.readFileSync(f,'utf8');
  const hits=t.match(emojiRe)||[];
  if(!hits.length) return;
  const top = rel.split(path.sep)[0] || '(root)';
  (dirs[top] = dirs[top] || {files:0, total:0, sample:[]});
  dirs[top].files++;
  dirs[top].total += hits.length;
  if(dirs[top].sample.length<3) dirs[top].sample.push(rel+':'+hits.length);
});
const order = Object.entries(dirs).sort((a,b)=>b[1].files-a[1].files);
console.log('=== EMOJI BY TOP DIR (source, non-dist) ===');
for(const [d,info] of order){
  console.log(`\n[${d}] files=${info.files} totalEmoji=${info.total}`);
  info.sample.forEach(s=>console.log('   ',s));
}
