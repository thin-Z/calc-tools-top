/* Tests for js/calculators/markdown-preview.js (P1P2-03, P1P2-13).
 * 覆盖基础语法子集 + XSS 转义用例。 */
const test = require('node:test');
const assert = require('node:assert');

globalThis.window = globalThis;

require('../calculators/markdown-preview.js');

test('window API is exposed', () => {
  ['escapeHtml', 'parseMarkdown'].forEach((fn) => {
    assert.strictEqual(typeof window[fn], 'function', fn + ' should be a function');
  });
});

test('escapeHtml escapes HTML special characters', () => {
  assert.strictEqual(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.strictEqual(escapeHtml('a & b < c > d " e \' f'), 'a &amp; b &lt; c &gt; d &quot; e &#39; f');
});

test('parseMarkdown: headings, bold, italic, inline code', () => {
  const html = parseMarkdown('# Title\n\n**bold** and *italic* and `code`');
  assert.ok(html.includes('<h1>Title</h1>'));
  assert.ok(html.includes('<strong>bold</strong>'));
  assert.ok(html.includes('<em>italic</em>'));
  assert.ok(html.includes('<code>code</code>'));
});

test('parseMarkdown: fenced code block with language class', () => {
  const html = parseMarkdown('```js\nvar x = 1;\n```');
  assert.ok(html.includes('<pre><code class="language-js">'));
  assert.ok(html.includes('var x = 1;'));
});

test('parseMarkdown: ordered/unordered lists and blockquote', () => {
  const html = parseMarkdown('- a\n- b\n\n1. x\n2. y\n\n> quote');
  assert.ok(html.includes('<ul>'));
  assert.ok(html.includes('<li>a</li>'));
  assert.ok(html.includes('<ol>'));
  assert.ok(html.includes('<li>x</li>'));
  assert.ok(html.includes('<blockquote>quote</blockquote>'));
});

test('parseMarkdown: horizontal rule and table', () => {
  const html = parseMarkdown('---\n\n| A | B |\n|---|---|\n| 1 | 2 |');
  assert.ok(html.includes('<hr>'));
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('<th>A</th>'));
  assert.ok(html.includes('<td>1</td>'));
});

test('parseMarkdown: links render with safe URL, javascript: rejected', () => {
  const html = parseMarkdown('[ok](https://example.com) [bad](javascript:alert(1))');
  assert.ok(html.includes('<a href="https://example.com">ok</a>'));
  assert.ok(!/href=["']javascript:/i.test(html), 'javascript: URL must be rejected');
  assert.ok(html.includes('bad'));
});

test('parseMarkdown XSS: script tags and event handlers are escaped', () => {
  const html = parseMarkdown('<script>alert(1)</script>\n\n<img onerror="alert(2)">');
  assert.ok(!/<script>/i.test(html), 'no raw script tag');
  assert.ok(!/<img\b/i.test(html), 'no raw img tag');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img'));
});

test('parseMarkdown XSS: inline code containing markup stays escaped', () => {
  const html = parseMarkdown('`<img src=x onerror=alert(1)>`');
  assert.ok(html.includes('<code>&lt;img'));
  assert.ok(!/<img\b/i.test(html));
});

test('parseMarkdown: empty input returns empty string', () => {
  assert.strictEqual(parseMarkdown(''), '');
  assert.strictEqual(parseMarkdown('   \n  '), '');
  assert.strictEqual(parseMarkdown(null), '');
});
