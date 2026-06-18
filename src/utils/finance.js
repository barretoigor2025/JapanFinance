import { calcDay, estimateDeductions } from "./calc.js";

export function monthLabel(ym) {
  if (!ym) return "";
  const label = new Date(`${ym}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function allMonthsFromData(entries = [], gastos = {}, extras = {}) {
  const months = new Set();
  entries.forEach(e => e?.date && months.add(e.date.slice(0, 7)));
  Object.keys(gastos?.overrides || {}).forEach(m => months.add(m));
  Object.keys(gastos?.monthItems || {}).forEach(m => months.add(m));
  (extras?.cartao?.lancamentos || []).forEach(i => i?.date && months.add(i.date.slice(0, 7)));
  (extras?.taxPayments || []).forEach(p => (p.parcelas || []).forEach(x => x?.dueDate && months.add(x.dueDate.slice(0, 7))));
  return [...months].sort();
}

export function sumSalaryMonth(entries = [], settings = {}, month) {
  const monthEntries = entries.filter(e => e?.date?.slice(0, 7) === month).sort((a, b) => a.date.localeCompare(b.date));
  let accOT = 0;
  const calcs = monthEntries.map(e => {
    const c = calcDay(e, settings, accOT);
    accOT += c.overtimeHours;
    return c;
  });
  const grossSalary = calcs.reduce((s, c) => s + c.grossPay, 0);
  const taxableTeate = (settings.teate || []).filter(t => t.active).reduce((s, t) => s + (t.amount || 0), 0);
  const grossWithTeate = grossSalary + taxableTeate;
  const deduction = estimateDeductions(grossWithTeate, settings);
  return {
    entries: monthEntries,
    calcs,
    workedDays: monthEntries.filter(e => e.dayType !== "yukyu").length,
    yukyuDays: monthEntries.filter(e => e.dayType === "yukyu").length,
    totalHours: calcs.reduce((s, c) => s + c.totalHours, 0),
    overtimeHours: calcs.reduce((s, c) => s + c.overtimeHours, 0),
    nightHours: calcs.reduce((s, c) => s + c.nightHours, 0),
    grossSalary,
    teate: taxableTeate,
    grossWithTeate,
    estimatedNet: deduction.netPay,
    estimatedDeductions: deduction.totalDeductions,
    deductions: deduction.deductions,
  };
}

function valWithOverride(item, overrides) {
  if (!item) return 0;
  return overrides?.[item.id] !== undefined ? overrides[item.id] : (item.amount || 0);
}

export function sumBudgetMonth(gastos = {}, month) {
  const overrides = gastos.overrides?.[month] || {};
  const hidden = gastos.monthHidden?.[month] || [];
  const monthItems = gastos.monthItems?.[month] || [];
  const visible = item => item?.active !== false && !hidden.includes(item.id);

  const recurringIncome = (gastos.rendas || []).filter(visible).map(i => ({ ...i, amount: valWithOverride(i, overrides), source: "fixo" }));
  const recurringDebit = (gastos.despesas || []).filter(i => i.tipo === "debito" && visible(i)).map(i => ({ ...i, amount: valWithOverride(i, overrides), source: "fixo" }));
  const recurringHagaki = (gastos.despesas || []).filter(i => i.tipo === "hagaki" && visible(i)).map(i => ({ ...i, amount: valWithOverride(i, overrides), source: "fixo" }));
  const monthIncome = monthItems.filter(i => i.tipo === "renda").map(i => ({ ...i, source: "mês" }));
  const monthDebit = monthItems.filter(i => i.tipo === "debito").map(i => ({ ...i, source: "mês" }));
  const monthHagaki = monthItems.filter(i => i.tipo === "hagaki").map(i => ({ ...i, source: "mês" }));

  const incomeItems = [...recurringIncome, ...monthIncome];
  const debitItems = [...recurringDebit, ...monthDebit];
  const hagakiItems = [...recurringHagaki, ...monthHagaki];
  const income = incomeItems.reduce((s, i) => s + (i.amount || 0), 0);
  const debit = debitItems.reduce((s, i) => s + (i.amount || 0), 0);
  const hagaki = hagakiItems.reduce((s, i) => s + (i.amount || 0), 0);

  return { incomeItems, debitItems, hagakiItems, income, debit, hagaki, fixedExpenses: debit + hagaki };
}

export function cardMonth(lancamentos = [], month) {
  const items = lancamentos.filter(i => i?.date?.slice(0, 7) === month).sort((a, b) => b.date.localeCompare(a.date));
  const total = items.reduce((s, i) => s + (i.amount || 0), 0);
  const byCat = items.reduce((acc, i) => {
    const key = i.customCat || i.cat || "outro";
    acc[key] = (acc[key] || 0) + (i.amount || 0);
    return acc;
  }, {});
  const categories = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => ({ cat, amount }));
  return { items, total, categories };
}

export function vehicleTaxStatus(extras = {}, month) {
  const vehicles = extras.taxVehicles || [];
  const payments = extras.taxPayments || [];
  const rows = payments.flatMap(payment => {
    const vehicle = vehicles.find(v => v.id === payment.vehicleId);
    return (payment.parcelas || []).map(parcel => ({
      vehicle: vehicle?.name || "Veículo",
      year: payment.year,
      amount: parcel.value || 0,
      dueDate: parcel.dueDate,
      paid: !!parcel.paid,
      paidDate: parcel.paidDate,
      parcel: parcel.num,
    }));
  }).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  return {
    rows,
    monthRows: rows.filter(r => r.dueDate?.slice(0, 7) === month),
    openTotal: rows.filter(r => !r.paid).reduce((s, r) => s + r.amount, 0),
    nextOpen: rows.find(r => !r.paid),
  };
}

export function annualTaxSnapshot(extras = {}) {
  const gensen = [...(extras.gensen || [])].sort((a, b) => (b.nenBun || 0) - (a.nenBun || 0))[0];
  if (!gensen) return null;
  return {
    year: gensen.nenBun,
    company: gensen.empresa,
    paid: gensen.shiharaiGaku || 0,
    salaryIncomeAfterDeduction: gensen.kyuyoShotokuGo || 0,
    incomeDeductions: gensen.shotokuKojo || 0,
    withheldTax: gensen.gensenZei || 0,
    socialInsurance: gensen.shakaiHoken || 0,
  };
}

export function buildMonthlyFinance(entries, settings, gastos, extras, month) {
  const salary = sumSalaryMonth(entries, settings, month);
  const budget = sumBudgetMonth(gastos, month);
  const card = cardMonth(extras?.cartao?.lancamentos || [], month);
  const vehicleTax = vehicleTaxStatus(extras, month);
  const incomeReal = budget.income || salary.estimatedNet;
  const totalOut = budget.fixedExpenses + card.total;
  const saldo = incomeReal - totalOut;
  const cashNeeded = budget.hagaki + vehicleTax.monthRows.filter(r => !r.paid).reduce((s, r) => s + r.amount, 0);
  return { salary, budget, card, vehicleTax, incomeReal, totalOut, saldo, cashNeeded };
}
