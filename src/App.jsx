import React, { useMemo, useState } from "react";

/*
  小资金交易决策系统 v3
  目标：新手小白直接从 Moomoo 找到原始数据，不做手算。
  设计：尽量用大白话，少术语；需要比较和计算的地方交给系统。
*/

function Icon({ children }) {
  return <span className="inline-flex h-5 w-5 items-center justify-center text-lg leading-none">{children}</span>;
}

function Card({ title, subtitle, icon, children }) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-slate-100 p-2">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function NumberInput({ label, value, onChange, prefix = "", suffix = "", hint = "" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3">
        {prefix && <span className="text-sm text-slate-500">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-2 py-3 text-sm outline-none"
        />
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-xs leading-5 text-slate-400">{hint}</span>}
    </label>
  );
}

function TextInput({ label, value, onChange, hint = "" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
      />
      {hint && <span className="mt-1 block text-xs leading-5 text-slate-400">{hint}</span>}
    </label>
  );
}

function Select({ label, value, onChange, options, hint = "" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs leading-5 text-slate-400">{hint}</span>}
    </label>
  );
}

function Toggle({ label, value, onChange, danger = false }) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm transition ${
        value
          ? danger
            ? "border-red-300 bg-red-50 text-red-900"
            : "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
      }`}
    >
      <span className="leading-5">{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0" />
    </label>
  );
}

function Info({ label, value, note = "", tone = "slate" }) {
  const cls = {
    slate: "bg-slate-50 text-slate-900",
    green: "bg-emerald-50 text-emerald-800",
    yellow: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-800",
  }[tone] || "bg-slate-50 text-slate-900";

  return (
    <div className={`rounded-xl p-3 ${cls}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
      {note && <p className="mt-1 text-xs leading-5 opacity-80">{note}</p>}
    </div>
  );
}

