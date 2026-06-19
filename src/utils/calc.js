import { parseTime } from "./fmt.js";

export const DAY_TYPES = [
  { value: "normal",  label: "Normal" },
  { value: "saturday", label: "Sábado (6º dia)" },
  { value: "sunday",  label: "Domingo" },
  { value: "holiday", label: "Feriado Legal" },
  { value: "yukyu",   label: "有給休暇 (Folga Remunerada)" },
];

const JAPAN_RULES = {
  dailyHours: 8,
  weeklyHours: 40,
  overtimeRate: 0.25,
  overtimeHighRate: 0.50,
  monthlyOvertimeThreshold: 60,
  nightStart: 22,
  nightEnd: 5,
  nightRate: 0.25,
  holidayRate: 0.35,
};

const AICHI_RATES = {
  kenkouHoken: 0.0525,
  kouseiNenkin: 0.0915,
  kaigoHoken: 0.0082,
  koyouHoken: 0.006,
};

function getRules(settings) {
  if (settings.mode === "custom" && settings.customRules) {
    return { ...JAPAN_RULES, ...settings.customRules };
  }
  return JAPAN_RULES;
}

function calcNightMinutes(startMin, endMin, rules) {
  const nightStart = (rules.nightStart || 22) * 60;
  const nightEnd = (rules.nightEnd || 5) * 60;
  const dayLen = 24 * 60;

  // Build night windows for current day and next day
  const windows = [
    [nightStart, dayLen],
    [0, nightEnd],
    [nightStart + dayLen, dayLen + dayLen],
    [dayLen, dayLen + nightEnd],
  ];

  let nightMins = 0;
  const shiftLen = endMin > startMin ? endMin - startMin : endMin + dayLen - startMin;
  const normEnd = endMin > startMin ? endMin : endMin + dayLen;

  for (const [ws, we] of windows) {
    const oStart = Math.max(startMin, ws);
    const oEnd = Math.min(normEnd, we);
    if (oEnd > oStart) nightMins += oEnd - oStart;
  }
  return Math.min(nightMins, shiftLen);
}

export function calcDay(entry, settings, monthlyOvertimeSoFar = 0) {
  const rules = getRules(settings);
  const rate = settings.hourlyRate || 0;

  if (entry.dayType === "yukyu") {
    const pay = 8 * rate;
    return {
      totalMin: 480, totalHours: 8,
      normalMin: 480, normalHours: 8,
      overtimeDailyMin: 0, overtimeHours: 0,
      nightMin: 0, nightHours: 0,
      isHoliday: false, isSaturday: false, isSunday: false, isYukyu: true,
      normalPay: pay, overtimePay: 0, nightPay: 0, holidayPay: 0, satSunPay: 0,
      grossPay: pay,
      breakdown: { isYukyu: true, overtimeNormal: 0, overtimeHigh: 0, nightHours: 0, jpSaturdayIsAllOT: false, rates: { overtimeRate: rules.overtimeRate, nightRate: rules.nightRate, holidayRate: rules.holidayRate } },
    };
  }

  const startMin = parseTime(entry.start);
  let endMin = parseTime(entry.end);
  const breakMins = parseInt(entry.breakMinutes || 0, 10);

  // Handle overnight shifts
  const rawDuration = endMin > startMin ? endMin - startMin : endMin + 1440 - startMin;
  const totalMin = Math.max(0, rawDuration - breakMins);
  const totalHours = totalMin / 60;

  const nightMin = calcNightMinutes(startMin, endMin > startMin ? endMin : endMin + 1440, rules);
  const nightHours = nightMin / 60;

  const isHoliday = entry.dayType === "holiday";
  const isSaturday = entry.dayType === "saturday";
  const isSunday = entry.dayType === "sunday";
  const jpSaturdayIsAllOT = isSaturday && settings.mode !== "custom";

  const dailyLimit = (rules.dailyHours || 8) * 60;
  let overtimeDailyMin = 0;
  let normalMin = totalMin;

  if (jpSaturdayIsAllOT) {
    overtimeDailyMin = totalMin;
    normalMin = 0;
  } else if (!isHoliday) {
    overtimeDailyMin = Math.max(0, totalMin - dailyLimit);
    normalMin = Math.min(totalMin, dailyLimit);
  }

  const overtimeHours = overtimeDailyMin / 60;
  const normalHours = normalMin / 60;

  // Monthly OT tiers
  const threshold = (rules.monthlyOvertimeThreshold || 60) * 60;
  const soFarMins = monthlyOvertimeSoFar * 60;
  const afterMins = soFarMins + overtimeDailyMin;
  let overtimeHighMin = 0;
  let overtimeNormalMin = overtimeDailyMin;
  if (afterMins > threshold) {
    overtimeHighMin = Math.min(overtimeDailyMin, afterMins - threshold);
    overtimeNormalMin = overtimeDailyMin - overtimeHighMin;
  }

  // Pay calculations
  let normalPay = 0, overtimePay = 0, nightPay = 0, holidayPay = 0, satSunPay = 0;

  if (isHoliday) {
    holidayPay = totalHours * rate * rules.holidayRate;
    normalPay = totalHours * rate;
  } else {
    normalPay = normalHours * rate;
    // 1 + rate: overtime hours are paid base + premium (e.g. 1.25x for 25% OT)
    overtimePay = (overtimeNormalMin / 60) * rate * (1 + rules.overtimeRate)
      + (overtimeHighMin / 60) * rate * (1 + (rules.overtimeHighRate || 0.5));
  }

  nightPay = nightHours * rate * rules.nightRate;

  if (isSunday && settings.mode === "custom" && rules.sundayRate) {
    satSunPay = totalHours * rate * rules.sundayRate;
  }
  if (isSaturday && settings.mode === "custom" && rules.saturdayRate && !jpSaturdayIsAllOT) {
    satSunPay = totalHours * rate * rules.saturdayRate;
  }

  const grossPay = normalPay + overtimePay + nightPay + holidayPay + satSunPay;

  return {
    totalMin, totalHours: Math.round(totalHours * 100) / 100,
    normalMin, normalHours: Math.round(normalHours * 100) / 100,
    overtimeDailyMin, overtimeHours: Math.round(overtimeHours * 100) / 100,
    nightMin, nightHours: Math.round(nightHours * 100) / 100,
    isHoliday, isSaturday, isSunday, isYukyu: false,
    normalPay: Math.round(normalPay),
    overtimePay: Math.round(overtimePay),
    nightPay: Math.round(nightPay),
    holidayPay: Math.round(holidayPay),
    satSunPay: Math.round(satSunPay),
    grossPay: Math.round(grossPay),
    breakdown: {
      isYukyu: false,
      overtimeNormal: overtimeNormalMin / 60,
      overtimeHigh: overtimeHighMin / 60,
      nightHours,
      jpSaturdayIsAllOT,
      rates: { overtimeRate: rules.overtimeRate, overtimeHighRate: rules.overtimeHighRate || 0.5, nightRate: rules.nightRate, holidayRate: rules.holidayRate },
    },
  };
}

