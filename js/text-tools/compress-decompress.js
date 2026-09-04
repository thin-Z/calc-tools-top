/* ===== 压缩 / 解压缩工具（Zlib、Gzip、Deflate、Brotli）===== */
/* 纯前端实现：fflate 处理 Zlib/Gzip/Deflate，自托管 brotli 编解码处理 Brotli。
   数据全程在浏览器本地处理，不上传服务器。 */

var CD_MODE = 'compress';      // compress | decompress
var CD_ALGO = 'gzip';          // zlib | gzip | deflate | brotli
var CD_FORMAT = 'base64';      // hex | base64

var _brotliReady = false;
var _brotliLoading = null;

/* Brotli 编码/解码库较大（约 700KB），仅在用户选择 Brotli 时按需懒加载，
   避免拖累使用 Zlib/Gzip/Deflate 的普通用户。 */
function ensureBrotli() {
  if (_brotliReady && window.BrotliEnc && window.BrotliDec) return Promise.resolve();
  if (_brotliLoading) return _brotliLoading;
  _brotliLoading = new Promise(function (resolve, reject) {
    var pending = 2;
    function done() { if (--pending === 0) { _brotliReady = true; resolve(); } }
    function fail() { _brotliLoading = null; reject(new Error('Brotli 解码库加载失败，请检查网络后重试')); }
    ['/js/vendor/brotli-dec.min.js', '/js/vendor/brotli-enc.min.js'].forEach(function (src) {
      var s = document.createElement('script');
      s.src = src; s.onload = done; s.onerror = fail;
      document.head.appendChild(s);
    });
  });
  return _brotliLoading;
}

function bytesToText(u8) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); }
  catch (e) { return null; }
}
function textToBytes(text) { return new TextEncoder().encode(text); }