function ScoreBar({ label, value, max }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const sectorOptions = [
  { value: "semiconductor", label: "半导体：看 SMH 或 SOXX" },
  { value: "bigtech", label: "大型科技：看 QQQ 或 XLK" },
  { value: "software", label: "软件/云服务：看 IGV 或 QQQ" },
  { value: "ev", label: "电动车/消费成长：看 QQQ 或 XLY" },
  { value: "finance", label: "金融银行：看 XLF" },
  { value: "energy", label: "能源石油：看 XLE" },
  { value: "health", label: "医药医疗：看 XLV" },
  { value: "index", label: "我交易的是指数 ETF：直接看 SPY/QQQ" },
  { value: "other", label: "其他：自己选择最接近的板块 ETF" },
];

const setupOptions = [
  {
    value: "breakout",
    label: "横着憋了一段时间，今天带量往上冲出来",
  },
  {
    value: "pullback",
    label: "本来就在涨，回调几天后又重新往上走",
  },
  {
    value: "earnings",
    label: "财报已经公布，市场用上涨表示认可",
  },
  {
    value: "other",
    label: "都不是，只是我觉得它可能会涨",
  },
];

const setupDescriptions = {
  breakout: "适合那种前面横着走了几天，价格像被压住一样，今天突然冲出前面的价格范围，而且成交量比平时大。核心不是追涨，而是确认它从整理区往上突破。",
  pullback: "适合那种本来已经在上涨的强势股票，中间休息、回调几天，但没有跌坏；随后重新站起来继续往上涨。核心是买强势股的二次启动，不是抄底弱票。",
  earnings: "适合财报已经公布之后，股价跳涨、成交量变大，并且没有很快跌回去。核心是等市场先表态认可财报，再考虑跟随，不是在财报前赌大小。",
  other: "如果你的理由只是便宜、别人推荐、怕错过、已经涨很多但还想追、或者财报前赌一把，那就不属于系统买点。",
};

const setupLabels = {
  breakout: [
    "前面至少横着走了几天，不是已经连续暴涨后才想追",
    "今天收盘价明显高过前面那段横盘区间",
    "今天成交量明显比平时大",
    "今天收盘位置偏高，不是尾盘砸下来",
    "没有明显冲高回落的大上影线",
  ],
  pullback: [
    "这只股票之前已经在上涨，不是长期下跌股",
    "这几天只是正常回调，不是一路崩下去",
    "回调时成交量变小，说明不是明显砸盘",
    "今天重新上涨，价格重新站回短期均线附近",
    "没有跌破最近一段时间的重要低点",
  ],
  earnings: [
    "财报已经公布，不是在财报前赌博",
    "财报后股价跳涨或明显上涨",
    "财报后成交量明显比平时大",
    "没有很快跌回财报公布前的价格附近",
    "回踩后还能重新走强",
  ],
};

const riskOptions = [
  { value: "0.02", label: "2%：轻仓试错" },
  { value: "0.03", label: "3%：正常进攻" },
  { value: "0.05", label: "5%：高进攻" },
  { value: "0.08", label: "8%：极限模式，本月最多一次" },
];

const initial = {
  currentEquity: "3000",
  dayStartEquity: "3000",
  weekStartEquity: "3000",
  stageHighEquity: "3000",
  consecutiveLosses: "0",
  symbol: "INTC",

  spyToday: "",
  spy5d: "",
  spy1m: "",
  qqqToday: "",
  qqq5d: "",
  qqq1m: "",
  vix: "",
  spyAbove20: false,
  spyAbove50: false,
  qqqAbove20: false,
  qqqAbove50: false,

  sectorType: "semiconductor",
  sectorToday: "",
  sector5d: "",
  sector1m: "",
  sectorAbove20: false,
  leadersStrong: false,

  stockToday: "",
  stock5d: "",
  stock1m: "",
  stockAbove20: false,
  stock20Up: false,
  shortLineAbove20: false,

  weakOpen: "",
  weakHigh: "",
  weakLow: "",
  weakClose: "",
  weakVolume: "",
  weakAvgVolume10: "",

  setupType: "breakout",
  setupChecks: {
    breakout: [false, false, false, false, false],
    pullback: [false, false, false, false, false],
    earnings: [false, false, false, false, false],
  },

  hardVeto: {
    earningsSoon: false,
    gapNoPullback: false,
    chasing: false,
    upperShadow: false,
    noStop: false,
    fomo: false,
    revenge: false,
    badLiquidity: false,
  },

  buyPrice: "",
  stopPrice: "",
  targetPrice: "",
  riskPct: "0.05",
};

function n(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function filled(v) {
  return String(v ?? "").trim() !== "";
}

function lossPct(start, current) {
  const s = n(start);
  const c = n(current);
  if (s <= 0 || c <= 0) return 0;
  return Math.max(0, ((s - c) / s) * 100);
}

function drawdownPct(high, current) {
  const h = n(high);
  const c = n(current);
  if (h <= 0 || c <= 0) return 0;
  return Math.max(0, ((h - c) / h) * 100);
}

function compare(a, b) {
  if (!filled(a) || !filled(b)) return null;
  return n(a) > n(b);
}

function countComparison(items) {
  const available = items.filter((x) => x !== null);
  return {
    available: available.length,
    passed: available.filter(Boolean).length,
  };
}

function inferQqqNotWeak(f) {
  const res = countComparison([
    compare(f.qqqToday, f.spyToday),
    compare(f.qqq5d, f.spy5d),
    compare(f.qqq1m, f.spy1m),
  ]);
  return { ...res, ok: res.available >= 2 && res.passed >= 2 };
}

function inferSectorStrong(f) {
  const res = countComparison([
    compare(f.sectorToday, f.spyToday),
    compare(f.sector5d, f.spy5d),
    compare(f.sector1m, f.spy1m),
    compare(f.sectorToday, f.qqqToday),
    compare(f.sector5d, f.qqq5d),
    compare(f.sector1m, f.qqq1m),
  ]);
  return { ...res, ok: res.available >= 3 && res.passed >= 3 };
}

function inferStockStrong(f) {
  const res = countComparison([
    compare(f.stockToday, f.qqqToday),
    compare(f.stock5d, f.qqq5d),
    compare(f.stock1m, f.qqq1m),
    compare(f.stockToday, f.spyToday),
    compare(f.stock5d, f.spy5d),
    compare(f.stock1m, f.spy1m),
  ]);
  return { ...res, ok: res.available >= 3 && res.passed >= 3 };
}

function calcWeakCandle(f) {
  const complete = [f.weakOpen, f.weakHigh, f.weakLow, f.weakClose, f.weakVolume, f.weakAvgVolume10].every(filled);
  if (!complete) return { complete: false, isBad: false, dropPct: 0, closePlace: 0, volumeTimes: 0 };

  const open = n(f.weakOpen);
  const high = n(f.weakHigh);
  const low = n(f.weakLow);
  const close = n(f.weakClose);
  const vol = n(f.weakVolume);
  const avg = n(f.weakAvgVolume10);

  const dropPct = open > 0 ? ((open - close) / open) * 100 : 0;
  const range = high - low;
  const closePlace = range > 0 ? (close - low) / range : 1;
  const volumeTimes = avg > 0 ? vol / avg : 0;
  const isBad = close < open && dropPct >= 2 && closePlace <= 0.3 && volumeTimes >= 1.5;

  return { complete, isBad, dropPct, closePlace, volumeTimes };
}

function rrInfo(rr) {
  if (!Number.isFinite(rr) || rr <= 0) return { label: "未计算", tone: "slate", note: "需要填写买入价、止损价、目标价" };
  if (rr < 1) return { label: "很差", tone: "red", note: "潜在利润还不够覆盖一次亏损" };
  if (rr < 2) return { label: "不合格", tone: "red", note: "至少要达到 1:2，否则不交易" };
  if (rr < 3) return { label: "合格", tone: "yellow", note: "可以交易，但不算顶级机会" };
  return { label: "优秀", tone: "green", note: "具备高进攻的风险收益基础" };
}

function countTrue(arr) {
  return arr.filter(Boolean).length;
}

export function evaluateTrade(f) {
  const account = n(f.currentEquity);
  const todayLoss = lossPct(f.dayStartEquity, f.currentEquity);
  const weekLoss = lossPct(f.weekStartEquity, f.currentEquity);
  const dd = drawdownPct(f.stageHighEquity, f.currentEquity);
  const qqq = inferQqqNotWeak(f);
  const sector = inferSectorStrong(f);
  const stock = inferStockStrong(f);
  const weak = calcWeakCandle(f);
  const vix = n(f.vix);

  const accountVeto = [];
  if (todayLoss >= 5) accountVeto.push("今天账户亏损已经超过 5%，当天停止交易");
  if (weekLoss >= 10) accountVeto.push("本周账户亏损已经超过 10%，停止交易一周");
  if (dd >= 30) accountVeto.push("账户距离阶段最高点回撤超过 30%，停止实盘两周");
  if (n(f.consecutiveLosses) >= 4) accountVeto.push("连续亏损 4 笔以上，停止交易一周");

  const marketVeto = [];
  if (!f.spyAbove50 && !f.qqqAbove50) marketVeto.push("SPY 和 QQQ 都在 50 日均线下方，大盘环境太差");
  if (vix > 25) marketVeto.push("VIX 高于 25，市场恐慌，不开新仓");
  if (filled(f.spyToday) && filled(f.qqqToday) && n(f.spyToday) <= -1.5 && n(f.qqqToday) <= -1.5) {
    marketVeto.push("SPY 和 QQQ 今天都明显下跌，自动判定为恐慌盘");
  }

  const hardLabels = {
    earningsSoon: "财报快到了：距离财报少于 3 个交易日",
    gapNoPullback: "今天高开太多，而且没有回踩确认",
    chasing: "价格已经离短期均线太远，我是在追高",
    upperShadow: "今天冲高回落明显，可能是假突破",
    noStop: "我还没有提前写止损价",
    fomo: "我只是怕错过，所以想买",
    revenge: "我亏了以后想翻本，所以想买",
    badLiquidity: "成交量太差，买卖不够顺畅",
  };

  const hardVeto = Object.entries(f.hardVeto)
    .filter(([, v]) => v)
    .map(([k]) => hardLabels[k]);

  if (!f.stockAbove20) hardVeto.push("个股价格不在 20 日均线上方");
  if (!f.stock20Up) hardVeto.push("个股 20 日均线没有向上");
  if (weak.complete && weak.isBad) hardVeto.push("最近 5 天内出现疑似放量大跌 K 线");

  const marketScore = countTrue([f.spyAbove20, f.qqqAbove20, qqq.ok, vix > 0 && vix < 20]) * 5;
  const sectorScore = countTrue([f.sectorAbove20, sector.ok, f.leadersStrong]) * 5;
  const trendScore = countTrue([f.stockAbove20, f.stock20Up, f.shortLineAbove20, stock.ok, weak.complete && !weak.isBad]) * 4;

  let setupScore = 0;
  if (["breakout", "pullback", "earnings"].includes(f.setupType)) {
    setupScore = countTrue(f.setupChecks[f.setupType]) * 5;
  }

  const buy = n(f.buyPrice);
  const stop = n(f.stopPrice);
  const target = n(f.targetPrice);
  const perShareRisk = buy > 0 && stop > 0 ? buy - stop : 0;
  const reward = target > 0 && buy > 0 ? target - buy : 0;
  const rr = perShareRisk > 0 && reward > 0 ? reward / perShareRisk : 0;
  const selectedRisk = Number(f.riskPct);

  let riskScore = 0;
  if (stop > 0) riskScore += 5;
  if (perShareRisk > 0) riskScore += 5;
  if (rr >= 2) riskScore += 5;
  if (selectedRisk <= 0.08 && account * selectedRisk > 0) riskScore += 5;

  const total = marketScore + sectorScore + trendScore + setupScore + riskScore;

  const thresholdFail = [];
  if (marketScore < 10) thresholdFail.push("市场分低于 10：大盘环境不够好");
  if (sectorScore < 5) thresholdFail.push("板块分低于 5：板块不支持");
  if (trendScore < 12) thresholdFail.push("趋势分低于 12：个股不够强");
  if (setupScore < 15) thresholdFail.push("买点分低于 15：买入位置不成立");
  if (riskScore < 15) thresholdFail.push("风险分低于 15：止损或目标价不合格");
  if (f.setupType === "other") thresholdFail.push("买入理由不属于系统允许的 3 种机会");
  if (perShareRisk <= 0) thresholdFail.push("止损价必须低于买入价");

  const allVeto = [...accountVeto, ...marketVeto, ...hardVeto];

  let rawDecision = "禁止交易";
  let maxPositionPct = 0;
  let riskMode = 0;

  if (allVeto.length || thresholdFail.length || total < 65) {
    rawDecision = "禁止交易";
  } else if (total < 75) {
    rawDecision = "轻仓试错";
    maxPositionPct = 0.3;
    riskMode = Math.min(selectedRisk, 0.03);
  } else if (total < 85) {
    rawDecision = "标准进攻";
    maxPositionPct = 0.7;
    riskMode = Math.min(selectedRisk, 0.05);
  } else {
    rawDecision = "高进攻 / 满仓候选";
    maxPositionPct = 1;
    riskMode = Math.min(selectedRisk, 0.08);
  }

  if (marketScore < 15 && maxPositionPct > 0.7) {
    rawDecision = "标准进攻，市场不够强，禁止满仓";
    maxPositionPct = 0.7;
  }

  if (dd >= 20 && maxPositionPct > 0.5) {
    rawDecision = rawDecision.includes("禁止") ? rawDecision : `${rawDecision}，账户回撤超过 20%，仓位上限降到 50%`;
    maxPositionPct = 0.5;
  }

  const maxLoss = account * riskMode;
  const riskShares = perShareRisk > 0 ? Math.floor(maxLoss / perShareRisk) : 0;
  const positionShares = buy > 0 ? Math.floor((account * maxPositionPct) / buy) : 0;
  const shares = rawDecision.includes("禁止") ? 0 : Math.max(0, Math.min(riskShares, positionShares));
  const positionAmount = shares * buy;
  const actualLoss = shares * perShareRisk;
  const actualPositionPct = account > 0 ? positionAmount / account : 0;

  let finalAction = "取消：不交易";
  if (!rawDecision.includes("禁止") && shares > 0) {
    finalAction = rawDecision.includes("轻仓") ? "允许：轻仓试错" : rawDecision.includes("标准") ? "允许：标准进攻" : "允许：高进攻";
  } else if (!rawDecision.includes("禁止")) {
    finalAction = "等待：数据不完整，无法计算股数";
  }

  return {
    todayLoss,
    weekLoss,
    dd,
    qqq,
    sector,
    stock,
    weak,
    accountVeto,
    marketVeto,
    hardVeto,
    thresholdFail,
    marketScore,
    sectorScore,
    trendScore,
    setupScore,
    riskScore,
    total,
    rawDecision,
    finalAction,
    maxPositionPct,
    riskMode,
    perShareRisk,
    rr,
    rrInfo: rrInfo(rr),
    maxLoss,
    riskShares,
    positionShares,
    shares,
    positionAmount,
    actualLoss,
    actualPositionPct,
  };
}

const goodSetup = [true, true, true, true, true];
const TEST_CASES = [
  {
    name: "高质量机会应允许高进攻",
    form: {
      ...initial,
      currentEquity: "3000",
      dayStartEquity: "3000",
      weekStartEquity: "3000",
      stageHighEquity: "3000",
      spyToday: "0.4", spy5d: "2", spy1m: "5",
      qqqToday: "0.8", qqq5d: "3", qqq1m: "8",
      sectorToday: "1.2", sector5d: "5", sector1m: "12",
      stockToday: "2", stock5d: "8", stock1m: "18",
      vix: "16",
      spyAbove20: true, spyAbove50: true, qqqAbove20: true, qqqAbove50: true,
      sectorAbove20: true, leadersStrong: true,
      stockAbove20: true, stock20Up: true, shortLineAbove20: true,
      weakOpen: "100", weakHigh: "102", weakLow: "99", weakClose: "101", weakVolume: "80", weakAvgVolume10: "100",
      setupType: "breakout",
      setupChecks: { ...initial.setupChecks, breakout: goodSetup },
      buyPrice: "100", stopPrice: "95", targetPrice: "115", riskPct: "0.08",
    },
    expect: "允许：高进攻",
  },
  {
    name: "VIX 高于 25 必须取消",
    form: { ...initial, vix: "28", spyAbove50: true, qqqAbove50: true },
    expect: "取消",
  },
  {
    name: "止损价高于买入价必须取消",
    form: { ...initial, buyPrice: "100", stopPrice: "105", targetPrice: "115" },
    expect: "取消",
  },
];

function runTests() {
  return TEST_CASES.map((t) => {
    const res = evaluateTrade(t.form);
    return { ...t, result: res, passed: res.finalAction.includes(t.expect) };
  });
}

function TestPanel() {
  const tests = useMemo(() => runTests(), []);
  const passed = tests.filter((t) => t.passed).length;
  return (
    <Card title="内置规则测试" icon={<Icon>🧪</Icon>} subtitle="防止核心判断逻辑被改坏。不是行情回测。">
      <div className="mb-3 rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-700">通过：{passed}/{tests.length}</div>
      <div className="space-y-2">
        {tests.map((t) => (
          <div key={t.name} className={`rounded-xl border p-3 text-sm ${t.passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-800">{t.name}</span>
              <span className={t.passed ? "text-emerald-700" : "text-red-700"}>{t.passed ? "通过" : "失败"}</span>
            </div>
            <p className="mt-1 text-slate-500">输出：{t.result.finalAction}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function TradingDecisionApp() {
  const [form, setForm] = useState(initial);
  const [showTests, setShowTests] = useState(false);
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateHard = (key, value) => setForm((f) => ({ ...f, hardVeto: { ...f.hardVeto, [key]: value } }));
  const updateSetup = (type, idx, value) => {
    setForm((f) => {
      const next = [...f.setupChecks[type]];
      next[idx] = value;
      return { ...f, setupChecks: { ...f.setupChecks, [type]: next } };
    });
  };

  const result = useMemo(() => evaluateTrade(form), [form]);
  const issues = [...result.accountVeto, ...result.marketVeto, ...result.hardVeto, ...result.thresholdFail];
  const isCancel = result.finalAction.includes("取消");

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-slate-300">小资金体量搏机会</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">交易决策测试系统</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                风险说明：本工具只是把你的交易规则结构化，不能预测涨跌，也不构成投资建议。高进攻系统可能产生较大回撤，任何买入前都必须确认止损、仓位和最大亏损；如果系统输出取消，强行交易就是系统外赌博。
              </p>
            </div>
            <div className={`rounded-2xl px-5 py-4 text-center ${isCancel ? "bg-red-500" : "bg-emerald-500"}`}>
              <div className="text-xs opacity-90">最终指令</div>
              <div className="mt-1 text-xl font-bold">{result.finalAction}</div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <main className="space-y-6">
            <Card title="1. 账户数据：只填 Moomoo 账户里能看到的数字" icon={<Icon>🛡️</Icon>} subtitle="填当前资产、今天开始前资产、本周开始前资产、历史最高资产；系统自己算亏损和回撤。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberInput label="当前账户总资产" value={form.currentEquity} onChange={(v) => update("currentEquity", v)} prefix="$" />
                <NumberInput label="今天开始前账户总资产" value={form.dayStartEquity} onChange={(v) => update("dayStartEquity", v)} prefix="$" />
                <NumberInput label="本周开始前账户总资产" value={form.weekStartEquity} onChange={(v) => update("weekStartEquity", v)} prefix="$" />
                <NumberInput label="你账户曾经到过的最高总资产" value={form.stageHighEquity} onChange={(v) => update("stageHighEquity", v)} prefix="$" />
                <NumberInput label="最近连续亏损交易次数" value={form.consecutiveLosses} onChange={(v) => update("consecutiveLosses", v)} suffix="笔" />
                <TextInput label="准备交易的股票代码" value={form.symbol} onChange={(v) => update("symbol", v.toUpperCase())} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Info label="今天账户亏损" value={`${result.todayLoss.toFixed(2)}%`} tone={result.todayLoss >= 5 ? "red" : "slate"} note="≥5% 当天停手" />
                <Info label="本周账户亏损" value={`${result.weekLoss.toFixed(2)}%`} tone={result.weekLoss >= 10 ? "red" : "slate"} note="≥10% 停止交易一周" />
                <Info label="距离历史高点回撤" value={`${result.dd.toFixed(2)}%`} tone={result.dd >= 20 ? "red" : "slate"} note="≥20% 降仓；≥30% 停手" />
              </div>
            </Card>

            <Card title="2. 大盘数据：从 Moomoo 直接抄涨跌幅" icon={<Icon>🌦️</Icon>} subtitle="搜索 SPY 和 QQQ，抄今天、5日、1个月涨跌幅。系统会自动判断 QQQ 有没有弱于 SPY，也会自动判断恐慌盘。">
              <div className="grid gap-4 md:grid-cols-3">
                <NumberInput label="SPY 今天涨跌幅" value={form.spyToday} onChange={(v) => update("spyToday", v)} suffix="%" hint="Moomoo 股票页面价格旁边可见" />
                <NumberInput label="SPY 5日涨跌幅" value={form.spy5d} onChange={(v) => update("spy5d", v)} suffix="%" hint="Moomoo 切到 5D 查看" />
                <NumberInput label="SPY 1个月涨跌幅" value={form.spy1m} onChange={(v) => update("spy1m", v)} suffix="%" hint="Moomoo 切到 1M 查看" />
                <NumberInput label="QQQ 今天涨跌幅" value={form.qqqToday} onChange={(v) => update("qqqToday", v)} suffix="%" />
                <NumberInput label="QQQ 5日涨跌幅" value={form.qqq5d} onChange={(v) => update("qqq5d", v)} suffix="%" />
                <NumberInput label="QQQ 1个月涨跌幅" value={form.qqq1m} onChange={(v) => update("qqq1m", v)} suffix="%" />
                <NumberInput label="VIX 当前数值" value={form.vix} onChange={(v) => update("vix", v)} hint="Moomoo 搜索 VIX，直接抄数值" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Toggle label="SPY 当前价格在 20 日均线之上" value={form.spyAbove20} onChange={(v) => update("spyAbove20", v)} />
                <Toggle label="SPY 当前价格在 50 日均线之上" value={form.spyAbove50} onChange={(v) => update("spyAbove50", v)} />
                <Toggle label="QQQ 当前价格在 20 日均线之上" value={form.qqqAbove20} onChange={(v) => update("qqqAbove20", v)} />
                <Toggle label="QQQ 当前价格在 50 日均线之上" value={form.qqqAbove50} onChange={(v) => update("qqqAbove50", v)} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Info label="QQQ 对比 SPY" value={result.qqq.ok ? "QQQ 不弱" : "QQQ 偏弱/数据不足"} tone={result.qqq.ok ? "green" : "yellow"} note={`比较了 ${result.qqq.available} 项，QQQ 跑赢 ${result.qqq.passed} 项；至少 2 项跑赢才算不弱`} />
                <Info label="恐慌判断" value={n(form.vix) > 25 || (filled(form.spyToday) && filled(form.qqqToday) && n(form.spyToday) <= -1.5 && n(form.qqqToday) <= -1.5) ? "风险偏高" : "未触发恐慌"} tone={n(form.vix) > 25 ? "red" : "slate"} note="VIX>25，或 SPY/QQQ 同时明显下跌，会自动拦截" />
              </div>
            </Card>

            <Card title="3. 板块数据：先选股票属于哪类，再抄板块 ETF 涨跌幅" icon={<Icon>🏭</Icon>} subtitle="不要自己想板块 ETF 代码。先选类型，系统告诉你该看哪个。然后从 Moomoo 抄今天、5日、1个月涨跌幅。">
              <Select label="这只股票大概属于哪个方向" value={form.sectorType} onChange={(v) => update("sectorType", v)} options={sectorOptions} />
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <NumberInput label="板块 ETF 今天涨跌幅" value={form.sectorToday} onChange={(v) => update("sectorToday", v)} suffix="%" />
                <NumberInput label="板块 ETF 5日涨跌幅" value={form.sector5d} onChange={(v) => update("sector5d", v)} suffix="%" />
                <NumberInput label="板块 ETF 1个月涨跌幅" value={form.sector1m} onChange={(v) => update("sector1m", v)} suffix="%" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Toggle label="板块 ETF 当前价格在 20 日均线之上" value={form.sectorAbove20} onChange={(v) => update("sectorAbove20", v)} />
                <Toggle label="这个板块里几个龙头也在涨，不是只有我这只股票涨" value={form.leadersStrong} onChange={(v) => update("leadersStrong", v)} />
              </div>
              <div className="mt-4">
                <Info label="板块对比大盘" value={result.sector.ok ? "板块强于大盘" : "板块不强/数据不足"} tone={result.sector.ok ? "green" : "yellow"} note={`比较了 ${result.sector.available} 项，板块跑赢 ${result.sector.passed} 项；至少 3 项跑赢才算强`} />
              </div>
            </Card>

            <Card title="4. 个股数据：从 Moomoo 抄个股涨跌幅" icon={<Icon>📈</Icon>} subtitle="输入这只股票今天、5日、1个月涨跌幅。系统会自动和 SPY/QQQ 比较。">
              <div className="grid gap-4 md:grid-cols-3">
                <NumberInput label="个股今天涨跌幅" value={form.stockToday} onChange={(v) => update("stockToday", v)} suffix="%" />
                <NumberInput label="个股 5日涨跌幅" value={form.stock5d} onChange={(v) => update("stock5d", v)} suffix="%" />
                <NumberInput label="个股 1个月涨跌幅" value={form.stock1m} onChange={(v) => update("stock1m", v)} suffix="%" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Toggle label="个股当前价格在 20 日均线之上" value={form.stockAbove20} onChange={(v) => update("stockAbove20", v)} />
                <Toggle label="个股 20 日均线正在往上走" value={form.stock20Up} onChange={(v) => update("stock20Up", v)} />
                <Toggle label="短期均线在 20 日均线之上" value={form.shortLineAbove20} onChange={(v) => update("shortLineAbove20", v)} />
              </div>
              <div className="mt-4">
                <Info label="个股对比大盘" value={result.stock.ok ? "个股强于 QQQ/SPY" : "个股不强/数据不足"} tone={result.stock.ok ? "green" : "yellow"} note={`比较了 ${result.stock.available} 项，个股跑赢 ${result.stock.passed} 项；至少 3 项跑赢才算强`} />
              </div>
            </Card>

            <Card title="5. 最近 5 天里有没有危险的大跌 K 线" icon={<Icon>📉</Icon>} subtitle="打开日线图，点最近 5 天里最弱的那一天，Moomoo 会显示开盘、最高、最低、收盘、成交量。成交量均线看 MAVOL10。全部直接抄，不要手算。">
              <div className="grid gap-4 md:grid-cols-3">
                <NumberInput label="那天开盘价" value={form.weakOpen} onChange={(v) => update("weakOpen", v)} prefix="$" />
                <NumberInput label="那天最高价" value={form.weakHigh} onChange={(v) => update("weakHigh", v)} prefix="$" />
                <NumberInput label="那天最低价" value={form.weakLow} onChange={(v) => update("weakLow", v)} prefix="$" />
                <NumberInput label="那天收盘价" value={form.weakClose} onChange={(v) => update("weakClose", v)} prefix="$" />
                <NumberInput label="那天成交量 VOL" value={form.weakVolume} onChange={(v) => update("weakVolume", v)} hint="例如 82.5M 就填 82.5；单位要和 MAVOL10 一致" />
                <NumberInput label="10 日平均成交量 MAVOL10" value={form.weakAvgVolume10} onChange={(v) => update("weakAvgVolume10", v)} hint="例如 50M 就填 50" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Info label="这天跌了多少" value={`${result.weak.dropPct.toFixed(2)}%`} note="≥2% 算明显下跌" />
                <Info label="成交量是平时几倍" value={`${result.weak.volumeTimes.toFixed(2)}x`} note="≥1.5x 算放量" />
                <Info label="收盘靠不靠近最低点" value={`${(result.weak.closePlace * 100).toFixed(0)}%`} note="≤30% 说明收得很弱" />
              </div>
              <div className="mt-4">
                <Info label="系统判断" value={!result.weak.complete ? "数据未填完整" : result.weak.isBad ? "危险：疑似放量大跌" : "未触发危险大跌"} tone={!result.weak.complete ? "yellow" : result.weak.isBad ? "red" : "green"} note="只要触发危险大跌，系统会取消新交易" />
              </div>
            </Card>

            <Card title="6. 买入理由：用大白话选择，不选术语" icon={<Icon>✅</Icon>} subtitle="系统只允许 3 种买入理由。三个都不是，就不要交易。">
              <Select label="你这次想买，最接近哪一种情况？" value={form.setupType} onChange={(v) => update("setupType", v)} options={setupOptions} />
              <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{setupDescriptions[form.setupType]}</div>
              {form.setupType !== "other" && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {setupLabels[form.setupType].map((label, idx) => (
                    <Toggle key={label} label={label} value={form.setupChecks[form.setupType][idx]} onChange={(v) => updateSetup(form.setupType, idx, v)} />
                  ))}
                </div>
              )}
            </Card>

            <Card title="7. 一票否决：这些情况出现就不交易" icon={<Icon>⛔</Icon>} subtitle="不用懂专业术语。只要这句话符合你现在的情况，就勾上。勾上后系统会取消交易。">
              <div className="grid gap-3 md:grid-cols-2">
                <Toggle label="财报快到了：距离财报少于 3 个交易日" value={form.hardVeto.earningsSoon} onChange={(v) => updateHard("earningsSoon", v)} danger />
                <Toggle label="今天高开太多，而且没有回踩确认" value={form.hardVeto.gapNoPullback} onChange={(v) => updateHard("gapNoPullback", v)} danger />
                <Toggle label="价格已经离短期均线太远，我是在追高" value={form.hardVeto.chasing} onChange={(v) => updateHard("chasing", v)} danger />
                <Toggle label="今天冲高回落明显，可能是假突破" value={form.hardVeto.upperShadow} onChange={(v) => updateHard("upperShadow", v)} danger />
                <Toggle label="我还没有提前写止损价" value={form.hardVeto.noStop} onChange={(v) => updateHard("noStop", v)} danger />
                <Toggle label="我只是怕错过，所以想买" value={form.hardVeto.fomo} onChange={(v) => updateHard("fomo", v)} danger />
                <Toggle label="我亏了以后想翻本，所以想买" value={form.hardVeto.revenge} onChange={(v) => updateHard("revenge", v)} danger />
                <Toggle label="成交量太差，买卖不够顺畅" value={form.hardVeto.badLiquidity} onChange={(v) => updateHard("badLiquidity", v)} danger />
              </div>
            </Card>

            <Card title="8. 买入价、止损价、目标价" icon={<Icon>💵</Icon>} subtitle="这三个价格必须提前写。系统会自动算盈亏比、最大亏损、可以买多少股。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberInput label="计划买入价" value={form.buyPrice} onChange={(v) => update("buyPrice", v)} prefix="$" />
                <NumberInput label="错了就卖的价格，也就是止损价" value={form.stopPrice} onChange={(v) => update("stopPrice", v)} prefix="$" />
                <NumberInput label="第一目标价" value={form.targetPrice} onChange={(v) => update("targetPrice", v)} prefix="$" />
                <Select label="这笔最多愿意亏账户多少" value={form.riskPct} onChange={(v) => update("riskPct", v)} options={riskOptions} />
              </div>
            </Card>
          </main>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <Card title="系统判定" icon={<Icon>{isCancel ? "⚠️" : "🟢"}</Icon>}>
              <div className={`rounded-2xl p-4 ${isCancel ? "bg-red-50" : "bg-emerald-50"}`}>
                <p className="text-sm text-slate-500">最终动作</p>
                <p className={`mt-1 text-2xl font-bold ${isCancel ? "text-red-700" : "text-emerald-700"}`}>{result.finalAction}</p>
                <p className="mt-2 text-sm text-slate-600">系统判定：{result.rawDecision}</p>
              </div>
              <div className="mt-4 space-y-3">
                <ScoreBar label="大盘分" value={result.marketScore} max={20} />
                <ScoreBar label="板块分" value={result.sectorScore} max={15} />
                <ScoreBar label="个股趋势分" value={result.trendScore} max={20} />
                <ScoreBar label="买入位置分" value={result.setupScore} max={25} />
                <ScoreBar label="风险控制分" value={result.riskScore} max={20} />
                <div className="rounded-xl bg-slate-100 p-4 text-center">
                  <div className="text-sm text-slate-500">总分</div>
                  <div className="text-3xl font-bold">{result.total}/100</div>
                </div>
              </div>
            </Card>

            <Card title="交易参数输出" icon={<Icon>💰</Icon>}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="每股最多亏" value={`$${result.perShareRisk.toFixed(2)}`} />
                <Info label="盈亏比" value={result.rr ? `1:${result.rr.toFixed(2)}` : "--"} tone={result.rrInfo.tone} note={result.rrInfo.note} />
                <Info label="盈亏比等级" value={result.rrInfo.label} tone={result.rrInfo.tone} />
                <Info label="这笔最多亏" value={`$${result.maxLoss.toFixed(2)}`} />
                <Info label="系统仓位上限" value={`${(result.maxPositionPct * 100).toFixed(0)}%`} />
                <Info label="按风险可买" value={`${result.riskShares} 股`} />
                <Info label="按仓位可买" value={`${result.positionShares} 股`} />
                <div className="col-span-2 rounded-xl bg-slate-950 p-4 text-white">
                  <p className="text-sm text-slate-300">最终建议买入</p>
                  <p className="mt-1 text-3xl font-bold">{result.shares} 股</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    计划买入金额：${result.positionAmount.toFixed(2)}；实际仓位：{(result.actualPositionPct * 100).toFixed(1)}%；如果打到止损，预计亏损：${result.actualLoss.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>

            <Card title="为什么取消 / 风险提示" icon={<Icon>🚨</Icon>}>
              <div className="space-y-3 text-sm">
                {issues.length === 0 ? (
                  <p className="rounded-xl bg-emerald-50 p-3 leading-6 text-emerald-800">暂无一票否决。继续看最终动作，不代表必须交易。</p>
                ) : (
                  issues.map((x) => <p key={x} className="rounded-xl bg-red-50 p-3 leading-6 text-red-800">{x}</p>)
                )}
              </div>
            </Card>

            <Card title="卖出规则" icon={<Icon>📋</Icon>}>
              <div className="space-y-2 text-sm leading-6 text-slate-700">
                <p>跌到止损价：直接卖，不解释。</p>
                <p>盈利达到 1R：把止损抬到成本附近。</p>
                <p>盈利达到 2R：卖出 20%-30%。</p>
                <p>盈利达到 3R：再卖出 20%-30%。</p>
                <p>跌破 20 日均线、跌破前低、放量大跌：清仓或大幅减仓。</p>
              </div>
            </Card>

            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <button type="button" onClick={() => setShowTests((v) => !v)} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                {showTests ? "隐藏内置测试" : "显示内置测试"}
              </button>
            </div>
            {showTests && <TestPanel />}
          </aside>
        </div>
      </div>
    </div>
  );
}
