// 板块资金流 · 动态气泡可视化引擎（v3 水体模型）
// 中心水平线 = 水面：正资金气泡浮出水面，负资金气泡沉入水底，物理弹簧运动模拟真实浮沉
(function () {
  'use strict';

  /* ================= 数据 ================= */
  // 指数（同花顺 iFinD，2026-08-12 收盘）
  var INDICES = [
    { n: '上证指数', v: '3946.68', c: 0.32 },
    { n: '深证成指', v: '14414.43', c: 1.09 },
    { n: '创业板指', v: '3602.08', c: 1.49 },
    { n: '科创50', v: '1736.99', c: 1.61 },
    { n: '沪深300', v: '4690.92', c: 0.58 }
  ];

  // 概念板块主力资金净流入（亿元，正值流入 / 负值流出，2026-08-12 收盘）
  // 数据来源：同花顺 iFinD
  var SECTORS = [
    { name: '5G', flow: 169.27 },
    { name: '新能源汽车', flow: 139.74 },
    { name: '华为概念', flow: 131.95 },
    { name: '存储芯片', flow: 93.26 },
    { name: '消费电子', flow: 86.96 },
    { name: '半导体', flow: 69.77 },
    { name: '低空经济', flow: 60.56 },
    { name: '机器人', flow: 59.70 },
    { name: '人形机器人', flow: 57.60 },
    { name: '小米概念', flow: 45.62 },
    { name: '东数西算(算力)', flow: 31.41 },
    { name: '人工智能', flow: 27.16 },
    { name: '光伏设备', flow: 17.10 },
    { name: '锂电池', flow: 16.74 },
    { name: '半导体设备', flow: 8.12 },
    { name: '白酒', flow: 6.19 },
    { name: '影视院线', flow: 2.76 },
    { name: '光刻机', flow: 2.74 },
    { name: '有色金属', flow: 2.52 },
    { name: '卫星互联网', flow: 1.90 },
    { name: '医药商业', flow: 0.82 },
    { name: 'MLCC', flow: -15.65 },
    { name: '算力租赁', flow: -14.46 },
    { name: 'AIGC', flow: -12.20 },
    { name: '创新药', flow: -11.65 },
    { name: '稀土永磁', flow: -6.01 },
    { name: '黄金', flow: -5.50 },
    { name: '证券', flow: -1.18 },
    { name: '国防军工', flow: -0.73 }
  ];

  // 日内累积曲线：相对 09:30 的分钟偏移 -> 累计进度(0~1)
  var CURVE = [
    [0, 0.00], [5, 0.05], [15, 0.13], [30, 0.27], [60, 0.42],
    [90, 0.52], [120, 0.60], [150, 0.60], [180, 0.66], [210, 0.74],
    [240, 0.84], [255, 0.92], [270, 0.97], [300, 1.00]
  ];

  var TRADE_START = 9 * 60 + 30;
  var TRADE_END = 15 * 60;
  var TRADE_LEN = TRADE_END - TRADE_START;

  /* ================= 工具 ================= */
  function seeded(i) {
    var x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function curveAt(tMin) {
    var x = Math.max(0, Math.min(TRADE_LEN, tMin));
    var p = CURVE, n = p.length;
    if (x <= p[0][0]) return p[0][1];
    for (var i = 1; i < n; i++) {
      if (x <= p[i][0]) {
        var f = (x - p[i - 1][0]) / (p[i][0] - p[i - 1][0]);
        return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * f;
      }
    }
    return p[n - 1][1];
  }

  function timeFmt(tMin) {
    var h = Math.floor(tMin / 60), m = Math.round(tMin % 60);
    if (m === 60) { h++; m = 0; }
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function phaseOf(tMin) {
    if (tMin < 10 * 60) return '开盘 · 资金快速入场';
    if (tMin < 11 * 60 + 30) return '早盘 · 板块分化显现';
    if (tMin < 13 * 60) return '午间休市 · 资金沉淀';
    if (tMin < 14 * 60 + 30) return '午后 · 资金持续轮动';
    return '尾盘 · 资金加速轮动';
  }

  // 纯数字格式：统一以"亿"为单位（如 116.7亿 / 18.3亿 / 7.59亿 / 0.43亿）
  function fmtYi(v) {
    var abs = Math.abs(v);
    if (abs >= 100) return v.toFixed(1) + '亿';
    if (abs >= 10) return v.toFixed(1) + '亿';
    return v.toFixed(2) + '亿';
  }

  function shortName(name) {
    return name.length > 4 ? name.slice(0, 2) + '…' : name;
  }

  // 颜色插值（红 ↔ 绿，k: 0=绿 1=红）
  function lerpColor(k) {
    // 红 RGB(240,71,63)  绿 RGB(47,182,114)
    var r = Math.round(47 + (240 - 47) * k);
    var g = Math.round(182 + (71 - 182) * k);
    var b = Math.round(114 + (63 - 114) * k);
    return [r, g, b];
  }

  /* ================= 状态 ================= */
  var MAX_ABS = 169.27; // 5G 概念，全市场最大资金量
  var playing = true;
  var speed = 4;
  var tMin = 0;
  var lastTs = 0;
  var time = 0; // 动画时间（秒），用于波浪/漂移

  /* ================= DOM ================= */
  var cv = document.getElementById('cv-main');
  var ctx = cv.getContext('2d');
  var tip = document.getElementById('tip');
  var btnPlay = document.getElementById('btn-play');
  var tlRange = document.getElementById('tl-range');
  var tlTime = document.getElementById('tl-time');
  var tlMeta = document.querySelector('.tl-meta');
  var elInSum = document.getElementById('in-sum');
  var elInCnt = document.getElementById('in-cnt');
  var elOutSum = document.getElementById('out-sum');
  var elOutCnt = document.getElementById('out-cnt');
  var elInLeg = document.getElementById('in-legend');
  var elOutLeg = document.getElementById('out-legend');
  var elIdx = document.getElementById('idx-strip');
  var waterline = document.getElementById('waterline');
  var elTpCur = document.getElementById('tp-cur');
  var elTpFill = document.getElementById('tp-fill');
  var elTpPct = document.getElementById('tp-pct');
  var elTpLeft = document.getElementById('tp-left');

  var W = 0, H = 0, DPR = 1;
  var midY = 0;
  var bubbles = [];

  function resize() {
    DPR = window.devicePixelRatio || 1;
    var rect = cv.parentElement.getBoundingClientRect();
    W = Math.max(320, rect.width);
    H = Math.max(240, rect.height);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    midY = H * 0.5;
    waterline.style.top = midY + 'px';
    buildBubbles();
  }

  function buildBubbles() {
    bubbles = [];
    var inGrp = SECTORS.filter(function (s) { return s.flow > 0; })
      .sort(function (a, b) { return b.flow - a.flow; });
    var outGrp = SECTORS.filter(function (s) { return s.flow < 0; })
      .sort(function (a, b) { return Math.abs(b.flow) - Math.abs(a.flow); });

    // 环绕轨道半径（占画布宽比例，5 层分布，最大 0.28 保证气泡与光晕不超画布边界）
    function radiiFor(n) {
      var layers = 5;
      var per = Math.max(1, Math.ceil(n / layers));
      var arr = [];
      for (var i = 0; i < n; i++) {
        var layer = Math.min(layers - 1, Math.floor(i / per));
        arr.push(0.14 + layer * 0.035);
      }
      return arr;
    }

    function pushGroup(group, radii, centerY, fixFirst) {
      group.forEach(function (s, idx) {
        var fixed = fixFirst && idx === 0; // 最大板块固定在中心
        bubbles.push({
          s: s,
          f: s.flow,
          r: 20,
          x: W * 0.5,
          y: H * centerY,
          vy: 0,
          fixed: fixed,
          cx: 0.5,
          cy: centerY,
          orbit: fixed ? 0 : (radii[idx] || 0.30),
          angle: seeded(idx * 17 + 5) * Math.PI * 2,
          speedMul: 0.75 + (idx % 5) * 0.12,
          phase: seeded(idx * 7 + 3) * 6.28,
          wobble: seeded(idx * 11 + 4) * 6.28
        });
      });
    }

    pushGroup(inGrp, radiiFor(inGrp.length - 1), 0.30, true);   // 水上中心
    pushGroup(outGrp, radiiFor(outGrp.length - 1), 0.72, true); // 水下中心
  }

  /* ================= 日内演化 ================= */
  // 板块当日资金轨迹：收盘值 × 累积曲线 + 日内噪声（收盘前衰减为 0，保证与真实数据一致）
  // 噪声幅度足以让中小板块盘中出现短暂变号 → 气泡穿越水面（浮出/沉入）
  function flowAt(b, now) {
    var base = b.s.flow * (0.05 + 0.95 * curveAt(now));
    var decay = 1 - now / TRADE_LEN; // 越接近收盘噪声越小
    var noise = b.s.flow * 0.14 * Math.sin(now / 22 + b.phase) * decay
              + Math.abs(b.s.flow) * 0.06 * Math.sin(now / 7 + b.wobble) * decay;
    return base + noise;
  }

  // 平衡深度：按资金量大小决定离水面的距离（资金越大浮得越高/沉得越深）
  function targetYOf(b, f) {
    var depth = 0.14 + Math.sqrt(Math.abs(f) / MAX_ABS) * 0.30;
    var sign = f >= 0 ? -1 : 1; // 水上为负方向（y 向上）
    var ty = midY + sign * depth * H;
    var topPad = 0.11 * H, botPad = 0.11 * H;
    if (ty < topPad + b.r) ty = topPad + b.r;
    if (ty > H - botPad - b.r) ty = H - botPad - b.r;
    return ty;
  }

  /* ================= 背景绘制 ================= */
  function drawBackground(nowSec) {
    // 水上（空气层）：暗色微红
    var sky = ctx.createLinearGradient(0, 0, 0, midY);
    sky.addColorStop(0, 'rgba(16,10,16,0.9)');
    sky.addColorStop(1, 'rgba(30,16,20,0.35)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, midY);

    // 水下（水体层）：深蓝渐变 + 光线
    var sea = ctx.createLinearGradient(0, midY, 0, H);
    sea.addColorStop(0, 'rgba(14,34,58,0.92)');
    sea.addColorStop(0.5, 'rgba(9,24,44,0.88)');
    sea.addColorStop(1, 'rgba(4,12,26,0.95)');
    ctx.fillStyle = sea;
    ctx.fillRect(0, midY, W, H - midY);

    // 水下斜向光柱
    ctx.save();
    for (var i = 0; i < 4; i++) {
      var gx = W * (0.12 + i * 0.24) + Math.sin(nowSec * 0.3 + i * 2) * 30;
      var grad = ctx.createLinearGradient(gx, midY, gx + 60, H);
      grad.addColorStop(0, 'rgba(140,200,255,0.10)');
      grad.addColorStop(1, 'rgba(140,200,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(gx, midY);
      ctx.lineTo(gx + 40, H);
      ctx.lineTo(gx + 90, H);
      ctx.lineTo(gx + 14, midY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 水面波浪线（双层）
    ctx.beginPath();
    for (var x = 0; x <= W; x += 4) {
      var wy = midY + Math.sin(x * 0.008 + nowSec * 0.0016) * 5 + Math.sin(x * 0.021 - nowSec * 0.0021) * 3;
      if (x === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
    }
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(150,205,255,0.55)';
    ctx.stroke();
    ctx.beginPath();
    for (var x2 = 0; x2 <= W; x2 += 4) {
      var wy2 = midY + Math.sin(x2 * 0.012 + nowSec * 0.0012 + 2) * 3.5;
      if (x2 === 0) ctx.moveTo(x2, wy2); else ctx.lineTo(x2, wy2);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(150,205,255,0.22)';
    ctx.stroke();

    // 水下环境小气泡（装饰）
    for (var b = 0; b < 14; b++) {
      var bx = ((seeded(b) * W) + nowSec * 6 * (0.4 + seeded(b + 50) * 0.8)) % W;
      var by = midY + 8 + ((seeded(b + 100) * 0.9 + (nowSec * 8 * (0.3 + seeded(b + 50) * 0.7)) % 0.9) * (H - midY - 14));
      var br = 1.5 + seeded(b + 200) * 3;
      ctx.globalAlpha = 0.16 + seeded(b + 300) * 0.2;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(160,215,255,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ================= 气泡绘制 ================= */
  function drawBubble(b, nowSec) {
    var f = b.f;
    var up = f >= 0; // 正资金 = 浮出水面
    var k = Math.min(1, Math.max(0, (midY - b.y) / (H * 0.5) + 0.5)); // 0=深水底(绿) 1=高空(红)
    var rgb = lerpColor(k);
    var col = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    var r = b.r;
    var x = b.x, y = b.y;

    // 光晕
    var g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r * 1.5);
    g.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.34)');
    g.addColorStop(0.6, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.10)');
    g.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 气泡主体（真实水泡质感：冷色环境反光 + 板块色渐变过渡）
    var body = ctx.createRadialGradient(x - r * 0.32, y - r * 0.38, r * 0.06, x, y, r);
    body.addColorStop(0, 'rgba(216,231,250,0.55)');   // 天空冷白反光
    body.addColorStop(0.26, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.42)');
    body.addColorStop(0.72, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.34)');
    body.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.16)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 水泡描边（单圈）
    ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 高光点（冷白，带环境色）
    ctx.fillStyle = 'rgba(226,240,255,0.78)';
    ctx.beginPath();
    ctx.arc(x - r * 0.34, y - r * 0.4, Math.max(1.5, r * 0.13), 0, Math.PI * 2);
    ctx.fill();

    // 板块名（楷书字体）
    var fs = Math.max(10, r * 0.28);
    ctx.font = '700 ' + fs + 'px "KaiTi","STKaiti","楷体","Kaiti SC",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillText(shortName(b.s.name), x, y - fs * 0.58);
    ctx.font = (fs * 0.82) + 'px GeistMono,monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText((f >= 0 ? '+' : '') + fmtYi(f), x, y + fs * 0.6);
  }

  /* ================= 碰撞分离（防重叠，保证文字可读） ================= */
  function resolveCollisions() {
    var i, j, a, b, dx, dy, d2, minD, d, overlap;
    for (var it = 0; it < 10; it++) {
      for (i = 0; i < bubbles.length; i++) {
        a = bubbles[i];
        for (j = i + 1; j < bubbles.length; j++) {
          b = bubbles[j];
          dx = b.x - a.x;
          dy = b.y - a.y;
          minD = a.r + b.r + 6; // 预留文字间距
          d2 = dx * dx + dy * dy;
          if (d2 > 0.01 && d2 < minD * minD) {
            d = Math.sqrt(d2);
            overlap = (minD - d) / d * 0.5;
            // 水平完全分离；垂直方向加强（分区钳制会兜底确保正负分层）
            a.x -= dx * overlap;
            b.x += dx * overlap;
            a.y -= dy * overlap * 0.6;
            b.y += dy * overlap * 0.6;
          }
        }
      }
    }
    // 边界约束（避开顶部/底部标题区）
    bubbles.forEach(function (b) {
      if (b.x < b.r + 6) b.x = b.r + 6;
      if (b.x > W - b.r - 6) b.x = W - b.r - 6;
      if (b.y < b.r + 0.10 * H) b.y = b.r + 0.10 * H;
      if (b.y > H - b.r - 0.10 * H) b.y = H - b.r - 0.10 * H;
    });

    // 分区保持：负资金气泡尽量保持在水面以下，正资金气泡保持在水面以上
    bubbles.forEach(function (b) {
      var gap = b.r * 0.35 + 5; // 气泡边缘到水面的最小间距
      if (b.f < 0 && b.y < midY + gap) b.y = midY + gap;
      if (b.f >= 0 && b.y > midY - gap) b.y = midY - gap;
    });
  }

  /* ================= 主循环 ================= */
  function tick(ts) {
    var dt = 0;
    if (playing) {
      if (!lastTs) lastTs = ts;
      dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      tMin += dt * speed;
      if (tMin >= TRADE_LEN) {
        tMin = TRADE_LEN;
        playing = false;
        btnPlay.textContent = '▶';
        btnPlay.classList.remove('playing');
      }
    } else {
      lastTs = 0;
    }
    time += 1 / 60;

    var now = tMin;

    // 更新气泡轨道运动：最大板块固定中心，其余板块沿椭圆轨道环绕
    var sumIn = 0, sumOut = 0, nIn = 0, nOut = 0;
    var ORBIT_SPEED = Math.PI * 2 * 6 / TRADE_LEN; // 6 圈 / 交易日（放缓环绕速度）
    bubbles.forEach(function (b) {
      var f = flowAt(b, now);
      b.f = f;

      // 气泡大小（按当前资金量，上限收紧避免贴边）
      var ratio = Math.sqrt(Math.abs(f) / MAX_ABS);
      b.r = 12 + ratio * Math.min(30, H * 0.10);

      var tx, ty;
      if (b.fixed) {
        // 中心固定 + 轻微呼吸浮动
        tx = W * b.cx;
        ty = H * b.cy + Math.sin(now / 25 + b.wobble) * 5;
      } else {
        // 椭圆轨道：水平半径 orbit，垂直幅度 0.40
        var ang = b.angle + now * ORBIT_SPEED * b.speedMul;
        tx = W * b.cx + W * b.orbit * Math.cos(ang);
        ty = H * b.cy + W * b.orbit * 0.40 * Math.sin(ang);
      }

      // 平滑跟随目标位置
      var k = Math.min(1, dt * 4.5);
      b.x += (tx - b.x) * k;
      b.y += (ty - b.y) * k;
      b.x += Math.sin(now / 18 + b.phase) * 3 * dt;

      // 边界约束
      if (b.x < b.r + 6) b.x = b.r + 6;
      if (b.x > W - b.r - 6) b.x = W - b.r - 6;
      if (b.y < b.r + 0.10 * H) b.y = b.r + 0.10 * H;
      if (b.y > H - b.r - 0.10 * H) b.y = H - b.r - 0.10 * H;

      if (f >= 0) { sumIn += f; nIn++; } else { sumOut += f; nOut++; }
    });

    // 防重叠碰撞分离
    resolveCollisions();

    // 绘制
    drawBackground(time);
    bubbles.forEach(function (b) { drawBubble(b, time); });

    // 汇总
    elInSum.textContent = '+' + sumIn.toFixed(2) + ' 亿';
    elInCnt.textContent = nIn + ' 个';
    elOutSum.textContent = sumOut.toFixed(2) + ' 亿';
    elOutCnt.textContent = nOut + ' 个';

    // 时间轴
    var timeTxt = timeFmt(TRADE_START + now);
    tlTime.textContent = timeTxt;
    tlRange.value = Math.round(now / TRADE_LEN * 1000);
    if (tlMeta) tlMeta.textContent = phaseOf(TRADE_START + now) + ' · 概念板块 · 同花顺 iFinD';

    // 右上角时间进度
    var pct = now / TRADE_LEN;
    elTpCur.textContent = timeTxt;
    elTpFill.style.width = (pct * 100).toFixed(1) + '%';
    elTpPct.textContent = Math.round(pct * 100) + '%';
    elTpLeft.textContent = pct >= 1 ? '已收盘' : '距收盘 ' + timeFmt(TRADE_LEN - now);

    requestAnimationFrame(tick);
  }

  /* ================= 交互 ================= */
  function hitTest(e) {
    var rect = cv.getBoundingClientRect();
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    var b = null;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var bb = bubbles[i];
      var dx = x - bb.x, dy = y - bb.y;
      if (dx * dx + dy * dy <= bb.r * bb.r) { b = bb; break; }
    }
    if (!b) { tip.style.display = 'none'; return; }
    var up = b.f >= 0;
    var color = up ? 'var(--up)' : 'var(--down)';
    var pct = (Math.abs(b.f) / MAX_ABS * 100).toFixed(1);
    tip.innerHTML =
      '<div class="n" style="color:' + color + '">' + b.s.name + '板块</div>' +
      '<div class="r" style="color:' + color + '">' + (up ? '+' : '') + fmtYi(b.f) + '</div>' +
      '<div class="d">资金强度 ' + pct + '% · ' + (up ? '净流入' : '净流出') + '</div>' +
      '<div class="bar"><i style="width:' + Math.min(100, pct) + '%;background:' + color + '"></i></div>';
    tip.style.display = 'block';
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - tw - 10, Math.max(6, e.clientX + 14)) + 'px';
    tip.style.top = (e.clientY - th - 12 < 6 ? e.clientY + 16 : e.clientY - th - 12) + 'px';
  }

  btnPlay.addEventListener('click', function () {
    playing = !playing;
    if (playing && tMin >= TRADE_LEN) tMin = 0;
    btnPlay.textContent = playing ? '⏸' : '▶';
    btnPlay.classList.toggle('playing', playing);
    lastTs = 0;
  });

  tlRange.addEventListener('input', function () {
    tMin = Number(this.value) / 1000 * TRADE_LEN;
  });

  document.querySelectorAll('.tl-speed button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tl-speed button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      speed = Number(b.getAttribute('data-spd'));
    });
  });

  cv.addEventListener('mousemove', hitTest);
  document.addEventListener('mousemove', function (e) {
    var r = cv.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
      tip.style.display = 'none';
    }
  });

  /* ================= 顶部指数条 / 底部板块标签 ================= */
  function renderChrome() {
    elIdx.innerHTML = INDICES.map(function (d) {
      var cls = d.c > 0 ? 'up-txt' : (d.c < 0 ? 'down-txt' : '');
      return '<div class="idx-chip"><span class="n">' + d.n + '</span><span class="v">' + d.v + '</span><span class="c ' + cls + '">' + (d.c > 0 ? '+' : '') + d.c.toFixed(2) + '%</span></div>';
    }).join('');

    var inTop = SECTORS.filter(function (s) { return s.flow > 0; })
      .sort(function (a, b) { return b.flow - a.flow; }).slice(0, 6);
    var outTop = SECTORS.filter(function (s) { return s.flow < 0; })
      .sort(function (a, b) { return Math.abs(b.flow) - Math.abs(a.flow); }).slice(0, 6);
    elInLeg.innerHTML = inTop.map(function (s) { return '<span style="color:#ff8a83">' + s.name + '</span>'; }).join('');
    elOutLeg.innerHTML = outTop.map(function (s) { return '<span style="color:#6fd8a5">' + s.name + '</span>'; }).join('');
  }

  /* ================= 启动 ================= */
  if (playing) {
    btnPlay.textContent = '⏸';
    btnPlay.classList.add('playing');
  }
  renderChrome();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(tick);
})();
