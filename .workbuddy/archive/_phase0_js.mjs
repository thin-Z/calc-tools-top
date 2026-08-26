import fs from 'node:fs';

function apply(file, ops) {
  if (!fs.existsSync(file)) { console.log(file + ': MISSING'); return; }
  let s = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const op of ops) {
    const re = new RegExp(op.re, op.flags || '');
    if (re.test(s)) { s = s.replace(re, op.rep); n++; }
  }
  if (n > 0) fs.writeFileSync(file, s, 'utf8');
  console.log(`${file}: ${n} replacements`);
}

// ---- site-home.js (static code) ----
apply('js/site-home.js', [
  { re: "icon: '\\u{1F3E5}'", rep: "icon: 'stethoscope'", flags: 'u' },
  { re: "health: '\\u{1F3E5} 健康'", rep: "health: '健康'", flags: 'u' },
  { re: "health: '\\u{1F3E5} Health'", rep: "health: 'Health'", flags: 'u' },
  { re: "'⬆ 上升中'", rep: "'上升中'" },
  { re: "'🔥 今日热门'", rep: "'今日热门'", flags: 'u' },
  { re: "'🔥 ' \\+ entry\\.score", rep: "entry.score", flags: 'u' },
  { re: "（\\u{1F319}\\/\\u2600\\uFE0F?）", rep: "（跟随主题）", flags: 'u' },
]);

// ---- theme-toggle.js (comment only) ----
apply('js/theme-toggle.js', [
  { re: "（\\u{1F319}\\/\\u2600\\uFE0F?）", rep: "（跟随主题）", flags: 'u' },
]);

// ---- text-tools: copy feedback (user-visible strings) ----
apply('js/text-tools/case-converter.js', [
  { re: "btn\\.textContent = '\\u2705 ' \\+ \\(btn\\.textContent\\.indexOf\\('\\u{1F4CB}'\\)", rep: "btn.textContent = '已复制'", flags: 'u' },
  { re: "btn\\.textContent = btn\\.textContent\\.indexOf\\('Copied'\\) !== -1 \\? '\\u{1F4CB} Copy Result' : '\\u{1F4CB} 复制结果'", rep: "btn.textContent = '复制结果'", flags: 'u' },
]);
apply('js/text-tools/generator.js', [
  { re: "btn\\.textContent = '\\u2705 已复制'", rep: "btn.textContent = '已复制'", flags: 'u' },
  { re: "btn\\.textContent = '\\u{1F4CB} 复制全部'", rep: "btn.textContent = '复制全部'", flags: 'u' },
]);
apply('js/text-tools/reading-time.js', [
  { re: "btn\\.textContent = '\\u2705 已复制'", rep: "btn.textContent = '已复制'", flags: 'u' },
  { re: "btn\\.textContent = '\\u{1F4CB} 复制结果'", rep: "btn.textContent = '复制结果'", flags: 'u' },
]);
apply('js/text-tools/word-counter.js', [
  { re: "if \\(btn\\) btn\\.textContent = '\\u2713';", rep: "if (btn) btn.textContent = '已复制';", flags: 'u' },
  { re: "if \\(btn\\) btn\\.textContent = '\\u2717';", rep: "if (btn) btn.textContent = '复制失败';", flags: 'u' },
]);

// ---- api/test comments: strip warning sign ----
for (const f of ['api/test/clicks.test.js', 'api/test/likes.test.js', 'api/test/csp-report.test.js']) {
  apply(f, [{ re: '\\u26A0\\uFE0F?\\s*', rep: '', flags: 'gu' }]);
}

console.log('JS PHASE0 DONE');
