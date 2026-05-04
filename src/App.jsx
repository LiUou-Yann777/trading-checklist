import React, { useMemo, useState } from "react";

/*
  Small Account Trading Decision App
  修复点：
  1. 移除 lucide-react 依赖，避免运行环境从 cdn.jsdelivr.net 拉取图标失败。
  2. 使用本地内联 EmojiIcon 作为图标，不依赖外部包。
  3. 将核心决策逻辑抽成 evaluateTrade(form)，并增加内置测试用例 TEST_CASES。
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
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
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
        <span className="font-medium text-slate-900">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
      </div>
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
  breakout: [
    "横盘至少 5-10 个交易日",
    "收盘突破平台上沿",
    "成交量 ≥ 10 日均量 1.5 倍",
    "收盘在当日振幅上半区",
    "不是长上影假突破",
  ],
  pullback: [
    "原本处于上涨趋势",
    "回踩 EMA10 / EMA20",
    "回踩时缩量",
    "重新放量站回 EMA5 / EMA10",
    "没有跌破前低",
  ],
  earnings: [
    "财报已经公布",
    "财报后跳空上涨",
    "成交量明显放大",
    "没有立刻回补缺口",
    "回踩后重新走强",
  ],
};

const initial = {
  account: "3000",
  symbol: "INTC",
  currentPrice: "",
  buyPrice: "",
  stopPrice: "",
  firstTarget: "",
  dailyLossPct: "0",
  weeklyLossPct: "0",
  drawdownPct: "0",
  consecutiveLosses: "0",
  spyAbove20: false,
  qqqAbove20: false,
  qqqStrong: false,
  vixUnder20: false,
  spyBelow50: false,
  qqqBelow50: false,
  vixAbove25: false,
  panicDay: false,
  sectorAbove20: false,
  sectorStrong: false,
  leadersStrong: false,
  priceAbove20: false,
  ema20Up: false,
  ema5Above20: false,
  stockStrong: false,
  noBearVolume: false,
  setupType: "breakout",
  setupChecks: {
    breakout: [false, false, false, false, false],
    pullback: [false, false, false, false, false],
    earnings: [false, false, false, false, false],
  },
  hardVeto: {
    belowEma20: false,
    ema20Down: false,
    earningsSoon: false,
    gapNoPullback: false,
    farFromEma10: false,
    upperShadow: false,
    bearVolume: false,
    badLiquidity: false,
    noStop: false,
    cannotCalcRisk: false,
    fomo: false,
    revenge: false,
  },
  riskPct: "0.05",
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function countTrue(values) {
  return values.filter(Boolean).length;
}

export function evaluateTrade(form) {
  const account = toNum(form.account);
  const buy = toNum(form.buyPrice || form.currentPrice);
  const stop = toNum(form.stopPrice);
  const target = toNum(form.firstTarget);
  const dailyLoss = toNum(form.dailyLossPct);
  const weeklyLoss = toNum(form.weeklyLossPct);
  const drawdown = toNum(form.drawdownPct);
  const losses = toNum(form.consecutiveLosses);

  const accountVeto = [];
  if (dailyLoss >= 5) accountVeto.push("单日亏损 ≥ 5%，当天停手");
  if (weeklyLoss >= 10) accountVeto.push("单周亏损 ≥ 10%，停止交易一周");
  if (drawdown >= 30) accountVeto.push("阶段回撤 ≥ 30%，停止实盘两周");
  if (losses >= 4) accountVeto.push("连续亏损 ≥ 4 笔，停止交易一周");

  const marketVeto = [];
  if (form.spyBelow50) marketVeto.push("SPY 跌破 EMA50");
  if (form.qqqBelow50) marketVeto.push("QQQ 跌破 EMA50");
  if (form.vixAbove25) marketVeto.push("VIX > 25");
  if (form.panicDay) marketVeto.push("当天明显恐慌盘");

  const hardVetoLabels = {
    belowEma20: "目标股在 EMA20 下方",
    ema20Down: "EMA20 向下",
    earningsSoon: "距离财报少于 3 个交易日",
    gapNoPullback: "高开超过 5%，无回踩确认",
    farFromEma10: "连涨后明显远离 EMA10",
    upperShadow: "放量长上影假突破",
    bearVolume: "近期连续放量大阴线",
    badLiquidity: "流动性差 / 成交量死水",
    noStop: "没有提前写止损价",
    cannotCalcRisk: "算不出最大亏损",
    fomo: "FOMO 追涨",
    revenge: "亏损后想翻本",
  };

  const hardVeto = Object.entries(form.hardVeto || {})
    .filter(([, v]) => Boolean(v))
    .map(([k]) => hardVetoLabels[k] || k);

  const marketScore = countTrue([
    form.spyAbove20,
    form.qqqAbove20,
    form.qqqStrong,
    form.vixUnder20,
  ]) * 5;

  const sectorScore = countTrue([
    form.sectorAbove20,
    form.sectorStrong,
    form.leadersStrong,
  ]) * 5;

  const trendScore = countTrue([
    form.priceAbove20,
    form.ema20Up,
    form.ema5Above20,
    form.stockStrong,
    form.noBearVolume,
  ]) * 4;

  let setupScore = 0;
  if (["breakout", "pullback", "earnings"].includes(form.setupType)) {
    setupScore = countTrue(form.setupChecks?.[form.setupType] || []) * 5;
  }

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
  if (marketScore < 10) thresholdFail.push("市场分低于 10");
  if (sectorScore < 5) thresholdFail.push("板块分低于 5");
  if (trendScore < 12) thresholdFail.push("趋势分低于 12");
  if (setupScore < 15) thresholdFail.push("买点分低于 15");
  if (riskScore < 15) thresholdFail.push("风险分低于 15");
  if (form.setupType === "other") thresholdFail.push("买点类型非法");
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

  if (drawdown >= 20 && maxPositionPct > 0.5) {
    maxPositionPct = 0.5;
    rawDecision = rawDecision.includes("禁止")
      ? rawDecision
      : `${rawDecision}，回撤 ≥20%，仓位上限降至 50%`;
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
      account: "3000",
      buyPrice: "100",
      stopPrice: "95",
      firstTarget: "112",
      spyAbove20: true,
      qqqAbove20: true,
      qqqStrong: true,
      vixUnder20: true,
      sectorAbove20: true,
      sectorStrong: true,
      leadersStrong: true,
      priceAbove20: true,
      ema20Up: true,
      ema5Above20: true,
      stockStrong: true,
      noBearVolume: true,
      setupType: "breakout",
      setupChecks: { ...initial.setupChecks, breakout: allTrueSetup },
      riskPct: "0.08",
    },
    expectActionIncludes: "允许：高进攻",
  },
  {
    name: "硬性否决触发必须取消",
    form: {
      ...initial,
      buyPrice: "100",
      stopPrice: "95",
      firstTarget: "112",
      spyAbove20: true,
      qqqAbove20: true,
      qqqStrong: true,
      vixUnder20: true,
      sectorAbove20: true,
      sectorStrong: true,
      leadersStrong: true,
      priceAbove20: true,
      ema20Up: true,
      ema5Above20: true,
      stockStrong: true,
      noBearVolume: true,
      setupType: "breakout",
      setupChecks: { ...initial.setupChecks, breakout: allTrueSetup },
      hardVeto: { ...initial.hardVeto, fomo: true },
    },
    expectActionIncludes: "取消",
  },
  {
    name: "止损价高于买入价必须取消",
    form: {
      ...initial,
      buyPrice: "100",
      stopPrice: "101",
      firstTarget: "112",
      spyAbove20: true,
      qqqAbove20: true,
      qqqStrong: true,
      vixUnder20: true,
      sectorAbove20: true,
      sectorStrong: true,
      leadersStrong: true,
      priceAbove20: true,
      ema20Up: true,
      ema5Above20: true,
      stockStrong: true,
      noBearVolume: true,
      setupType: "breakout",
      setupChecks: { ...initial.setupChecks, breakout: allTrueSetup },
    },
    expectActionIncludes: "取消",
  },
  {
    name: "市场非绿灯时禁止满仓，应降级为标准进攻",
    form: {
      ...initial,
      buyPrice: "100",
      stopPrice: "95",
      firstTarget: "112",
      spyAbove20: true,
      qqqAbove20: true,
      qqqStrong: false,
      vixUnder20: true,
      sectorAbove20: true,
      sectorStrong: true,
      leadersStrong: true,
      priceAbove20: true,
      ema20Up: true,
      ema5Above20: true,
      stockStrong: true,
      noBearVolume: true,
      setupType: "breakout",
      setupChecks: { ...initial.setupChecks, breakout: allTrueSetup },
      riskPct: "0.08",
    },
    expectActionIncludes: "允许：标准进攻",
  },
];

function runTests() {
  return TEST_CASES.map((test) => {
    const result = evaluateTrade(test.form);
    const passed = result.finalAction.includes(test.expectActionIncludes);
    return { ...test, result, passed };
  });
}

function TestPanel() {
  const tests = useMemo(() => runTests(), []);
  const passedCount = tests.filter((t) => t.passed).length;

  return (
    <Card title="内置规则测试" icon={<EmojiIcon symbol="🧪" />} subtitle="用于验证核心决策逻辑。不是行情回测，只是防止规则代码被改坏。">
      <div className="mb-3 rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-700">
        通过：{passedCount}/{tests.length}
      </div>
      <div className="space-y-2">
        {tests.map((t) => (
          <div
            key={t.name}
            className={`rounded-xl border p-3 text-sm ${t.passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
          >
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
  const updateHard = (key, value) =>
    setForm((f) => ({ ...f, hardVeto: { ...f.hardVeto, [key]: value } }));

  const updateSetupCheck = (type, idx, value) => {
    setForm((f) => {
      const next = [...f.setupChecks[type]];
      next[idx] = value;
      return { ...f, setupChecks: { ...f.setupChecks, [type]: next } };
    });
  };

  const result = useMemo(() => evaluateTrade(form), [form]);
  const isCancel = result.finalAction.includes("取消");
  const allIssues = [
    ...result.accountVeto,
    ...result.marketVeto,
    ...result.hardVeto,
    ...result.thresholdFail,
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-slate-300">小资金体量搏机会</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">交易决策测试系统</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                按 MBTI 测试的交互形式填写，但输出不是人格标签，而是交易动作：取消、等待、轻仓、标准进攻或高进攻，并自动计算止损、仓位和股数。
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
            <Card title="1. 基础与账户熔断" icon={<EmojiIcon symbol="🛡️" />} subtitle="先判断你今天有没有资格交易。账户失控时，不看个股。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberInput label="账户总资金" value={form.account} onChange={(v) => update("account", v)} prefix="$" />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">股票代码</span>
                  <input
                    value={form.symbol}
                    onChange={(e) => update("symbol", e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"
                  />
                </label>
                <NumberInput label="今日账户亏损" value={form.dailyLossPct} onChange={(v) => update("dailyLossPct", v)} suffix="%" />
                <NumberInput label="本周账户亏损" value={form.weeklyLossPct} onChange={(v) => update("weeklyLossPct", v)} suffix="%" />
                <NumberInput label="距离阶段高点回撤" value={form.drawdownPct} onChange={(v) => update("drawdownPct", v)} suffix="%" />
                <NumberInput label="连续亏损笔数" value={form.consecutiveLosses} onChange={(v) => update("consecutiveLosses", v)} suffix="笔" />
              </div>
            </Card>

            <Card title="2. 市场天气" icon={<EmojiIcon symbol="🌦️" />} subtitle="市场红灯时，个股再好也不新开多仓。">
              <div className="grid gap-3 md:grid-cols-2">
                <Toggle label="SPY 在 EMA20 上方" value={form.spyAbove20} onChange={(v) => update("spyAbove20", v)} />
                <Toggle label="QQQ 在 EMA20 上方" value={form.qqqAbove20} onChange={(v) => update("qqqAbove20", v)} />
                <Toggle label="QQQ 不弱于 SPY" value={form.qqqStrong} onChange={(v) => update("qqqStrong", v)} />
                <Toggle label="VIX < 20" value={form.vixUnder20} onChange={(v) => update("vixUnder20", v)} />
                <Toggle label="SPY 跌破 EMA50" value={form.spyBelow50} onChange={(v) => update("spyBelow50", v)} danger />
                <Toggle label="QQQ 跌破 EMA50" value={form.qqqBelow50} onChange={(v) => update("qqqBelow50", v)} danger />
                <Toggle label="VIX > 25" value={form.vixAbove25} onChange={(v) => update("vixAbove25", v)} danger />
                <Toggle label="今天明显恐慌盘" value={form.panicDay} onChange={(v) => update("panicDay", v)} danger />
              </div>
            </Card>

            <Card title="3. 板块与个股趋势" icon={<EmojiIcon symbol="📈" />} subtitle="你只攻击强势板块里的强势股。弱板块里的个股异动，降级处理。">
              <div className="grid gap-3 md:grid-cols-2">
                <Toggle label="板块 ETF 在 EMA20 上方" value={form.sectorAbove20} onChange={(v) => update("sectorAbove20", v)} />
                <Toggle label="板块强于大盘" value={form.sectorStrong} onChange={(v) => update("sectorStrong", v)} />
                <Toggle label="板块龙头同步走强" value={form.leadersStrong} onChange={(v) => update("leadersStrong", v)} />
                <div className="hidden md:block" />
                <Toggle label="个股价格在 EMA20 上方" value={form.priceAbove20} onChange={(v) => update("priceAbove20", v)} />
                <Toggle label="EMA20 向上" value={form.ema20Up} onChange={(v) => update("ema20Up", v)} />
                <Toggle label="EMA5 在 EMA20 上方" value={form.ema5Above20} onChange={(v) => update("ema5Above20", v)} />
                <Toggle label="个股强于 SPY / QQQ" value={form.stockStrong} onChange={(v) => update("stockStrong", v)} />
                <Toggle label="近期没有放量大阴线" value={form.noBearVolume} onChange={(v) => update("noBearVolume", v)} />
              </div>
            </Card>

            <Card title="4. 买点类型测试" icon={<EmojiIcon symbol="✅" />} subtitle="只能选择 A/B/C 三种合法买点。其他买点默认非法。">
              <Select label="本次买点类型" value={form.setupType} onChange={(v) => update("setupType", v)} options={setupOptions} />
              {form.setupType !== "other" && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {setupLabels[form.setupType].map((label, idx) => (
                    <Toggle
                      key={label}
                      label={label}
                      value={form.setupChecks[form.setupType][idx]}
                      onChange={(v) => updateSetupCheck(form.setupType, idx, v)}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card title="5. 硬性否决项" icon={<EmojiIcon symbol="⛔" />} subtitle="这里不是扣分项。任意一项触发，系统直接取消交易。">
              <div className="grid gap-3 md:grid-cols-2">
                <Toggle label="目标股在 EMA20 下方" value={form.hardVeto.belowEma20} onChange={(v) => updateHard("belowEma20", v)} danger />
                <Toggle label="EMA20 向下" value={form.hardVeto.ema20Down} onChange={(v) => updateHard("ema20Down", v)} danger />
                <Toggle label="距离财报少于 3 个交易日" value={form.hardVeto.earningsSoon} onChange={(v) => updateHard("earningsSoon", v)} danger />
                <Toggle label="高开超过 5%，无回踩确认" value={form.hardVeto.gapNoPullback} onChange={(v) => updateHard("gapNoPullback", v)} danger />
                <Toggle label="连涨后明显远离 EMA10" value={form.hardVeto.farFromEma10} onChange={(v) => updateHard("farFromEma10", v)} danger />
                <Toggle label="放量长上影假突破" value={form.hardVeto.upperShadow} onChange={(v) => updateHard("upperShadow", v)} danger />
                <Toggle label="近期连续放量大阴线" value={form.hardVeto.bearVolume} onChange={(v) => updateHard("bearVolume", v)} danger />
                <Toggle label="流动性差 / 成交量死水" value={form.hardVeto.badLiquidity} onChange={(v) => updateHard("badLiquidity", v)} danger />
                <Toggle label="没有提前写止损价" value={form.hardVeto.noStop} onChange={(v) => updateHard("noStop", v)} danger />
                <Toggle label="算不出最大亏损" value={form.hardVeto.cannotCalcRisk} onChange={(v) => updateHard("cannotCalcRisk", v)} danger />
                <Toggle label="FOMO 追涨" value={form.hardVeto.fomo} onChange={(v) => updateHard("fomo", v)} danger />
                <Toggle label="亏损后想翻本" value={form.hardVeto.revenge} onChange={(v) => updateHard("revenge", v)} danger />
              </div>
            </Card>

            <Card title="6. 价格、止损与仓位计算" icon={<EmojiIcon symbol="💵" />} subtitle="系统用止损倒推股数，不允许先拍脑袋决定满仓。">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberInput label="当前价，可选" value={form.currentPrice} onChange={(v) => update("currentPrice", v)} prefix="$" />
                <NumberInput label="计划买入价" value={form.buyPrice} onChange={(v) => update("buyPrice", v)} prefix="$" />
                <NumberInput label="技术止损价" value={form.stopPrice} onChange={(v) => update("stopPrice", v)} prefix="$" />
                <NumberInput label="第一目标价，用于计算盈亏比" value={form.firstTarget} onChange={(v) => update("firstTarget", v)} prefix="$" />
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
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">每股风险</p>
                  <p className="mt-1 font-semibold">${result.perShareRisk.toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">盈亏比</p>
                  <p className="mt-1 font-semibold">{result.rr ? result.rr.toFixed(2) : "--"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">最大亏损</p>
                  <p className="mt-1 font-semibold">${result.maxLoss.toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">仓位上限</p>
                  <p className="mt-1 font-semibold">{(result.maxPositionPct * 100).toFixed(0)}%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">风险允许股数</p>
                  <p className="mt-1 font-semibold">{result.riskShares}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">仓位允许股数</p>
                  <p className="mt-1 font-semibold">{result.positionShares}</p>
                </div>
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
                  allIssues.map((x) => (
                    <p key={x} className="rounded-xl bg-red-50 p-3 text-red-800">{x}</p>
                  ))
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
              <button
                type="button"
                onClick={() => setShowTests((v) => !v)}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
              >
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
