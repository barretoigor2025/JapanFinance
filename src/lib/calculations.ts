import type { AppState, CardLaunch, WorkEntry } from '../types';

const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });

export const formatYen = (value: number) => yen.format(Math.round(value || 0));

export function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  return Math.max(0, endMin - startMin);
}

export function nightMinutes(entry: WorkEntry, nightStart = 22, nightEnd = 5) {
  const [sh, sm] = entry.start.split(':').map(Number);
  const total = minutesBetween(entry.start, entry.end);
  const startAbs = sh * 60 + sm;
  let minutes = 0;
  for (let i = 0; i < total; i += 15) {
    const clock = (startAbs + i) % (24 * 60);
    const hour = clock / 60;
    const isNight = nightStart > nightEnd ? hour >= nightStart || hour < nightEnd : hour >= nightStart && hour < nightEnd;
    if (isNight) minutes += 15;
  }
  return minutes;
}

export function summarizeWork(entries: WorkEntry[], state: AppState, ym: string) {
  const rules = state.settings.customRules;
  const monthEntries = entries.filter((entry) => entry.date.startsWith(ym));
  let totalMinutes = 0;
  let regularMinutes = 0;
  let overtimeMinutes = 0;
  let nightPremiumMinutes = 0;
  let holidayMinutes = 0;
  let paidLeaveDays = 0;

  for (const entry of monthEntries) {
    const worked = Math.max(0, minutesBetween(entry.start, entry.end) - entry.breakMinutes);
    if (entry.dayType === 'yukyu') {
      paidLeaveDays += 1;
      regularMinutes += rules.dailyHours * 60;
      totalMinutes += rules.dailyHours * 60;
      continue;
    }
    totalMinutes += worked;
    const dailyBase = Math.min(worked, rules.dailyHours * 60);
    regularMinutes += dailyBase;
    overtimeMinutes += Math.max(0, worked - rules.dailyHours * 60);
    if (entry.dayType === 'holiday' || entry.dayType === 'sunday') holidayMinutes += worked;
    nightPremiumMinutes += Math.max(0, nightMinutes(entry, rules.nightStart, rules.nightEnd) - Math.min(entry.breakMinutes, 60));
  }

  const hourly = state.settings.hourlyRate;
  const basePay = (regularMinutes / 60) * hourly;
  const overtimePay = (overtimeMinutes / 60) * hourly * (1 + rules.overtimeRate);
  const nightPay = (nightPremiumMinutes / 60) * hourly * rules.nightRate;
  const holidayPay = (holidayMinutes / 60) * hourly * rules.holidayRate;
  const allowances = state.settings.teate.filter((item) => item.active).reduce((sum, item) => sum + item.amount, 0);
  const gross = basePay + overtimePay + nightPay + holidayPay + allowances;

  return { monthEntries, totalMinutes, regularMinutes, overtimeMinutes, nightPremiumMinutes, holidayMinutes, paidLeaveDays, basePay, overtimePay, nightPay, holidayPay, allowances, gross };
}

export function activeMonthItems(state: AppState, ym: string) {
  const hidden = new Set(state.gastos.monthHidden?.[ym] ?? []);
  const override = state.gastos.overrides?.[ym] ?? {};
  const incomes = state.gastos.rendas
    .filter((item) => item.active && !hidden.has(item.id))
    .map((item) => ({ ...item, amount: override[item.id] ?? item.amount }));
  const expenses = state.gastos.despesas
    .filter((item) => item.active && !hidden.has(item.id))
    .map((item) => ({ ...item, amount: override[item.id] ?? item.amount }));
  const oneOff = (state.gastos.monthItems?.[ym] ?? []).map((item) => ({ ...item, active: true }));
  return { incomes, expenses: [...expenses, ...oneOff] };
}

export function summarizeBudget(state: AppState, ym: string) {
  const { incomes, expenses } = activeMonthItems(state, ym);
  const incomeTotal = incomes.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  return { incomes, expenses, incomeTotal, expenseTotal, balance: incomeTotal - expenseTotal };
}

export function summarizeCard(launches: CardLaunch[] = [], ym: string) {
  const filtered = launches.filter((item) => item.date.startsWith(ym));
  const total = filtered.reduce((sum, item) => sum + item.amount, 0);
  const byCat = filtered.reduce<Record<string, number>>((acc, item) => {
    const key = item.customCat || item.cat || 'outro';
    acc[key] = (acc[key] ?? 0) + item.amount;
    return acc;
  }, {});
  return { filtered, total, byCat: Object.entries(byCat).sort((a, b) => b[1] - a[1]) };
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
