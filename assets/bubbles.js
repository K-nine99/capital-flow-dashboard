// 板块资金流 · 动态气泡可视化引擎（v3 水体模型）
// 中心水平线 = 水面：正资金气泡浮出水面，负资金气泡沉入水底，物理弹簧运动模拟真实浮沉
(function () {
  'use strict';

  /* ================= 数据 ================= */
  // 指数（同花顺 iFinD，2026-08-13 收盘）
  var INDICES = [
    { n: '上证指数', v: '3926.96', c: -0.50 },
    { n: '深证成指', v: '14289.44', c: -0.87 },
    { n: '创业板指', v: '3586.04', c: -0.45 },
    { n: '科创50', v: '1717.75', c: -1.11 },
    { n: '沪深300', v: '4663.95', c: -0.57 }
  ];

  // 当日真实分时收盘点位（同花顺 iFinD，2026-08-13，10 分钟粒度，[分钟偏移, 点位]）
  // 真实走势：上午高开上涨、午后回落、尾盘跳水收跌；指数条按此真实路径演化
  var INTRADAY = {
    '上证指数': [[10,3965.79],[20,3965.57],[30,3963.70],[40,3964.71],[50,3965.37],[60,3960.59],[70,3962.93],[80,3963.67],[90,3962.31],[100,3961.32],[110,3962.02],[120,3963.15],[210,3967.90],[220,3963.58],[230,3966.73],[240,3964.84],[250,3958.44],[260,3955.15],[270,3957.88],[280,3954.51],[290,3950.39],[300,3934.52],[310,3931.27],[330,3926.96]],
    '深证成指': [[10,14523.68],[20,14524.21],[30,14540.09],[40,14573.65],[50,14562.76],[60,14548.50],[70,14518.80],[80,14508.02],[90,14517.68],[100,14501.79],[110,14499.68],[120,14519.97],[210,14550.98],[220,14526.36],[230,14547.82],[240,14537.12],[250,14482.77],[260,14459.33],[270,14481.74],[280,14448.58],[290,14433.37],[300,14340.95],[310,14319.85],[330,14289.44]],
    '创业板指': [[10,3640.93],[20,3652.13],[30,3657.45],[40,3672.48],[50,3670.82],[60,3669.07],[70,3654.16],[80,3650.85],[90,3656.74],[100,3651.33],[110,3651.07],[120,3660.25],[210,3669.78],[220,3661.85],[230,3668.92],[240,3660.04],[250,3643.07],[260,3636.53],[270,3645.27],[280,3633.74],[290,3631.86],[300,3604.53],[310,3595.48],[330,3586.04]],
    '科创50': [[10,1767.34],[20,1766.63],[30,1764.19],[40,1773.27],[50,1774.24],[60,1772.08],[70,1762.49],[80,1763.81],[90,1765.51],[100,1766.73],[110,1770.06],[120,1770.03],[210,1781.95],[220,1769.51],[230,1772.83],[240,1765.28],[250,1757.36],[260,1751.78],[270,1756.53],[280,1748.90],[290,1744.74],[300,1728.74],[310,1721.59],[330,1717.75]],
    '沪深300': [[10,4718.43],[20,4717.60],[30,4717.37],[40,4721.16],[50,4720.40],[60,4715.95],[70,4714.83],[80,4714.31],[90,4713.22],[100,4710.85],[110,4710.17],[120,4714.06],[210,4720.53],[220,4716.95],[230,4722.61],[240,4720.94],[250,4708.40],[260,4702.09],[270,4706.51],[280,4698.92],[290,4695.51],[300,4673.29],[310,4669.33],[330,4663.95]]
  };

  // 板块当日真实分时（同花顺概念指数，2026-08-13，10 分钟粒度，[分钟偏移, 点位]）
  // 每个板块按自身真实盘中节奏演化；未列出的板块用上证指数分时作为真实市场节奏代理
  var SECTOR_TREND = {
    '华为概念': [[10,3496.68],[20,3498.04],[30,3500.14],[40,3500.21],[50,3493.75],[60,3487.62],[70,3478.13],[80,3476.14],[90,3479.05],[100,3472.18],[110,3471.09],[120,3477.54],[210,3485.08],[220,3478.13],[230,3483.61],[240,3482.87],[250,3473.70],[260,3470.16],[270,3472.70],[280,3466.94],[290,3461.83],[300,3441.00],[310,3434.57],[330,3425.24]],
    '低空经济': [[10,2069.62],[20,2070.85],[30,2071.16],[40,2069.29],[50,2066.53],[60,2063.45],[70,2062.04],[80,2060.26],[90,2062.07],[100,2059.01],[110,2058.87],[120,2062.51],[210,2063.64],[220,2059.97],[230,2062.60],[240,2063.45],[250,2059.24],[260,2058.18],[270,2058.84],[280,2055.55],[290,2052.06],[300,2040.69],[310,2036.68],[330,2031.52]],
    '机器人': [[10,3925.50],[20,3928.13],[30,3930.43],[40,3930.67],[50,3925.37],[60,3918.51],[70,3915.57],[80,3913.48],[90,3917.60],[100,3911.25],[110,3911.04],[120,3916.79],[210,3920.96],[220,3913.98],[230,3918.60],[240,3918.28],[250,3909.37],[260,3906.85],[270,3908.52],[280,3902.69],[290,3895.23],[300,3873.59],[310,3866.84],[330,3856.76]],
    '东数西算(算力)': [[10,2241.55],[20,2243.55],[30,2243.25],[40,2243.86],[50,2239.50],[60,2236.12],[70,2227.68],[80,2225.64],[90,2227.03],[100,2222.43],[110,2221.41],[120,2225.24],[210,2231.42],[220,2227.45],[230,2231.79],[240,2232.07],[250,2225.09],[260,2222.10],[270,2223.86],[280,2219.15],[290,2215.70],[300,2201.46],[310,2197.15],[330,2191.25]],
    '人形机器人': [[10,2428.41],[20,2430.08],[30,2432.78],[40,2435.12],[50,2432.59],[60,2428.45],[70,2423.41],[80,2420.07],[90,2423.05],[100,2419.73],[110,2418.57],[120,2422.31],[210,2425.46],[220,2419.41],[230,2421.64],[240,2421.02],[250,2414.01],[260,2412.43],[270,2415.26],[280,2410.70],[290,2405.63],[300,2391.31],[310,2386.06],[330,2378.75]],
    '小米概念': [[10,2088.95],[20,2088.75],[30,2088.59],[40,2091.51],[50,2089.47],[60,2086.43],[70,2079.86],[80,2078.81],[90,2081.74],[100,2078.42],[110,2077.59],[120,2081.11],[210,2086.27],[220,2081.61],[230,2085.56],[240,2083.96],[250,2077.63],[260,2074.84],[270,2076.92],[280,2072.52],[290,2069.85],[300,2056.17],[310,2052.64],[330,2045.96]],
    '锂电池': [[10,1917.39],[20,1914.14],[30,1914.37],[40,1914.28],[50,1912.34],[60,1908.89],[70,1907.81],[80,1907.31],[90,1909.28],[100,1906.56],[110,1905.98],[120,1909.06],[210,1910.86],[220,1907.93],[230,1909.93],[240,1911.43],[250,1906.08],[260,1905.56],[270,1906.93],[280,1904.25],[290,1901.15],[300,1889.58],[310,1886.48],[330,1881.48]],
    '稀土永磁': [[10,3612.13],[20,3599.34],[30,3599.73],[40,3599.13],[50,3591.46],[60,3583.91],[70,3579.75],[80,3580.21],[90,3583.57],[100,3577.16],[110,3580.56],[120,3583.78],[210,3584.01],[220,3576.33],[230,3578.32],[240,3582.76],[250,3572.64],[260,3569.64],[270,3572.17],[280,3564.53],[290,3556.84],[300,3539.06],[310,3531.41],[330,3521.99]],
    '算力租赁': [[10,1451.69],[20,1453.49],[30,1454.20],[40,1452.33],[50,1448.28],[60,1445.06],[70,1439.42],[80,1438.30],[90,1437.74],[100,1434.03],[110,1432.92],[120,1435.65],[210,1438.62],[220,1436.60],[230,1439.93],[240,1440.02],[250,1435.33],[260,1433.38],[270,1434.14],[280,1431.35],[290,1429.30],[300,1421.11],[310,1418.38],[330,1414.60]],
    '创新药': [[10,1330.58],[20,1336.24],[30,1346.73],[40,1344.43],[50,1338.07],[60,1341.35],[70,1358.14],[80,1363.48],[90,1365.59],[100,1366.56],[110,1373.08],[120,1376.60],[210,1369.87],[220,1372.92],[230,1373.48],[240,1369.42],[250,1369.37],[260,1367.32],[270,1367.62],[280,1367.39],[290,1364.56],[300,1356.35],[310,1355.74],[330,1354.60]],
    '存储芯片': [[10,2692.00],[20,2689.59],[30,2685.67],[40,2703.82],[50,2708.66],[60,2703.50],[70,2684.27],[80,2681.21],[90,2688.85],[100,2687.73],[110,2685.70],[120,2689.25],[210,2701.10],[220,2684.58],[230,2686.81],[240,2677.86],[250,2666.16],[260,2662.41],[270,2669.41],[280,2660.40],[290,2656.37],[300,2630.60],[310,2621.56],[330,2610.29]],
    '光伏设备': [[10,7536.81],[20,7523.30],[30,7516.30],[40,7491.63],[50,7478.05],[60,7453.45],[70,7471.83],[80,7462.69],[90,7471.04],[100,7456.95],[110,7453.12],[120,7467.98],[210,7467.96],[220,7465.35],[230,7469.22],[240,7476.21],[250,7462.82],[260,7453.68],[270,7453.78],[280,7442.68],[290,7425.85],[300,7384.46],[310,7373.20],[330,7350.21]],
    '白酒': [[10,6171.42],[20,6207.21],[30,6213.11],[40,6191.74],[50,6188.87],[60,6190.40],[70,6214.70],[80,6226.02],[90,6220.30],[100,6219.47],[110,6217.62],[120,6218.87],[210,6203.22],[220,6207.35],[230,6206.88],[240,6210.95],[250,6211.49],[260,6209.72],[270,6203.20],[280,6201.19],[290,6189.54],[300,6170.88],[310,6171.86],[330,6161.47]],
    '卫星互联网': [[10,4544.66],[20,4545.49],[30,4542.70],[40,4545.91],[50,4539.51],[60,4533.45],[70,4523.29],[80,4514.55],[90,4519.35],[100,4511.80],[110,4511.60],[120,4520.27],[210,4525.68],[220,4513.53],[230,4521.51],[240,4521.65],[250,4510.49],[260,4506.69],[270,4510.57],[280,4504.85],[290,4497.48],[300,4469.74],[310,4459.99],[330,4444.54]]
  };

  // 概念板块主力资金净流入（亿元，正值流入 / 负值流出，2026-08-13 收盘）
  // 数据来源：同花顺 iFinD
  var SECTORS = [
    { name: '算力租赁', flow: 47.67 },
    { name: '东数西算(算力)', flow: 15.92 },
    { name: '证券', flow: 6.11 },
    { name: '白酒', flow: 4.19 },
    { name: '医药商业', flow: 4.03 },
    { name: '卫星互联网', flow: 2.00 },
    { name: '锂电池', flow: -1.66 },
    { name: '创新药', flow: -2.78 },
    { name: 'AIGC', flow: -2.89 },
    { name: '国防军工', flow: -7.38 },
    { name: '影视院线', flow: -7.88 },
    { name: '光伏设备', flow: -14.52 },
    { name: '半导体设备', flow: -17.09 },
    { name: '光刻机', flow: -18.16 },
    { name: '5G', flow: -23.12 },
    { name: '稀土永磁', flow: -28.96 },
    { name: '人工智能', flow: -30.74 },
    { name: '小米概念', flow: -32.67 },
    { name: 'MLCC', flow: -33.54 },
    { name: '消费电子', flow: -51.43 },
    { name: '低空经济', flow: -62.37 },
    { name: '半导体', flow: -73.07 },
    { name: '人形机器人', flow: -76.51 },
    { name: '黄金', flow: -84.86 },
    { name: '新能源汽车', flow: -90.90 },
    { name: '存储芯片', flow: -101.87 },
    { name: '机器人', flow: -103.30 },
    { name: '华为概念', flow: -123.13 },
    { name: '有色金属', flow: -143.15 }
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
  var MAX_ABS = 143.15; // 有色金属，全市场最大资金量（净流出）
  var lastLegMin = -100; // 上次刷新板块标签的盘中时间（分钟），-100 保证首帧即刷新
  var playing = true;
  var speed = 22; // 默认 22x：开盘→收盘约 15 秒
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
      .sort(function (a, b) { return b.flow - a.flow; })
      .slice(0, 12); // 流入取排名前 12（不足 12 取实际数量）
    var outGrp = SECTORS.filter(function (s) { return s.flow < 0; })
      .sort(function (a, b) { return Math.abs(b.flow) - Math.abs(a.flow); })
      .slice(0, 12); // 流出取排名前 12（不足 12 取实际数量）

    // 环绕轨道半径（占画布宽比例，5 层分布：从 0.20 起环绕，与居中大板块保持间距，最大 0.28 不超边界）
    function radiiFor(n) {
      var layers = 5;
      var per = Math.max(1, Math.ceil(n / layers));
      var arr = [];
      for (var i = 0; i < n; i++) {
        var layer = Math.min(layers - 1, Math.floor(i / per));
        arr.push(0.20 + layer * 0.02);
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

    pushGroup(inGrp, radiiFor(inGrp.length - 1), 0.30, true);   // 水上中心：最大流入板块居中
    pushGroup(outGrp, radiiFor(outGrp.length - 1), 0.70, true); // 水下中心：最大流出板块居中
  }

  /* ================= 日内演化 ================= */
  // 板块当日资金轨迹：真实分时驱动（板块概念指数分时 → 当日进度 0~1）
  // 盘中资金流 = 收盘主力净流入 × 板块指数进度 (p-p0)/(pe-p0)，收盘精确回到收盘值
  // 未单独收录的板块用上证指数分时作为真实市场节奏代理
  function flowAt(b, now) {
    var arr = SECTOR_TREND[b.s.name] || INTRADAY['上证指数'];
    if (!arr || !arr.length) { // 兜底：无分时数据时退化为累积曲线模拟
      var base = b.s.flow * (0.05 + 0.95 * curveAt(now));
      var decay = 1 - now / TRADE_LEN;
      return base + b.s.flow * 0.08 * Math.sin(now / 22 + b.phase) * decay;
    }
    var p0 = arr[0][1], pe = arr[arr.length - 1][1];
    var d = pe - p0;
    if (Math.abs(d) < 1e-6) return b.s.flow * curveAt(now); // 板块指数几乎平盘
    return b.s.flow * ((seriesAt(arr, now) - p0) / d);
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

  // 公共：对 [分钟偏移, 数值] 系列按 x 线性插值取点
  function seriesAt(arr, x) {
    if (!arr || !arr.length) return 0;
    if (x <= arr[0][0]) return arr[0][1];
    if (x >= arr[arr.length - 1][0]) return arr[arr.length - 1][1];
    var lo = 0, hi = arr.length - 1;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (arr[mid][0] <= x) lo = mid; else hi = mid;
    }
    var f = (x - arr[lo][0]) / (arr[hi][0] - arr[lo][0]);
    return arr[lo][1] + (arr[hi][1] - arr[lo][1]) * f;
  }

  // 指数盘中演化：按当日真实分时点位（INTRADAY）线性插值，涨跌幅相对昨收实时计算
  // now 为盘中分钟偏移（0~330）；无分时数据时退化为平滑模拟（开盘价 → 收盘价）
  function indexAt(d, now) {
    var arr = INTRADAY[d.n];
    var prevClose = d.v / (1 + d.c / 100); // 昨收 = 收盘 / (1 + 收盘涨跌幅)
    if (!arr || !arr.length) {
      var pct0 = d.c * curveAt(now);
      return { price: prevClose * (1 + pct0 / 100), pct: pct0 };
    }
    var price = seriesAt(arr, now);
    return { price: price, pct: (price / prevClose - 1) * 100 };
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

    // 板块名（楷书，显示全称，字号随气泡大小自适应，不超出气泡边界，超长自动分行）
    var fs = Math.max(7, Math.min(15, r * 0.26));
    var nameTxt = b.s.name;
    var maxW = Math.max(14, r * 1.35); // 文本最大宽度（气泡内径留边距）
    var twoLines = false;
    ctx.font = '700 ' + fs + 'px "KaiTi","STKaiti","楷体","Kaiti SC",serif';
    while (ctx.measureText(nameTxt).width > maxW && fs > 6) {
      fs -= 1;
      ctx.font = '700 ' + fs + 'px "KaiTi","STKaiti","楷体","Kaiti SC",serif';
    }
    if (ctx.measureText(nameTxt).width > maxW && nameTxt.length > 2) {
      // 全称过长且已到最小字号 → 拆成两行显示（仍为全称）
      var mid = Math.ceil(nameTxt.length / 2);
      var line1 = nameTxt.slice(0, mid);
      var line2 = nameTxt.slice(mid);
      while ((ctx.measureText(line1).width > maxW || ctx.measureText(line2).width > maxW) && fs > 6) {
        fs -= 1;
        ctx.font = '700 ' + fs + 'px "KaiTi","STKaiti","楷体","Kaiti SC",serif';
      }
      twoLines = true;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillText(line1, x, y - fs * 0.95);
      ctx.fillText(line2, x, y + fs * 0.15);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillText(nameTxt, x, y - fs * 0.58);
    }

    // 金额（等宽字体，随气泡动态放大——气泡变大数字同步变大，突出显示）
    var fs2 = Math.max(8, Math.min(24, r * 0.36));
    ctx.font = fs2 + 'px GeistMono,monospace';
    var amtTxt = (f >= 0 ? '+' : '') + fmtYi(f);
    while (ctx.measureText(amtTxt).width > maxW && fs2 > 6) {
      fs2 -= 0.5;
      ctx.font = fs2 + 'px GeistMono,monospace';
    }
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(amtTxt, x, y + (twoLines ? fs * 1.0 : fs * 0.62));
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
        tMin = 0;          // 循环播放：播完自动重播，保证指数/板块始终可见动态变化
        lastLegMin = -100; // 重播首帧立即刷新指数条与板块标签
      }
    } else {
      lastTs = 0;
    }
    time += 1 / 60;

    var now = tMin;

    // 更新气泡轨道运动：最大板块固定中心，其余板块沿椭圆轨道环绕
    var sumIn = 0, sumOut = 0, nIn = 0, nOut = 0;
    var ORBIT_SPEED = Math.PI * 2 * 2 / TRADE_LEN; // 2 圈 / 交易日（高倍速下降低环绕速度，便于看清板块）
    bubbles.forEach(function (b) {
      var f = flowAt(b, now);
      b.f = f;

      // 气泡大小（按当前资金量：最大板块居中突出，上限收紧避免贴边）
      var ratio = Math.sqrt(Math.abs(f) / MAX_ABS);
      b.r = 12 + ratio * Math.min(38, H * 0.12);

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

    // 上方指数条与板块标签随日内时间动态变化（盘中每 10 分钟刷新一次）
    if (now - lastLegMin >= 10) {
      lastLegMin = now;
      renderIndices(now);
      renderLegend();
    }

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

  /* ================= 顶部指数条 / 板块标签 ================= */
  // 板块标签（上方流入 / 下方流出 各前 6）：随日内时间动态更新排名
  // 盘中以气泡当前资金量计算，盘前（bubbles 未构建）回退到收盘数据
  function renderLegend() {
    var pool = bubbles.length ? bubbles : SECTORS.map(function (s) { return { f: s.flow, s: s }; });
    var inTop = pool.filter(function (b) { return b.f >= 0; })
      .sort(function (a, b) { return b.f - a.f; }).slice(0, 6);
    var outTop = pool.filter(function (b) { return b.f < 0; })
      .sort(function (a, b) { return Math.abs(b.f) - Math.abs(a.f); }).slice(0, 6);
    elInLeg.innerHTML = inTop.map(function (b) { return '<span style="color:#ff8a83">' + b.s.name + '</span>'; }).join('');
    elOutLeg.innerHTML = outTop.map(function (b) { return '<span style="color:#6fd8a5">' + b.s.name + '</span>'; }).join('');
  }

  // 顶部指数条：随日内时间动态显示盘中点位与涨跌幅（开盘 0% 平滑过渡到收盘值）
  function renderIndices(now) {
    elIdx.innerHTML = INDICES.map(function (d) {
      var it = indexAt(d, now);
      var cls = it.pct > 0 ? 'up-txt' : (it.pct < 0 ? 'down-txt' : '');
      return '<div class="idx-chip"><span class="n">' + d.n + '</span><span class="v">' + it.price.toFixed(2) + '</span><span class="c ' + cls + '">' + (it.pct > 0 ? '+' : '') + it.pct.toFixed(2) + '%</span></div>';
    }).join('');
  }

  function renderChrome() {
    renderIndices(0);
    renderLegend();
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
