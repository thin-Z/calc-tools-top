/**
 * Shared fake-DOM harness for testing browser-global calculator scripts
 * (js/calculators/*.js) WITHOUT modifying their source.
 *
 * The calculator files declare top-level functions (doCalculate / resetForm /
 * pure helpers) and only touch the DOM inside those functions. We load the
 * source in a vm sandbox with a minimal `document` / `window`, pre-seed input
 * element values, invoke doCalculate(), then read the output elements'
 * textContent to assert on the real calculation logic.
 *
 * This keeps E6/Q-5 work at "zero structural change": the source files are
 * untouched; only tests are added. (js/calculators/** is excluded from the
 * coverage gate, so these tests raise real coverage without nudging the
 * 80% threshold.)
 *
 * Second batch extensions (all additive / backward compatible with batch 1):
 *   - fake elements gain addEventListener / querySelector / classList tracking
 *   - document gains readyState, addEventListener, querySelectorAll, createElement
 *   - sandbox gains getLang() so bilingual calculators take the zh branch
 *   - IIFE-wrapped sources: an export epilogue is injected before the closing
 *     `})();` so inner functions (doCalculate / init / ...) become reachable
 *   - options: { inputs, checked, lang, entry, querySelector, querySelectorAll,
 *               globals }
 *   - result helpers: html(id), hasClass(id, cls), call(fnName, values)
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/* Functions we try to pull out of IIFE-wrapped sources. */
const EXPORT_NAMES = [
  'doCalculate',
  'doCalculateIfVisible',
  'resetForm',
  'init',
  'doConvert',
  'updateUnits',
  'countWorkdays',
  'calculate',
  'copyRandomResults',
  'setupDownload',
];

/**
 * IIFE-wrapped files hide their helpers from the sandbox global. Inject an
 * export epilogue just before the final `})();` so the names become reachable
 * through sandbox.__xports (names that do not exist are silently skipped).
 * @param {string} src calculator source text
 * @returns {string} source with epilogue injected when wrapped
 */
function withExportEpilogue(src) {
  const trimmed = src.trim();
  // 文件头可能是注释块再接 (function () { ... })();，故只要求存在 IIFE 开闭配对，
  // 且没有顶级（行首）function doCalculate。
  const wrapped = /\}\)\(\);?$/.test(trimmed)
    && /\(function\s*\(\s*\)\s*\{/.test(src)
    && !/^function\s+doCalculate/m.test(trimmed);
  if (!wrapped) return src;
  const idx = src.lastIndexOf('})();');
  if (idx < 0) return src;
  const epilogue = EXPORT_NAMES
    .map((n) => 'try { __xports.' + n + ' = ' + n + '; } catch (e) {}')
    .join('\n');
  return src.slice(0, idx) + '\n' + epilogue + '\n' + src.slice(idx);
}

/**
 * Build one fake DOM element.
 * @param {string} id element id
 * @param {{value?:string,checked?:boolean}} seed initial value / checked state
 * @returns {object} fake element
 */
function makeElement(id, seed = {}) {
  const classes = new Set();
  return {
    id,
    value: seed.value !== undefined ? seed.value : '',
    textContent: '',
    innerHTML: '',
    checked: seed.checked === true,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c) => {
        if (classes.has(c)) { classes.delete(c); return false; }
        classes.add(c);
        return true;
      },
      contains: (c) => classes.has(c),
    },
    style: { setProperty() {}, color: '' },
    min: undefined,
    max: undefined,
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild() {},
    click() {},
    focus() {},
  };
}

/**
 * Load a calculator source into a fake-DOM sandbox.
 * @param {string} name file name (without .js) under js/calculators/
 * @param {object} [options] see file header
 * @returns {object} test api: run / call / text / html / get / hasClass / error / reset
 */
function loadCalculator(name, options = {}) {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'calculators', name + '.js'),
    'utf8'
  );
  const inputs = options.inputs || {};
  const checks = options.checked || {};
  const lang = options.lang || 'zh';
  const entry = options.entry || 'doCalculate';
  const qsFn = typeof options.querySelector === 'function' ? options.querySelector : null;
  const qsaFn = typeof options.querySelectorAll === 'function' ? options.querySelectorAll : null;
  const extraGlobals = options.globals || {};

  const elements = new Map();
  const make = (id) => {
    if (!elements.has(id)) {
      elements.set(id, makeElement(id, {
        value: inputs[id] !== undefined ? String(inputs[id]) : '',
        checked: checks[id] === true,
      }));
    }
    return elements.get(id);
  };

  const document = {
    readyState: 'complete',
    getElementById: (id) => make(id),
    querySelector: (sel) => (qsFn ? qsFn(sel) : null),
    querySelectorAll: (sel) => (qsaFn ? qsaFn(sel) : []),
    addEventListener() {},
    removeEventListener() {},
    createElement: (tag) => makeElement('_created_' + tag),
    body: makeElement('body'),
  };

  let lastError = null;
  const window = {
    showError: (m) => { lastError = m; },
    copyText: () => Promise.resolve(),
  };
  const sandbox = Object.assign(
    { console, document, window, getLang: () => lang },
    extraGlobals,
    { __xports: {} }
  );
  vm.createContext(sandbox);
  vm.runInContext(withExportEpilogue(src), sandbox);

  const api = {
    sandbox,
    exports: sandbox.__xports,
    /** Resolve a top-level function (global scope, or IIFE-exported). */
    fn(fnName) {
      return typeof sandbox[fnName] === 'function'
        ? sandbox[fnName]
        : sandbox.__xports[fnName];
    },
    get: (id) => elements.get(id),
    text: (id) => { const e = elements.get(id); return e ? e.textContent : undefined; },
    html: (id) => { const e = elements.get(id); return e ? e.innerHTML : undefined; },
    hasClass: (id, cls) => {
      const e = elements.get(id);
      return !!(e && e.classList.contains(cls));
    },
    error: () => lastError,
    /** Seed values then invoke the entry function (default doCalculate). */
    run(values, fnName) {
      lastError = null;
      for (const [id, v] of Object.entries(values || {})) {
        make(id).value = String(v);
      }
      const target = fnName || entry;
      const f = api.fn(target);
      if (typeof f !== 'function') {
        throw new Error('calculator "' + name + '" exposes no function "' + target + '"');
      }
      f();
      return api;
    },
    /** Invoke an arbitrary top-level function with seeded values. */
    call(fnName, values) {
      return api.run(values, fnName);
    },
    reset() {
      lastError = null;
      const f = api.fn('resetForm');
      if (typeof f === 'function') f();
      return api;
    },
  };
  return api;
}

module.exports = { loadCalculator, makeElement };