export function estimateDeductions(grossMonthly, settings) {
  const deductions = [];

  if (settings.healthInsurance !== false) {
    const amount = Math.round(grossMonthly * AICHI_RATES.kenkouHoken);
    deductions.push({ name: "健康保険", label: "Kenkou Hoken", amount, rate: AICHI_RATES.kenkouHoken });
  }
  if (settings.pension !== false) {
    const amount = Math.round(grossMonthly * AICHI_RATES.kouseiNenkin);
    deductions.push({ name: "厚生年金", label: "Kousei Nenkin", amount, rate: AICHI_RATES.kouseiNenkin });
  }
  if (settings.age >= 40) {
    const amount = Math.round(grossMonthly * AICHI_RATES.kaigoHoken);
    deductions.push({ name: "介護保険", label: "Kaigo Hoken (40+)", amount, rate: AICHI_RATES.kaigoHoken });
  }
  if (settings.employmentInsurance !== false) {
    const amount = Math.round(grossMonthly * AICHI_RATES.koyouHoken);
    deductions.push({ name: "雇用保険", label: "Koyou Hoken", amount, rate: AICHI_RATES.koyouHoken });
  }

  const socialSecurity = deductions.reduce((a, d) => a + d.amount, 0);
  const taxable = Math.max(0, grossMonthly - socialSecurity);

  let incomeTax = 0;
  if (taxable > 500000) incomeTax = taxable * 0.23;
  else if (taxable > 300000) incomeTax = taxable * 0.20;
  else if (taxable > 162500) incomeTax = taxable * 0.10;
  else if (taxable > 88000) incomeTax = taxable * 0.05;
  incomeTax = Math.round(incomeTax);
  if (incomeTax > 0) {
    deductions.push({ name: "所得税", label: "Shotoku Zei", amount: incomeTax, rate: null });
  }

  if (settings.municipalTax !== false) {
    const amount = Math.round(grossMonthly * (0.10 / 12));
    deductions.push({ name: "住民税", label: "Juumin Zei (est.)", amount, rate: 0.10 / 12 });
  }

  const totalDeductions = deductions.reduce((a, d) => a + d.amount, 0);
  const netPay = Math.max(0, grossMonthly - totalDeductions);

  return { deductions, totalDeductions, netPay, totalRate: totalDeductions / grossMonthly };
}

export function checkConflict(entry, entries, excludeId) {
  const same = entries.filter(e => e.id !== excludeId && e.date === entry.date);
  if (same.length === 0) return null;
  const ex = same[0];
  return { message: `Já existe um lançamento em ${entry.date}: ${ex.start}–${ex.end}` };
}

export const defaultSettings = {
  name: "",
  hourlyRate: 1500,
  age: 30,
  prefecture: "",
  hireDate: "",
  mode: "japan",
  healthInsurance: true,
  pension: true,
  employmentInsurance: true,
  municipalTax: true,
  defaultBreak: 60,
  teate: [
    { id: "t1", name: "非課税通勤手当", label: "Vale Transporte", amount: 12900, taxable: false, active: true },
    { id: "t2", name: "住宅手当①", label: "Moradia 1", amount: 15000, taxable: true, active: true },
    { id: "t3", name: "住宅手当②", label: "Moradia 2", amount: 10000, taxable: true, active: true },
    { id: "t4", name: "その他手当", label: "Outros", amount: 0, taxable: true, active: false },
  ],
  customRules: {
    dailyHours: 8, weeklyHours: 40,
    overtimeRate: 0.25, overtimeHighRate: 0.50,
    monthlyOvertimeThreshold: 60,
    nightStart: 22, nightEnd: 5, nightRate: 0.25,
    holidayRate: 0.35, saturdayRate: 0, sundayRate: 0,
  },
};

export const defaultGastos = {
  rendas: [],
  despesas: [],
  overrides: {},
  cartao: {},
  monthItems: {},
  monthHidden: {},
};
