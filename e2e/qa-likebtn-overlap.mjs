// QA regression assertion: .hot-tool-card .like-btn must NOT overlap .tool-tags
// Renders the local built site and asserts like-btn.top >= tool-tags.bottom.
import { chromium } from 'playwright';

const URL = process.env.QA_URL || 'http://127.0.0.1:4173/';

async function measure(page) {
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('.hot-tool-card .like-btn', { timeout: 15000 });
  await page.waitForTimeout(2000); // allow JS render to settle
  await page.waitForSelector('.hot-tool-card .tool-tags', { timeout: 10000 });
  await page.waitForSelector('.hot-tool-card .like-btn', { timeout: 10000 });

  return page.evaluate(() => {
    const card = document.querySelector('.hot-tool-card');
    const tags = card.querySelector('.tool-tags');
    const btn = card.querySelector('.like-btn');
    if (!card || !tags || !btn) {
      return { error: 'missing elements', card: !!card, tags: !!tags, btn: !!btn };
    }
    const cr = card.getBoundingClientRect();
    const tr = tags.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    return {
      cardTop: +cr.top.toFixed(2),
      cardBottom: +cr.bottom.toFixed(2),
      cardLeft: +cr.left.toFixed(2),
      cardRight: +cr.right.toFixed(2),
      cardHeight: +cr.height.toFixed(2),
      tagsTop: +tr.top.toFixed(2),
      tagsBottom: +tr.bottom.toFixed(2),
      btnTop: +br.top.toFixed(2),
      btnBottom: +br.bottom.toFixed(2),
      btnLeft: +br.left.toFixed(2),
      btnRight: +br.right.toFixed(2),
      btnWidth: +br.width.toFixed(2),
      computedMarginTop: cs.marginTop,
      computedMarginRight: cs.marginRight,
      computedMarginBottom: cs.marginBottom,
      computedMarginLeft: cs.marginLeft,
    };
  });
}

const browser = await chromium.launch({ channel: 'msedge' });
const results = [];

try {
  // Desktop viewport
  const pageD = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const d = await measure(pageD);
  const gapD = +(d.btnTop - d.tagsBottom).toFixed(2);
  const noOverlapD = d.btnTop >= d.tagsBottom - 0.5;
  const insideD = d.btnTop >= d.cardTop && d.btnBottom <= d.cardBottom + 0.5;
  const rightAlignedD = Math.abs(d.cardRight - d.btnRight) <= 4;
  results.push({ viewport: 'desktop(1280)', data: d, gap: gapD, noOverlap: noOverlapD, insideCard: insideD, rightAligned: rightAlignedD });
  await pageD.close();

  // Mobile viewport — also guards against any @media margin override
  const pageM = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const m = await measure(pageM);
  const gapM = +(m.btnTop - m.tagsBottom).toFixed(2);
  const noOverlapM = m.btnTop >= m.tagsBottom - 0.5;
  const insideM = m.btnTop >= m.cardTop && m.btnBottom <= m.cardBottom + 0.5;
  results.push({ viewport: 'mobile(390)', data: m, gap: gapM, noOverlap: noOverlapM, insideCard: insideM, rightAligned: null });
  await pageM.close();
} finally {
  await browser.close();
}

let allPass = true;
for (const r of results) {
  const d = r.data;
  console.log(`\n===== Viewport: ${r.viewport} =====`);
  if (d.error) {
    console.log('  ERROR:', d.error);
    allPass = false;
    continue;
  }
  console.log(`  card height        = ${d.cardHeight}px  (top ${d.cardTop}, bottom ${d.cardBottom})`);
  console.log(`  .tool-tags bottom  = ${d.tagsBottom}`);
  console.log(`  .like-btn  top     = ${d.btnTop}`);
  console.log(`  gap (btnTop - tagsBottom) = ${r.gap}  (>=0 => NO overlap)`);
  console.log(`  computed margin    = ${d.computedMarginTop} ${d.computedMarginRight} ${d.computedMarginBottom} ${d.computedMarginLeft}`);
  console.log(`  btnRight vs cardRight gap = ${(d.cardRight - d.btnRight).toFixed(2)}  (<=4 => right aligned)`);
  console.log(`  btnInsideCard      = ${r.insideCard}`);
  console.log(`  noOverlap          = ${r.noOverlap}`);
  if (!r.noOverlap || !r.insideCard) allPass = false;
}

console.log('\n========================================');
console.log(allPass ? 'ASSERTION PASSED: like-btn does not overlap tool-tags' : 'ASSERTION FAILED: overlap detected');
console.log('========================================');
process.exit(allPass ? 0 : 2);
