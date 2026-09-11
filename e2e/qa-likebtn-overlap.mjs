// QA regression assertion: .hot-tool-card .like-btn is anchored to the card's
// TOP-RIGHT corner (position:absolute; top:10px; right:10px; z-index:2) and does
// NOT overlap .hot-score / .hot-badge. Renders the local built site and asserts,
// for every .hot-tool-card, on desktop (1280x900) and mobile (390x844):
//   - .like-btn computed position === 'absolute'
//   - btnTop - cardTop  ∈ [9.5, 12.5]   (expected ~11px: 10px CSS + ~1px card border)
//   - cardRight - btnRight ∈ [9.5, 12.5]
//   - .like-btn fully inside the card rect
//   - .like-btn / .hot-score / .hot-badge pairwise non-overlapping (open-interval AABB)
//   - .hot-score.left >= .hot-badge.right (score badge sits right of the rank badge, positive gap)
// Exit code: 0 = ASSERTION PASSED, 2 = ASSERTION FAILED (including missing elements / nav errors).
import { chromium } from 'playwright';

const URL = process.env.QA_URL || 'http://127.0.0.1:4173/';
const LO = 9.5;   // lower bound of offsets (px, incl. 1.5px card border tolerance)
const HI = 12.5;  // upper bound of offsets

// Open-interval AABB intersection: touching edges (gap === 0) => NOT overlapping.
function overlaps(a, b) {
  return a.left < b.right - 1e-6 && a.right > b.left + 1e-6 &&
         a.top < b.bottom - 1e-6 && a.bottom > b.top + 1e-6;
}

async function measure(page) {
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
  // Soft-wait: a missing card is an assertion failure (exit 2), not a thrown timeout.
  await page.waitForSelector('.hot-tool-card', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000); // allow JS render to settle

  return page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    const cards = [...document.querySelectorAll('.hot-tool-card')];
    if (!cards.length) return { error: 'no .hot-tool-card found (page rendered without hot cards?)' };
    return {
      count: cards.length,
      cards: cards.map((card, i) => {
        const btn = card.querySelector('.like-btn');
        const score = card.querySelector('.hot-score');
        const badge = card.querySelector('.hot-badge');
        return {
          index: i + 1,
          card: rect(card),
          btn: btn ? rect(btn) : null,
          score: score ? rect(score) : null,
          badge: badge ? rect(badge) : null,
          btnPosition: btn ? getComputedStyle(btn).position : null,
        };
      }),
    };
  });
}

const failures = [];
const logs = [];
let browser;

try {
  browser = await chromium.launch({ channel: 'msedge' });

  for (const vp of [{ name: 'desktop(1280x900)', width: 1280, height: 900 }, { name: 'mobile(390x844)', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    try {
      const res = await measure(page);

      logs.push(`\n===== Viewport: ${vp.name} =====`);
      if (res.error) {
        logs.push(`  ERROR: ${res.error}`);
        failures.push(`${vp.name}: ${res.error}`);
        continue;
      }
      logs.push(`  hot cards found: ${res.count}`);

      res.cards.forEach((c) => {
        const tag = `#${c.index}`;
        const r2 = (n) => (Number.isFinite(n) ? +n.toFixed(2) : n);
        const offTop = c.btn ? c.btn.top - c.card.top : NaN;
        const offRight = c.btn ? c.card.right - c.btn.right : NaN;

        // 1. absolute positioning
        if (c.btnPosition !== 'absolute') failures.push(`${vp.name} ${tag}: like-btn position=${c.btnPosition} (expected absolute)`);

        // 2. TOP-RIGHT anchoring offsets
        if (!(offTop >= LO && offTop <= HI)) failures.push(`${vp.name} ${tag}: btnTop-cardTop=${r2(offTop)} not in [${LO}, ${HI}]`);
        if (!(offRight >= LO && offRight <= HI)) failures.push(`${vp.name} ${tag}: cardRight-btnRight=${r2(offRight)} not in [${LO}, ${HI}]`);

        // 3. like-btn fully inside card rect (allow tiny epsilon)
        if (c.btn && (c.btn.top < c.card.top - 0.5 || c.btn.bottom > c.card.bottom + 0.5 ||
                      c.btn.left < c.card.left - 0.5 || c.btn.right > c.card.right + 0.5)) {
          failures.push(`${vp.name} ${tag}: like-btn not fully inside card rect`);
        }

        // 4. pairwise non-overlap among like-btn / hot-score / hot-badge
        const parts = [['like-btn', c.btn], ['hot-score', c.score], ['hot-badge', c.badge]].filter(([, v]) => v);
        for (let i = 0; i < parts.length; i++) {
          for (let j = i + 1; j < parts.length; j++) {
            if (overlaps(parts[i][1], parts[j][1])) {
              failures.push(`${vp.name} ${tag}: OVERLAP ${parts[i][0]} x ${parts[j][0]}`);
            }
          }
        }

        // 5. hot-score right of hot-badge (positive gap)
        if (c.score && c.badge && (c.score.left - c.badge.right) < 0) {
          failures.push(`${vp.name} ${tag}: hot-score.left - hot-badge.right = ${r2(c.score.left - c.badge.right)} (expected >= 0)`);
        }

        logs.push(`  ${tag}: offTop=${r2(offTop)} offRight=${r2(offRight)} pos=${c.btnPosition}` +
          (c.score && c.badge ? ` score-badge-gap=${r2(c.score.left - c.badge.right)}` : ''));
      });
    } catch (e) {
      logs.push(`\n===== Viewport: ${vp.name} =====`);
      logs.push(`  ERROR: ${e.message}`);
      failures.push(`${vp.name}: unexpected error: ${e.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }
} catch (e) {
  failures.push(`fatal: ${e.message}`);
} finally {
  if (browser) await browser.close().catch(() => {});
}

logs.forEach((l) => console.log(l));
console.log('\n========================================');
if (failures.length) {
  console.log(`ASSERTION FAILED (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  console.log('========================================');
  process.exit(2);
} else {
  console.log('ASSERTION PASSED: hot-card like-btn anchored TOP-RIGHT, no score/badge overlap');
  console.log('========================================');
  process.exit(0);
}
