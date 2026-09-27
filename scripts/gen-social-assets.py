#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scripts/gen-social-assets.py -- 社交分享图与 iOS 主屏图标生成器

背景（2026-09-23 深度视觉审查报告 P1-5 / P2-8）：
  (b) og:image 指向 assets/logo.svg（360x90 SVG）-> 社交平台普遍不支持 SVG 预览图，
      且推荐尺寸为 1200x630 位图。本脚本产出 assets/og-image.png。
  (c) 缺 apple-touch-icon（构建期注入指向 SVG，iOS 不支持）-> 本脚本产出
      assets/apple-touch-icon.png（180x180）。

设计契约（色值全部来自设计令牌，禁止自创色值）：
  --brand-blue       #007AFF   <- css/tokens.css :13
  --brand-blue-dark  #0056CC   <- css/tokens.css :14
  渐变使用品牌蓝阶两端点（#007AFF / #0056CC），方向 135deg。
  D7 决策（2026-08-26）：纯 #007AFF 单一品牌蓝阶，禁止紫值回归 —— 本脚本不含任何紫值。

几何图形复用站内既有品牌资产，条件做两处适配：
  1. 几何取 assets/favicon.svg（120x120 的"小尺寸方形标志"），而不是 assets/logo.svg。
     理由：logo.svg 的工具宽 7/400、且带一条贯穿的接缝凹槽，缩到 <=180px 时细工具会退化成
     "天线"、接缝会退化成"屏幕线"，站内自己也是用 favicon.svg 这一版去做 <=32px 的标签页图标。
     三个交付物（分享图锁定行小图形 / 分享图右侧大图形 / 主屏图标）统一用这一套几何，
     保证同一张分享图里不会出现两个版本的品牌图形。
  2. 单色化：分享图与图标需要白色前景，原 favicon 的琥珀 / 绿点缀在蓝底上会破坏单一
     品牌蓝阶，故统一为白色（箱盖纯白、箱体白 0.88），箱扣落在蓝阶深色端 --brand-blue-dark。
     形状不变，只换颜色。

字号策略：本文件是 1200x630 的营销位图，非 UI 界面。全部字号 = 站内字号令牌 x 1.5
（--fs-4xl 48 -> 72 / --fs-2xl 24 -> 36 / --fs-xl 20 -> 30），
避免"图片自创一套字号"，同时与 css/tokens.css 的 --fs-* 阶梯保持可追溯关系。

对比度策略（WCAG 2.1 AA，正文阈值 4.5:1）：
  白字直接压在纯 #007AFF 上只有 4.02:1，**不达标**。本脚本组合使用两种手段：
    手段 1（选项 1，主导）：把 135deg 渐变的深端 #0056CC 放在左上 -> 全部文字落在
        渐变的深色一侧，白字基线对比度从 4.02:1 抬到 5.03:1；
    手段 2（选项 3，兜底）：文字侧再叠一层 alpha=0.10 的黑色半透明衬底。黑色遮罩只降
        亮度、不改色相，因此画面仍是纯正品牌蓝阶，而白字实测对比度 >= 5.2:1。
  脚本渲染完成后会**读回落盘的 PNG**，逐像素扫描每个文字包围盒底下的真实背景色，
  计算生效文字色（含 alpha 合成）对背景的最小对比度并断言 >= 4.5。
  背景色必须取自"同坐标的无文字底板"渲染：直接在成品图上扫，会把白色字形像素当成
  背景，得到 1.00 的假数值（本脚本 v1 就踩过这个坑，故拆成底板量对比度 + 成品验字形）。

字体：
  中文 -- C:/Windows/Fonts/Deng.ttf（等线 Regular）/ Dengb.ttf（等线 Bold，同族）
  拉丁 -- C:/Windows/Fonts/arial.ttf / arialbd.ttf
  （全部本机字体，无网络字体依赖）

