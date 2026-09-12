(function () {
  'use strict';
  /* =====================================================================
   * 站点集成：文案国际化（中文为源码原文，英文见 BM_I18N_EN）
   * L(中文) —— 中文环境原样返回，英文环境查表翻译
   * =================================================================== */
  var BM_I18N_EN = {
    "请先导入图片": "Please import an image first",
    " 枚": " pcs",
    " 在 A4 上最多可排 ": " fits up to ",
    "已导出 ": "Exported ",
    "安全区": "Safe area",
    " 列 × ": " cols × ",
    " 枚，点击将自动夹取为 ": " pcs, click to clamp to ",
    "出血 ": "Bleed ",
    "裁切 ": "Cut ",
    "出血线 ": "Bleed line ",
    "裁切线 ": "Cut line ",
    "成品 ": "Finish ",
    "规格": "Spec",
    "成品": "Finish",
    "出血": "Bleed",
    "含出血": "With bleed",
    "mm · 出血 ": "mm · bleed ",
    "mm · 含出血 ": "mm · with bleed ",
    " · 裁切 ": " · cut ",
    " · 含出血 ": " · with bleed ",
    "原图 ": "Original ",
    "（已自动降采样）": " (auto downsampled)",
    " · 缩放 ": " · zoom ",
    " · 旋转 ": " · rotate ",
    " · 水平翻转": " · flip horizontal",
    " · 垂直翻转": " · flip vertical",
    "尚未载入图片。支持拖拽、点击选择或 Ctrl + V 粘贴。": "No image yet. Drag a file here, click to choose, or paste with Ctrl + V.",
    "导出尺寸 ": "Export size ",
    "，透明背景": ", transparent background",
    "，白色背景": ", white background",
    "单枚 ": "Single ",
    "A4 排布：": "A4 layout: ",
    " 行，共 ": " rows, ",
    " 枚 · 枚间距 ": " pcs · gap ",
    "mm · 四周留白 ": "mm · margin ",
    " 枚（": " pcs (",
    " 行），": " rows), ",
    " 枚已置灰降权（仍可点击，点击后自动夹取为 ": " pcs dimmed (still clickable, will clamp to ",
    " 枚）。": " pcs).",
    "效果预览": "Preview",
    "拟真徽章 · ": "Realistic badge · ",
    "亮面": "Glossy",
    "亚光": "Matte",
    "基础圆形裁剪": "Basic circle crop",
    "打印预览": "Print preview",
    " 枚 · 300 DPI · ": " pcs · 300 DPI · ",
    "px/枚": "px/pc",
    "请选择图片文件（JPG / PNG / WebP / GIF）": "Please choose an image file (JPG / PNG / WebP / GIF)",
    "已载入 ": "Loaded ",
    "（已降采样）": " (downsampled)",
    "图片加载失败，请换一张试试": "Failed to load the image, please try another one",
    "已清除图片": "Image cleared",
    "已重置（含规格与调整）": "Reset (including spec and adjustments)",
    "图片宽高比过大，已应用最小缩放 ": "Aspect ratio is too large, applied minimum zoom ",
    "导出失败，请重试": "Export failed, please retry",
    "，当前生效 ": ", currently active ",
    " 枚（由规格与枚间距推导）": " pcs (derived from spec and gap)",
    " 枚（当前实际生效枚数，由规格与枚间距推导）": " pcs (actual active count, derived from spec and gap)",
    "，超出上限：A4 上最多可排 ": ", over the limit: A4 fits up to ",
    " 枚，已自动夹取为 ": " pcs, automatically clamped to "
  };
  var BM_LANG = (function () {
    try {
      var p = (window.location && window.location.pathname) || '';
      if (p === '/en' || p.indexOf('/en/') === 0) { return 'en'; }
      if (typeof window.getLang === 'function') { return window.getLang() === 'en' ? 'en' : 'zh'; }
    } catch (e) { /* 忽略，回落中文 */ }
    return 'zh';
  })();
  function L(s) {
    return (BM_LANG === 'en' && Object.prototype.hasOwnProperty.call(BM_I18N_EN, s)) ? BM_I18N_EN[s] : s;
  }


  /* =====================================================================
   * 常量与配置
   * =================================================================== */

  var MM_PER_INCH = 25.4;
  var DPI = 300;                                   // 打印输出分辨率
  var A4_MM = { w: 210, h: 297 };                  // A4 物理尺寸
  var A4_MARGIN_MM = 8;                            // A4 四周打印安全边距
  var SAFE_INSET_MM = 2;                           // 安全区距裁切线内缩量
  var MAX_IMAGE_SIDE = 4000;                       // 超大图降采样阈值
  var ZOOM_MIN = 0.1;
  var ZOOM_MAX = 5;
  var EDITOR_FACE_RATIO = 0.86;                    // 画布中成品圆占画布边长的比例
  var PREVIEW_FACE_RATIO = 0.74;                   // 预览图中成品圆占输出边长的比例（预留投影空间）
  var HISTORY_LIMIT = 60;
  var PREVIEW_SIZES = [512, 1024, 2048];

  /** 形状：circle=圆形（成品默认）；rounded=圆角方形（圆角 22%）；square=方形 */
  var ROUNDED_RADIUS_RATIO = 0.22;

  /** 规格表：diameter=成品直径(mm)，bleed=单边出血(mm)，total=含出血直径(mm) */
  var SPECS = [
    { id: '32', label: '32mm', diameter: 32, bleed: 2, total: 36 },
    { id: '44', label: '44mm', diameter: 44, bleed: 2, total: 48 },
    { id: '58', label: '58mm', diameter: 58, bleed: 3, total: 64 },
    { id: '75', label: '75mm', diameter: 75, bleed: 3, total: 81 }
  ];
  var DEFAULT_SPEC_ID = '58';

  /* =====================================================================
   * 全局状态
   * =================================================================== */

  var state = {
    image: null,          // HTMLCanvasElement 或 ImageBitmap（为绘制源）
    imgW: 0,
    imgH: 0,
    downsampled: false,
    hasImage: false,
    tx: 0,                // 平移偏移（以成品直径为单位归一化）
    ty: 0,
    zoom: 1,              // 缩放倍率，1 = 覆盖(cover)含出血圆
    rot: 0,               // 旋转角度 0-360
    flipH: false,
    flipV: false,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    specId: DEFAULT_SPEC_ID,
    // ---- 设计参数（形状 / 颜色 / 文字）----
    shape: 'circle',            // circle | rounded | square
    bgColor: '#FFFFFF',         // 徽章底色（填充图片未覆盖区域）
    rimColor: '#C8D0DA',        // 拟真效果金属包边基色
    textOn: false,              // 是否叠加文字
    textContent: '',
    textColor: '#111111',
    textSize: 12,               // 相对成品边长（直径）的百分比
    textPos: 'bottom',          // top | center | bottom
    textStroke: false,
    textStrokeColor: '#FFFFFF'
  };

  var opts = {
    mode: 'preview',          // preview | print
    realistic: true,
    transparentBg: false,
    surface: 'glossy',        // glossy | matte
    previewSize: 1024,
    showGuides: true,
    showLabels: true,
    count: 20,
    gap: 3                    // mm
  };

  var history = [];
  var histIndex = -1;
  var toastTimer = null;

  /* =====================================================================
   * 通用工具
   * =================================================================== */

  function $(id) { return document.getElementById(id); }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function norm360(deg) { var d = deg % 360; return d < 0 ? d + 360 : d; }

  function mmToPx(mm) { return mm * DPI / MM_PER_INCH; }

  function getSpec(id) {
    for (var i = 0; i < SPECS.length; i++) {
      if (SPECS[i].id === id) { return SPECS[i]; }
    }
    return SPECS[2];
  }

  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    if (toastTimer) { clearTimeout(toastTimer); }
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  /** 更新 range 进度填充（--p 变量） */
  function paintRange(el) {
    var min = parseFloat(el.min);
    var max = parseFloat(el.max);
    var val = parseFloat(el.value);
    var p = (max === min) ? 0 : (val - min) / (max - min) * 100;
    el.style.setProperty('--p', p.toFixed(2) + '%');
  }

  /* =====================================================================
   * 形状与颜色工具
   * =================================================================== */

  /** 圆角矩形路径（不 beginPath，由调用方控制路径生命周期） */
  function roundRectPath(ctx, x, y, w, h, r) {
    if (r <= 0) {
      ctx.rect(x, y, w, h);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /**
   * 构建成品轮廓路径（圆 / 圆角方 / 方），size 为完整边长（直径）。
   * 调用方式：ctx.beginPath(); facePath(ctx, cx, cy, size, shape); …clip()/fill()/stroke()
   */
  function facePath(ctx, cx, cy, size, shape) {
    var half = size / 2;
    if (shape === 'rounded') {
      roundRectPath(ctx, cx - half, cy - half, size, size, size * ROUNDED_RADIUS_RATIO);
    } else if (shape === 'square') {
      roundRectPath(ctx, cx - half, cy - half, size, size, 0);
    } else {
      // moveTo 防止与既有子路径（如 evenodd 遮罩矩形）之间产生连接线
      ctx.moveTo(cx + half, cy);
      ctx.arc(cx, cy, half, 0, Math.PI * 2);
    }
  }

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) {
      h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    }
    var n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) { return { r: 200, g: 208, b: 218 }; }
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  /** 颜色明暗派生：f>1 提亮，f<1 压暗 */
  function shade(hex, f) {
    var c = hexToRgb(hex);
    var r = Math.round(clamp(c.r * f, 0, 255));
    var g = Math.round(clamp(c.g * f, 0, 255));
    var b = Math.round(clamp(c.b * f, 0, 255));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* =====================================================================
   * 文字层：绘制在成品轮廓内（调用方需已 clip），所有导出共享同一渲染
   * =================================================================== */

  function drawTextLayer(ctx, cx, cy, faceD) {
    if (!state.textOn || !state.textContent) { return; }
    var fs = Math.max(2, faceD * (state.textSize / 100));
    var y = cy + (state.textPos === 'top' ? -faceD * 0.30 : (state.textPos === 'center' ? 0 : faceD * 0.30));
    ctx.save();
    ctx.font = '700 ' + fs + 'px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (state.textStroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1, fs * 0.16);
      ctx.strokeStyle = state.textStrokeColor;
      ctx.strokeText(state.textContent, cx, y);
    }
    ctx.fillStyle = state.textColor;
    ctx.fillText(state.textContent, cx, y);
    ctx.restore();
  }

  /* =====================================================================
   * 渲染核心：把图片按当前变换绘制到指定画布坐标
   * ---------------------------------------------------------------------
   * 变换归一化策略：tx/ty 以「成品圆直径」为单位，zoom 相对于「含出血圆 cover」，
   * 因此同一状态在任意输出尺寸（编辑器 / 预览 / 300DPI 打印）下构图完全一致，
   * 实现真正的所见即所得（WYSIWYG）。
   * =================================================================== */

  function baseFitFor(faceD, specId) {
    var spec = getSpec(specId);
    var bleedD = faceD * (spec.total / spec.diameter);
    return Math.max(bleedD / state.imgW, bleedD / state.imgH);
  }

  function filterString(st) {
    if (st.brightness === 0 && st.contrast === 0 && st.saturation === 0) { return 'none'; }
    return 'brightness(' + (100 + st.brightness) + '%) contrast(' + (100 + st.contrast) +
           '%) saturate(' + (100 + st.saturation) + '%)';
  }

  /**
   * 在 (cx, cy) 处绘制图片，faceD 为「成品圆」直径（像素）。
   * 调用方负责设置裁剪路径。
   *
   * 变换模型（务必与 solveGesture / onWheel 的反解公式保持一致）：
   *   P(u) = C + t * faceD + R(rot) · S · (fit · u)
   * 其中 t = (tx, ty) 为归一化平移量、u 为图片局部坐标、S 为翻转矩阵。
   * 注意：平移必须在 rotate / scale **之前**叠加，因为手势求解把手势位移
   * 定义在画布空间（未旋转）上。
   */
  function renderImageTo(ctx, cx, cy, faceD, st) {
    var s = st || state;
    if (!state.image) { return; }
    var fit = baseFitFor(faceD, s.specId) * s.zoom;
    var w = state.imgW * fit;
    var h = state.imgH * fit;
    ctx.save();
    ctx.translate(cx + s.tx * faceD, cy + s.ty * faceD);
    ctx.rotate(s.rot * Math.PI / 180);
    ctx.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1);
    ctx.filter = filterString(s);
    ctx.drawImage(state.image, -w / 2, -h / 2, w, h);
    ctx.filter = 'none';
    ctx.restore();
  }

  /* =====================================================================
   * 画布准备（devicePixelRatio 适配，保证高清）
   * =================================================================== */

  function prepCanvas(cv) {
    var w = Math.max(1, Math.round(cv.clientWidth));
    var h = Math.max(1, Math.round(cv.clientHeight));
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var pw = Math.max(1, Math.round(w * dpr));
    var ph = Math.max(1, Math.round(h * dpr));
    if (cv.width !== pw || cv.height !== ph) {
      cv.width = pw;
      cv.height = ph;
    }
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  }

  /* =====================================================================
   * 拟真马口铁徽章绘制
   * =================================================================== */

  /** 表面光效：顶部柔光 + 底部暗角（+ 亮面镜面反射）；裁剪跟随当前形状 */
  function drawSurfaceLight(ctx, cx, cy, faceD, glossy) {
    var r = faceD / 2;
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, faceD, state.shape);
    ctx.clip();

    // 顶部柔光
    var topA = glossy ? 0.44 : 0.20;
    var g1 = ctx.createRadialGradient(
      cx - faceD * 0.16, cy - faceD * 0.36, faceD * 0.01,
      cx - faceD * 0.16, cy - faceD * 0.36, faceD * 0.98
    );
    g1.addColorStop(0, 'rgba(255,255,255,' + topA + ')');
    g1.addColorStop(0.42, 'rgba(255,255,255,' + (topA * 0.30) + ')');
    g1.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(cx - r, cy - r, faceD, faceD);

    // 底部暗角
    var g2 = ctx.createLinearGradient(0, cy + faceD * 0.04, 0, cy + r);
    g2.addColorStop(0, 'rgba(12,18,28,0)');
    g2.addColorStop(1, glossy ? 'rgba(12,18,28,0.16)' : 'rgba(12,18,28,0.10)');
    ctx.fillStyle = g2;
    ctx.fillRect(cx - r, cy - r, faceD, faceD);

    if (glossy) {
      // 亮面：斜向镜面反射
      ctx.save();
      ctx.translate(cx - faceD * 0.19, cy - faceD * 0.31);
      ctx.rotate(-0.42);
      var g3 = ctx.createRadialGradient(0, 0, 0, 0, 0, faceD * 0.30);
      g3.addColorStop(0, 'rgba(255,255,255,0.52)');
      g3.addColorStop(0.55, 'rgba(255,255,255,0.15)');
      g3.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.ellipse(0, 0, faceD * 0.30, faceD * 0.10, 0, 0, Math.PI * 2);
      ctx.fillStyle = g3;
      ctx.fill();
      ctx.restore();
    } else {
      // 亚光：均匀膜面
      var g4 = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      g4.addColorStop(0, 'rgba(255,255,255,0.07)');
      g4.addColorStop(1, 'rgba(35,45,60,0.06)');
      ctx.fillStyle = g4;
      ctx.fillRect(cx - r, cy - r, faceD, faceD);
    }
    ctx.restore();
  }

  /** 拟真徽章：金属包边 + 高光 + 投影（形状感知：圆 / 圆角方 / 方） */
  function drawRealisticBadge(ctx, cx, cy, faceD) {
    var glossy = opts.surface === 'glossy';
    var shape = state.shape;
    var rimW = faceD * 0.045;
    var outerS = faceD + rimW * 2;               // 含包边的完整外轮廓边长

    // 1) 投影 + 底色
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, outerS, shape);
    ctx.shadowColor = 'rgba(9,14,24,0.38)';
    ctx.shadowBlur = faceD * 0.10;
    ctx.shadowOffsetY = faceD * 0.035;
    ctx.fillStyle = shade(state.rimColor, 0.92);
    ctx.fill();
    ctx.restore();

    // 2) 底色 + 图像（裁到外圈）
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, outerS, shape);
    ctx.clip();
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(cx - outerS, cy - outerS, outerS * 2, outerS * 2);
    renderImageTo(ctx, cx, cy, faceD);
    ctx.restore();

    // 3) 表面光效（裁到成品轮廓）
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, faceD, shape);
    ctx.clip();
    drawSurfaceLight(ctx, cx, cy, faceD, glossy);
    drawTextLayer(ctx, cx, cy, faceD);
    ctx.restore();

    // 4) 金属包边（由包边基色派生的渐变描边，模拟马口铁卷边）
    var base = state.rimColor;
    var g = ctx.createLinearGradient(cx - outerS * 0.38, cy - outerS / 2, cx + outerS * 0.38, cy + outerS / 2);
    g.addColorStop(0.00, shade(base, 1.18));
    g.addColorStop(0.16, shade(base, 1.05));
    g.addColorStop(0.38, shade(base, 0.72));
    g.addColorStop(0.54, shade(base, 1.12));
    g.addColorStop(0.74, shade(base, 0.68));
    g.addColorStop(0.90, shade(base, 0.96));
    g.addColorStop(1.00, shade(base, 1.15));
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, faceD + rimW, shape);
    ctx.lineWidth = rimW;
    ctx.strokeStyle = g;
    ctx.stroke();
    ctx.restore();

    // 5) 包边顶侧高光细线
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, outerS - rimW * 0.30, shape);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(1, rimW * 0.17);
    ctx.stroke();
    ctx.restore();

    // 6) 内圈压痕（图像与包边分界）
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, faceD, shape);
    ctx.strokeStyle = 'rgba(20,26,36,0.20)';
    ctx.lineWidth = Math.max(1, faceD * 0.005);
    ctx.stroke();
    ctx.restore();

    // 7) 外缘描边
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, outerS - Math.max(0.5, faceD * 0.0025), shape);
    ctx.strokeStyle = 'rgba(20,26,36,0.28)';
    ctx.lineWidth = Math.max(1, faceD * 0.006);
    ctx.stroke();
    ctx.restore();
  }

  /** 纯轮廓裁剪（关闭拟真效果时） */
  function drawPlainBadge(ctx, cx, cy, faceD) {
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, faceD, state.shape);
    ctx.fillStyle = state.bgColor;
    ctx.fill();
    ctx.clip();
    renderImageTo(ctx, cx, cy, faceD);
    drawTextLayer(ctx, cx, cy, faceD);
    ctx.restore();
  }

  /* =====================================================================
   * 编辑器绘制（暗化遮罩 + 虚线边框）
   * =================================================================== */

  function faceDcss() {
    var cv = $('editorCanvas');
    return Math.max(1, Math.min(cv.clientWidth, cv.clientHeight) * EDITOR_FACE_RATIO);
  }

  function drawEditor() {
    var cv = $('editorCanvas');
    if (!cv.clientWidth) { return; }
    var p = prepCanvas(cv);
    var ctx = p.ctx;
    var cx = p.w / 2;
    var cy = p.h / 2;
    var faceD = Math.min(p.w, p.h) * EDITOR_FACE_RATIO;
    var faceR = faceD / 2;
    var spec = getSpec(state.specId);

    if (!state.hasImage) {
      ctx.save();
      ctx.setLineDash([7, 7]);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      facePath(ctx, cx, cy, faceD, state.shape);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 1) 图片
    renderImageTo(ctx, cx, cy, faceD);

    // 1.5) 文字层（裁到成品轮廓内）
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, faceD, state.shape);
    ctx.clip();
    drawTextLayer(ctx, cx, cy, faceD);
    ctx.restore();

    // 2) 轮廓外暗化遮罩（evenodd：矩形 + 成品轮廓）
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, p.w, p.h);
    facePath(ctx, cx, cy, faceD, state.shape);
    ctx.fillStyle = 'rgba(13,16,22,0.62)';
    ctx.fill('evenodd');
    ctx.restore();

    // 3) 出血轮廓虚线（外侧，含出血尺寸）
    var bleedS = faceD * (spec.total / spec.diameter);
    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    facePath(ctx, cx, cy, bleedS, state.shape);
    ctx.stroke();
    ctx.restore();

    // 4) 裁切轮廓（成品轮廓，蓝色实线）
    ctx.save();
    ctx.strokeStyle = 'rgba(0,122,255,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    facePath(ctx, cx, cy, faceD, state.shape);
    ctx.stroke();
    ctx.restore();

    // 5) 角标文字
    ctx.save();
    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(L('出血 ') + spec.total + 'mm', 10, p.h - 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,122,255,0.9)';
    ctx.fillText(L('裁切 ') + spec.diameter + 'mm', p.w - 10, p.h - 10);
    ctx.restore();
  }

  /* =====================================================================
   * 打印辅助线与标注
   * =================================================================== */

  /**
   * 绘制一枚打印徽章（形状感知）。
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx 圆心/中心 X（像素，含出血尺寸）
   * @param {number} cy 圆心/中心 Y
   * @param {number} cellPx 含出血的完整边长（像素）
   */
  function drawPrintBadge(ctx, cx, cy, cellPx) {
    var spec = getSpec(state.specId);
    var shape = state.shape;
    var ratio = spec.diameter / spec.total;
    var bleedS = cellPx;                      // 含出血完整边长
    var cutS = cellPx * ratio;                // 成品完整边长
    var safeS = Math.max(4, cutS - mmToPx(SAFE_INSET_MM) * 2);

    // 1) 底色（保证打印不透明，图片未覆盖处为底色）
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, bleedS, shape);
    ctx.clip();
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(cx - bleedS, cy - bleedS, bleedS * 2, bleedS * 2);
    ctx.restore();

    // 2) 图像（裁到出血轮廓）
    if (state.hasImage) {
      ctx.save();
      ctx.beginPath();
      facePath(ctx, cx, cy, bleedS, shape);
      ctx.clip();
      renderImageTo(ctx, cx, cy, cutS);
      ctx.restore();
    }

    // 2.5) 文字层（始终裁到成品轮廓内）
    ctx.save();
    ctx.beginPath();
    facePath(ctx, cx, cy, cutS, shape);
    ctx.clip();
    drawTextLayer(ctx, cx, cy, cutS);
    ctx.restore();

    var lw = Math.max(1, cellPx * 0.0028);
    var font = Math.max(9, cellPx * 0.027);

    // 3) 辅助线
    if (opts.showGuides) {
      // 出血线（最外，红色虚线）
      ctx.save();
      ctx.setLineDash([bleedS * 0.06, bleedS * 0.045]);
      ctx.strokeStyle = 'rgba(214,60,60,0.85)';
      ctx.lineWidth = lw;
      ctx.beginPath();
      facePath(ctx, cx, cy, bleedS - lw, shape);
      ctx.stroke();
      ctx.restore();

      // 裁切线（成品轮廓，蓝色细实线）
      ctx.save();
      ctx.strokeStyle = 'rgba(0,110,235,0.9)';
      ctx.lineWidth = lw;
      ctx.beginPath();
      facePath(ctx, cx, cy, cutS, shape);
      ctx.stroke();
      ctx.restore();

      // 安全区轮廓（浅绿虚线）
      ctx.save();
      ctx.setLineDash([bleedS * 0.042, bleedS * 0.036]);
      ctx.strokeStyle = 'rgba(60,170,110,0.75)';
      ctx.lineWidth = lw;
      ctx.beginPath();
      facePath(ctx, cx, cy, safeS, shape);
      ctx.stroke();
      ctx.restore();
    }

    // 4) 文字标注
    if (opts.showLabels) {
      ctx.save();
      ctx.font = '600 ' + font + 'px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = 'center';
      ctx.lineWidth = Math.max(2, font * 0.22);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineJoin = 'round';

      // 出血线标注（出血轮廓内侧顶部）
      var bleedText = L('出血线 ') + spec.total + 'mm';
      ctx.textBaseline = 'top';
      ctx.strokeText(bleedText, cx, cy - bleedS / 2 + font * 0.35);
      ctx.fillStyle = 'rgba(200,45,45,0.95)';
      ctx.fillText(bleedText, cx, cy - bleedS / 2 + font * 0.35);

      // 裁切线标注（裁切轮廓外侧顶部）
      var cutText = L('裁切线 ') + spec.diameter + 'mm';
      ctx.textBaseline = 'bottom';
      ctx.strokeText(cutText, cx, cy - cutS / 2 - font * 0.28);
      ctx.fillStyle = 'rgba(0,100,220,0.95)';
      ctx.fillText(cutText, cx, cy - cutS / 2 - font * 0.28);

      // 安全区标注（安全轮廓外侧底部）
      ctx.textBaseline = 'top';
      ctx.strokeText(L('安全区'), cx, cy + safeS / 2 + font * 0.28);
      ctx.fillStyle = 'rgba(45,150,95,0.95)';
      ctx.fillText(L('安全区'), cx, cy + safeS / 2 + font * 0.28);

      ctx.restore();
    }
  }

  /* =====================================================================
   * A4 拼版计算
   * ---------------------------------------------------------------------
   * 布局完全约束在 [margin, pageW-margin] × [margin, pageH-margin] 内，
   * 任意「规格 × 枚数 × 间距」组合都不会越出 A4 边界。
   * =================================================================== */

  function computeA4Layout(spec, count, gapMm) {
    var pageW = mmToPx(A4_MM.w);
    var pageH = mmToPx(A4_MM.h);
    // 安全边距向上取整 → 实际留白 ≥ 8mm（宁可多留）
    var margin = Math.ceil(mmToPx(A4_MARGIN_MM));
    // 单元格取整像素：300DPI 下 N px = N/300*25.4 mm，误差 ≤ 0.05mm，
    // 但可保证圆边落在整像素上，打印更锐利（避免半像素抗锯齿发虚）
    var cell = Math.round(mmToPx(spec.total));
    var gap = Math.max(0, Math.round(mmToPx(gapMm)) || 0);
    var availW = pageW - margin * 2;
    var availH = pageH - margin * 2;

    var maxCols = Math.max(1, Math.floor((availW + gap) / (cell + gap)));
    var maxRows = Math.max(1, Math.floor((availH + gap) / (cell + gap)));
    var maxCount = maxCols * maxRows;

    var n = Math.max(1, Math.min(Math.round(count), maxCount));

    // 选取最多空位最少、且整块比例接近 A4 的金字塔排布
    var best = null;
    for (var c = 1; c <= maxCols; c++) {
      var r = Math.ceil(n / c);
      if (r > maxRows) { continue; }
      var blockW = c * cell + (c - 1) * gap;
      var blockH = r * cell + (r - 1) * gap;
      var score = Math.abs((blockW / blockH) - (pageW / pageH)) + (c * r - n) * 0.02;
      if (!best || score < best.score) {
        best = { cols: c, rows: r, score: score, blockW: blockW, blockH: blockH };
      }
    }
    if (!best) {
      best = {
        cols: maxCols, rows: maxRows,
        blockW: maxCols * cell + (maxCols - 1) * gap,
        blockH: maxRows * cell + (maxRows - 1) * gap
      };
    }

    // 起点一律向下取整：保证 blockW/H ≤ availW/H 时整块必然落在安全边距内
    var startY = Math.floor((pageH - best.blockH) / 2);

    var cells = [];
    for (var i = 0; i < n; i++) {
      var col = i % best.cols;
      var row = Math.floor(i / best.cols);
      var itemsInRow = Math.min(best.cols, n - row * best.cols);
      var rowW = itemsInRow * cell + (itemsInRow - 1) * gap;
      var rowStartX = Math.floor((pageW - rowW) / 2);
      cells.push({
        x: rowStartX + col * (cell + gap),
        y: startY + row * (cell + gap),
        size: cell
      });
    }

    return {
      pageW: pageW,
      pageH: pageH,
      margin: margin,
      cell: cell,
      gap: gap,
      cols: best.cols,
      rows: best.rows,
      maxCols: maxCols,
      maxRows: maxRows,
      maxCount: maxCount,
      count: n,
      requested: Math.round(count),
      clamped: Math.round(count) > maxCount,
      cells: cells
    };
  }

  function currentLayout() {
    return computeA4Layout(getSpec(state.specId), opts.count, opts.gap);
  }

  /** 把整张 A4 拼版画到 ctx，pxPerMm 决定输出缩放 */
  function drawA4Sheet(ctx, layout, pxPerMm) {
    var k = pxPerMm / (DPI / MM_PER_INCH);
    var w = layout.pageW * k;
    var h = layout.pageH * k;

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.scale(k, k);

    for (var i = 0; i < layout.cells.length; i++) {
      var cellData = layout.cells[i];
      drawPrintBadge(ctx, cellData.x + cellData.size / 2, cellData.y + cellData.size / 2, cellData.size);
    }

    // 版面参考：可打印区域边框（极淡），随「显示辅助线」开关一起隐藏
    if (opts.showGuides) {
      ctx.save();
      ctx.setLineDash([layout.margin * 0.4, layout.margin * 0.4]);
      ctx.strokeStyle = 'rgba(140,150,165,0.30)';
      ctx.lineWidth = 1 / k;
      ctx.strokeRect(layout.margin, layout.margin, layout.pageW - layout.margin * 2, layout.pageH - layout.margin * 2);
      ctx.restore();
    }

    ctx.restore();
  }

  /* =====================================================================
   * 预览面板绘制
   * =================================================================== */

  function drawPreviewPanel() {
    if (opts.mode === 'preview') {
      $('previewCanvas').classList.remove('hidden');
      $('printDuo').classList.add('hidden');
      drawPreviewBadge();
    } else {
      $('previewCanvas').classList.add('hidden');
      $('printDuo').classList.remove('hidden');
      drawSinglePreview();
      drawA4Preview();
    }
  }

  function drawPreviewBadge() {
    var cv = $('previewCanvas');
    if (!cv.clientWidth) { return; }
    var p = prepCanvas(cv);
    var ctx = p.ctx;
    var S = Math.min(p.w, p.h);
    var cx = p.w / 2;
    var cy = p.h / 2;
    var faceD = S * PREVIEW_FACE_RATIO;

    if (!state.hasImage) { return; }

    // 与导出结果保持一致：关闭透明背景时预览也铺白底
    if (!opts.transparentBg) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.restore();
    }

    if (opts.realistic) {
      drawRealisticBadge(ctx, cx, cy, faceD);
    } else {
      drawPlainBadge(ctx, cx, cy, faceD);
    }
  }

  function drawSinglePreview() {
    var cv = $('singleCanvas');
    if (!cv.clientWidth) { return; }
    var p = prepCanvas(cv);
    var ctx = p.ctx;
    var S = Math.min(p.w, p.h);
    var spec = getSpec(state.specId);
    var faceD = S * 0.82;
    var cellPx = faceD * (spec.total / spec.diameter);
    drawPrintBadge(ctx, p.w / 2, p.h / 2, cellPx);
  }

  function drawA4Preview() {
    var cv = $('a4Canvas');
    if (!cv.clientWidth) { return; }
    var p = prepCanvas(cv);
    var layout = currentLayout();
    var pxPerMm = p.w / A4_MM.w;
    drawA4Sheet(p.ctx, layout, pxPerMm);
    // 纸张外描边，避免与深色背景糊在一起
    p.ctx.save();
    p.ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    p.ctx.lineWidth = 1;
    p.ctx.strokeRect(0.5, 0.5, p.w - 1, p.h - 1);
    p.ctx.restore();
  }

  /* =====================================================================
   * 文本提示同步
   * =================================================================== */

  var specTableCacheKey = '';

  function updateSpecTable(force) {
    var key = state.specId;
    if (!force && key === specTableCacheKey) { return; }
    specTableCacheKey = key;
    var html = '<div class="spec-tr spec-th"><span>' + L('规格') + '</span><span>' + L('成品') + '</span><span>' + L('出血') + '</span><span>' + L('含出血') + '</span></div>';
    for (var i = 0; i < SPECS.length; i++) {
      var s = SPECS[i];
      html += '<div class="spec-tr' + (s.id === state.specId ? ' active' : '') + '">' +
        '<span>' + s.id + 'mm</span>' +
        '<span>' + s.diameter + 'mm</span>' +
        '<span>' + s.bleed + 'mm</span>' +
        '<span>' + s.total + 'mm</span>' +
        '</div>';
    }
    $('specTable').innerHTML = html;
  }

  function updateHints() {
    var spec = getSpec(state.specId);

    $('specInfo').textContent =
      L('成品 ') + spec.diameter + L('mm · 出血 ') + spec.bleed + L('mm · 含出血 ') + spec.total + 'mm' +
      L(' · 裁切 ') + Math.round(mmToPx(spec.diameter)) + 'px';

    $('editorBadge').textContent = spec.label + L(' · 含出血 ') + spec.total + 'mm';

    // 编辑器提示
    if (state.hasImage) {
      $('editorHint').textContent =
        L('原图 ') + state.imgW + ' × ' + state.imgH + ' px' +
        (state.downsampled ? L('（已自动降采样）') : '') +
        L(' · 缩放 ') + state.zoom.toFixed(2) + '×' +
        L(' · 旋转 ') + Math.round(state.rot) + '°' +
        (state.flipH ? L(' · 水平翻转') : '') +
        (state.flipV ? L(' · 垂直翻转') : '');
    } else {
      $('editorHint').textContent = L('尚未载入图片。支持拖拽、点击选择或 Ctrl + V 粘贴。');
    }

    // 预览尺寸提示
    $('previewPixelHint').textContent =
      L('导出尺寸 ') + opts.previewSize + ' × ' + opts.previewSize + ' px（PNG' +
      (opts.transparentBg ? L('，透明背景') : L('，白色背景')) + '）';

    // 打印尺寸提示
    var singlePx = Math.round(mmToPx(spec.total));
    $('printPixelHint').textContent =
      L('单枚 ') + singlePx + ' × ' + singlePx + ' px（' + spec.total + 'mm @300DPI）' +
      ' · A4 ' + Math.round(mmToPx(A4_MM.w)) + ' × ' + Math.round(mmToPx(A4_MM.h)) + ' px';

    // A4 排布提示：高亮药丸 == lay.count，因此这里只陈述事实，不再出现「已夹取」矛盾文案
    var lay = currentLayout();
    $('countHint').textContent = L('A4 排布：') + lay.cols + L(' 列 × ') + lay.rows + L(' 行，共 ') + lay.count +
      L(' 枚 · 枚间距 ') + opts.gap + L('mm · 四周留白 ') + A4_MARGIN_MM + 'mm';

    // 上限说明：仅当存在被置灰的超限选项时提示
    var limitEl = $('countLimit');
    var maxOption = 0;
    var optsBtns = $('countGroup').querySelectorAll('.pill:not(.pill-dyn)');
    for (var bi = 0; bi < optsBtns.length; bi++) {
      var bv = parseInt(optsBtns[bi].getAttribute('data-count'), 10);
      if (bv > maxOption) { maxOption = bv; }
    }
    if (lay.maxCount < maxOption) {
      var overList = [];
      for (var oj = 0; oj < optsBtns.length; oj++) {
        var ov = parseInt(optsBtns[oj].getAttribute('data-count'), 10);
        if (ov > lay.maxCount) { overList.push(ov); }
      }
      limitEl.textContent = spec.label + L(' 在 A4 上最多可排 ') + lay.maxCount + L(' 枚（') +
        lay.maxCols + L(' 列 × ') + lay.maxRows + L(' 行），') + overList.join(' / ') +
        L(' 枚已置灰降权（仍可点击，点击后自动夹取为 ') + lay.maxCount + L(' 枚）。');
      limitEl.classList.remove('hidden');
    } else {
      limitEl.classList.add('hidden');
    }

    // 预览面板副标题
    if (opts.mode === 'preview') {
      $('previewTitle').textContent = L('效果预览');
      $('previewMeta').textContent =
        (opts.realistic ? L('拟真徽章 · ') + (opts.surface === 'glossy' ? L('亮面') : L('亚光')) : L('基础圆形裁剪')) +
        ' · ' + spec.label + ' · ' + opts.previewSize + 'px';
    } else {
      $('previewTitle').textContent = L('打印预览');
      $('previewMeta').textContent =
        spec.label + ' × ' + lay.count + L(' 枚 · 300 DPI · ') +
        Math.round(mmToPx(spec.total)) + L('px/枚');
    }
  }

  function updateUndoRedoUI() {
    $('btnUndo').disabled = histIndex <= 0;
    $('btnRedo').disabled = histIndex >= history.length - 1;
  }

  function renderAll() {
    drawEditor();
    drawPreviewPanel();
    updateHints();
  }

  /* =====================================================================
   * 状态快照 / 撤销重做
   * =================================================================== */

  function snapshotState() {
    return {
      tx: state.tx, ty: state.ty, zoom: state.zoom, rot: state.rot,
      flipH: state.flipH, flipV: state.flipV,
      brightness: state.brightness, contrast: state.contrast, saturation: state.saturation,
      specId: state.specId,
      shape: state.shape,
      bgColor: state.bgColor, rimColor: state.rimColor,
      textOn: state.textOn, textContent: state.textContent,
      textColor: state.textColor, textSize: state.textSize,
      textPos: state.textPos, textStroke: state.textStroke,
      textStrokeColor: state.textStrokeColor
    };
  }

  function pushHistory(reset) {
    var snap = snapshotState();
    if (reset) {
      history = [snap];
      histIndex = 0;
    } else {
      var cur = history[histIndex];
      if (cur && JSON.stringify(cur) === JSON.stringify(snap)) {
        updateUndoRedoUI();
        return;
      }
      history = history.slice(0, histIndex + 1);
      history.push(snap);
      if (history.length > HISTORY_LIMIT) { history.shift(); }
      histIndex = history.length - 1;
    }
    updateUndoRedoUI();
  }

  function applySnapshot(snap) {
    if (!snap) { return; }
    state.tx = snap.tx;
    state.ty = snap.ty;
    state.zoom = snap.zoom;
    state.rot = snap.rot;
    state.flipH = snap.flipH;
    state.flipV = snap.flipV;
    state.brightness = snap.brightness;
    state.contrast = snap.contrast;
    state.saturation = snap.saturation;
    state.specId = snap.specId;
    // 设计参数（旧快照缺省时回落当前值，保证向前兼容）
    if (snap.shape !== undefined) { state.shape = snap.shape; }
    if (snap.bgColor !== undefined) { state.bgColor = snap.bgColor; }
    if (snap.rimColor !== undefined) { state.rimColor = snap.rimColor; }
    if (snap.textOn !== undefined) { state.textOn = snap.textOn; }
    if (snap.textContent !== undefined) { state.textContent = snap.textContent; }
    if (snap.textColor !== undefined) { state.textColor = snap.textColor; }
    if (snap.textSize !== undefined) { state.textSize = snap.textSize; }
    if (snap.textPos !== undefined) { state.textPos = snap.textPos; }
    if (snap.textStroke !== undefined) { state.textStroke = snap.textStroke; }
    if (snap.textStrokeColor !== undefined) { state.textStrokeColor = snap.textStrokeColor; }
    syncUIFromState();
    syncCountPills();                 // 撤销回更小规格时同样需要重新夹取枚数
    renderAll();
  }

  function undo() {
    if (histIndex <= 0) { return; }
    histIndex--;
    applySnapshot(history[histIndex]);
    updateUndoRedoUI();
  }

  function redo() {
    if (histIndex >= history.length - 1) { return; }
    histIndex++;
    applySnapshot(history[histIndex]);
    updateUndoRedoUI();
  }

  /** 把 state 同步到所有 UI 控件 */
  function syncUIFromState() {
    var spec = getSpec(state.specId);

    $('zoomSlider').value = String(state.zoom);
    $('zoomVal').textContent = state.zoom.toFixed(2) + '×';
    paintRange($('zoomSlider'));

    $('rotSlider').value = String(Math.round(state.rot));
    $('rotVal').textContent = Math.round(state.rot) + '°';
    paintRange($('rotSlider'));

    $('briSlider').value = String(state.brightness);
    $('briVal').textContent = String(state.brightness);
    paintRange($('briSlider'));

    $('conSlider').value = String(state.contrast);
    $('conVal').textContent = String(state.contrast);
    paintRange($('conSlider'));

    $('satSlider').value = String(state.saturation);
    $('satVal').textContent = String(state.saturation);
    paintRange($('satSlider'));

    var specBtns = $('specGroup').querySelectorAll('.pill');
    for (var i = 0; i < specBtns.length; i++) {
      specBtns[i].classList.toggle('active', specBtns[i].getAttribute('data-spec') === state.specId);
    }

    updateSpecTable();
    $('editorEmpty').style.display = state.hasImage ? 'none' : 'flex';
    syncDesignUI();
  }

  /** 把设计参数（形状 / 颜色 / 文字）同步到控件；正在输入的控件不回写 */
  function syncDesignUI() {
    var shapeBtns = $('shapeGroup').querySelectorAll('.pill');
    for (var i = 0; i < shapeBtns.length; i++) {
      shapeBtns[i].classList.toggle('active', shapeBtns[i].getAttribute('data-shape') === state.shape);
    }

    $('bgColor').value = state.bgColor;
    $('rimColor').value = state.rimColor;

    $('swText').checked = state.textOn;
    $('textBody').classList.toggle('hidden', !state.textOn);
    var ti = $('textInput');
    if (document.activeElement !== ti) { ti.value = state.textContent; }
    $('textColor').value = state.textColor;

    var ts = $('textSize');
    ts.value = String(state.textSize);
    $('textSizeVal').textContent = state.textSize + '%';
    paintRange(ts);

    var posBtns = $('textPosGroup').querySelectorAll('button');
    for (var j = 0; j < posBtns.length; j++) {
      posBtns[j].classList.toggle('active', posBtns[j].getAttribute('data-pos') === state.textPos);
    }

    $('swTextStroke').checked = state.textStroke;
    $('textStrokeColor').value = state.textStrokeColor;
  }

  /** 设计参数默认值（重置 / 清除图片时调用） */
  function resetDesignState() {
    state.shape = 'circle';
    state.bgColor = '#FFFFFF';
    state.rimColor = '#C8D0DA';
    state.textOn = false;
    state.textContent = '';
    state.textColor = '#111111';
    state.textSize = 12;
    state.textPos = 'bottom';
    state.textStroke = false;
    state.textStrokeColor = '#FFFFFF';
  }

  /* =====================================================================
   * 图片载入
   * =================================================================== */

  function loadImageElement(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        resolve({ source: img, url: url });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('image decode failed'));
      };
      img.src = url;
    });
  }

  /** 载入文件 → 必要时降采样 → 重置变换 → 入栈历史 */
  function loadFile(file) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) {
      toast(L('请选择图片文件（JPG / PNG / WebP / GIF）'));
      return;
    }

    var useBitmap = (typeof createImageBitmap === 'function');

    function fallback() {
      return loadImageElement(file).then(function (res) {
        return { source: res.source, url: res.url, close: null };
      });
    }

    var chain;
    if (useBitmap) {
      chain = createImageBitmap(file).then(function (bmp) {
        return { source: bmp, url: null, close: function () { if (bmp.close) { bmp.close(); } } };
      })['catch'](function () { return fallback(); });
    } else {
      chain = fallback();
    }

    chain.then(function (res) {
      var src = res.source;
      var w = src.width || src.naturalWidth || 0;
      var h = src.height || src.naturalHeight || 0;
      if (!w || !h) { throw new Error('invalid image size'); }

      var scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(w, h));
      var drawable = src;
      var finalW = w;
      var finalH = h;
      var downsampled = false;

      if (scale < 1) {
        finalW = Math.max(1, Math.round(w * scale));
        finalH = Math.max(1, Math.round(h * scale));
        var tmp = document.createElement('canvas');
        tmp.width = finalW;
        tmp.height = finalH;
        var tctx = tmp.getContext('2d');
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = 'high';
        tctx.drawImage(src, 0, 0, finalW, finalH);
        drawable = tmp;
        downsampled = true;
        if (res.close) { res.close(); }
      }

      state.image = drawable;
      state.imgW = finalW;
      state.imgH = finalH;
      state.downsampled = downsampled;
      state.hasImage = true;

      // 初始：最短边填充圆形（cover）居中
      state.tx = 0;
      state.ty = 0;
      state.zoom = 1;
      state.rot = 0;
      state.flipH = false;
      state.flipV = false;
      state.brightness = 0;
      state.contrast = 0;
      state.saturation = 0;

      if (res.url) { URL.revokeObjectURL(res.url); }

      syncUIFromState();
      pushHistory(true);
      renderAll();
      toast(L('已载入 ') + finalW + ' × ' + finalH + 'px' + (downsampled ? L('（已降采样）') : ''));
    })['catch'](function (err) {
      if (window.console && console.error) { console.error(err); }
      toast(L('图片加载失败，请换一张试试'));
    });
  }

  function clearImage() {
    state.image = null;
    state.imgW = 0;
    state.imgH = 0;
    state.hasImage = false;
    state.downsampled = false;
    state.tx = 0; state.ty = 0; state.zoom = 1; state.rot = 0;
    state.flipH = false; state.flipV = false;
    state.brightness = 0; state.contrast = 0; state.saturation = 0;
    resetDesignState();
    history = [];
    histIndex = -1;
    syncUIFromState();
    updateUndoRedoUI();
    renderAll();
    toast(L('已清除图片'));
  }

  /* =====================================================================
   * 画布交互：拖拽 / 缩放 / 旋转 / 双指手势
   * =================================================================== */

  var pointers = new Map();
  var gesture = null;

  function localPoint(clientX, clientY, rect) {
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function pointerList() {
    var arr = [];
    pointers.forEach(function (v) { arr.push(v); });
    return arr;
  }

  function startGesture(rect, clientMid, kind) {
    var Cx = rect.left + rect.width / 2;
    var Cy = rect.top + rect.height / 2;
    var snap = snapshotState();
    // 与 drawEditor 保持完全一致：成品圆直径按画布较短边换算
    var faceD = Math.min(rect.width, rect.height) * EDITOR_FACE_RATIO;
    gesture = {
      kind: kind,                       // 'drag' | 'pinch'
      startState: snap,
      startZoom: snap.zoom,
      startRot: snap.rot,
      Cx: Cx,
      Cy: Cy,
      faceD: faceD,
      startMid: { x: clientMid.x, y: clientMid.y },
      startDist: 0,
      startAngle: 0,
      base: baseFitFor(faceD, snap.specId),
      moved: false
    };
  }

  /**
   * 统一求解：让 startMid 处的图像点在当前 mid 处保持不动（平移 + 缩放 + 旋转）。
   *
   * 渲染模型：P(u) = C + t·faceD + R(rot)·S·(fit·u)
   * 令 q(rot) = R(rot)·S·u  （图片点的「单位向量」，与 fit 无关）
   *   起手：d0 = t0·faceD + q(rot0)·fit0   ⇒  q(rot0) = (d0 - t0·faceD) / fit0
   *   当前：d1 = t1·faceD + q(rot1)·fit1 ，且 q(rot1) = R(Δ)·q(rot0)，Δ = rot1 - rot0
   *   ⇒     t1 = (d1 - R(Δ)·q(rot0)·fit1) / faceD
   *
   * 关键：Δt 必须把「手势过程中的旋转增量 Δ」也一起转过去，否则 rot≠0 时
   * 双指旋转 / Shift+拖拽旋转会产生锚点漂移（旧版即缺此项）。当 Δ=0 时
   * R(Δ)=I，公式退化为纯平移/缩放，与旧实现完全等价。
   */
  function solveGesture(mid, zoomTarget, rotTarget) {
    var g = gesture;
    var faceD = g.faceD;
    var d0x = g.startMid.x - g.Cx;
    var d0y = g.startMid.y - g.Cy;
    var d1x = mid.x - g.Cx;
    var d1y = mid.y - g.Cy;

    var fit0 = g.base * g.startState.zoom;
    var q0x = (d0x - g.startState.tx * faceD) / fit0;
    var q0y = (d0y - g.startState.ty * faceD) / fit0;

    var z1 = clamp(zoomTarget, ZOOM_MIN, ZOOM_MAX);
    var fit1 = g.base * z1;

    // 手势内旋转增量（用未归一化的差值，保证跨 0/360 时仍取最短等效角）
    var dRad = (rotTarget - g.startState.rot) * Math.PI / 180;
    var cosD = Math.cos(dRad);
    var sinD = Math.sin(dRad);
    var q1x = q0x * cosD - q0y * sinD;
    var q1y = q0x * sinD + q0y * cosD;

    state.zoom = z1;
    state.tx = (d1x - q1x * fit1) / faceD;
    state.ty = (d1y - q1y * fit1) / faceD;
    state.rot = norm360(rotTarget);
  }

  function onPointerDown(e) {
    if (!state.hasImage) { return; }
    var cv = $('editorCanvas');
    var rect = cv.getBoundingClientRect();
    if (!rect.width) { return; }

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 忽略捕获失败 */ }
    cv.classList.add('dragging');

    var list = pointerList();
    if (list.length === 1) {
      var p = localPoint(e.clientX, e.clientY, rect);
      if (e.shiftKey) {
        // Shift + 拖拽 = 旋转
        startGesture(rect, { x: e.clientX, y: e.clientY }, 'drag');
        gesture.rotateMode = true;
        gesture.startAngle = Math.atan2(p.y - rect.height / 2, p.x - rect.width / 2);
      } else {
        startGesture(rect, { x: e.clientX, y: e.clientY }, 'drag');
        gesture.rotateMode = false;
      }
    } else if (list.length === 2) {
      // 单指 → 双指：先提交上一段手势，避免历史丢失
      if (gesture && gesture.moved) { pushHistory(false); }
      var a = list[0];
      var b = list[1];
      var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      startGesture(rect, mid, 'pinch');
      gesture.startDist = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      gesture.startAngle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    }
  }

  function onPointerMove(e) {
    if (!gesture || !pointers.has(e.pointerId)) { return; }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    var cv = $('editorCanvas');
    var rect = cv.getBoundingClientRect();
    var list = pointerList();

    gesture.moved = true;

    if (gesture.kind === 'drag' && list.length >= 1) {
      if (gesture.rotateMode) {
        var p = localPoint(e.clientX, e.clientY, rect);
        var ang = Math.atan2(p.y - rect.height / 2, p.x - rect.width / 2);
        var delta = (ang - gesture.startAngle) * 180 / Math.PI;
        solveGesture({ x: e.clientX, y: e.clientY }, gesture.startZoom, gesture.startRot + delta);
      } else {
        solveGesture({ x: e.clientX, y: e.clientY }, gesture.startZoom, gesture.startRot);
      }
    } else if (gesture.kind === 'pinch' && list.length >= 2) {
      var a = list[0];
      var b = list[1];
      var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      var dist = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      var angNow = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      var ratio = dist / gesture.startDist;
      solveGesture(mid, gesture.startZoom * ratio, gesture.startRot + (angNow - gesture.startAngle));
    }

    syncUIFromState();
    drawEditor();
    drawPreviewPanel();
    updateHints();
  }

  function onPointerUp(e) {
    if (!pointers.has(e.pointerId)) { return; }
    var cv = $('editorCanvas');
    pointers.delete(e.pointerId);
    try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }

    var list = pointerList();
    if (list.length === 0) {
      var wasMoved = gesture && gesture.moved;
      gesture = null;
      cv.classList.remove('dragging');
      if (wasMoved) { pushHistory(false); }
    } else if (list.length === 1) {
      // 双指 → 单指：提交双指手势，再以剩余手指为基准重新起手
      var hadMoved = gesture && gesture.moved;
      var rect = cv.getBoundingClientRect();
      startGesture(rect, { x: list[0].x, y: list[0].y }, 'drag');
      gesture.rotateMode = false;
      if (hadMoved) { pushHistory(false); }
    }
  }

  function onWheel(e) {
    if (!state.hasImage) { return; }
    e.preventDefault();
    var cv = $('editorCanvas');
    var rect = cv.getBoundingClientRect();
    var p = localPoint(e.clientX, e.clientY, rect);
    var faceD = Math.min(rect.width, rect.height) * EDITOR_FACE_RATIO;
    var base = baseFitFor(faceD, state.specId);

    var factor = Math.exp(-e.deltaY * 0.0015);
    var z1 = clamp(state.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    if (Math.abs(z1 - state.zoom) < 1e-6) { return; }

    // 以光标为锚点：光标下的图像点保持不动。
    // 与 solveGesture 同一模型；滚轮不改变 rot，故 Δ=0（R(Δ)=I）。
    // 画布中心与 drawEditor 完全一致（cx=p.w/2, cy=p.h/2）
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    var fit0 = base * state.zoom;
    var q0x = ((p.x - cx) - state.tx * faceD) / fit0;
    var q0y = ((p.y - cy) - state.ty * faceD) / fit0;
    var fit1 = base * z1;

    state.tx = ((p.x - cx) - q0x * fit1) / faceD;
    state.ty = ((p.y - cy) - q0y * fit1) / faceD;
    state.zoom = z1;

    syncUIFromState();
    drawEditor();
    drawPreviewPanel();
    updateHints();
  }

  /* =====================================================================
   * 工具按钮行为
   * =================================================================== */

  function resetTransformFull() {
    state.tx = 0; state.ty = 0; state.zoom = 1; state.rot = 0;
    state.flipH = false; state.flipV = false;
    state.brightness = 0; state.contrast = 0; state.saturation = 0;
    resetDesignState();
  }

  function doReset() {
    resetTransformFull();
    state.specId = DEFAULT_SPEC_ID;
    opts.count = 20;
    syncUIFromState();
    syncCountPills();
    pushHistory(false);
    renderAll();
    toast(L('已重置（含规格与调整）'));
  }

  /** 工具栏前置校验：无图片时给出提示并中断 */
  function requireImage() {
    if (!state.hasImage) {
      toast(L('请先导入图片'));
      return false;
    }
    return true;
  }

  function doCenter() {
    if (!requireImage()) { return; }
    state.tx = 0;
    state.ty = 0;
    syncUIFromState();
    pushHistory(false);
    renderAll();
  }

  function doCover() {
    if (!requireImage()) { return; }
    state.zoom = 1;
    state.tx = 0;
    state.ty = 0;
    syncUIFromState();
    pushHistory(false);
    renderAll();
  }

  function doContain() {
    if (!requireImage()) { return; }
    var faceD = faceDcss();
    var spec = getSpec(state.specId);
    var bleedD = faceD * (spec.total / spec.diameter);
    var cover = Math.max(bleedD / state.imgW, bleedD / state.imgH);
    var contain = Math.min(bleedD / state.imgW, bleedD / state.imgH);
    var z = contain / cover;                       // 相对 cover 的倍率
    if (z < ZOOM_MIN) {
      toast(L('图片宽高比过大，已应用最小缩放 ') + ZOOM_MIN + '×');
    }
    state.zoom = clamp(z, ZOOM_MIN, ZOOM_MAX);
    state.tx = 0;
    state.ty = 0;
    syncUIFromState();
    pushHistory(false);
    renderAll();
  }

  function doFlipH() {
    if (!requireImage()) { return; }
    state.flipH = !state.flipH;
    syncUIFromState();
    pushHistory(false);
    renderAll();
  }

  function doFlipV() {
    if (!requireImage()) { return; }
    state.flipV = !state.flipV;
    syncUIFromState();
    pushHistory(false);
    renderAll();
  }

  function doRot90() {
    if (!requireImage()) { return; }
    state.rot = norm360(state.rot + 90);
    syncUIFromState();
    pushHistory(false);
    renderAll();
  }

  /* =====================================================================
   * 导出
   * =================================================================== */

  function downloadBlob(blob, filename) {
    if (!blob) { toast(L('导出失败，请重试')); return; }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  function exportPreview() {
    if (!state.hasImage) { toast(L('请先导入图片')); return; }
    var size = opts.previewSize;
    var cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    if (!opts.transparentBg) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
    }

    var cx = size / 2;
    var cy = size / 2;
    var faceD = size * PREVIEW_FACE_RATIO;

    if (opts.realistic) {
      drawRealisticBadge(ctx, cx, cy, faceD);
    } else {
      drawPlainBadge(ctx, cx, cy, faceD);
    }

    var name = 'badge-' + getSpec(state.specId).id + 'mm-preview.png';
    cv.toBlob(function (blob) {
      downloadBlob(blob, name);
      toast(L('已导出 ') + name);
    }, 'image/png');
  }

  function exportSinglePrint() {
    if (!state.hasImage) { toast(L('请先导入图片')); return; }
    var spec = getSpec(state.specId);
    var side = Math.round(mmToPx(spec.total));
    var cv = document.createElement('canvas');
    cv.width = side;
    cv.height = side;
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, side, side);
    drawPrintBadge(ctx, side / 2, side / 2, side);

    var name = 'badge-' + spec.id + 'mm-print-300dpi.png';
    cv.toBlob(function (blob) {
      downloadBlob(blob, name);
      toast(L('已导出 ') + name + '（' + side + '×' + side + 'px）');
    }, 'image/png');
  }

  function renderA4ToCanvas() {
    var cv = $('printCanvas');
    var w = Math.round(mmToPx(A4_MM.w));
    var h = Math.round(mmToPx(A4_MM.h));
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    var ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var layout = currentLayout();
    drawA4Sheet(ctx, layout, DPI / MM_PER_INCH);
    return layout;
  }

  function exportA4() {
    if (!state.hasImage) { toast(L('请先导入图片')); return; }
    var layout = renderA4ToCanvas();
    var spec = getSpec(state.specId);
    var w = Math.round(mmToPx(A4_MM.w));
    var h = Math.round(mmToPx(A4_MM.h));

    $('printCanvas').toBlob(function (blob) {
      var name = 'badge-a4-' + spec.id + 'mm-x' + layout.count + '-300dpi.png';
      downloadBlob(blob, name);
      toast(L('已导出 ') + name + '（' + w + '×' + h + 'px）');
    }, 'image/png');
  }

  function doPrint() {
    if (!state.hasImage) { toast(L('请先导入图片')); return; }
    renderA4ToCanvas();
    // 等待一帧确保画布内容已提交，再唤起打印
    setTimeout(function () { window.print(); }, 80);
  }

  /* =====================================================================
   * UI 绑定
   * =================================================================== */

  /**
   * 枚数归一化：把 opts.count 夹取到当前「规格 × 间距」下的 A4 上限。
   * 保证「药丸高亮」始终等于「实际排布枚数」，避免出现
   * 「高亮 20 枚 / 提示已夹取为 8 枚」这种自相矛盾的面板。
   * 返回被夹取到的上限值。
   */
  function normalizeCount() {
    var lay = computeA4Layout(getSpec(state.specId), opts.count, opts.gap);
    if (opts.count > lay.maxCount) { opts.count = lay.maxCount; }
    return lay.maxCount;
  }

  /**
   * 把动态药丸按数值升序插到正确位置，保持药丸网格始终「从小到大」排列。
   * @param {HTMLElement} group 药丸容器
   * @param {HTMLElement} dyn   动态药丸（已在 DOM 中）
   */
  function insertPillSorted(group, dyn) {
    var target = parseInt(dyn.getAttribute('data-count'), 10);
    var kids = group.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el === dyn) { continue; }
      var v = parseInt(el.getAttribute('data-count'), 10);
      if (!isNaN(v) && v > target) { group.insertBefore(dyn, el); return; }
    }
    group.appendChild(dyn);
  }

  /**
   * 同步「实际生效枚数」药丸。
   *
   * 背景：预设药丸集合是**静态**的（{1,2,4,6,8,9,12,16,20}），但 A4 容量随
   * 「规格 × 枚间距」**动态**变化，容量可能落在集合之外（如 44mm@3mm → 15）。
   * 只做静态枚举永远追不上（间距 0–30mm 可调，容量取值远超集合），
   * 因此这里在「生效枚数不落在预设集合内」时**动态生成**一个承载该值的药丸，
   * 保证任意规格 × 任意间距下，高亮药丸唯一且等于实际排布枚数。
   *
   * @param {HTMLElement} group   药丸容器
   * @param {object}      spec    当前规格
   * @param {boolean}     matched 生效枚数是否命中某个预设药丸
   */
  function syncDynCountPill(group, spec, matched) {
    var dyn = group.querySelector('.pill.pill-dyn');
    if (matched) {                       // 生效枚数落在预设集合内 → 不需要动态药丸
      if (dyn) { dyn.parentNode.removeChild(dyn); }
      return;
    }
    if (!dyn) {                          // 首次出现：创建后先挂到末尾，再挪到有序位置
      dyn = document.createElement('button');
      dyn.type = 'button';
      dyn.className = 'pill pill-dyn';
      group.appendChild(dyn);
    }
    dyn.setAttribute('data-count', String(opts.count));
    dyn.textContent = String(opts.count);
    dyn.classList.add('active');         // 它就是当前唯一生效项
    dyn.classList.remove('pill-over');
    // 动态药丸代表「当前实际生效枚数」，永远不是超限项，故同样不使用 aria-disabled
    dyn.setAttribute('aria-label', spec.label + L('，当前生效 ') + opts.count + L(' 枚（由规格与枚间距推导）'));
    dyn.title = spec.label + ' × ' + opts.count + L(' 枚（当前实际生效枚数，由规格与枚间距推导）');
    insertPillSorted(group, dyn);
  }

  /** 同步枚数药丸：高亮 = 实际生效枚数；超上限选项降权置灰 */
  function syncCountPills() {
    var maxCount = normalizeCount();     // 先夹取，此刻 opts.count 已是实际生效值
    var spec = getSpec(state.specId);
    var group = $('countGroup');
    // 只遍历预设药丸；动态药丸由 syncDynCountPill 单独处理
    var btns = group.querySelectorAll('.pill:not(.pill-dyn)');
    var matched = false;
    for (var i = 0; i < btns.length; i++) {
      var v = parseInt(btns[i].getAttribute('data-count'), 10);
      var over = v > maxCount;
      var on = (v === opts.count);
      if (on) { matched = true; }
      btns[i].classList.toggle('active', on);
      btns[i].classList.toggle('pill-over', over);
      // 超上限药丸只是**视觉降权**：#countGroup 的委托处理器仍会把它夹取到上限
      // （有意的快捷行为——用户表达的是「我要尽可能多」，并已用 toast 明确告知）。
      // 因此这里**不能**设 aria-disabled="true"：那会让屏幕阅读器宣告「已禁用」，
      // 而控件实际可用，属 ARIA 语义与行为不一致。改为用 aria-label 如实说明后果。
      btns[i].setAttribute('aria-label', over
        ? (spec.label + L('，超出上限：A4 上最多可排 ') + maxCount + L(' 枚，点击将自动夹取为 ') + maxCount + L(' 枚'))
        : (spec.label + '，' + v + L(' 枚')));
      btns[i].title = over
        ? (spec.label + L(' 在 A4 上最多可排 ') + maxCount + L(' 枚，点击将自动夹取为 ') + maxCount + L(' 枚'))
        : (spec.label + ' × ' + v + L(' 枚'));
    }
    syncDynCountPill(group, spec, matched);
    return maxCount;
  }

  function switchMode(mode) {
    opts.mode = mode;
    var btns = $('modeSwitch').querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-mode') === mode);
    }
    $('exportPreview').classList.toggle('hidden', mode !== 'preview');
    $('exportPrint').classList.toggle('hidden', mode !== 'print');
    renderAll();
  }

  function bindUI() {
    /* ---------- 文件导入 ---------- */
    $('btnPick').addEventListener('click', function () { $('fileInput').click(); });
    $('fileInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) { loadFile(f); }
      e.target.value = '';
    });
    $('btnClear').addEventListener('click', clearImage);

    /* ---------- 拖拽导入 ---------- */
    var dragDepth = 0;
    var overlay = $('dropOverlay');

    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) { e.preventDefault(); });

    $('editorStage').addEventListener('dragenter', function (e) {
      e.preventDefault();
      dragDepth++;
      overlay.classList.add('show');
    });
    $('editorStage').addEventListener('dragover', function (e) {
      e.preventDefault();
      if (e.dataTransfer) { e.dataTransfer.dropEffect = 'copy'; }
    });
    $('editorStage').addEventListener('dragleave', function (e) {
      e.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) { overlay.classList.remove('show'); }
    });
    $('editorStage').addEventListener('drop', function (e) {
      e.preventDefault();
      dragDepth = 0;
      overlay.classList.remove('show');
      var dt = e.dataTransfer;
      if (!dt) { return; }
      if (dt.files && dt.files.length) {
        loadFile(dt.files[0]);
      } else if (dt.items && dt.items.length) {
        for (var i = 0; i < dt.items.length; i++) {
          if (dt.items[i].kind === 'file') {
            var f = dt.items[i].getAsFile();
            if (f) { loadFile(f); return; }
          }
        }
      }
    });

    /* ---------- 剪贴板粘贴 ---------- */
    document.addEventListener('paste', function (e) {
      var cd = e.clipboardData;
      if (!cd) { return; }
      if (cd.items && cd.items.length) {
        for (var i = 0; i < cd.items.length; i++) {
          var it = cd.items[i];
          if (it.kind === 'file' && it.type && it.type.indexOf('image') === 0) {
            var f = it.getAsFile();
            if (f) { e.preventDefault(); loadFile(f); return; }
          }
        }
      }
      if (cd.files && cd.files.length) {
        e.preventDefault();
        loadFile(cd.files[0]);
      }
    });

    /* ---------- 模式切换 ---------- */
    $('modeSwitch').addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.getAttribute('data-mode')) {
        switchMode(t.getAttribute('data-mode'));
      }
    });

    /* ---------- 裁剪滑杆 ---------- */
    var zoomEl = $('zoomSlider');
    zoomEl.addEventListener('input', function () {
      state.zoom = clamp(parseFloat(zoomEl.value), ZOOM_MIN, ZOOM_MAX);
      $('zoomVal').textContent = state.zoom.toFixed(2) + '×';
      paintRange(zoomEl);
      renderAll();
    });
    zoomEl.addEventListener('change', function () { pushHistory(false); });

    var rotEl = $('rotSlider');
    rotEl.addEventListener('input', function () {
      // 滑杆量程 0–360 视为绝对角度：360° ≡ 0°，两者渲染完全等价。
      // 这里只 clamp 不做 norm360 —— 否则拖到最右会立刻被折回 0，
      // 手柄在拖拽过程中突然跳到最左（D2 缺陷）。
      state.rot = clamp(parseFloat(rotEl.value) || 0, 0, 360);
      $('rotVal').textContent = Math.round(state.rot) + '°';
      paintRange(rotEl);
      renderAll();
    });
    rotEl.addEventListener('change', function () { pushHistory(false); });

    /* ---------- 图像调整滑杆 ---------- */
    function bindAdjust(sliderId, valId, key) {
      var el = $(sliderId);
      el.addEventListener('input', function () {
        state[key] = clamp(parseInt(el.value, 10) || 0, -100, 100);
        $(valId).textContent = String(state[key]);
        paintRange(el);
        renderAll();
      });
      el.addEventListener('change', function () { pushHistory(false); });
    }
    bindAdjust('briSlider', 'briVal', 'brightness');
    bindAdjust('conSlider', 'conVal', 'contrast');
    bindAdjust('satSlider', 'satVal', 'saturation');

    /* ---------- 工具按钮 ---------- */
    $('btnReset').addEventListener('click', doReset);
    $('btnCenter').addEventListener('click', doCenter);
    $('btnCover').addEventListener('click', doCover);
    $('btnContain').addEventListener('click', doContain);
    $('btnFlipH').addEventListener('click', doFlipH);
    $('btnFlipV').addEventListener('click', doFlipV);
    $('btnRot90').addEventListener('click', doRot90);

    /* ---------- 规格选择 ---------- */
    $('specGroup').addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.getAttribute('data-spec')) {
        var id = t.getAttribute('data-spec');
        if (id === state.specId) { return; }
        state.specId = id;                       // 裁剪状态完整保留
        syncUIFromState();
        syncCountPills();                        // 换规格后 A4 上限变化，重新夹取枚数
        pushHistory(false);
        renderAll();
      }
    });

    /* ---------- 撤销 / 重做 ---------- */
    $('btnUndo').addEventListener('click', undo);
    $('btnRedo').addEventListener('click', redo);

    /* ---------- 折叠面板 ---------- */
    $('btnShortcutToggle').addEventListener('click', function () {
      var body = $('shortcutBody');
      var open = body.classList.toggle('open');
      $('btnShortcutToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $('btnShortcutOpen').addEventListener('click', function () {
      var body = $('shortcutBody');
      if (!body.classList.contains('open')) {
        body.classList.add('open');
        $('btnShortcutToggle').setAttribute('aria-expanded', 'true');
      }
      $('shortcutCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    /* ---------- 形状选择 ---------- */
    $('shapeGroup').addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.getAttribute('data-shape')) {
        var s = t.getAttribute('data-shape');
        if (s === state.shape) { return; }
        state.shape = s;
        syncDesignUI();
        pushHistory(false);
        renderAll();
      }
    });

    /* ---------- 文字层 ---------- */
    $('swText').addEventListener('change', function (e) {
      state.textOn = e.target.checked;
      $('textBody').classList.toggle('hidden', !state.textOn);
      pushHistory(false);
      renderAll();
    });
    $('textInput').addEventListener('input', function (e) {
      state.textContent = e.target.value;
      renderAll();                       // 输入过程实时预览，不推历史
    });
    $('textInput').addEventListener('change', function () { pushHistory(false); });
    $('textColor').addEventListener('input', function (e) {
      state.textColor = e.target.value;
      renderAll();
    });
    var textSizeEl = $('textSize');
    textSizeEl.addEventListener('input', function () {
      state.textSize = clamp(parseFloat(textSizeEl.value) || 12, 4, 20);
      $('textSizeVal').textContent = state.textSize + '%';
      paintRange(textSizeEl);
      renderAll();
    });
    textSizeEl.addEventListener('change', function () { pushHistory(false); });
    $('textPosGroup').addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.getAttribute('data-pos')) {
        state.textPos = t.getAttribute('data-pos');
        var btns = $('textPosGroup').querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          btns[i].classList.toggle('active', btns[i] === t);
        }
        pushHistory(false);
        renderAll();
      }
    });
    $('swTextStroke').addEventListener('change', function (e) {
      state.textStroke = e.target.checked;
      pushHistory(false);
      renderAll();
    });
    $('textStrokeColor').addEventListener('input', function (e) {
      state.textStrokeColor = e.target.value;
      renderAll();
    });

    /* ---------- 颜色 ---------- */
    $('bgColor').addEventListener('input', function (e) {
      state.bgColor = e.target.value;
      renderAll();
    });
    $('rimColor').addEventListener('input', function (e) {
      state.rimColor = e.target.value;
      renderAll();
    });

    /* ---------- 导出（模式 A） ---------- */
    $('swRealistic').addEventListener('change', function (e) {
      opts.realistic = e.target.checked;
      renderAll();
    });
    $('swTransparent').addEventListener('change', function (e) {
      opts.transparentBg = e.target.checked;
      renderAll();
    });
    $('surfaceSwitch').addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.getAttribute('data-surface')) {
        opts.surface = t.getAttribute('data-surface');
        var btns = $('surfaceSwitch').querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          btns[i].classList.toggle('active', btns[i] === t);
        }
        renderAll();
      }
    });
    $('sizeSwitch').addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.getAttribute('data-size')) {
        var s = parseInt(t.getAttribute('data-size'), 10);
        if (PREVIEW_SIZES.indexOf(s) === -1) { return; }
        opts.previewSize = s;
        var btns = $('sizeSwitch').querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
          btns[i].classList.toggle('active', btns[i] === t);
        }
        updateHints();
      }
    });
    $('btnExportPreview').addEventListener('click', exportPreview);

    /* ---------- 导出（模式 B） ---------- */
    $('swGuides').addEventListener('change', function (e) {
      opts.showGuides = e.target.checked;
      renderAll();
    });
    $('swLabels').addEventListener('change', function (e) {
      opts.showLabels = e.target.checked;
      renderAll();
    });
    $('countGroup').addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.getAttribute('data-count')) {
        var requested = parseInt(t.getAttribute('data-count'), 10);
        var spec = getSpec(state.specId);
        var lay = computeA4Layout(spec, requested, opts.gap);
        if (requested > lay.maxCount) {
          // 超上限：夹取到上限，高亮随即落到实际生效枚数上（命中预设→该预设药丸；
          // 未命中→动态药丸），并明确告知
          opts.count = lay.maxCount;
          toast(spec.label + L(' 在 A4 上最多可排 ') + lay.maxCount + L(' 枚，已自动夹取为 ') + lay.maxCount + L(' 枚'));
        } else {
          opts.count = requested;
        }
        syncCountPills();
        renderAll();
      }
    });
    $('gapInput').addEventListener('input', function (e) {
      var v = parseFloat(e.target.value);
      if (isNaN(v)) { return; }
      opts.gap = clamp(v, 0, 30);
      syncCountPills();          // 间距变大→上限变小，需要重新夹取并刷新药丸
      renderAll();
    });
    $('gapInput').addEventListener('blur', function (e) {
      e.target.value = String(opts.gap);
    });
    $('btnExportA4').addEventListener('click', exportA4);
    $('btnExportSingle').addEventListener('click', exportSinglePrint);
    $('btnPrint').addEventListener('click', doPrint);

    /* ---------- 画布交互 ---------- */
    var cv = $('editorCanvas');
    cv.addEventListener('pointerdown', onPointerDown);
    cv.addEventListener('pointermove', onPointerMove);
    cv.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('pointercancel', onPointerUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* ---------- 键盘 ---------- */
    window.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
        return;
      }

      var key = e.key;
      var lower = (key && key.length === 1) ? key.toLowerCase() : key;

      // 撤销 / 重做
      if ((e.ctrlKey || e.metaKey) && lower === 'z') {
        e.preventDefault();
        if (e.shiftKey) { redo(); } else { undo(); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && lower === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if (!state.hasImage) { return; }

      // 方向键微调平移
      var step = (e.shiftKey ? 10 : 1) * 0.006;
      var handled = true;
      if (key === 'ArrowLeft') { state.tx -= step; }
      else if (key === 'ArrowRight') { state.tx += step; }
      else if (key === 'ArrowUp') { state.ty -= step; }
      else if (key === 'ArrowDown') { state.ty += step; }
      else { handled = false; }

      if (handled) {
        e.preventDefault();
        syncUIFromState();
        renderAll();
        pushHistory(false);
      }
    });

    /* ---------- 窗口尺寸变化 ---------- */
    var resizeTimer = null;
    function onResize() {
      if (resizeTimer) { clearTimeout(resizeTimer); }
      resizeTimer = setTimeout(function () { renderAll(); }, 60);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (typeof ResizeObserver === 'function') {
      var ro = new ResizeObserver(onResize);
      ro.observe($('editorStage'));
      ro.observe($('previewStage'));
    }

    /* ---------- 打印前重绘 ---------- */
    window.addEventListener('beforeprint', function () { renderA4ToCanvas(); });
  }

  /* =====================================================================
   * 启动
   * =================================================================== */

  function init() {
    bindUI();

    // 初始化滑杆填充
    paintRange($('zoomSlider'));
    paintRange($('rotSlider'));
    paintRange($('briSlider'));
    paintRange($('conSlider'));
    paintRange($('satSlider'));
    paintRange($('textSize'));

    syncCountPills();
    syncUIFromState();
    updateUndoRedoUI();
    switchMode('preview');
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();