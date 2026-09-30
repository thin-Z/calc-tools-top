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
 * This keeps E6/Q-5 first-batch work at "zero structural change": the source
 * files are untouched; only tests are added. (js/calculators/** is excluded
 * from the coverage gate, so these tests raise real coverage without nudging
 * the 80% threshold.)
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCalculator(name, { inputs = {} } = {}) {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'calculators', name + '.js'),
    'utf8'
  );
  const elements = new Map();
  const make = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value: inputs[id] !== undefined ? String(inputs[id]) : '',
        textContent: '',
        innerHTML: '',
        checked: false,
        classList: { add() {}, remove() {} },
        style: { setProperty() {}, color: '' },
        min: undefined,
        max: undefined,
      });
    }
    return elements.get(id);
  };
  const document = {
    getElementById: (id) => make(id),
    querySelector: () => null,
  };
  let lastError = null;
  const window = { showError: (m) => { lastError = m; } };
  const sandbox = { console, document, window };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return {
    sandbox,
    get: (id) => elements.get(id),
    text: (id) => { const e = elements.get(id); return e ? e.textContent : undefined; },
    error: () => lastError,
    run(values) {
      for (const [id, v] of Object.entries(values)) make(id).value = String(v);
      sandbox.doCalculate();
      return this;
    },
    reset() { sandbox.resetForm(); return this; },
  };
}

module.exports = { loadCalculator };