function toHex(u8) {
  var s = '';
  for (var i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16);
  return s;
}
function fromHex(str) {
  str = str.trim().replace(/\s+/g, '');
  if (str.length % 2 !== 0) throw new Error('Hex 字符串长度必须为偶数');
  var u8 = new Uint8Array(str.length / 2);
  for (var i = 0; i < u8.length; i++) {
    var v = parseInt(str.substr(i * 2, 2), 16);
    if (!isFinite(v)) throw new Error('Hex 包含非法字符');
    u8[i] = v;
  }
  return u8;
}
function toB64(u8) {
  var bin = '';
  for (var i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}
function fromB64(str) {
  str = str.trim().replace(/\s+/g, '');
  if (!str) throw new Error('请输入待解压的数据');
  if (!/^[A-Za-z0-9+/=]+$/.test(str)) throw new Error('Base64 包含非法字符，请检查是否混入了空格或换行');
  if (str.length % 4 !== 0) throw new Error('Base64 长度无效（应为 4 的倍数）——数据可能复制不完整，请重新复制整段');
  try {
    return new Uint8Array(atob(str).split('').map(function (c) { return c.charCodeAt(0); }));
  } catch (e) {
    throw new Error('Base64 解码失败，数据可能不完整或已损坏');
  }
}

/* Zlib = 裸 Deflate + 2 字节头(0x78 0x9c) + 4 字节 Adler-32 校验和（大端）。
   fflate 的 deflateSync 输出裸 Deflate，这里补上 zlib 包装以便与标准 zlib 工具互认。 */
function adler32(buf) {
  var a = 1, b = 0;
  for (var i = 0; i < buf.length; i++) { a = (a + buf[i]) % 65521; b = (a + b) % 65521; }
  return ((b << 16) | a) >>> 0;
}
function zlibWrap(raw, src) {
  var ad = adler32(src);
  var out = new Uint8Array(raw.length + 6);
  out[0] = 0x78; out[1] = 0x9c;
  out.set(raw, 2);
  out[raw.length + 2] = (ad >>> 24) & 255;
  out[raw.length + 3] = (ad >>> 16) & 255;
  out[raw.length + 4] = (ad >>> 8) & 255;
  out[raw.length + 5] = ad & 255;
  return out;
}

function compressBytes(bytes) {
  var f = window.fflate;
  if (CD_ALGO === 'gzip') return f.gzipSync(bytes);
  if (CD_ALGO === 'deflate') return f.deflateSync(bytes);
  if (CD_ALGO === 'zlib') return zlibWrap(f.deflateSync(bytes), bytes);
  if (CD_ALGO === 'brotli') {
    if (!window.BrotliEnc) throw new Error('Brotli 编码库未就绪');
    var c = window.BrotliEnc.compress(bytes, 6, 22);
    if (!c) throw new Error('Brotli 压缩失败');
    return c;
  }
  throw new Error('未知算法: ' + CD_ALGO);
}
function decompressBytes(bytes) {
  var f = window.fflate;
  if (CD_ALGO === 'gzip') return f.gunzipSync(bytes);
  if (CD_ALGO === 'deflate') return f.inflateSync(bytes);
  if (CD_ALGO === 'zlib') {
    if (bytes.length < 6) throw new Error('Zlib 数据过短');
    return f.inflateSync(bytes.subarray(2, bytes.length - 4));
  }
  if (CD_ALGO === 'brotli') {
    if (!window.BrotliDec) throw new Error('Brotli 解码库未就绪');
    var d = window.BrotliDec.decompress(bytes);
    if (!d) throw new Error('Brotli 解压失败');
    return d;
  }
  throw new Error('未知算法: ' + CD_ALGO);
}

function setChip(selector, attr, value) {
  var chips = document.querySelectorAll(selector);
  for (var i = 0; i < chips.length; i++) {
    if (chips[i].getAttribute(attr) === value) chips[i].classList.add('active');
    else chips[i].classList.remove('active');
  }
}

function switchCdMode(mode) {
  CD_MODE = mode;
  setChip('.mode-chip[data-mode]', 'data-mode', mode);
  runCd();
}
function switchCdAlgo(algo) {
  CD_ALGO = algo;
  setChip('.algo-chip[data-algo]', 'data-algo', algo);
  runCd();
}
function switchCdFormat(fmt) {
  CD_FORMAT = fmt;
  runCd();
}

function algoName(a) {
  return { zlib: 'Zlib', gzip: 'Gzip', deflate: 'Deflate', brotli: 'Brotli' }[a] || a;
}

function runCd() {
  var input = document.getElementById('textInput');
  var resultSection = document.getElementById('resultSection');
  var errorSection = document.getElementById('errorSection');
  var resultArea = document.getElementById('resultArea');
  var statsArea = document.getElementById('statsArea');
  var noteArea = document.getElementById('noteArea');
  resultSection.classList.add('hidden');
  errorSection.style.display = 'none';
  noteArea.textContent = '';
  if (!input.value.trim()) { resultArea.textContent = ''; return; }

  var exec = function () {
    try {
      if (CD_MODE === 'compress') {
        var src = textToBytes(input.value);
        var comp = compressBytes(src);
        var encoded = (CD_FORMAT === 'hex') ? toHex(comp) : toB64(comp);
        resultArea.textContent = encoded;
        var ratio = src.length === 0 ? 0 : Math.round((1 - comp.length / src.length) * 100);
        statsArea.textContent = '原始 ' + src.length + ' 字节 → ' + algoName(CD_ALGO) + ' ' + comp.length +
          ' 字节' + (ratio >= 0 ? '（节省 ' + ratio + '%）' : '（增大 ' + (-ratio) + '%）');
        resultSection.classList.remove('hidden');
      } else {
        var bytes = (CD_FORMAT === 'hex') ? fromHex(input.value) : fromB64(input.value);
        var dec = decompressBytes(bytes);
        var text = bytesToText(dec);
        if (text !== null) {
          resultArea.textContent = text;
        } else {
          resultArea.textContent = (CD_FORMAT === 'hex') ? toHex(dec) : toB64(dec);
          noteArea.textContent = '提示：解压结果为二进制数据（非文本），已以 ' + (CD_FORMAT === 'hex' ? 'Hex' : 'Base64') + ' 形式展示。';
        }
        statsArea.textContent = algoName(CD_ALGO) + ' ' + bytes.length + ' 字节 → 解压 ' + dec.length + ' 字节';
        resultSection.classList.remove('hidden');
      }
    } catch (e) {
      var msg = e.message || '处理失败';
      if (CD_MODE === 'decompress') {
        msg = '解压失败：' + msg + '（请确认数据完整、未损坏，且 Base64/Hex 已整段复制）';
      }
      document.getElementById('errorMsg').textContent = msg;
      errorSection.style.display = 'block';
    }
  };

  if (CD_ALGO === 'brotli') {
    ensureBrotli().then(exec).catch(function (e) {
      document.getElementById('errorMsg').textContent = e.message || 'Brotli 库加载失败';
      errorSection.style.display = 'block';
    });
  } else {
    exec();
  }
}

function copyCdResult() {
  var content = document.getElementById('resultArea').textContent;
  if (!content) { alert('请先生成结果'); return; }
  var btn = document.getElementById('copyBtn');
  function mark() {
    btn.textContent = '已复制';
    btn.classList.add('copied');
    setTimeout(function () { btn.textContent = '复制结果'; btn.classList.remove('copied'); }, 2000);
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(content).then(mark);
  } else {
    var ta = document.createElement('textarea');
    ta.value = content; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    mark();
  }
}

function clearCd() {
  document.getElementById('textInput').value = '';
  document.getElementById('resultArea').textContent = '';
  document.getElementById('statsArea').textContent = '';
  document.getElementById('noteArea').textContent = '';
  document.getElementById('resultSection').classList.add('hidden');
  document.getElementById('errorSection').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () { runCd(); });