用法（运行目录 = 仓库根）：
  C:/Users/thinZ/.workbuddy/binaries/python/envs/default/Scripts/python.exe scripts/gen-social-assets.py

产出：
  assets/og-image.png          1200x630  RGB  <= 300 KB
  assets/apple-touch-icon.png  180x180   RGB  （不透明，圆角由 iOS 裁切）
"""

import math
import os
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

# ============================================================
# 一、设计令牌（与 css/tokens.css 同值，禁止自创）
# ============================================================

BRAND_BLUE = (0, 0x7A, 0xFF)          # css/tokens.css --brand-blue       #007AFF
BRAND_BLUE_DARK = (0, 0x56, 0xCC)     # css/tokens.css --brand-blue-dark  #0056CC

# 文字侧半透明衬底：纯黑只降亮度、不改色相，合成结果仍是品牌蓝阶
SCRIM_COLOR = (0, 0, 0)
SCRIM_ALPHA_MAX = 0.10
SCRIM_FADE_START = 640.0 / 1200.0
SCRIM_FADE_END = 880.0 / 1200.0

# 白色前景字阶（alpha 越低对比度越低，最低一档 0.90 实测仍有 >= 5.4:1）
WHITE_FULL = (255, 255, 255, 255)      # 品牌站名 / 主主张
WHITE_SUB = (255, 255, 255, 230)       # 0.90 拉丁副行
WHITE_BODY = (255, 255, 255, 240)      # 0.94 副主张
WHITE_MICRO = (255, 255, 255, 235)     # 0.92 具体工具名 / 域名
RULE_COLOR = (255, 255, 255, 64)       # 分隔细线

# 文案（全部取自站点真实内容，无虚构指标）
# og:title 与 assets/logo.svg 的站名均为「工具箱里」（INSIDE THE TOOLBOX），
# 分享图必须与站内品牌标识一致，故沿用站点自身品牌名。
BRAND_ZH = "工具箱里"
BRAND_EN = "INSIDE THE TOOLBOX"
HEADLINE_ZH = "免费在线计算器与文本工具集"
SUBHEAD_ZH = "浏览器本地处理，数据不上传"
TOOLS_ZH = "房贷 · 个税 · BMI · 图片压缩 · JSON 格式化"
DOMAIN_EN = "www.calc-tools.top"

FONT_ZH = "C:/Windows/Fonts/Deng.ttf"        # 等线 Regular
FONT_ZH_BOLD = "C:/Windows/Fonts/Dengb.ttf"  # 等线 Bold
FONT_LATIN = "C:/Windows/Fonts/arial.ttf"
FONT_LATIN_BOLD = "C:/Windows/Fonts/arialbd.ttf"

OUT_OG = "assets/og-image.png"
OUT_ATI = "assets/apple-touch-icon.png"

OG_W, OG_H = 1200, 630
OG_BUDGET = 300 * 1024

ATI_SIZE = 180
ATI_SAFE_MARGIN = 18   # iOS 会自行裁圆角，图形四周必须留 >= 18px 安全边距

# 品牌图形几何来源（站内三套既有品牌资产，按"尺寸场景"取用，不新造形状）：
#   assets/logo.svg     400x380  大尺寸方形标志（含箱体/箱盖/接缝/箱扣/螺丝刀/铅笔）
#   assets/favicon.svg  120x120  小尺寸方形标志（紧凑箱体 + 加粗工具，无接缝凹槽）
# 分享图右侧的大图形用 logo.svg 的完整几何；锁定行与主屏图标都是 <=180px 的小尺寸场景，
# 用 favicon.svg 的紧凑几何（工具更粗，60px 下才认得出是工具箱而不是"天线"）。
FAV_BOX = (20.0, 14.734653, 100.0, 103.0)    # favicon.svg 几何包围盒（含旋转后工具）
FAV_W = FAV_BOX[2] - FAV_BOX[0]
FAV_H = FAV_BOX[3] - FAV_BOX[1]

# 品牌图形调色板（三处图形复用，保证同一套语言）。
# 注意 favicon.svg 这一版几何没有接缝凹槽（logo.svg 才有），故调色板只有四个槽位。
MARK_PAL = {
    "body": (255, 255, 255, 224),      # 箱体白 0.88，与箱盖形成层次
    "lid": WHITE_FULL,                 # 箱盖纯白
    "latch": BRAND_BLUE_DARK + (235,), # 箱扣回落到 --brand-blue-dark 深色端
    "tool": WHITE_FULL,                # 螺丝刀 / 铅笔纯白
}


# ============================================================
# 二、对比度计算（WCAG 2.1）
# ============================================================

def _chan_to_lin(v):
    """单个 sRGB 通道 -> 线性值（WCAG 2.1 官方系数的字面实现）。"""
    c = v / 255.0
    if c <= 0.03928:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def rel_luminance(rgb):
    return 0.2126 * _chan_to_lin(rgb[0]) + 0.7152 * _chan_to_lin(rgb[1]) + 0.0722 * _chan_to_lin(rgb[2])


def contrast_ratio(c1, c2):
    l1, l2 = rel_luminance(c1), rel_luminance(c2)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)


def over(fg_rgba, bg_rgb):
    """把带 alpha 的前景色合成到背景上，得到**生效颜色**（对比度实测必须用这个值）。"""
    a = fg_rgba[3] / 255.0 if len(fg_rgba) == 4 else 1.0
    return tuple(round(fg_rgba[i] * a + bg_rgb[i] * (1.0 - a)) for i in range(3))


# ============================================================
# 三、基础绘制工具
# ============================================================

def _lerp(a, b, t):
    return a + (b - a) * t


def gradient_rgb(w, h, c1, c2, deg):
    """线性渐变。先在小画布算好再双三次上采样：避免逐像素 Python 循环，且天然无 banding。"""
    sw, sh = 64, 34
    ang = math.radians(deg)
    ux, uy = math.sin(ang), -math.cos(ang)   # SVG 约定：0deg 朝上，90deg 朝右
    corners = [(0.0, 0.0), (1.0, 0.0), (0.0, 1.0), (1.0, 1.0)]
    vals = [x * ux + y * uy for x, y in corners]
    lo, hi = min(vals), max(vals)

    small = Image.new("RGB", (sw, sh))
    px = small.load()
    for y in range(sh):
        for x in range(sw):
            t = (x / (sw - 1.0) * ux + y / (sh - 1.0) * uy - lo) / (hi - lo)
            t = min(1.0, max(0.0, t))
            px[x, y] = (
                round(_lerp(c1[0], c2[0], t)),
                round(_lerp(c1[1], c2[1], t)),
                round(_lerp(c1[2], c2[2], t)),
            )
    return small.resize((w, h), Image.BICUBIC)


def alpha_mask_h(w, h, stops):
    """水平方向 alpha 蒙版。stops = [(x_ratio, alpha_ratio), ...] 升序。"""
    row = Image.new("L", (w, 1))
    px = row.load()
    for x in range(w):
        r = x / (w - 1.0)
        a = stops[-1][1]
        for i in range(len(stops) - 1):
            r0, a0 = stops[i]
            r1, a1 = stops[i + 1]
            if r <= r1:
                k = 0.0 if r1 == r0 else (r - r0) / (r1 - r0)
                a = _lerp(a0, a1, min(1.0, max(0.0, k)))
                break
        px[x, 0] = round(a * 255)
    return row.resize((w, h), Image.NEAREST)


def radial_alpha_mask(w, h, cx, cy, radius, peak):
    """径向柔光蒙版（右上角一层极淡白色高光，给纯渐变一点纵深）。"""
    sw, sh = 60, 32
    small = Image.new("L", (sw, sh))
    px = small.load()
    for y in range(sh):
        for x in range(sw):
            dx = x / (sw - 1.0) * w - cx
            dy = y / (sh - 1.0) * h - cy
            d = math.hypot(dx, dy) / radius
            px[x, y] = round((0.0 if d >= 1.0 else (1.0 - d) ** 2) * peak * 255)
    return small.resize((w, h), Image.BICUBIC)


def load_font(path, size):
    return ImageFont.truetype(path, size)


def is_latin(ch):
    """拉丁 / 半角标点走 Arial，其余（CJK、全角标点）走等线。"""
    return ord(ch) < 0x2E80


def ink_metrics(text, font, tracked=0.0):
    """返回 (宽度, 相对基线的墨迹上沿, 相对基线的墨迹下沿)。

    PIL 的 font.getbbox 是相对 ascender 原点的，而 draw.text(anchor="ls") 的原点在
    baseline；两者相差一个 ascent。直接拿 getbbox 的 y 去算居中会把文字整体下移一个
    ascent（本脚本 v1 的实测 bug：72px 站名的墨迹盒从 y=144 漂到 y=184）。
    """
    ascent, _ = font.getmetrics()
    if tracked and len(text) > 1:
        w = 0.0
        top, bottom = None, None
        for ch in text:
            bb = font.getbbox(ch)
            top = bb[1] if top is None else min(top, bb[1])
            bottom = bb[3] if bottom is None else max(bottom, bb[3])
            w += font.getlength(ch) + tracked
        w -= tracked
        return w, top - ascent, bottom - ascent
    bb = font.getbbox(text)
    return bb[2] - bb[0], bb[1] - ascent, bb[3] - ascent


def draw_delta_line(layer, text, font, x, baseline_y, fill, tracked=0.0):
    """逐字绘制以实现 letter-spacing（PIL 无原生字距）。返回结束时的 x。"""
    d = ImageDraw.Draw(layer)
    cur = x
    for ch in text:
        d.text((cur, baseline_y), ch, font=font, fill=fill, anchor="ls")
        cur += font.getlength(ch) + tracked
    return cur


def draw_line(layer, text, font, x, center_y, fill, tracked=0.0):
    """在给定视觉中心线上绘制一行，返回墨迹包围盒 (x0,y0,x1,y1) 供对比度实测。"""
    w, top, bottom = ink_metrics(text, font, tracked)
    baseline = center_y - (top + bottom) / 2.0
    draw_delta_line(layer, text, font, x, baseline, fill, tracked)
    return (
        int(x),
        int(math.floor(baseline + top)),
        int(math.ceil(x + w)),
        int(math.ceil(baseline + bottom)),
    )


def draw_mixed_line(layer, text, size, cjk_path, latin_path, x, center_y, fill, tracked=0.0):
    """中英混排行（如「房贷 · 个税 · BMI」）：按脚本切字体，共用同一条基线。"""
    d = ImageDraw.Draw(layer)
    cjk = load_font(cjk_path, size)
    latin = load_font(latin_path, size)

    runs = []
    for ch in text:
        kind = "latin" if is_latin(ch) else "cjk"
        if runs and runs[-1][0] == kind:
            runs[-1][1] += ch
        else:
            runs.append([kind, ch])

    total = 0.0
    top_most, bottom_most = None, None
    for kind, run in runs:
        f = latin if kind == "latin" else cjk
        ascent, _ = f.getmetrics()
        for ch in run:
            total += f.getlength(ch) + tracked
            bb = f.getbbox(ch)
            t, b = bb[1] - ascent, bb[3] - ascent
            top_most = t if top_most is None else min(top_most, t)
            bottom_most = b if bottom_most is None else max(bottom_most, b)
    total -= tracked

    baseline = center_y - (top_most + bottom_most) / 2.0
    cur = x
    for kind, run in runs:
        f = latin if kind == "latin" else cjk
        for ch in run:
            d.text((cur, baseline), ch, font=f, fill=fill, anchor="ls")
            cur += f.getlength(ch) + tracked

    return (
        int(x),
        int(math.floor(baseline + top_most)),
        int(math.ceil(x + total)),
        int(math.ceil(baseline + bottom_most)),
    )


# ============================================================
# 四、品牌图形（复用 logo.svg 的箱体几何，单色化）
# ============================================================

def _rot(pts, cx, cy, deg, dx=0.0, dy=0.0):
    """SVG 语义的 rotate(deg, cx, cy) + translate(dx, dy)。"""
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    out = []
    for (x, y) in pts:
        rx, ry = x - cx, y - cy
        out.append((cx + rx * ca - ry * sa + dx, cy + rx * sa + ry * ca + dy))
    return out


def draw_mark(layer, ox, oy, scale, pal, stroke=None, stroke_w=0):
    """favicon.svg 的紧凑几何。

    全部三个交付物都用这一套几何，保证同一张分享图里的"锁定行小图形"与"右侧大图形"
    是同一个形状，不会出现两个版本的标志。
    ox/oy = 目标包围盒左上角；scale = 1 个 viewBox 单位对应多少像素。
    """
    d = ImageDraw.Draw(layer)
    sw = max(1, int(round(stroke_w))) if stroke else 0

    def T(x, y):
        return (ox + (x - FAV_BOX[0]) * scale, oy + (y - FAV_BOX[1]) * scale)

    def R(x0, y0, x1, y1, radius, fill, corners=None):
        d.rounded_rectangle(
            [T(x0, y0), T(x1, y1)],
            radius=max(0.0, radius * scale),
            fill=fill,
            outline=stroke,
            width=sw,
            corners=corners,
        )

    R(20, 55, 100, 103, 8, pal["body"])                                      # 箱体
    R(20, 25, 100, 55, 14, pal["lid"], corners=(True, True, False, False))   # 箱盖
    R(48, 52, 72, 60, 2, pal["latch"])                                       # 箱扣
    # 螺丝刀：favicon.svg rect(35,15,6x28) rotate(-15deg, 38, 30)
    d.polygon(
        [T(*p) for p in _rot([(35, 15), (41, 15), (41, 43), (35, 43)], 38, 30, -15)],
        fill=pal["tool"],
        outline=stroke,
        width=sw,
    )
    # 铅笔：favicon.svg g translate(72,22) rotate(20deg) 内 rect(-4,0,7x25)
    d.polygon(
        [T(*p) for p in _rot([(-4, 0), (3, 0), (3, 25), (-4, 25)], 0, 0, 20, 72, 22)],
        fill=pal["tool"],
        outline=stroke,
        width=sw,
    )


# ============================================================
# 五、og 分享图 1200x630
# ============================================================

def build_og():
    W, H = OG_W, OG_H

    # 1) 品牌蓝 135deg 渐变。深端 #0056CC 置于左上 -> 左对齐的文字整体落在深色一侧，
    #    白字对比度从 4.02:1（压在 #007AFF 上）抬到 >= 5.0:1。
    bg = gradient_rgb(W, H, BRAND_BLUE_DARK, BRAND_BLUE, 135).convert("RGBA")

    # 2) 右上极淡白色柔光，给纯渐变一点纵深（文字在左侧，不影响文字对比度）
    glow = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    glow.putalpha(radial_alpha_mask(W, H, W * 0.96, H * -0.06, 640, 0.12))
    bg = Image.alpha_composite(bg, glow)

    # 3) 文字侧 alpha=0.10 半透明黑色衬底（只降亮度、不改色相 -> 仍是品牌蓝阶）
    scrim = Image.new("RGBA", (W, H), SCRIM_COLOR + (255,))
    scrim.putalpha(
        alpha_mask_h(
            W, H,
            [(0.0, SCRIM_ALPHA_MAX), (SCRIM_FADE_START, SCRIM_ALPHA_MAX), (SCRIM_FADE_END, 0.0), (1.0, 0.0)],
        )
    )
    bg = Image.alpha_composite(bg, scrim)

    # 4) 右侧品牌图形：整只箱体的线稿（等大、不裁切），填充极淡 + 描边压线，
    #    既是品牌呼应也把右半幅的空场收住；alpha 远低于文字层，不与文案争夺注意力。
    mark_h = 320.0
    mark_w = mark_h * (FAV_W / FAV_H)
    ghost = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    draw_mark(
        ghost,
        ox=OG_W - 96.0 - mark_w,
        oy=(H - mark_h) / 2.0,
        scale=mark_h / FAV_H,
        pal={
            "body": (255, 255, 255, 12),
            "lid": (255, 255, 255, 16),
            "seam": (255, 255, 255, 20),
            "latch": (255, 255, 255, 20),
            "tool": (255, 255, 255, 14),
        },
        stroke=(255, 255, 255, 88),
        stroke_w=4,
    )
    bg = Image.alpha_composite(bg, ghost)

    # 5) 文字层
    text = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    pad = 96
    boxes = []

    # 5a) 品牌锁定行：图形 + 站名 + 拉丁副行（与站内 header 的 logo-h.svg 同一结构）
    mark_h_small = 112.0
    mark_w_small = mark_h_small * (FAV_W / FAV_H)
    lock_cy = 162.0
    draw_mark(text, ox=float(pad), oy=lock_cy - mark_h_small / 2.0, scale=mark_h_small / FAV_H, pal=MARK_PAL)

    word_x = pad + mark_w_small + 34.0
    f_word = load_font(FONT_ZH_BOLD, 72)        # --fs-4xl 48 x 1.5
    f_latin_sub = load_font(FONT_LATIN_BOLD, 18)
    boxes.append(("品牌站名 72px", draw_line(text, BRAND_ZH, f_word, word_x, 144.0, WHITE_FULL, 72 * 0.02)))
    boxes.append(("拉丁副行 18px", draw_line(text, BRAND_EN, f_latin_sub, word_x, 201.0, WHITE_SUB, 18 * 0.22)))

    # 5b) 分隔细线
    ImageDraw.Draw(text).rectangle([pad, 267, pad + 420, 269], fill=RULE_COLOR)

    # 5c) 价值主张 + 具体工具名 + 域名
    f_head = load_font(FONT_ZH_BOLD, 36)        # --fs-2xl 24 x 1.5
    f_sub = load_font(FONT_ZH, 30)              # --fs-xl 20 x 1.5
    f_micro = load_font(FONT_LATIN_BOLD, 18)
    boxes.append(("主主张 36px", draw_line(text, HEADLINE_ZH, f_head, pad, 344.0, WHITE_FULL, 0.0)))
    boxes.append(("副主张 30px", draw_line(text, SUBHEAD_ZH, f_sub, pad, 400.0, WHITE_BODY, 0.0)))
    boxes.append(("工具名 18px", draw_mixed_line(text, TOOLS_ZH, 18, FONT_ZH, FONT_LATIN_BOLD, pad, 450.0, WHITE_MICRO, 0.0)))
    boxes.append(("域名 18px", draw_line(text, DOMAIN_EN, f_micro, pad, 522.0, WHITE_MICRO, 18 * 0.06)))

    final = Image.alpha_composite(bg, text).convert("RGB")
    return final, bg.convert("RGB"), boxes


# ============================================================
# 六、apple-touch-icon 180x180
# ============================================================

def build_ati():
    size = ATI_SIZE
    # iOS 会自己裁圆角，且不接受透明通道，故背景满幅出血、输出不透明 RGB
    bg = gradient_rgb(size, size, BRAND_BLUE, BRAND_BLUE_DARK, 135).convert("RGBA")

    inner = size - ATI_SAFE_MARGIN * 2          # 144px 安全区
    scale = inner / FAV_H                       # 等比：以高度贴合安全区
    mark_w = FAV_W * scale
    ox = (size - mark_w) / 2.0
    oy = float(ATI_SAFE_MARGIN)

    layer = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw_mark(layer, ox=ox, oy=oy, scale=scale, pal=MARK_PAL)

    final = Image.alpha_composite(bg, layer).convert("RGB")
    margins = {
        "left": ox,
        "top": oy,
        "right": size - (ox + mark_w),
        "bottom": size - (oy + inner),
    }
    return final, bg.convert("RGB"), margins


# ============================================================
# 七、保存与实测校验
# ============================================================

def save_png(img, path, budget=None):
    """常规 RGB PNG 优先；超预算再退化为 256 色自适应调色板（含抖动）。返回 (字节数, 是否量化)。"""
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    nbytes = os.path.getsize(path)
    if budget is None or nbytes <= budget:
        return nbytes, False
    img.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(path, "PNG", optimize=True)
    return os.path.getsize(path), True


def min_contrast_over_bbox(img_rgb, box, fg_rgba):
    """扫描包围盒内每个像素：生效文字色 vs 该像素背景 的最小对比度。"""
    px = img_rgb.load()
    x0 = max(0, box[0]); y0 = max(0, box[1])
    x1 = min(img_rgb.width - 1, box[2]); y1 = min(img_rgb.height - 1, box[3])
    worst = 99.0
    worst_bg = None
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            bg = px[x, y]
            c = contrast_ratio(over(fg_rgba, bg), bg)
            if c < worst:
                worst, worst_bg = c, bg
    return worst, worst_bg


def ink_presence(img_rgb, box, fg_rgba):
    """证明文字确实被画上了：包围盒内应存在接近生效文字色的像素。"""
    px = img_rgb.load()
    target = rel_luminance(over(fg_rgba, (0, 0, 0)))
    best = 0.0
    for y in range(max(0, box[1]), min(img_rgb.height - 1, box[3]) + 1):
        for x in range(max(0, box[0]), min(img_rgb.width - 1, box[2]) + 1):
            d = abs(rel_luminance(px[x, y]) - target)
            best = max(best, 1.0 - d)
    return best


def report_text_contrast(path, bg_path, boxes, fg_map):
    """双重实测：
      1) 对比度 -- 在**同坐标的纯底板**上逐像素取背景色（底板无文字，才是真实背景；
         直接在成品图上取会把白色字形像素当成背景，得到 1.00 的假数值）。
      2) 字形存在 -- 在成品图上确认包围盒内确有接近生效文字色的像素（防止漏画 / 错位）。
    """
    ok = True
    final = Image.open(path).convert("RGB")
    plane = Image.open(bg_path).convert("RGB")
    print(f"{'文字元素':<16}{'墨迹包围盒(x0,y0,x1,y1)':<28}{'生效文字色':<16}{'最亮背景':<14}{'最小对比度':<12}{'AA 4.5':<8}{'字形存在':<8}")
    for name, box in boxes:
        fg = fg_map[name]
        worst, worst_bg = min_contrast_over_bbox(plane, box, fg)
        presence = ink_presence(final, box, fg)
        passed = worst >= 4.5 and presence >= 0.70
        ok = ok and passed
        print(
            f"{name:<16}{str(box):<28}{str(over(fg, worst_bg)):<16}{str(worst_bg):<14}"
            f"{worst:<12.2f}{('PASS' if passed else 'FAIL'):<8}{presence:<8.2f}"
        )
    return ok


def main():
    ok = True

    print("=" * 96)
    print("assets/og-image.png  (1200x630)")
    print("=" * 96)
    og_final, og_plane, og_boxes = build_og()
    fg_map = {
        "品牌站名 72px": WHITE_FULL,
        "拉丁副行 18px": WHITE_SUB,
        "主主张 36px": WHITE_FULL,
        "副主张 30px": WHITE_BODY,
        "工具名 18px": WHITE_MICRO,
        "域名 18px": WHITE_MICRO,
    }
    og_bytes, og_quant = save_png(og_final, OUT_OG, OG_BUDGET)
    # 临时底板文件（仅用于对比度复测，写完即删，不污染仓库）
    plane_path = os.path.join(tempfile.gettempdir(), "gen-social-bg-plane.png")
    save_png(og_plane, plane_path, None)
    og_img = Image.open(OUT_OG)
    print(f"文件: {OUT_OG}")
    print(f"字节: {og_bytes}  ({og_bytes / 1024:.1f} KB)   预算 {OG_BUDGET / 1024:.0f} KB   "
          f"{'[OK]' if og_bytes <= OG_BUDGET else '[FAIL]'}")
    print(f"尺寸: {og_img.width}x{og_img.height}   模式: {og_img.mode}   调色板量化: {'是' if og_quant else '否'}")
    if og_bytes > OG_BUDGET or og_img.size != (OG_W, OG_H):
        ok = False
    print("-" * 96)
    ok = report_text_contrast(OUT_OG, plane_path, og_boxes, fg_map) and ok
    print("-" * 96)
    print(f"  渐变端点 左上(应近 --brand-blue-dark #0056CC): {og_plane.getpixel((0, 0))}")
    print(f"  渐变端点 右下(应近 --brand-blue      #007AFF): {og_plane.getpixel((OG_W - 1, OG_H - 1))}")
    os.remove(plane_path)

    print()
    print("=" * 96)
    print(f"assets/apple-touch-icon.png  ({ATI_SIZE}x{ATI_SIZE})")
    print("=" * 96)
    ati_final, ati_plane, ati_margins = build_ati()
    ati_bytes, ati_quant = save_png(ati_final, OUT_ATI, None)
    ati_img = Image.open(OUT_ATI)
    print(f"文件: {OUT_ATI}")
    print(f"字节: {ati_bytes}  ({ati_bytes / 1024:.1f} KB)   尺寸: {ati_img.width}x{ati_img.height}   "
          f"模式: {ati_img.mode}   调色板量化: {'是' if ati_quant else '否'}")
    if ati_img.size != (ATI_SIZE, ATI_SIZE):
        ok = False
    print("安全边距(要求 >= 18px): "
          + "  ".join(f"{k}={v:.1f}px" for k, v in ati_margins.items())
          + f"   {'[OK]' if min(ati_margins.values()) >= ATI_SAFE_MARGIN - 0.01 else '[FAIL]'}")
    if min(ati_margins.values()) < ATI_SAFE_MARGIN - 0.01:
        ok = False

    # 图标图形 = 非文本图形元素，适用 WCAG 2.1 非文本对比度 3.0:1。
    # 对比度同样在"无图形底板"上取背景色；前景取整套图形里 alpha 最低的箱体（0.88），
    # 即最不利情形。
    inner = ATI_SIZE - ATI_SAFE_MARGIN * 2
    scale = inner / FAV_H
    mark_w = FAV_W * scale
    ox = (ATI_SIZE - mark_w) / 2.0
    box = (int(ox), ATI_SAFE_MARGIN, int(math.ceil(ox + mark_w)), ATI_SIZE - ATI_SAFE_MARGIN)
    worst, worst_bg = min_contrast_over_bbox(ati_plane, box, MARK_PAL["body"])
    presence = ink_presence(ati_img.convert("RGB"), box, MARK_PAL["body"])
    print("-" * 96)
    print(f"图形包围盒: {box}   最亮背景: {worst_bg}   白形最小对比度: {worst:.2f}   "
          f"阈值(非文本) 3.0:1   {'PASS' if worst >= 3.0 else 'FAIL'}   图形存在: {presence:.2f}")
    if worst < 3.0 or presence < 0.70:
        ok = False

    print()
    print("=" * 96)
    print(f"总判定: {'PASS' if ok else 'FAIL'}")
    print("=" * 96)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
