import React, { useMemo, useState } from "react";

/*
  Small Account Trading Decision App v2
  改进点：
  1. 用一手数据计算 QQQ 是否弱于 SPY。
  2. 用账户净值计算今日亏损%、本周亏损%、阶段高点回撤%。
  3. 用板块 ETF 涨跌幅自动判断板块是否强于大盘。
  4. 用 OHLCV 自动判断近期疑似放量大阴线。
  5. 用个股/QQQ/SPY 涨跌幅自动判断个股是否强于大盘。
  6. 简化硬性否决项术语。
  7. 给盈亏比显示具体参考等级。
  8. 替换首页说明为风险说明。
*/

function EmojiIcon({ symbol }) {
  return <span className="inline-flex h-5 w-5 items-center justify-center text-lg leading-none">{symbol}</span>;
}

function Card({ title, icon, children, subtitle }) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-slate-100 p-2">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, value, onChange, danger = false }) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm transition ${
        value
          ? danger
            ? "border-red-300 bg-red-50"
            : "border-emerald-300 bg-emerald-50"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
      }`}
    >
      <span className="pr-3 text-slate-800">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5"
      />
    </label>
  );
}

function NumberInput({ label, value, onChange, prefix = "", suffix = "", placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3">
        {prefix && <span className="text-sm text-slate-500">{prefix}</span>}
        <input
          type="number"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-2 py-3 text-sm outline-none"
        />
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </div>
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
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
    </label>
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

function InfoBox({ label, value, note, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-900",
    green: "bg-emerald-50 text-emerald-800",
    yellow: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-800",
  };
  return (
    <div className={`rounded-xl p-3 ${tones[tone] || tones.slate}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
      {note && <p className="mt-1 text-xs opacity-80">{note}</p>}
    </div>
  );
}

const setupOptions = [
  { value: "breakout", label: "A：平台突破" },
  { value: "pullback", label: "B：强趋势回踩" },
  { value: "earnings", label: "C：财报后确认" },
  { value: "other", label: "其他：非法买点" },
];

const riskOptions = [
  { value: "0.02", label: "2%：轻仓试错" },
  { value: "0.03", label: "3%：正常进攻" },
  { value: "0.05", label: "5%：高进攻" },
  { value: "0.08", label: "8%：极限模式，本月最多一次" },
];

const setupLabels = {
  breakout: ["横盘至少 5-10 个交易日", "收盘突破平台上沿", "成交量明显放大", "收盘在当天偏高位置", "不是冲高回落"],
  pullback: ["原本处于上涨趋势", "回踩 EMA10 / EMA20", "回踩时缩量", "重新放量站回 EMA5 / EMA10", "没有跌破前低"],
  earnings: ["财报已经公布", "财报后跳空上涨", "成交量明显放大", "没有立刻回补缺口", "回踩后重新走强"],
};

