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
    " · 裁切圆 ": " · cut circle ",
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
    " 枚，已自动夹取为 ": " pcs, automatically clamped to ",
    "无": "None",
    "双线": "Double line",
    "虚线": "Dashed",
    "波浪": "Wave",
    "星点": "Star dots",
    "纯色环": "Solid ring",
    "已去背景（移除 ": "Background removed (removed ",
    " 像素）": " px)",
    "未检测到可去除的背景": "No removable background found",
    "已智能增强（锐化 + 对比度）": "Enhanced (sharpen + contrast)",
    "calc-tools.top 免费制作": "Made with calc-tools.top",
    "请先导入图片或添加换图队列": "Please import an image or add a queue first",
    "当前环境不支持导出 PDF，请改用 PNG": "PDF export is not supported in this environment, please use PNG",
    "PDF 导出需要 JPEG 编码，请改用 PNG": "PDF export needs JPEG encoding, please use PNG",
    "图": "Image ",
    "尚未添加图片": "No images added yet",
    "移除": "Remove",
    " 张": " pcs",
    "当前 A4 拼版将循环填入 ": "A4 sheet will cycle through ",
    " 张不同图案": " different designs",
    "未启用队列：A4 拼版使用同一图案阵列": "Queue off: A4 sheet repeats the same design",
    "工程文件格式不正确": "Invalid project file format",
    "已载入工程": "Project loaded",
    "（无图片）": " (no image)",
    "工程内图片解码失败": "Failed to decode the image in the project",
    "请先导入图片或添加换图队列再保存工程": "Please import an image or add a queue before saving",
    "已保存工程文件": "Project file saved",
    "工程文件解析失败": "Failed to parse the project file",
    "工程文件读取失败": "Failed to read the project file",
    "队列图片加载失败": "Failed to load the queue image",
    "规格：成品 ": "Spec: finish ",
    "【badge-maker 工厂规范导出说明】": "[badge-maker factory-spec export notes]",
    "mm，出血 ": "mm, bleed ",
    "mm，含出血 ": "mm, with bleed ",
    "分辨率：300 DPI（A4 拼版 ": "Resolution: 300 DPI (A4 sheet ",
    "px）": "px)",
    "下单步骤：": "Order steps:",
    "1. 导出 PNG / PDF 印刷稿（已含出血 / 裁切 / 安全区辅助线）": "1. Export the PNG / PDF print sheet (bleed / cut / safe-area guides included)",
    "2. 确认出血线外无重要内容、文字在安全区内": "2. Make sure nothing important falls outside the bleed line and text stays inside the safe area",
    "3. 去柔造 / 1688「哇噢定制」等平台上传，选对应规格与工艺（亮面 / 哑膜）": "3. Upload to platforms such as Rouzao / 1688 \"Wao Custom\", then pick the matching spec and finish (glossy / matte)",
    "4. 无设备可直接平台打样邮寄；有设备自印": "4. No press? Order a sample from the platform. Have a press? Print it yourself.",
    "已复制下单指引": "Order guide copied",
    "复制失败，请手动选择文本": "Copy failed, please select the text manually",
    "退出全屏": "Exit full screen",
    "全屏": "Full screen"
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
  var A4_PT = { w: 595.28, h: 841.89 };            // A4 物理尺寸（PostScript 点，72pt/inch）
  var A4_MARGIN_MM = 8;                            // A4 四周打印安全边距
  var SAFE_INSET_MM = 2;                           // 安全区距裁切线内缩量
  var MAX_IMAGE_SIDE = 4000;                       // 超大图降采样阈值
  var ZOOM_MIN = 0.1;
  var ZOOM_MAX = 5;
  var EDITOR_FACE_RATIO = 0.86;                    // 画布中成品圆占画布边长的比例
  var PREVIEW_FACE_RATIO = 0.74;                   // 预览图中成品圆占输出边长的比例（预留投影空间）
  var HISTORY_LIMIT = 60;
  var PREVIEW_SIZES = [512, 1024, 2048];

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
    text: makeDefaultText(),
    border: makeDefaultBorder(),
    shape: 'circle',          // 形状/版型：circle | square | heart | card
    bgColor: '#FFFFFF',       // 徽章底色（图片未覆盖处 / 纯圆底）
    rimColor: '#C8D0DA',      // 拟真效果金属包边基色（派生 7 档明暗渐变）
    queue: []                // 多图拼版队列：[{image, imgW, imgH, name}]
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
    gap: 3,                   // mm
    special: 'none',          // 底纹工艺：none | star | holographic | brushed
    useQueue: false,          // 启用换图队列多图拼版
    shareBadge: false        // 导出图带「calc-tools.top 制作」角标
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

  /** #RRGGBB → {r,g,b}；非法输入回落中性灰，避免 NaN 污染渲染 */
  function hexToRgb(hex) {
    var s = String(hex || '').replace('#', '');
    if (s.length === 3) { s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; }
    var n = parseInt(s, 16);
    if (!isFinite(n) || s.length !== 6) { return { r: 200, g: 208, b: 218 }; }
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  /** 颜色明暗派生：RGB × f（截断到 0-255），用于由「包边基色」派生金属渐变 */
  function shade(hex, f) {
    var c = hexToRgb(hex);
    return 'rgb(' + Math.round(clamp(c.r * f, 0, 255)) + ',' +
      Math.round(clamp(c.g * f, 0, 255)) + ',' +
      Math.round(clamp(c.b * f, 0, 255)) + ')';
  }

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
   * 渲染核心：把图片按当前变换绘制到指定画布坐标
   * ---------------------------------------------------------------------
   * 变换归一化策略：tx/ty 以「成品圆直径」为单位，zoom 相对于「含出血圆 cover」，
   * 因此同一状态在任意输出尺寸（编辑器 / 预览 / 300DPI 打印）下构图完全一致，
   * 实现真正的所见即所得（WYSIWYG）。
   * =================================================================== */

  function baseFitFor(faceD, specId, src) {
    var spec = getSpec(specId);
    var bleedD = faceD * (spec.total / spec.diameter);
    var iw = src ? src.imgW : state.imgW;
    var ih = src ? src.imgH : state.imgH;
    return Math.max(bleedD / iw, bleedD / ih);
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
  function renderImageTo(ctx, cx, cy, faceD, st, src) {
    var s = st || state;
    var im = src ? src.image : state.image;
    if (!im) { return; }
    var iw = src ? src.imgW : state.imgW;
    var ih = src ? src.imgH : state.imgH;
    var fit = baseFitFor(faceD, s.specId, src) * s.zoom;
    var w = iw * fit;
    var h = ih * fit;
    ctx.save();
    ctx.translate(cx + s.tx * faceD, cy + s.ty * faceD);
    ctx.rotate(s.rot * Math.PI / 180);
    ctx.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1);
    ctx.filter = filterString(s);
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
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

  /** 表面光效：顶部柔光 + 底部暗角（+ 亮面镜面反射） */
  function drawSurfaceLight(ctx, cx, cy, faceD, glossy, shape) {
    var r = faceD / 2;
    ctx.save();
    tracePath(ctx, cx, cy, r, shape);
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

  /** 拟真徽章：金属包边 + 高光 + 投影 */
  function drawRealisticBadge(ctx, cx, cy, faceD) {
    var glossy = opts.surface === 'glossy';
    var rimW = faceD * 0.045;
    var outerR = faceD / 2 + rimW;

    // 1) 投影 + 底色
    ctx.save();
    tracePath(ctx, cx, cy, outerR, state.shape);
    ctx.shadowColor = 'rgba(9,14,24,0.38)';
    ctx.shadowBlur = faceD * 0.10;
    ctx.shadowOffsetY = faceD * 0.035;
    ctx.fillStyle = shade(state.rimColor, 0.92);
    ctx.fill();
    ctx.restore();

    // 2) 底色 + 图像（裁到外形）
    ctx.save();
    tracePath(ctx, cx, cy, outerR, state.shape);
    ctx.clip();
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(cx - outerR, cy - outerR, outerR * 2, outerR * 2);
    renderImageTo(ctx, cx, cy, faceD);
    ctx.restore();

    // 3) 表面光效（按形状裁切）
    drawSurfaceLight(ctx, cx, cy, faceD, glossy, state.shape);

    // 4) 金属包边（形状描边，模拟马口铁卷边）
    var rimBase = state.rimColor;
    var g = ctx.createLinearGradient(cx - outerR * 0.75, cy - outerR, cx + outerR * 0.75, cy + outerR);
    g.addColorStop(0.00, shade(rimBase, 1.18));
    g.addColorStop(0.16, shade(rimBase, 1.05));
    g.addColorStop(0.38, shade(rimBase, 0.72));
    g.addColorStop(0.54, shade(rimBase, 1.12));
    g.addColorStop(0.74, shade(rimBase, 0.68));
    g.addColorStop(0.90, shade(rimBase, 0.96));
    g.addColorStop(1.00, shade(rimBase, 1.15));
    ctx.save();
    tracePath(ctx, cx, cy, faceD / 2 + rimW / 2, state.shape);
    ctx.lineWidth = rimW;
    ctx.strokeStyle = g;
    ctx.stroke();
    ctx.restore();

    if (state.shape === 'circle') {
      // 5) 包边顶侧高光细线
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, outerR - rimW * 0.30, Math.PI * 1.03, Math.PI * 1.97);
      ctx.strokeStyle = 'rgba(255,255,255,0.78)';
      ctx.lineWidth = Math.max(1, rimW * 0.17);
      ctx.stroke();
      ctx.restore();

      // 6) 内圈压痕（图像与包边分界）
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, faceD / 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(20,26,36,0.20)';
      ctx.lineWidth = Math.max(1, faceD * 0.005);
      ctx.stroke();
      ctx.restore();

      // 7) 外缘描边
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, outerR - Math.max(0.5, faceD * 0.0025), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(20,26,36,0.28)';
      ctx.lineWidth = Math.max(1, faceD * 0.006);
      ctx.stroke();
      ctx.restore();
    } else {
      // 7) 外缘描边（沿形状）
      ctx.save();
      tracePath(ctx, cx, cy, outerR - Math.max(0.5, faceD * 0.0025), state.shape);
      ctx.strokeStyle = 'rgba(20,26,36,0.28)';
      ctx.lineWidth = Math.max(1, faceD * 0.006);
      ctx.stroke();
      ctx.restore();
    }

    // 8) 底纹工艺（仅拟真预览）
    drawSpecial(ctx, cx, cy, faceD);

    // 9) 文字层
    drawBadgeText(ctx, cx, cy, faceD);

    // 10) 边框素材
    drawBorder(ctx, cx, cy, faceD, state.border.id, state.border.color);
  }

  /** 纯圆形裁剪（关闭拟真效果时） */
  function drawPlainBadge(ctx, cx, cy, faceD) {
    var r = faceD / 2;
    ctx.save();
    tracePath(ctx, cx, cy, r, state.shape);
    ctx.fillStyle = state.bgColor;
    ctx.fill();
    ctx.clip();
    renderImageTo(ctx, cx, cy, faceD);
    ctx.restore();
    drawBadgeText(ctx, cx, cy, faceD);
    drawBorder(ctx, cx, cy, faceD, state.border.id, state.border.color);
  }

  /* =====================================================================
   * 文字层（BM-1 P0-1）：成品层叠加，不参与图片裁剪变换
   * ---------------------------------------------------------------------
   * 顶部/底部弧形排字（角色名 / 日期经典布局）+ 中央直排；
   * 在编辑器、拟真预览、纯圆预览、单枚 / 拼版打印中保持一致（WYSIWYG）。
   * =================================================================== */

  function makeDefaultText() {
    return {
      enabled: false,
      top: '', bottom: '', center: '',
      sizeRatio: 0.11,        // 字号 = 成品直径 × 该比例
      color: '#1A1A1A',
      stroke: true,
      strokeColor: '#FFFFFF',
      strokeRatio: 0.08       // 描边宽 = 字号 × 该比例
    };
  }

  function makeDefaultBorder() {
    return {
      id: 'none',              // none | double | dashed | wave | star | solid
      color: '#FFFFFF'         // 边框强调色
    };
  }

  var BORDER_LIST = [
    { id: 'none', label: L('无') },
    { id: 'double', label: L('双线') },
    { id: 'dashed', label: L('虚线') },
    { id: 'wave', label: L('波浪') },
    { id: 'star', label: L('星点') },
    { id: 'solid', label: L('纯色环') }
  ];

  /* =====================================================================
   * 形状 / 版型路径抽象（BM-3 #8）：圆 / 方 / 心形 / 卡片 共用同一渲染管线
   * ---------------------------------------------------------------------
   * addShapePath：仅追加子路径（不含 beginPath），用于 evenodd 遮罩合成；
   * tracePath：beginPath + addShapePath，用于独立裁切 / 描边。
   * =================================================================== */

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function heartPath(ctx, cx, cy, r) {
    var s = r * 1.18;
    ctx.moveTo(cx, cy + s * 0.72);
    ctx.bezierCurveTo(cx - s, cy - s * 0.20, cx - s * 0.55, cy - s * 0.95, cx, cy - s * 0.38);
    ctx.bezierCurveTo(cx + s * 0.55, cy - s * 0.95, cx + s, cy - s * 0.20, cx, cy + s * 0.72);
    ctx.closePath();
  }

  function addShapePath(ctx, cx, cy, r, shape) {
    if (shape === 'square' || shape === 'card') {
      var rr = (shape === 'card') ? r * 0.06 : r * 0.14;
      roundRectPath(ctx, cx - r, cy - r, r * 2, r * 2, rr);
    } else if (shape === 'heart') {
      heartPath(ctx, cx, cy, r);
    } else {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }

  function tracePath(ctx, cx, cy, r, shape) {
    ctx.beginPath();
    addShapePath(ctx, cx, cy, r, shape);
  }

  var TEXT_FONT_STACK = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,-apple-system,sans-serif';

  function drawArcText(ctx, cx, cy, radius, text, isTop) {
    var widths = [];
    var total = 0;
    var i;
    for (i = 0; i < text.length; i++) {
      var w = ctx.measureText(text[i]).width;
      widths.push(w); total += w;
    }
    if (total <= 0) { return; }
    var totalAngle = total / radius;
    var angle = isTop ? (-Math.PI / 2 - totalAngle / 2) : (Math.PI / 2 - totalAngle / 2);
    var dir = 1;
    for (i = 0; i < text.length; i++) {
      var ww = widths[i];
      var a = angle + dir * (ww / 2) / radius;
      ctx.save();
      ctx.translate(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
      ctx.rotate(a + (isTop ? Math.PI / 2 : -Math.PI / 2));
      ctx.strokeText(text[i], 0, 0);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
      angle += dir * ww / radius;
    }
  }

  function drawBadgeText(ctx, cx, cy, faceD) {
    var t = state.text;
    if (!t || !t.enabled) { return; }
    var hasAny = (t.top && t.top.length) || (t.bottom && t.bottom.length) || (t.center && t.center.length);
    if (!hasAny) { return; }
    var r = faceD / 2;
    var fontSize = Math.max(6, faceD * t.sizeRatio);
    ctx.save();
    tracePath(ctx, cx, cy, r, state.shape);
    ctx.clip();
    ctx.font = '700 ' + fontSize + 'px ' + TEXT_FONT_STACK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if (t.stroke) {
      ctx.lineWidth = Math.max(1, fontSize * t.strokeRatio);
      ctx.strokeStyle = t.strokeColor;
    } else {
      ctx.lineWidth = 0;
    }
    ctx.fillStyle = t.color;

    var ringR = r * 0.80;   // 弧形排字半径（贴近上/下缘）
    if (t.top) { drawArcText(ctx, cx, cy, ringR, t.top, true); }
    if (t.bottom) { drawArcText(ctx, cx, cy, ringR, t.bottom, false); }
    if (t.center) {
      ctx.save();
      ctx.strokeText(t.center, cx, cy);
      ctx.fillText(t.center, cx, cy);
      ctx.restore();
    }
    ctx.restore();
  }

  /* =====================================================================
   * 底纹工艺拟真（BM-1 P0-2）：仅作用于拟真预览，不污染打印 / 透明导出
   * =================================================================== */

  var sparklePts = [];
  (function () {
    for (var i = 0; i < 16; i++) {
      sparklePts.push({ a: Math.random() * Math.PI * 2, r: 0.25 + Math.random() * 0.6, s: 0.5 + Math.random() * 1 });
    }
  })();
  var brushedPts = [];
  (function () {
    for (var j = 0; j < 60; j++) { brushedPts.push((Math.random() - 0.5) * 2); }
  })();

  function drawSparkle(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.22, y - s * 0.22);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x + s * 0.22, y + s * 0.22);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.22, y + s * 0.22);
    ctx.lineTo(x - s, y);
    ctx.lineTo(x - s * 0.22, y - s * 0.22);
    ctx.closePath();
    ctx.fill();
  }

  function drawSpecial(ctx, cx, cy, faceD) {
    var kind = opts.special;
    if (!kind || kind === 'none') { return; }
    var r = faceD / 2;
    ctx.save();
    tracePath(ctx, cx, cy, r, state.shape);
    ctx.clip();
    if (kind === 'holographic') {
      ctx.globalCompositeOperation = 'screen';
      var g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      g.addColorStop(0.00, 'rgba(255,40,140,0.22)');
      g.addColorStop(0.20, 'rgba(150,40,255,0.22)');
      g.addColorStop(0.40, 'rgba(40,140,255,0.22)');
      g.addColorStop(0.60, 'rgba(40,255,200,0.22)');
      g.addColorStop(0.80, 'rgba(255,220,40,0.22)');
      g.addColorStop(1.00, 'rgba(255,40,140,0.22)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, faceD, faceD);
      ctx.globalCompositeOperation = 'source-over';
    } else if (kind === 'star') {
      var g2 = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
      g2.addColorStop(0, 'rgba(255,255,255,0.12)');
      g2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(cx - r, cy - r, faceD, faceD);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (var i = 0; i < sparklePts.length; i++) {
        var p = sparklePts[i];
        drawSparkle(ctx, cx + Math.cos(p.a) * (p.r * r), cy + Math.sin(p.a) * (p.r * r), r * 0.018 * p.s);
      }
    } else if (kind === 'brushed') {
      ctx.globalAlpha = 0.10;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, faceD * 0.004);
      for (var y = 0; y < brushedPts.length; y++) {
        var yy = -r + (y + 0.5) * (faceD / brushedPts.length);
        ctx.beginPath();
        ctx.moveTo(cx - r, cy + yy);
        ctx.lineTo(cx + r, cy + yy + brushedPts[y] * faceD * 0.01);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* =====================================================================
   * 边框素材（BM-2 #4）：本地程序化生成，无需外部资源，可商用
   * =================================================================== */

  function drawBorder(ctx, cx, cy, faceD, id, color) {
    if (!id || id === 'none') { return; }
    var r = faceD / 2;
    var shape = state.shape;
    ctx.save();
    tracePath(ctx, cx, cy, r, shape);
    ctx.clip();
    ctx.strokeStyle = color || '#FFFFFF';
    ctx.fillStyle = color || '#FFFFFF';
    ctx.lineJoin = 'round';
    if (shape !== 'circle') {
      // 非圆形状：沿形状描一条同色边框，保证版型一致
      ctx.lineWidth = Math.max(1, faceD * (id === 'solid' ? 0.06 : 0.03));
      tracePath(ctx, cx, cy, r * 0.92, shape);
      ctx.stroke();
      ctx.restore();
      return;
    }
    var i, a;
    if (id === 'double') {
      ctx.lineWidth = Math.max(1, faceD * 0.012);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.93, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2); ctx.stroke();
    } else if (id === 'dashed') {
      ctx.lineWidth = Math.max(1, faceD * 0.02);
      ctx.setLineDash([r * 0.06, r * 0.05]);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    } else if (id === 'solid') {
      ctx.lineWidth = Math.max(1, faceD * 0.06);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2); ctx.stroke();
    } else if (id === 'wave') {
      ctx.lineWidth = Math.max(1, faceD * 0.014);
      var seg = 120, baseR = r * 0.9, amp = r * 0.03, waves = 24;
      ctx.beginPath();
      for (i = 0; i <= seg; i++) {
        a = i / seg * Math.PI * 2;
        var rr = baseR + Math.sin(a * waves) * amp;
        var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      }
      ctx.closePath();
      ctx.stroke();
    } else if (id === 'star') {
      var n = 24, rr2 = r * 0.9, ss = r * 0.022;
      for (i = 0; i < n; i++) {
        a = i / n * Math.PI * 2;
        drawSparkle(ctx, cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2, ss);
      }
    }
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
      tracePath(ctx, cx, cy, faceR, state.shape);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 1) 图片
    renderImageTo(ctx, cx, cy, faceD);

    // 2) 形状外暗化遮罩（evenodd：矩形 + 形状）
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, p.w, p.h);
    addShapePath(ctx, cx, cy, faceR, state.shape);
    ctx.fillStyle = 'rgba(13,16,22,0.62)';
    ctx.fill('evenodd');
    ctx.restore();

    // 3) 出血圈虚线（外侧，含出血直径）
    var bleedR = faceR * (spec.total / spec.diameter);
    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = 1.5;
    tracePath(ctx, cx, cy, bleedR, state.shape);
    ctx.stroke();
    ctx.restore();

    // 4) 裁切圈（成品形状，蓝色实线）
    ctx.save();
    ctx.strokeStyle = 'rgba(0,122,255,0.95)';
    ctx.lineWidth = 2;
    tracePath(ctx, cx, cy, faceR, state.shape);
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

    // 6) 文字层（仅在有图时叠加于成品圆内）
    if (state.hasImage) {
      drawBadgeText(ctx, cx, cy, faceD);
    }

    // 7) 边框素材
    drawBorder(ctx, cx, cy, faceD, state.border.id, state.border.color);
  }

  /* =====================================================================
   * 打印辅助线与标注
   * =================================================================== */

  /**
   * 绘制一枚打印徽章。
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx 圆心 X（像素，含出血圆）
   * @param {number} cy 圆心 Y
   * @param {number} cellPx 含出血圆直径（像素）
   */
  function drawPrintBadge(ctx, cx, cy, cellPx, item) {
    var spec = getSpec(state.specId);
    var ratio = spec.diameter / spec.total;
    var bleedR = cellPx / 2;
    var cutR = bleedR * ratio;
    var safeR = Math.max(2, cutR - mmToPx(SAFE_INSET_MM));

    // 1) 底色（保证打印不透明，图片未覆盖处为徽章底色，默认纯白）
    ctx.save();
    tracePath(ctx, cx, cy, bleedR, state.shape);
    ctx.clip();
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(cx - bleedR, cy - bleedR, cellPx, cellPx);
    ctx.restore();

    // 2) 图像（裁到出血外形；多图拼版时每格使用各自的队列图）
    if ((item && item.image) || state.hasImage) {
      ctx.save();
      tracePath(ctx, cx, cy, bleedR, state.shape);
      ctx.clip();
      renderImageTo(ctx, cx, cy, cellPx * ratio, state, item);
      ctx.restore();
    }

    // 2.5) 文字层（裁到成品外形内，避免出血区出现文字）
    if ((item && item.image) || state.hasImage) {
      ctx.save();
      tracePath(ctx, cx, cy, cutR, state.shape);
      ctx.clip();
      drawBadgeText(ctx, cx, cy, cellPx * ratio);
      ctx.restore();
    }

    // 2.6) 边框素材
    drawBorder(ctx, cx, cy, cellPx * ratio, state.border.id, state.border.color);

    var lw = Math.max(1, cellPx * 0.0028);
    var font = Math.max(9, cellPx * 0.027);

    // 3) 辅助线
    if (opts.showGuides) {
      // 出血线（最外，红色虚线）
      ctx.save();
      ctx.setLineDash([bleedR * 0.10, bleedR * 0.07]);
      ctx.strokeStyle = 'rgba(214,60,60,0.85)';
      ctx.lineWidth = lw;
      tracePath(ctx, cx, cy, bleedR - lw, state.shape);
      ctx.stroke();
      ctx.restore();

      // 裁切线（成品圈，蓝色细实线）
      ctx.save();
      ctx.strokeStyle = 'rgba(0,110,235,0.9)';
      ctx.lineWidth = lw;
      tracePath(ctx, cx, cy, cutR, state.shape);
      ctx.stroke();
      ctx.restore();

      // 安全区圈（浅绿虚线）
      ctx.save();
      ctx.setLineDash([bleedR * 0.07, bleedR * 0.06]);
      ctx.strokeStyle = 'rgba(60,170,110,0.75)';
      ctx.lineWidth = lw;
      tracePath(ctx, cx, cy, safeR, state.shape);
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

      // 出血线标注（出血圈内侧顶部）
      var bleedText = L('出血线 ') + spec.total + 'mm';
      ctx.textBaseline = 'top';
      ctx.strokeText(bleedText, cx, cy - bleedR + font * 0.35);
      ctx.fillStyle = 'rgba(200,45,45,0.95)';
      ctx.fillText(bleedText, cx, cy - bleedR + font * 0.35);

      // 裁切线标注（裁切圈外侧顶部）
      var cutText = L('裁切线 ') + spec.diameter + 'mm';
      ctx.textBaseline = 'bottom';
      ctx.strokeText(cutText, cx, cy - cutR - font * 0.28);
      ctx.fillStyle = 'rgba(0,100,220,0.95)';
      ctx.fillText(cutText, cx, cy - cutR - font * 0.28);

      // 安全区标注（安全圈外侧底部）
      ctx.textBaseline = 'top';
      ctx.strokeText(L('安全区'), cx, cy + safeR + font * 0.28);
      ctx.fillStyle = 'rgba(45,150,95,0.95)';
      ctx.fillText(L('安全区'), cx, cy + safeR + font * 0.28);

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

    // 多图拼版：启用队列且队列非空时，每格循环使用各自的队列图
    var sources = null;
    if (opts.useQueue && state.queue.length) {
      sources = [];
      for (var q = 0; q < state.queue.length; q++) {
        sources.push({ image: state.queue[q].image, imgW: state.queue[q].imgW, imgH: state.queue[q].imgH });
      }
    }

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.scale(k, k);

    for (var i = 0; i < layout.cells.length; i++) {
      var cellData = layout.cells[i];
      var item = sources ? sources[i % sources.length] : null;
      drawPrintBadge(ctx, cellData.x + cellData.size / 2, cellData.y + cellData.size / 2, cellData.size, item);
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
      L(' · 裁切圆 ') + Math.round(mmToPx(spec.diameter)) + 'px';

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

    updateQueueHint();
    updateGuideSpec();
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
      specId: state.specId
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
    scheduleDraftSave();
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

    // 文字层控件
    if ($('swText')) { $('swText').checked = !!state.text.enabled; }
    if ($('txtTop')) { $('txtTop').value = state.text.top || ''; }
    if ($('txtBottom')) { $('txtBottom').value = state.text.bottom || ''; }
    if ($('txtCenter')) { $('txtCenter').value = state.text.center || ''; }
    if ($('txtSize')) {
      $('txtSize').value = String(Math.round(state.text.sizeRatio * 100));
      $('txtSizeVal').textContent = Math.round(state.text.sizeRatio * 100) + '%';
      paintRange($('txtSize'));
    }
    if ($('txtColor')) { $('txtColor').value = state.text.color; }
    if ($('swStroke')) { $('swStroke').checked = !!state.text.stroke; }
    if ($('txtStrokeColor')) { $('txtStrokeColor').value = state.text.strokeColor; }
    if ($('txtStrokeW')) {
      $('txtStrokeW').value = String(Math.round(state.text.strokeRatio * 100));
      $('txtStrokeWVal').textContent = Math.round(state.text.strokeRatio * 100) + '%';
      paintRange($('txtStrokeW'));
    }
    // 底纹工艺高亮
    if ($('specialSwitch')) {
      var spBtns = $('specialSwitch').querySelectorAll('button');
      for (var si = 0; si < spBtns.length; si++) {
        spBtns[si].classList.toggle('active', spBtns[si].getAttribute('data-special') === opts.special);
      }
    }

    // 边框控件高亮
    if ($('borderGroup')) {
      var bBtns = $('borderGroup').querySelectorAll('.pill');
      for (var bi = 0; bi < bBtns.length; bi++) {
        bBtns[bi].classList.toggle('active', bBtns[bi].getAttribute('data-border') === state.border.id);
      }
    }
    if ($('borderColor')) { $('borderColor').value = state.border.color; }

    // 徽章颜色（并入站点版能力）
    if ($('bgColor')) { $('bgColor').value = state.bgColor; }
    if ($('rimColor')) { $('rimColor').value = state.rimColor; }

    // 形状 / 版型 高亮
    if ($('shapeGroup')) {
      var shBtns = $('shapeGroup').querySelectorAll('.pill');
      for (var shi = 0; shi < shBtns.length; shi++) {
        shBtns[shi].classList.toggle('active', shBtns[shi].getAttribute('data-shape') === state.shape);
      }
    }
    if ($('swShare')) { $('swShare').checked = !!opts.shareBadge; }

    // 队列 / 下单指引控件
    if ($('swQueue')) { $('swQueue').checked = !!opts.useQueue; }
    renderQueueList();
    updateQueueHint();
    updateGuideSpec();
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
    history = [];
    histIndex = -1;
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    syncUIFromState();
    updateUndoRedoUI();
    renderAll();
    toast(L('已清除图片'));
  }

  /* =====================================================================
   * 本地 AI 辅助（BM-3 #9）：去背景 / 智能增强，零依赖、不联网
   * =================================================================== */

  function getImageCanvas() {
    if (!state.image) { return null; }
    var w = state.imgW || state.image.width || 1;
    var h = state.imgH || state.image.height || 1;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(state.image, 0, 0, w, h);
    return c;
  }

  function setImageFromCanvas(c) {
    state.image = c;
    state.imgW = c.width;
    state.imgH = c.height;
    state.hasImage = true;
    state.downsampled = false;
    syncUIFromState();
    pushHistory(false);
    renderAll();
    scheduleDraftSave();
  }

  /** 一键去背景：从四边漫水填充，移除与边缘近似的纯色背景（仅透明化连通区域，保留主体） */
  function removeBackground(tol) {
    if (!requireImage()) { return; }
    var c = getImageCanvas();
    if (!c) { return; }
    var w = c.width, h = c.height;
    var ctx = c.getContext('2d');
    var img = ctx.getImageData(0, 0, w, h);
    var d = img.data;
    // 采样四角平均作为背景色
    function px(x, y) { var p = (y * w + x) * 4; return [d[p], d[p + 1], d[p + 2]]; }
    var corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
    var bg = [0, 0, 0];
    for (var ci = 0; ci < corners.length; ci++) { bg[0] += corners[ci][0]; bg[1] += corners[ci][1]; bg[2] += corners[ci][2]; }
    bg[0] = Math.round(bg[0] / 4); bg[1] = Math.round(bg[1] / 4); bg[2] = Math.round(bg[2] / 4);

    var visited = new Uint8Array(w * h);
    var stack = [];
    function tryPush(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) { return; }
      var idx = y * w + x;
      if (visited[idx]) { return; }
      visited[idx] = 1;
      stack.push(idx);
    }
    for (var x = 0; x < w; x++) { tryPush(x, 0); tryPush(x, h - 1); }
    for (var y = 0; y < h; y++) { tryPush(0, y); tryPush(w - 1, y); }

    var t = (typeof tol === 'number') ? tol : 40;
    var removed = 0;
    while (stack.length) {
      var idx = stack.pop();
      var p = idx * 4;
      var dr = Math.abs(d[p] - bg[0]);
      var dg = Math.abs(d[p + 1] - bg[1]);
      var db = Math.abs(d[p + 2] - bg[2]);
      if (dr + dg + db <= t) {
        d[p + 3] = 0;
        removed++;
        var xx = idx % w, yy = (idx - xx) / w;
        tryPush(xx + 1, yy); tryPush(xx - 1, yy); tryPush(xx, yy + 1); tryPush(xx, yy - 1);
      }
    }
    ctx.putImageData(img, 0, 0);
    setImageFromCanvas(c);
    toast(removed ? (L('已去背景（移除 ') + removed + L(' 像素）')) : L('未检测到可去除的背景'));
  }

  /** 智能增强：锐化（unsharp mask）+ 自适应对比度，纯 canvas 像素运算 */
  function enhanceImage() {
    if (!requireImage()) { return; }
    var c = getImageCanvas();
    if (!c) { return; }
    var w = c.width, h = c.height;
    var ctx = c.getContext('2d');
    var img = ctx.getImageData(0, 0, w, h);
    var d = img.data;
    var n = w * h;
    var orig = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      orig[i * 3] = d[i * 4];
      orig[i * 3 + 1] = d[i * 4 + 1];
      orig[i * 3 + 2] = d[i * 4 + 2];
    }
    // 可分离盒式模糊（半径 1）用于 unsharp
    var blur = new Float32Array(n * 3);
    var tmp = new Float32Array(n * 3);
    function boxPass(src, dst) {
      var x, y, ch, dx, dy, nx, ny, sum, cnt;
      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          for (ch = 0; ch < 3; ch++) {
            sum = 0; cnt = 0;
            for (dx = -1; dx <= 1; dx++) {
              nx = x + dx; if (nx < 0 || nx >= w) { continue; }
              sum += src[(y * w + nx) * 3 + ch]; cnt++;
            }
            dst[(y * w + x) * 3 + ch] = sum / cnt;
          }
        }
      }
      for (x = 0; x < w; x++) {
        for (y = 0; y < h; y++) {
          for (ch = 0; ch < 3; ch++) {
            sum = 0; cnt = 0;
            for (dy = -1; dy <= 1; dy++) {
              ny = y + dy; if (ny < 0 || ny >= h) { continue; }
              sum += src[(ny * w + x) * 3 + ch]; cnt++;
            }
            dst[(y * w + x) * 3 + ch] = sum / cnt;
          }
        }
      }
    }
    boxPass(orig, tmp);
    boxPass(tmp, blur);

    var amount = 0.6, contrast = 1.12, o, sharp, v;
    for (var j = 0; j < n; j++) {
      for (var c3 = 0; c3 < 3; c3++) {
        o = orig[j * 3 + c3];
        sharp = o + (o - blur[j * 3 + c3]) * amount;
        v = (sharp - 128) * contrast + 128;
        if (v < 0) { v = 0; } else if (v > 255) { v = 255; }
        d[j * 4 + c3] = v;
      }
    }
    ctx.putImageData(img, 0, 0);
    setImageFromCanvas(c);
    toast(L('已智能增强（锐化 + 对比度）'));
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

  function fillRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fill();
  }

  /** 分享角标（BM-3 #10）：导出图右下角叠加「calc-tools.top 制作」水印，可关 */
  function drawShareBadge(ctx, w, h) {
    if (!opts.shareBadge) { return; }
    var fs = Math.max(11, Math.min(w, h) * 0.028);
    ctx.save();
    ctx.font = '600 ' + fs + 'px ' + TEXT_FONT_STACK;
    var t1 = L('calc-tools.top 免费制作');
    var t2 = 'https://calc-tools.top';
    var textW = Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width);
    var padX = fs * 0.6, padY = fs * 0.45;
    var boxW = textW + padX * 2;
    var boxH = fs * 1.2 * 2 + padY * 2;
    var x = w - boxW - fs * 0.5;
    var y = h - boxH - fs * 0.5;
    ctx.fillStyle = 'rgba(17,20,28,0.82)';
    fillRoundRect(ctx, x, y, boxW, boxH, fs * 0.3);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(t1, x + padX, y + padY);
    ctx.fillStyle = 'rgba(180,210,255,0.95)';
    ctx.fillText(t2, x + padX, y + padY + fs * 1.2);
    ctx.restore();
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

    drawShareBadge(ctx, size, size);

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
    drawShareBadge(ctx, side, side);

    var name = 'badge-' + spec.id + 'mm-print-300dpi.png';
    cv.toBlob(function (blob) {
      downloadBlob(blob, name);
      toast(L('已导出 ') + name + '（' + side + '×' + side + L('px）'));
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
    drawShareBadge(ctx, w, h);
    return layout;
  }

  function exportA4() {
    if (!state.hasImage && !(opts.useQueue && state.queue.length)) { toast(L('请先导入图片或添加换图队列')); return; }
    var layout = renderA4ToCanvas();
    var spec = getSpec(state.specId);
    var w = Math.round(mmToPx(A4_MM.w));
    var h = Math.round(mmToPx(A4_MM.h));

    $('printCanvas').toBlob(function (blob) {
      var name = 'badge-a4-' + spec.id + 'mm-x' + layout.count + '-300dpi.png';
      downloadBlob(blob, name);
      toast(L('已导出 ') + name + '（' + w + '×' + h + L('px）'));
    }, 'image/png');
  }

  function doPrint() {
    if (!state.hasImage && !(opts.useQueue && state.queue.length)) { toast(L('请先导入图片或添加换图队列')); return; }
    renderA4ToCanvas();
    // 等待一帧确保画布内容已提交，再唤起打印
    setTimeout(function () { window.print(); }, 80);
  }

  /* =====================================================================
   * PDF 导出（BM-2 #7）：零依赖自研，内嵌 A4 拼版 JPEG（DCTDecode）
   * 不引入任何外部库，保证单文件 / 离线可用
   * =================================================================== */

  function strToBytes(s) {
    var a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) { a[i] = s.charCodeAt(i) & 0xff; }
    return a;
  }
  function pad10(n) { var s = String(n); while (s.length < 10) { s = '0' + s; } return s; }

  function buildPdfFromJpeg(jpegBytes, wPt, hPt) {
    var chunks = [];
    var offsets = {};
    var pos = 0;
    function push(b) { chunks.push(b); pos += b.length; }
    push(strToBytes('%PDF-1.3\n'));
    offsets[1] = pos; push(strToBytes('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'));
    offsets[2] = pos; push(strToBytes('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'));
    offsets[3] = pos; push(strToBytes('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' +
      (+wPt.toFixed(2)) + ' ' + (+hPt.toFixed(2)) + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n'));
    offsets[4] = pos;
    var head = '4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + jpegBytes.width +
      ' /Height ' + jpegBytes.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
      jpegBytes.data.length + ' >>\nstream\n';
    push(strToBytes(head));
    push(jpegBytes.data);
    push(strToBytes('\nendstream\nendobj\n'));
    var content = 'q ' + (+wPt.toFixed(2)) + ' 0 0 ' + (+hPt.toFixed(2)) + ' 0 0 cm /Im0 Do Q\n';
    offsets[5] = pos;
    push(strToBytes('5 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream\nendobj\n'));
    var xrefStart = pos;
    var xref = 'xref\n0 6\n0000000000 65535 f \n';
    for (var i = 1; i <= 5; i++) { xref += pad10(offsets[i]) + ' 00000 n \n'; }
    push(strToBytes(xref));
    push(strToBytes('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF'));
    return new Blob(chunks, { type: 'application/pdf' });
  }

  function dataUrlToBytes(url) {
    var b64 = url.split(',')[1] || '';
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) { arr[i] = bin.charCodeAt(i); }
    return arr;
  }

  function exportA4PDF() {
    if (!state.hasImage && !(opts.useQueue && state.queue.length)) {
      toast(L('请先导入图片或添加换图队列')); return;
    }
    var layout = renderA4ToCanvas();
    var spec = getSpec(state.specId);
    var w = Math.round(mmToPx(A4_MM.w));
    var h = Math.round(mmToPx(A4_MM.h));
    var cv = $('printCanvas');
    var jpegUrl;
    try { jpegUrl = cv.toDataURL('image/jpeg', 0.92); }
    catch (e) { toast(L('当前环境不支持导出 PDF，请改用 PNG')); return; }
    if (!jpegUrl || jpegUrl.indexOf('data:image/jpeg') !== 0) { toast(L('PDF 导出需要 JPEG 编码，请改用 PNG')); return; }
    var bytes = dataUrlToBytes(jpegUrl);
    var pdf = buildPdfFromJpeg({ data: bytes, width: w, height: h }, A4_PT.w, A4_PT.h);
    var name = 'badge-a4-' + spec.id + 'mm-x' + layout.count + '-300dpi.pdf';
    downloadBlob(pdf, name);
    toast(L('已导出 ') + name);
  }

  /* =====================================================================
   * 换图队列（BM-2 #5）：多图拼版
   * =================================================================== */

  function queueItemToDataURL(item) {
    try {
      var tmp = document.createElement('canvas');
      tmp.width = item.imgW || 1;
      tmp.height = item.imgH || 1;
      tmp.getContext('2d').drawImage(item.image, 0, 0, tmp.width, tmp.height);
      return tmp.toDataURL('image/png');
    } catch (e) { return null; }
  }

  function addQueueItem(source, w, h, name) {
    var item = { image: source, imgW: w, imgH: h, name: name || (L('图') + (state.queue.length + 1)) };
    state.queue.push(item);
    renderQueueList();
    updateQueueHint();
    scheduleDraftSave();
  }

  function removeQueueItem(idx) {
    if (idx < 0 || idx >= state.queue.length) { return; }
    var it = state.queue[idx];
    try { if (it.image && it.image.close) { it.image.close(); } } catch (e) {}
    state.queue.splice(idx, 1);
    renderQueueList();
    updateQueueHint();
    scheduleDraftSave();
  }

  function renderQueueList() {
    var box = $('queueList');
    box.innerHTML = '';
    if (!state.queue.length) {
      var empty = document.createElement('div');
      empty.className = 'queue-empty';
      empty.textContent = L('尚未添加图片');
      box.appendChild(empty);
      return;
    }
    for (var i = 0; i < state.queue.length; i++) {
      (function (idx) {
        var wrap = document.createElement('div');
        wrap.className = 'queue-item';
        var thumb = document.createElement('img');
        thumb.alt = state.queue[idx].name;
        try {
          var c = document.createElement('canvas');
          c.width = state.queue[idx].imgW || 1; c.height = state.queue[idx].imgH || 1;
          c.getContext('2d').drawImage(state.queue[idx].image, 0, 0, c.width, c.height);
          thumb.src = c.toDataURL('image/png');
        } catch (e) { thumb.src = ''; }
        var rm = document.createElement('button');
        rm.className = 'q-remove'; rm.type = 'button'; rm.textContent = '×';
        rm.setAttribute('aria-label', L('移除'));
        rm.addEventListener('click', function (e) { e.stopPropagation(); removeQueueItem(idx); });
        wrap.appendChild(thumb); wrap.appendChild(rm);
        box.appendChild(wrap);
      })(i);
    }
  }

  function updateQueueHint() {
    $('queueCount').textContent = state.queue.length + L(' 张');
    var btn = $('btnExportA4');
    var pdf = $('btnExportA4PDF');
    var info = state.queue.length
      ? L('当前 A4 拼版将循环填入 ') + state.queue.length + L(' 张不同图案')
      : L('未启用队列：A4 拼版使用同一图案阵列');
    $('printPixelHint').textContent = info;
  }

  /* =====================================================================
   * 工程保存 / 载入 + 本地自动草稿（BM-1 P0-3）
   * =================================================================== */

  var DRAFT_KEY = 'calcBadgeMakerDraft_v1';

  function imageToDataURL() {
    if (!state.hasImage) { return null; }
    try {
      var tmp = document.createElement('canvas');
      tmp.width = state.imgW || 1;
      tmp.height = state.imgH || 1;
      tmp.getContext('2d').drawImage(state.image, 0, 0, tmp.width, tmp.height);
      return tmp.toDataURL('image/png');
    } catch (e) { return null; }
  }

  function serializeQueue() {
    var items = [];
    var omitted = false;
    var total = 0;
    for (var i = 0; i < state.queue.length; i++) {
      var url = queueItemToDataURL(state.queue[i]);
      if (!url || url.length > 1400000 || total + url.length > 4000000) { omitted = true; continue; }
      total += url.length;
      items.push({ name: state.queue[i].name, image: url });
    }
    return { items: items, omitted: omitted };
  }

  function serializeProject() {
    var q = serializeQueue();
    return {
      app: 'calc-tools-badge-maker',
      version: 1,
      savedAt: Date.now(),
      state: {
        tx: state.tx, ty: state.ty, zoom: state.zoom, rot: state.rot,
        flipH: state.flipH, flipV: state.flipV,
        brightness: state.brightness, contrast: state.contrast, saturation: state.saturation,
        specId: state.specId,
        text: state.text,
        border: state.border,
        shape: state.shape,
        bgColor: state.bgColor,
        rimColor: state.rimColor,
        image: imageToDataURL(),
        queue: q.items,
        queueOmitted: q.omitted
      },
      opts: {
        realistic: opts.realistic, transparentBg: opts.transparentBg,
        surface: opts.surface, previewSize: opts.previewSize,
        showGuides: opts.showGuides, showLabels: opts.showLabels,
        count: opts.count, gap: opts.gap, special: opts.special,
        useQueue: !!opts.useQueue,
        shareBadge: !!opts.shareBadge
      }
    };
  }

  function assignText(src) {
    var d = makeDefaultText();
    if (src && typeof src === 'object') {
      for (var k in d) { if (src[k] !== undefined) { d[k] = src[k]; } }
    }
    return d;
  }

  function assignBorder(src) {
    var d = makeDefaultBorder();
    if (src && typeof src === 'object') {
      if (src.id && BORDER_LIST.some(function (b) { return b.id === src.id; })) { d.id = src.id; }
      if (typeof src.color === 'string') { d.color = src.color; }
    }
    return d;
  }

  function applyProjectData(data) {
    if (!data || !data.state) { toast(L('工程文件格式不正确')); return; }
    var s = data.state;
    if (data.opts) {
      opts.realistic = !!data.opts.realistic;
      opts.transparentBg = !!data.opts.transparentBg;
      opts.surface = data.opts.surface === 'matte' ? 'matte' : 'glossy';
      opts.previewSize = data.opts.previewSize || 1024;
      opts.showGuides = data.opts.showGuides !== false;
      opts.showLabels = data.opts.showLabels !== false;
      opts.count = data.opts.count || 20;
      opts.gap = (typeof data.opts.gap === 'number') ? data.opts.gap : 3;
      opts.special = data.opts.special || 'none';
    }
    state.tx = s.tx || 0; state.ty = s.ty || 0; state.zoom = s.zoom || 1;
    state.rot = s.rot || 0; state.flipH = !!s.flipH; state.flipV = !!s.flipV;
    state.brightness = s.brightness || 0; state.contrast = s.contrast || 0; state.saturation = s.saturation || 0;
    state.specId = s.specId || DEFAULT_SPEC_ID;
    state.text = assignText(s.text);
    state.border = assignBorder(s.border);
    state.shape = (s.shape === 'square' || s.shape === 'heart' || s.shape === 'card') ? s.shape : 'circle';
    state.bgColor = (/^#[0-9a-fA-F]{6}$/.test(s.bgColor || '')) ? s.bgColor : '#FFFFFF';
    state.rimColor = (/^#[0-9a-fA-F]{6}$/.test(s.rimColor || '')) ? s.rimColor : '#C8D0DA';
    opts.useQueue = !!(data.opts && data.opts.useQueue);
    opts.shareBadge = !!(data.opts && data.opts.shareBadge);

    // 换图队列（异步重建位图）
    state.queue = [];
    if (s.queue && s.queue.length) {
      var pending = s.queue.length;
      for (var qi = 0; qi < s.queue.length; qi++) {
        (function (entry) {
          var qimg = new Image();
          qimg.onload = function () {
            state.queue.push({ image: qimg, imgW: qimg.naturalWidth, imgH: qimg.naturalHeight, name: entry.name || (L('图') + (state.queue.length + 1)) });
            renderQueueList(); updateQueueHint();
            pending--; if (pending === 0) { renderAll(); }
          };
          qimg.onerror = function () { pending--; if (pending === 0) { renderAll(); } };
          qimg.src = entry.image;
        })(s.queue[qi]);
      }
    }

    function finish() {
      syncUIFromState();
      pushHistory(true);
      renderAll();
      toast(L('已载入工程') + (state.hasImage ? '' : L('（无图片）')));
    }

    if (s.image) {
      var img = new Image();
      img.onload = function () {
        state.image = img;
        state.imgW = img.naturalWidth; state.imgH = img.naturalHeight;
        state.hasImage = true; state.downsampled = false;
        finish();
      };
      img.onerror = function () { toast(L('工程内图片解码失败')); finish(); };
      img.src = s.image;
    } else {
      state.image = null; state.imgW = 0; state.imgH = 0; state.hasImage = false;
      finish();
    }
  }

  function saveProject() {
    if (!state.hasImage && !state.queue.length) { toast(L('请先导入图片或添加换图队列再保存工程')); return; }
    var data = serializeProject();
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'badge-project-' + getSpec(state.specId).id + 'mm-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    toast(L('已保存工程文件'));
  }

  function loadProjectFromFile(file) {
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function () {
      try { applyProjectData(JSON.parse(reader.result)); }
      catch (err) { toast(L('工程文件解析失败')); }
    };
    reader.onerror = function () { toast(L('工程文件读取失败')); };
    reader.readAsText(file);
  }

  var draftTimer = null;
  function scheduleDraftSave() {
    if (draftTimer) { clearTimeout(draftTimer); }
    draftTimer = setTimeout(saveDraft, 700);
  }
  function saveDraft() {
    try {
      var data = serializeProject();
      // 图片过大时丢弃图片仅存参数，避免超出 localStorage 配额
      if (data.state.image && data.state.image.length > 1600000) { data.state.image = null; }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch (e) { /* 配额超限等，静默忽略 */ }
  }
  function restoreDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) { return; }
      var data = JSON.parse(raw);
      if (data && data.state) { applyProjectData(data); }
    } catch (e) { /* 忽略损坏的草稿 */ }
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

  /* =====================================================================
   * BM-2 辅助：换图队列加载、下单指引文本
   * =================================================================== */

  function fallbackImg(file, done) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { done(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); };
    img.onerror = function () { URL.revokeObjectURL(url); toast(L('队列图片加载失败')); };
    img.src = url;
  }

  function loadQueueFiles(files) {
    for (var i = 0; i < files.length; i++) {
      (function (file) {
        if (!file || !file.type || file.type.indexOf('image/') !== 0) { return; }
        function done(src, w, h) { addQueueItem(src, w, h, file.name || (L('图') + (state.queue.length + 1))); }
        if (typeof createImageBitmap === 'function') {
          createImageBitmap(file).then(function (bmp) { done(bmp, bmp.width, bmp.height); })['catch'](function () { fallbackImg(file, done); });
        } else { fallbackImg(file, done); }
      })(files[i]);
    }
  }

  function updateGuideSpec() {
    var spec = getSpec(state.specId);
    var el = $('guideSpec');
    if (el) { el.textContent = L('规格：成品 ') + spec.diameter + L('mm · 出血 ') + spec.bleed + L('mm · 含出血 ') + spec.total + 'mm · 300 DPI'; }
  }

  function guideText() {
    var spec = getSpec(state.specId);
    // 用数组 join 组织多行：避免中文字面量里出现 \n 转义（站点 i18n 生成器按「整串字面量」匹配，含转义序列会静默漏翻）
    return [
      L('【badge-maker 工厂规范导出说明】'),
      L('规格：成品 ') + spec.diameter + L('mm，出血 ') + spec.bleed + L('mm，含出血 ') + spec.total + 'mm',
      L('分辨率：300 DPI（A4 拼版 ') + Math.round(mmToPx(A4_MM.w)) + '×' + Math.round(mmToPx(A4_MM.h)) + L('px）'),
      L('下单步骤：'),
      L('1. 导出 PNG / PDF 印刷稿（已含出血 / 裁切 / 安全区辅助线）'),
      L('2. 确认出血线外无重要内容、文字在安全区内'),
      L('3. 去柔造 / 1688「哇噢定制」等平台上传，选对应规格与工艺（亮面 / 哑膜）'),
      L('4. 无设备可直接平台打样邮寄；有设备自印')
    ].join('\n');
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
      toast(L('已复制下单指引'));
    } catch (e) { toast(L('复制失败，请手动选择文本')); }
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

    /* ---------- 形状 / 版型（BM-3 #8） ---------- */
    var shapeGroup = $('shapeGroup');
    if (shapeGroup) {
      shapeGroup.addEventListener('click', function (e) {
        var t = e.target;
        if (t && t.tagName === 'BUTTON' && t.getAttribute('data-shape')) {
          var sh = t.getAttribute('data-shape');
          if (sh === state.shape) { return; }
          state.shape = sh;
          var pills = shapeGroup.querySelectorAll('.pill');
          for (var i = 0; i < pills.length; i++) { pills[i].classList.toggle('active', pills[i] === t); }
          renderAll();
          scheduleDraftSave();
        }
      });
    }

    /* ---------- 文字层（BM-1 P0-1） ---------- */
    function applyTextChange() {
      renderAll();
      scheduleDraftSave();
    }
    if ($('swText')) {
      $('swText').addEventListener('change', function (e) {
        state.text.enabled = e.target.checked;
        applyTextChange();
      });
    }
    var textIds = ['txtTop', 'txtBottom', 'txtCenter'];
    for (var ti = 0; ti < textIds.length; ti++) {
      (function (id) {
        var key = id === 'txtTop' ? 'top' : (id === 'txtBottom' ? 'bottom' : 'center');
        $(id).addEventListener('input', function (e) {
          state.text[key] = e.target.value;
          applyTextChange();
        });
      })(textIds[ti]);
    }
    if ($('txtSize')) {
      $('txtSize').addEventListener('input', function (e) {
        state.text.sizeRatio = clamp(parseFloat(e.target.value) / 100, 0.04, 0.30);
        $('txtSizeVal').textContent = Math.round(state.text.sizeRatio * 100) + '%';
        paintRange($('txtSize'));
        applyTextChange();
      });
    }
    if ($('txtColor')) {
      $('txtColor').addEventListener('input', function (e) { state.text.color = e.target.value; applyTextChange(); });
    }
    if ($('swStroke')) {
      $('swStroke').addEventListener('change', function (e) { state.text.stroke = e.target.checked; applyTextChange(); });
    }
    if ($('txtStrokeColor')) {
      $('txtStrokeColor').addEventListener('input', function (e) { state.text.strokeColor = e.target.value; applyTextChange(); });
    }
    if ($('txtStrokeW')) {
      $('txtStrokeW').addEventListener('input', function (e) {
        state.text.strokeRatio = clamp(parseFloat(e.target.value) / 100, 0, 0.30);
        $('txtStrokeWVal').textContent = Math.round(state.text.strokeRatio * 100) + '%';
        paintRange($('txtStrokeW'));
        applyTextChange();
      });
    }

    /* ---------- 底纹工艺（BM-1 P0-2） ---------- */
    if ($('specialSwitch')) {
      $('specialSwitch').addEventListener('click', function (e) {
        var t = e.target;
        if (t && t.tagName === 'BUTTON' && t.getAttribute('data-special')) {
          opts.special = t.getAttribute('data-special');
          var btns = $('specialSwitch').querySelectorAll('button');
          for (var bi = 0; bi < btns.length; bi++) {
            btns[bi].classList.toggle('active', btns[bi] === t);
          }
          renderAll();
          scheduleDraftSave();
        }
      });
    }

    /* ---------- 工程 保存/载入（BM-1 P0-3） ---------- */
    if ($('btnSaveProject')) { $('btnSaveProject').addEventListener('click', saveProject); }
    if ($('btnLoadProject')) { $('btnLoadProject').addEventListener('click', function () { $('projInput').click(); }); }
    if ($('projInput')) {
      $('projInput').addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (f) { loadProjectFromFile(f); }
        e.target.value = '';
      });
    }

    /* ---------- 边框素材（BM-2 #4） ---------- */
    var borderGroup = $('borderGroup');
    if (borderGroup) {
      borderGroup.addEventListener('click', function (e) {
        var t = e.target;
        if (t && t.tagName === 'BUTTON' && t.getAttribute('data-border')) {
          state.border.id = t.getAttribute('data-border');
          var pills = borderGroup.querySelectorAll('.pill');
          for (var i = 0; i < pills.length; i++) { pills[i].classList.toggle('active', pills[i] === t); }
          renderAll();
          scheduleDraftSave();
        }
      });
    }
    if ($('borderColor')) {
      $('borderColor').addEventListener('input', function () {
        state.border.color = this.value;
        renderAll();
        scheduleDraftSave();
      });
    }

    /* ---------- 徽章颜色（并入站点版能力） ---------- */
    if ($('bgColor')) {
      $('bgColor').addEventListener('input', function () {
        state.bgColor = this.value;
        renderAll();
        scheduleDraftSave();
      });
    }
    if ($('rimColor')) {
      $('rimColor').addEventListener('input', function () {
        state.rimColor = this.value;
        renderAll();
        scheduleDraftSave();
      });
    }

    /* ---------- 换图队列（BM-2 #5） ---------- */
    if ($('swQueue')) {
      $('swQueue').addEventListener('change', function () {
        opts.useQueue = this.checked;
        updateQueueHint();
        renderAll();
        scheduleDraftSave();
      });
    }
    if ($('btnAddQueue')) { $('btnAddQueue').addEventListener('click', function () { $('queueInput').click(); }); }
    if ($('queueInput')) {
      $('queueInput').addEventListener('change', function (e) {
        if (e.target.files && e.target.files.length) { loadQueueFiles(e.target.files); }
        e.target.value = '';
      });
    }

    /* ---------- PDF 导出（BM-2 #7） ---------- */
    if ($('btnExportA4PDF')) { $('btnExportA4PDF').addEventListener('click', exportA4PDF); }

    /* ---------- 工厂规范 & 下单指引（BM-2 #6） ---------- */
    if ($('btnGuideToggle')) {
      $('btnGuideToggle').addEventListener('click', function () {
        var body = $('guideBody');
        var open = body.classList.toggle('open');
        $('btnGuideToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    if ($('btnCopyGuide')) {
      $('btnCopyGuide').addEventListener('click', function () {
        var text = guideText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { toast(L('已复制下单指引')); }, function () { fallbackCopy(text); });
        } else { fallbackCopy(text); }
      });
    }

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

    /* ---------- 全屏切换 ---------- */
    var fsBtn = $('btnFullscreen');
    var fsExitBtn = $('fsExitBtn');
    function fsCurrent() {
      return document.fullscreenElement || document.webkitFullscreenElement || null;
    }
    function fsEnter() {
      var el = document.documentElement;
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!req) { return; }
      try {
        var p = req.call(el);
        if (p && typeof p.catch === 'function') { p.catch(function () {}); }
      } catch (e) { /* 忽略：可能被 iframe 策略拦截 */ }
    }
    function fsExit() {
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) { try { ex.call(document); } catch (e) {} }
    }
    function fsToggle() { if (fsCurrent()) { fsExit(); } else { fsEnter(); } }
    function fsSync() {
      var on = !!fsCurrent();
      document.body.classList.toggle('is-fullscreen', on);
      if (fsBtn) {
        fsBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        var lbl = fsBtn.querySelector('.fs-label');
        if (lbl) { lbl.textContent = on ? L('退出全屏') : L('全屏'); }
      }
      // 尺寸变化后重绘画布（兜底 resize 事件）
      window.dispatchEvent(new Event('resize'));
    }
    if (fsBtn) { fsBtn.addEventListener('click', fsToggle); }
    if (fsExitBtn) { fsExitBtn.addEventListener('click', fsExit); }
    document.addEventListener('fullscreenchange', fsSync);
    document.addEventListener('webkitfullscreenchange', fsSync);

    /* ---------- 分享角标 + 本地 AI 辅助（BM-3 #10 / #9） ---------- */
    if ($('swShare')) {
      $('swShare').addEventListener('change', function (e) {
        opts.shareBadge = e.target.checked;
        scheduleDraftSave();
      });
    }
    if ($('btnRemoveBg')) { $('btnRemoveBg').addEventListener('click', function () { removeBackground(40); }); }
    if ($('btnEnhance')) { $('btnEnhance').addEventListener('click', function () { enhanceImage(); }); }

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

    syncCountPills();
    syncUIFromState();
    updateUndoRedoUI();
    switchMode('preview');
    renderAll();
    restoreDraft();         // 自动恢复本地草稿（若有）
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();