const initial = {
  account: "3000",
  currentEquity: "3000",
  dayStartEquity: "3000",
  weekStartEquity: "3000",
  stageHighEquity: "3000",
  consecutiveLosses: "0",
  symbol: "INTC",
  currentPrice: "",
  buyPrice: "",
  stopPrice: "",
  firstTarget: "",

  spyDay: "",
  spy5: "",
  spy20: "",
  qqqDay: "",
  qqq5: "",
  qqq20: "",
  vix: "",
  spyAbove20: false,
  spyAbove50: false,
  qqqAbove20: false,
  qqqAbove50: false,
  panicDay: false,

  sectorName: "SMH",
  sectorDay: "",
  sector5: "",
  sector20: "",
  sectorAbove20: false,
  leadersStrong: false,

  stockDay: "",
  stock5: "",
  stock20: "",
  priceAbove20: false,
  ema20Up: false,
  ema5Above20: false,

  bearOpen: "",
  bearHigh: "",
  bearLow: "",
  bearClose: "",
  bearVolume: "",
  bearAvgVolume10: "",

  setupType: "breakout",
  setupChecks: {
    breakout: [false, false, false, false, false],
    pullback: [false, false, false, false, false],
    earnings: [false, false, false, false, false],
  },

  hardVeto: {
    earningsSoon: false,
    gapNoPullback: false,
    farFromEma10: false,
    upperShadow: false,
    noStop: false,
    fomo: false,
    revenge: false,
    badLiquidity: false,
  },
  riskPct: "0.05",
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hasValue(v) {
  return String(v ?? "").trim() !== "";
}

function pctLoss(start, current) {
  const s = toNum(start);
  const c = toNum(current);
  if (s <= 0 || c <= 0) return 0;
  return Math.max(0, ((s - c) / s) * 100);
}

function drawdown(high, current) {
  const h = toNum(high);
  const c = toNum(current);
  if (h <= 0 || c <= 0) return 0;
  return Math.max(0, ((h - c) / h) * 100);
}

function compareReturns(a, b) {
  if (!hasValue(a) || !hasValue(b)) return null;
  return toNum(a) > toNum(b);
}

function countAvailableTrue(items) {
  const available = items.filter((x) => x !== null);
  const passed = available.filter(Boolean).length;
  return { available: available.length, passed };
}

function inferQqqNotWeak(form) {
  const checks = [
    compareReturns(form.qqqDay, form.spyDay),
    compareReturns(form.qqq5, form.spy5),
    compareReturns(form.qqq20, form.spy20),
  ];
  const { available, passed } = countAvailableTrue(checks);
  return { available, passed, ok: available >= 2 && passed >= 2 };
}

function inferSectorStrong(form) {
  const checks = [
    compareReturns(form.sectorDay, form.spyDay),
    compareReturns(form.sector5, form.spy5),
    compareReturns(form.sector20, form.spy20),
    compareReturns(form.sectorDay, form.qqqDay),
    compareReturns(form.sector5, form.qqq5),
    compareReturns(form.sector20, form.qqq20),
  ];
  const { available, passed } = countAvailableTrue(checks);
  return { available, passed, ok: available >= 3 && passed >= 3 };
}

function inferStockStrong(form) {
  const checks = [
    compareReturns(form.stockDay, form.qqqDay),
    compareReturns(form.stock5, form.qqq5),
    compareReturns(form.stock20, form.qqq20),
    compareReturns(form.stockDay, form.spyDay),
    compareReturns(form.stock5, form.spy5),
    compareReturns(form.stock20, form.spy20),
  ];
  const { available, passed } = countAvailableTrue(checks);
  return { available, passed, ok: available >= 3 && passed >= 3 };
}

function calcBearCandle(form) {
  const required = [form.bearOpen, form.bearHigh, form.bearLow, form.bearClose, form.bearVolume, form.bearAvgVolume10];
  const complete = required.every(hasValue);
  if (!complete) {
    return { complete: false, isBear: false, bodyDropPct: 0, closePosition: 0, volumeRatio: 0 };
  }
  const open = toNum(form.bearOpen);
  const high = toNum(form.bearHigh);
  const low = toNum(form.bearLow);
  const close = toNum(form.bearClose);
  const volume = toNum(form.bearVolume);
  const avg = toNum(form.bearAvgVolume10);
  const bodyDropPct = open > 0 ? ((open - close) / open) * 100 : 0;
  const range = high - low;
  const closePosition = range > 0 ? (close - low) / range : 1;
  const volumeRatio = avg > 0 ? volume / avg : 0;
  const isBear = close < open && bodyDropPct >= 2 && volumeRatio >= 1.5 && closePosition <= 0.3;
  return { complete: true, isBear, bodyDropPct, closePosition, volumeRatio };
}

function rrLabel(rr) {
  if (!Number.isFinite(rr) || rr <= 0) return { text: "未计算", tone: "slate", note: "需要填写买入价、止损价、目标价" };
  if (rr < 1) return { text: "很差", tone: "red", note: "赚得不够覆盖一次亏损，不交易" };
  if (rr < 2) return { text: "不合格", tone: "red", note: "至少要达到 1:2" };
  if (rr < 3) return { text: "合格", tone: "yellow", note: "可以交易，但不算顶级机会" };
  return { text: "优秀", tone: "green", note: "具备高进攻的风险收益基础" };
}

function countTrue(values) {
  return values.filter(Boolean).length;
}

export function evaluateTrade(form) {
  const currentEquity = toNum(form.currentEquity || form.account);
  const account = currentEquity || toNum(form.account);
  const dailyLoss = pctLoss(form.dayStartEquity, currentEquity);
  const weeklyLoss = pctLoss(form.weekStartEquity, currentEquity);
  const stageDrawdown = drawdown(form.stageHighEquity, currentEquity);
  const losses = toNum(form.consecutiveLosses);
  const vix = toNum(form.vix);

  const qqqStrength = inferQqqNotWeak(form);
  const sectorStrength = inferSectorStrong(form);
  const stockStrength = inferStockStrong(form);
  const bear = calcBearCandle(form);

  const accountVeto = [];
  if (dailyLoss >= 5) accountVeto.push("今天账户已经亏损 5% 以上：当天停止交易");
  if (weeklyLoss >= 10) accountVeto.push("本周账户已经亏损 10% 以上：停止交易一周");
  if (stageDrawdown >= 30) accountVeto.push("账户距离阶段最高点回撤 30% 以上：停止实盘两周");
  if (losses >= 4) accountVeto.push("连续亏损 4 笔以上：停止交易一周");

  const marketVeto = [];
  if (!form.spyAbove50 && !form.qqqAbove50) marketVeto.push("SPY 和 QQQ 都在 EMA50 下方：大盘环境不合格");
  if (vix > 25) marketVeto.push("VIX 高于 25：市场恐慌，不开新仓");
  if (form.panicDay) marketVeto.push("今天明显恐慌盘：不交易");

  const hardVetoLabels = {
    earningsSoon: "财报快到了：距离财报少于 3 个交易日",
    gapNoPullback: "今天高开太多，而且没有回踩确认",
    farFromEma10: "价格已经明显远离短期均线，不追高",
    upperShadow: "今天冲高回落明显，可能是假突破",
    noStop: "没有提前写止损价",
    fomo: "我是因为怕错过才想买",
    revenge: "我是因为亏损后想翻本才想买",
    badLiquidity: "成交量太差，流动性不够",
  };

  const hardVeto = Object.entries(form.hardVeto || {})
    .filter(([, v]) => Boolean(v))
    .map(([k]) => hardVetoLabels[k] || k);

  if (bear.complete && bear.isBear) hardVeto.push("最近 5 天内出现疑似放量大阴线");
  if (!form.priceAbove20) hardVeto.push("个股价格不在 EMA20 上方");
  if (!form.ema20Up) hardVeto.push("个股 EMA20 没有向上");

  const marketScore = countTrue([
    form.spyAbove20,
    form.qqqAbove20,
    qqqStrength.ok,
    vix > 0 && vix < 20,
  ]) * 5;

  const sectorScore = countTrue([
    form.sectorAbove20,
    sectorStrength.ok,
    form.leadersStrong,
  ]) * 5;

  const noBearVolumeScore = bear.complete ? !bear.isBear : false;

  const trendScore = countTrue([
    form.priceAbove20,
    form.ema20Up,
    form.ema5Above20,
    stockStrength.ok,
    noBearVolumeScore,
  ]) * 4;

  let setupScore = 0;
  if (["breakout", "pullback", "earnings"].includes(form.setupType)) {
    setupScore = countTrue(form.setupChecks?.[form.setupType] || []) * 5;
  }

  const buy = toNum(form.buyPrice || form.currentPrice);
  const stop = toNum(form.stopPrice);
  const target = toNum(form.firstTarget);
  const perShareRisk = buy > 0 && stop > 0 ? buy - stop : 0;
  const reward = target > 0 && buy > 0 ? target - buy : 0;
  const rr = perShareRisk > 0 && reward > 0 ? reward / perShareRisk : 0;
  const selectedRiskPct = Number(form.riskPct);

  let riskScore = 0;
  if (stop > 0) riskScore += 5;
  if (perShareRisk > 0) riskScore += 5;
  if (rr >= 2) riskScore += 5;
  if (selectedRiskPct <= 0.08 && account * selectedRiskPct > 0) riskScore += 5;

  const total = marketScore + sectorScore + trendScore + setupScore + riskScore;
  const vetoes = [...accountVeto, ...marketVeto, ...hardVeto];

  const thresholdFail = [];
  if (marketScore < 10) thresholdFail.push("市场分低于 10：大盘环境不够好");
  if (sectorScore < 5) thresholdFail.push("板块分低于 5：板块不支持");
  if (trendScore < 12) thresholdFail.push("趋势分低于 12：个股不够强");
  if (setupScore < 15) thresholdFail.push("买点分低于 15：买点不成立");
  if (riskScore < 15) thresholdFail.push("风险分低于 15：止损或盈亏比不合格");
  if (form.setupType === "other") thresholdFail.push("买点类型非法：不属于 A/B/C");
  if (perShareRisk <= 0) thresholdFail.push("止损价必须低于买入价");

  let rawDecision = "禁止交易";
  let maxPositionPct = 0;
  let riskMode = 0;

  if (vetoes.length || thresholdFail.length || total < 65) {
    rawDecision = "禁止交易";
    maxPositionPct = 0;
    riskMode = 0;
  } else if (total < 75) {
    rawDecision = "轻仓试错";
    maxPositionPct = 0.3;
    riskMode = Math.min(selectedRiskPct, 0.03);
  } else if (total < 85) {
    rawDecision = "标准进攻";
    maxPositionPct = 0.7;
    riskMode = Math.min(selectedRiskPct, 0.05);
  } else {
    rawDecision = "高进攻 / 满仓候选";
    maxPositionPct = 1.0;
    riskMode = Math.min(selectedRiskPct, 0.08);
  }

  if (marketScore < 15 && maxPositionPct > 0.7) {
    maxPositionPct = 0.7;
    rawDecision = "标准进攻，市场非绿灯，禁止满仓";
  }

  if (stageDrawdown >= 20 && maxPositionPct > 0.5) {
    maxPositionPct = 0.5;
    rawDecision = rawDecision.includes("禁止") ? rawDecision : `${rawDecision}，账户回撤 ≥20%，仓位上限降至 50%`;
  }

  const riskAllowedLoss = account * riskMode;
  const riskShares = perShareRisk > 0 ? Math.floor(riskAllowedLoss / perShareRisk) : 0;
  const positionShares = buy > 0 ? Math.floor((account * maxPositionPct) / buy) : 0;
  const shares = rawDecision.includes("禁止") ? 0 : Math.max(0, Math.min(riskShares, positionShares));
  const positionAmount = shares * buy;
  const actualLoss = shares * perShareRisk;
  const actualPositionPct = account > 0 ? positionAmount / account : 0;

  let finalAction = "取消：不交易";
  if (!rawDecision.includes("禁止") && shares > 0) {
    finalAction = rawDecision.includes("轻仓")
      ? "允许：轻仓试错"
      : rawDecision.includes("标准")
      ? "允许：标准进攻"
      : "允许：高进攻";
  } else if (!rawDecision.includes("禁止") && shares <= 0) {
    finalAction = "等待：数据不完整，无法计算股数";
  }

  return {
    dailyLoss,
    weeklyLoss,
    stageDrawdown,
    qqqStrength,
    sectorStrength,
    stockStrength,
    bear,
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
    reward,
    rr,
    rrInfo: rrLabel(rr),
    maxLoss: riskAllowedLoss,
    riskShares,
    positionShares,
    shares,
    positionAmount,
    actualLoss,
    actualPositionPct,
  };
}

const allTrueSetup = [true, true, true, true, true];

const TEST_CASES = [
  {
    name: "高质量突破应允许高进攻",
    form: {
      ...initial,
      currentEquity: "3000",
      dayStartEquity: "3000",
      weekStartEquity: "3000",
      stageHighEquity: "3000",
      buyPrice: "100",
      stopPrice: "95",
      firstTarget: "115",
      spyDay: "0.5", spy5: "2", spy20: "5",
      qqqDay: "0.8", qqq5: "3", qqq20: "7",
      sectorDay: "1.5", sector5: "5", sector20: "12",
      stockDay: "2", stock5: "8", stock20: "20",
      vix: "16",
      spyAbove20: true,
      spyAbove50: true,
      qqqAbove20: true,
      qqqAbove50: true,
      sectorAbove20: true,
      leadersStrong: true,
      priceAbove20: true,
      ema20Up: true,
      ema5Above20: true,
      bearOpen: "100", bearHigh: "103", bearLow: "99", bearClose: "102", bearVolume: "100", bearAvgVolume10: "100",
      setupType: "breakout",
      setupChecks: { ...initial.setupChecks, breakout: allTrueSetup },
      riskPct: "0.08",
    },
    expectActionIncludes: "允许：高进攻",
  },
  {
    name: "放量大阴线必须取消",
    form: {
      ...initial,
      currentEquity: "3000",
      dayStartEquity: "3000",
      weekStartEquity: "3000",
      stageHighEquity: "3000",
      buyPrice: "100",
      stopPrice: "95",
      firstTarget: "115",
      spyDay: "0.5", spy5: "2", spy20: "5",
      qqqDay: "0.8", qqq5: "3", qqq20: "7",
      sectorDay: "1.5", sector5: "5", sector20: "12",
      stockDay: "2", stock5: "8", stock20: "20",
      vix: "16",
      spyAbove20: true,
      spyAbove50: true,
      qqqAbove20: true,
      qqqAbove50: true,
      sectorAbove20: true,
      leadersStrong: true,
      priceAbove20: true,
      ema20Up: true,
      ema5Above20: true,
      bearOpen: "100", bearHigh: "101", bearLow: "94", bearClose: "95", bearVolume: "200", bearAvgVolume10: "100",
      setupType: "breakout",
      setupChecks: { ...initial.setupChecks, breakout: allTrueSetup },
      riskPct: "0.08",
    },
    expectActionIncludes: "取消",
  },
  {
    name: "阶段回撤 30% 必须取消",
    form: {
      ...initial,
      currentEquity: "2100",
      dayStartEquity: "2100",
      weekStartEquity: "2100",
      stageHighEquity: "3000",
      buyPrice: "100",
      stopPrice: "95",
      firstTarget: "115",
    },
    expectActionIncludes: "取消",
  },
  {
    name: "QQQ 跑输 SPY 时市场分下降",
    form: {
      ...initial,
      spyDay: "1", spy5: "3", spy20: "6",
      qqqDay: "0", qqq5: "1", qqq20: "2",
    },
    expectQqqOk: false,
  },
];

function runTests() {
  return TEST_CASES.map((test) => {
    const result = evaluateTrade(test.form);
    let passed = true;
    if (test.expectActionIncludes) passed = result.finalAction.includes(test.expectActionIncludes);
    if (typeof test.expectQqqOk === "boolean") passed = result.qqqStrength.ok === test.expectQqqOk;
    return { ...test, result, passed };
  });
}

function TestPanel() {
  const tests = useMemo(() => runTests(), []);
  const passedCount = tests.filter((t) => t.passed).length;

  return (
    <Card title="内置规则测试" icon={<EmojiIcon symbol="🧪" />} subtitle="验证核心判断逻辑是否正常。不是行情回测。">
      <div className="mb-3 rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-700">通过：{passedCount}/{tests.length}</div>
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
  const updateSetupCheck = (type, idx, value) => {
    setForm((f) => {
      const next = [...f.setupChecks[type]];
      next[idx] = value;
      return { ...f, setupChecks: { ...f.setupChecks, [type]: next } };
    });
  };

  const result = useMemo(() => evaluateTrade(form), [form]);
  const isCancel = result.finalAction.includes("取消");
  const allIssues = [...result.accountVeto, ...result.marketVeto, ...result.hardVeto, ...result.thresholdFail];

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
            <Card title="1. 账户数据：自动计算亏损和回撤" icon={<EmojiIcon symbol="🛡️" />} subtitle="你只填账户净值，系统自动算今日亏损、本周亏损和阶段回撤。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberInput label="当前账户净值" value={form.currentEquity} onChange={(v) => update("currentEquity", v)} prefix="$" />
                <NumberInput label="今天开盘前账户净值" value={form.dayStartEquity} onChange={(v) => update("dayStartEquity", v)} prefix="$" />
                <NumberInput label="本周开始账户净值" value={form.weekStartEquity} onChange={(v) => update("weekStartEquity", v)} prefix="$" />
                <NumberInput label="阶段最高账户净值" value={form.stageHighEquity} onChange={(v) => update("stageHighEquity", v)} prefix="$" />
                <NumberInput label="连续亏损笔数" value={form.consecutiveLosses} onChange={(v) => update("consecutiveLosses", v)} suffix="笔" />
                <TextInput label="股票代码" value={form.symbol} onChange={(v) => update("symbol", v.toUpperCase())} placeholder="INTC" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoBox label="今日亏损" value={`${result.dailyLoss.toFixed(2)}%`} tone={result.dailyLoss >= 5 ? "red" : "slate"} note="≥5% 当天停手" />
                <InfoBox label="本周亏损" value={`${result.weeklyLoss.toFixed(2)}%`} tone={result.weeklyLoss >= 10 ? "red" : "slate"} note="≥10% 停止交易一周" />
                <InfoBox label="阶段回撤" value={`${result.stageDrawdown.toFixed(2)}%`} tone={result.stageDrawdown >= 20 ? "red" : "slate"} note="≥20% 降仓；≥30% 停手" />
              </div>
            </Card>

            <Card title="2. 大盘数据：自动判断 QQQ 是否弱于 SPY" icon={<EmojiIcon symbol="🌦️" />} subtitle="输入 SPY 和 QQQ 的当日、5日、20日涨跌幅，系统自动比较。">
              <div className="grid gap-4 md:grid-cols-3">
                <NumberInput label="SPY 当日涨跌幅" value={form.spyDay} onChange={(v) => update("spyDay", v)} suffix="%" />
                <NumberInput label="SPY 5日涨跌幅" value={form.spy5} onChange={(v) => update("spy5", v)} suffix="%" />
                <NumberInput label="SPY 20日涨跌幅" value={form.spy20} onChange={(v) => update("spy20", v)} suffix="%" />
                <NumberInput label="QQQ 当日涨跌幅" value={form.qqqDay} onChange={(v) => update("qqqDay", v)} suffix="%" />
                <NumberInput label="QQQ 5日涨跌幅" value={form.qqq5} onChange={(v) => update("qqq5", v)} suffix="%" />
                <NumberInput label="QQQ 20日涨跌幅" value={form.qqq20} onChange={(v) => update("qqq20", v)} suffix="%" />
                <NumberInput label="VIX 当前值" value={form.vix} onChange={(v) => update("vix", v)} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Toggle label="SPY 在 EMA20 上方" value={form.spyAbove20} onChange={(v) => update("spyAbove20", v)} />
                <Toggle label="SPY 在 EMA50 上方" value={form.spyAbove50} onChange={(v) => update("spyAbove50", v)} />
                <Toggle label="QQQ 在 EMA20 上方" value={form.qqqAbove20} onChange={(v) => update("qqqAbove20", v)} />
                <Toggle label="QQQ 在 EMA50 上方" value={form.qqqAbove50} onChange={(v) => update("qqqAbove50", v)} />
                <Toggle label="今天明显恐慌盘" value={form.panicDay} onChange={(v) => update("panicDay", v)} danger />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoBox label="QQQ 对 SPY" value={result.qqqStrength.ok ? "不弱" : "偏弱/未确认"} tone={result.qqqStrength.ok ? "green" : "yellow"} note={`已比较 ${result.qqqStrength.available} 项，跑赢 ${result.qqqStrength.passed} 项`} />
                <InfoBox label="VIX 判断" value={toNum(form.vix) > 25 ? "恐慌" : toNum(form.vix) > 0 && toNum(form.vix) < 20 ? "低恐慌" : "中性/未填"} tone={toNum(form.vix) > 25 ? "red" : "slate"} note="VIX > 25 直接禁止新仓" />
              </div>
            </Card>

            <Card title="3. 板块数据：自动判断板块是否强于大盘" icon={<EmojiIcon symbol="🏭" />} subtitle="例如 INTC 看 SMH/SOXX；科技股看 QQQ/XLK。输入板块 ETF 涨跌幅即可。">
              <div className="grid gap-4 md:grid-cols-4">
                <TextInput label="板块 ETF" value={form.sectorName} onChange={(v) => update("sectorName", v.toUpperCase())} placeholder="SMH" />
                <NumberInput label="板块 ETF 当日涨跌幅" value={form.sectorDay} onChange={(v) => update("sectorDay", v)} suffix="%" />
                <NumberInput label="板块 ETF 5日涨跌幅" value={form.sector5} onChange={(v) => update("sector5", v)} suffix="%" />
                <NumberInput label="板块 ETF 20日涨跌幅" value={form.sector20} onChange={(v) => update("sector20", v)} suffix="%" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Toggle label="板块 ETF 在 EMA20 上方" value={form.sectorAbove20} onChange={(v) => update("sectorAbove20", v)} />
                <Toggle label="板块里的龙头大多数也强" value={form.leadersStrong} onChange={(v) => update("leadersStrong", v)} />
              </div>
              <div className="mt-4">
                <InfoBox label="板块相对大盘" value={result.sectorStrength.ok ? "强于大盘" : "不强/未确认"} tone={result.sectorStrength.ok ? "green" : "yellow"} note={`已比较 ${result.sectorStrength.available} 项，跑赢 ${result.sectorStrength.passed} 项；至少 3 项跑赢才算强`} />
              </div>
            </Card>

            <Card title="4. 个股数据：自动判断个股是否强于 QQQ / SPY" icon={<EmojiIcon symbol="📈" />} subtitle="输入个股当日、5日、20日涨跌幅，系统自动和 QQQ/SPY 比较。">
              <div className="grid gap-4 md:grid-cols-3">
                <NumberInput label="个股当日涨跌幅" value={form.stockDay} onChange={(v) => update("stockDay", v)} suffix="%" />
                <NumberInput label="个股 5日涨跌幅" value={form.stock5} onChange={(v) => update("stock5", v)} suffix="%" />
                <NumberInput label="个股 20日涨跌幅" value={form.stock20} onChange={(v) => update("stock20", v)} suffix="%" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Toggle label="个股价格在 EMA20 上方" value={form.priceAbove20} onChange={(v) => update("priceAbove20", v)} />
                <Toggle label="个股 EMA20 向上" value={form.ema20Up} onChange={(v) => update("ema20Up", v)} />
                <Toggle label="EMA5 在 EMA20 上方" value={form.ema5Above20} onChange={(v) => update("ema5Above20", v)} />
              </div>
              <div className="mt-4">
                <InfoBox label="个股相对强弱" value={result.stockStrength.ok ? "强于 QQQ / SPY" : "不强/未确认"} tone={result.stockStrength.ok ? "green" : "yellow"} note={`已比较 ${result.stockStrength.available} 项，跑赢 ${result.stockStrength.passed} 项；至少 3 项跑赢才算强`} />
              </div>
            </Card>

            <Card title="5. 近期疑似放量大阴线计算器" icon={<EmojiIcon symbol="📉" />} subtitle="填最近 5 天里最像大阴线的那一天。如果没有，就填最近最弱的一天。系统自动判断。">
              <div className="grid gap-4 md:grid-cols-3">
                <NumberInput label="那天开盘价" value={form.bearOpen} onChange={(v) => update("bearOpen", v)} prefix="$" />
                <NumberInput label="那天最高价" value={form.bearHigh} onChange={(v) => update("bearHigh", v)} prefix="$" />
                <NumberInput label="那天最低价" value={form.bearLow} onChange={(v) => update("bearLow", v)} prefix="$" />
                <NumberInput label="那天收盘价" value={form.bearClose} onChange={(v) => update("bearClose", v)} prefix="$" />
                <NumberInput label="那天成交量" value={form.bearVolume} onChange={(v) => update("bearVolume", v)} />
                <NumberInput label="10日平均成交量" value={form.bearAvgVolume10} onChange={(v) => update("bearAvgVolume10", v)} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoBox label="实体跌幅" value={`${result.bear.bodyDropPct.toFixed(2)}%`} note="≥2% 算明显下跌" />
                <InfoBox label="成交量倍数" value={`${result.bear.volumeRatio.toFixed(2)}x`} note="≥1.5x 算放量" />
                <InfoBox label="收盘位置" value={`${(result.bear.closePosition * 100).toFixed(0)}%`} note="≤30% 算收在低位" />
              </div>
              <div className="mt-4">
                <InfoBox label="放量大阴线判断" value={!result.bear.complete ? "数据未填完整" : result.bear.isBear ? "是，禁止交易" : "否，未触发"} tone={!result.bear.complete ? "yellow" : result.bear.isBear ? "red" : "green"} note="条件：收盘低于开盘、跌幅≥2%、量≥10日均量1.5倍、收盘在全天下30%" />
              </div>
            </Card>

            <Card title="6. 买点类型测试" icon={<EmojiIcon symbol="✅" />} subtitle="只能选择 A/B/C 三种合法买点。其他买点默认非法。">
              <Select label="本次买点类型" value={form.setupType} onChange={(v) => update("setupType", v)} options={setupOptions} />
              {form.setupType !== "other" && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {setupLabels[form.setupType].map((label, idx) => (
                    <Toggle key={label} label={label} value={form.setupChecks[form.setupType][idx]} onChange={(v) => updateSetupCheck(form.setupType, idx, v)} />
                  ))}
                </div>
              )}
            </Card>

            <Card title="7. 简化版硬性否决项" icon={<EmojiIcon symbol="⛔" />} subtitle="这些不是扣分项。任何一个成立，系统会直接取消交易。">
              <div className="grid gap-3 md:grid-cols-2">
                <Toggle label="财报快到了：距离财报少于 3 个交易日" value={form.hardVeto.earningsSoon} onChange={(v) => updateHard("earningsSoon", v)} danger />
                <Toggle label="今天高开太多，而且没有回踩确认" value={form.hardVeto.gapNoPullback} onChange={(v) => updateHard("gapNoPullback", v)} danger />
                <Toggle label="价格已经明显远离短期均线，我是在追高" value={form.hardVeto.farFromEma10} onChange={(v) => updateHard("farFromEma10", v)} danger />
                <Toggle label="今天冲高回落明显，可能是假突破" value={form.hardVeto.upperShadow} onChange={(v) => updateHard("upperShadow", v)} danger />
                <Toggle label="我还没有提前写止损价" value={form.hardVeto.noStop} onChange={(v) => updateHard("noStop", v)} danger />
                <Toggle label="我只是怕错过，所以想买" value={form.hardVeto.fomo} onChange={(v) => updateHard("fomo", v)} danger />
                <Toggle label="我亏了以后想翻本，所以想买" value={form.hardVeto.revenge} onChange={(v) => updateHard("revenge", v)} danger />
                <Toggle label="成交量太差，流动性不够" value={form.hardVeto.badLiquidity} onChange={(v) => updateHard("badLiquidity", v)} danger />
              </div>
            </Card>

            <Card title="8. 价格、止损与仓位计算" icon={<EmojiIcon symbol="💵" />} subtitle="输入买入价、止损价、目标价，系统自动计算盈亏比和股数。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberInput label="当前价，可选" value={form.currentPrice} onChange={(v) => update("currentPrice", v)} prefix="$" />
                <NumberInput label="计划买入价" value={form.buyPrice} onChange={(v) => update("buyPrice", v)} prefix="$" />
                <NumberInput label="技术止损价" value={form.stopPrice} onChange={(v) => update("stopPrice", v)} prefix="$" />
                <NumberInput label="第一目标价" value={form.firstTarget} onChange={(v) => update("firstTarget", v)} prefix="$" />
                <Select label="本次最大风险比例" value={form.riskPct} onChange={(v) => update("riskPct", v)} options={riskOptions} />
              </div>
            </Card>
          </main>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <Card title="系统判定" icon={<EmojiIcon symbol={isCancel ? "⚠️" : "🟢"} />}>
              <div className={`rounded-2xl p-4 ${isCancel ? "bg-red-50" : "bg-emerald-50"}`}>
                <p className="text-sm text-slate-500">最终动作</p>
                <p className={`mt-1 text-2xl font-bold ${isCancel ? "text-red-700" : "text-emerald-700"}`}>{result.finalAction}</p>
                <p className="mt-2 text-sm text-slate-600">系统判定：{result.rawDecision}</p>
              </div>
              <div className="mt-4 space-y-3">
                <ScoreBar label="市场分" value={result.marketScore} max={20} />
                <ScoreBar label="板块分" value={result.sectorScore} max={15} />
                <ScoreBar label="趋势分" value={result.trendScore} max={20} />
                <ScoreBar label="买点分" value={result.setupScore} max={25} />
                <ScoreBar label="风险分" value={result.riskScore} max={20} />
                <div className="rounded-xl bg-slate-100 p-4 text-center">
                  <div className="text-sm text-slate-500">总分</div>
                  <div className="text-3xl font-bold">{result.total}/100</div>
                </div>
              </div>
            </Card>

            <Card title="交易参数输出" icon={<EmojiIcon symbol="💰" />}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoBox label="每股风险" value={`$${result.perShareRisk.toFixed(2)}`} />
                <InfoBox label="盈亏比" value={result.rr ? `1:${result.rr.toFixed(2)}` : "--"} tone={result.rrInfo.tone} note={result.rrInfo.note} />
                <InfoBox label="盈亏比等级" value={result.rrInfo.text} tone={result.rrInfo.tone} />
                <InfoBox label="最大亏损" value={`$${result.maxLoss.toFixed(2)}`} />
                <InfoBox label="仓位上限" value={`${(result.maxPositionPct * 100).toFixed(0)}%`} />
                <InfoBox label="风险允许股数" value={`${result.riskShares}`} />
                <InfoBox label="仓位允许股数" value={`${result.positionShares}`} />
                <div className="col-span-2 rounded-xl bg-slate-950 p-4 text-white">
                  <p className="text-sm text-slate-300">建议买入股数</p>
                  <p className="mt-1 text-3xl font-bold">{result.shares} 股</p>
                  <p className="mt-2 text-sm text-slate-300">
                    计划买入金额：${result.positionAmount.toFixed(2)}，实际仓位：{(result.actualPositionPct * 100).toFixed(1)}%，触发止损预计亏损：${result.actualLoss.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>

            <Card title="取消原因 / 风险提示" icon={<EmojiIcon symbol="🚨" />}>
              <div className="space-y-3 text-sm">
                {allIssues.length === 0 ? (
                  <p className="rounded-xl bg-emerald-50 p-3 text-emerald-800">暂无硬性否决。继续看系统输出，不代表一定要交易。</p>
                ) : (
                  allIssues.map((x) => <p key={x} className="rounded-xl bg-red-50 p-3 text-red-800">{x}</p>)
                )}
              </div>
            </Card>

            <Card title="卖出规则" icon={<EmojiIcon symbol="📋" />}>
              <div className="space-y-2 text-sm text-slate-700">
                <p>硬止损：跌到技术止损价，清仓。</p>
                <p>+1R：止损上移到成本附近。</p>
                <p>+2R：卖出 20%-30%。</p>
                <p>+3R：再卖出 20%-30%。</p>
                <p>跌破 EMA20 / 前低 / 放量大阴线：清仓或大幅减仓。</p>
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
