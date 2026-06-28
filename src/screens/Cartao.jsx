import { useState } from "react";
import { Card, BottomSheet, MonthPicker } from "../components/ui.jsx";
import { YEN, fmtDate } from "../utils/fmt.js";

function id() { return Math.random().toString(36).slice(2, 10); }
function p2(v) { return String(v).padStart(2, "0"); }
function ymd(d) { return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
function ym(d) { return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; }
function today() { return ymd(new Date()); }
function safe(v, f) { return Math.min(Math.max(parseInt(v, 10) || f, 1), 28); }
function money(v) { return parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0; }

function currentInvoiceMonth(closeDay = 20) {
  const now = new Date();
  const offset = now.getDate() > safe(closeDay, 20) ? 2 : 1;
  return ym(new Date(now.getFullYear(), now.getMonth() + offset, 1));
}

function invoiceRange(invoiceMonth, closeDay = 20) {
  const [y, m] = invoiceMonth.split("-").map(Number);
  const c = safe(closeDay, 20);
  return {
    start: ymd(new Date(y, m - 3, c + 1)),
    end: ymd(new Date(y, m - 2, c)),
  };
}

function dueDate(invoiceMonth, dueDay = 10) {
  const [y, m] = invoiceMonth.split("-").map(Number);
  return ymd(new Date(y, m - 1, safe(dueDay, 10)));
}

const CATS = [
  ["mercado_jp", "Mercado JP"],
  ["mercado_br", "Mercado BR"],
  ["restaurante", "Restaurante"],
  ["konbini", "Konbini"],
  ["combustivel", "Combustivel"],
  ["online", "Online/Amazon"],
  ["farmacia", "Farmacia"],
  ["homecenter", "HomeCenter"],
  ["outro", "Outro"],
];
const LEGACY = { supermercado: "mercado_jp", posto: "combustivel" };
function catLabel(v) {
  const k = LEGACY[v] || v;
  return CATS.find(c => c[0] === k)?.[1] || "Outro";
}
function setupDefault() { return { name: "Cartao", closingDay: 20, dueDay: 10, limit: 0 }; }

export function Cartao({ extras, setExtras }) {
  const setup = extras?.cartao?.setup || setupDefault();
  const [month, setMonth] = useState(() => currentInvoiceMonth(setup.closingDay));
  const [entry, setEntry] = useState(null);
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState(false);

  const all = extras?.cartao?.lancamentos || [];
  const range = invoiceRange(month, setup.closingDay);
  const due = dueDate(month, setup.dueDay);
  const rows = all.filter(x => x.date && x.date >= range.start && x.date <= range.end).sort((a, b) => b.date.localeCompare(a.date));
  const total = rows.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const limit = Number(setup.limit) || 0;
  const pct = limit > 0 ? Math.min(100, total / limit * 100) : 0;
  const cats = {};
  rows.forEach(x => { const k = LEGACY[x.cat] || x.cat || "outro"; cats[k] = (cats[k] || 0) + (Number(x.amount) || 0); });
  const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]);

  async function copy() {
    const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const text = [
      "DADOS DA FATURA - JAPANFINANCE",
      `Cartao: ${setup.name || "Cartao"}`,
      `Fatura selecionada: ${month}`,
      `Vencimento: ${due}`,
      `Fechamento: dia ${setup.closingDay}`,
      `Periodo: ${range.start} ate ${range.end}`,
      `Total: ${YEN(total)}`,
      "",
      "Lancamentos:",
      ...(ordered.length ? ordered.map(x => `- ${x.date} | ${catLabel(x.cat)} | ${YEN(x.amount)}`) : ["- Nenhum lancamento"]),
    ].join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { alert(text); }
  }

  function saveEntry() {
    const item = { id: entry.id || id(), date: entry.date || today(), amount: money(entry.amount), cat: entry.cat || "outro", customCat: null };
    setExtras(prev => {
      const cartao = prev?.cartao || {};
      const old = cartao.lancamentos || [];
      const next = old.some(x => x.id === item.id) ? old.map(x => x.id === item.id ? item : x) : [...old, item];
      return { ...prev, cartao: { ...cartao, lancamentos: next } };
    });
    setEntry(null);
  }

  function del(idv) {
    setExtras(prev => {
      const cartao = prev?.cartao || {};
      return { ...prev, cartao: { ...cartao, lancamentos: (cartao.lancamentos || []).filter(x => x.id !== idv) } };
    });
    setEntry(null);
  }

  function saveSetup() {
    const s = { name: draft.name || "Cartao", closingDay: parseInt(draft.closingDay, 10) || 20, dueDay: parseInt(draft.dueDay, 10) || 10, limit: money(draft.limit) };
    setExtras(prev => ({ ...prev, cartao: { ...(prev?.cartao || {}), setup: s } }));
    setMonth(currentInvoiceMonth(s.closingDay));
    setDraft(null);
  }

  return <div className="flex flex-col min-h-screen pb-20" style={{ background: "var(--bg)", color: "var(--text)" }}>
    <div className="flex items-center justify-between px-3 pt-3 pb-2 gap-2">
      <h1 className="text-base font-bold" style={{ color: "var(--cc)" }}>Cartao - {setup.name}</h1>
      <div className="flex gap-2">
        <button onClick={copy} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold" style={{ background: copied ? "var(--positive)" : "var(--bg-elevated)", color: copied ? "#fff" : "var(--text-sub)", border: "1px solid var(--border)" }}>{copied ? "Copiado" : "Copiar"}</button>
        <button onClick={() => setEntry({ date: today(), amount: "", cat: "outro" })} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: "var(--cc)", color: "#fff" }}>+ Lancar</button>
        <button onClick={() => setDraft({ ...setup })} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold" style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)" }}>Config</button>
      </div>
    </div>

    <div className="px-3 pb-1.5"><div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Fatura com vencimento em</div><MonthPicker value={month} onChange={setMonth} /></div>

    <div className="flex flex-col gap-2 px-3">
      <Card><div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Total da fatura</div><div className="text-base font-bold font-mono" style={{ color: "var(--negative)" }}>{YEN(total)}</div><p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{fmtDate(range.start, { day: "2-digit", month: "short" })} ate {fmtDate(range.end, { day: "2-digit", month: "short" })}. Vcto {fmtDate(due, { day: "2-digit", month: "short" })}. Fecha dia {setup.closingDay}.</p>{limit > 0 && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Limite {YEN(limit)} - uso {pct.toFixed(1)}%</p>}</Card>
      {catRows.length > 0 && <Card>{catRows.map(([k, v]) => <div key={k} className="flex justify-between py-1 border-b last:border-0" style={{ borderColor: "var(--border)" }}><span className="text-xs">{catLabel(k)}</span><span className="text-xs font-mono">{YEN(v)}</span></div>)}</Card>}
      <section><div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Lancamentos desta fatura</div><Card>{rows.length === 0 && <p className="text-xs py-1.5 text-center" style={{ color: "var(--text-muted)" }}>Nenhum lancamento nesta fatura</p>}{rows.map(x => <button key={x.id} onClick={() => setEntry({ ...x, amount: String(x.amount) })} className="w-full flex justify-between gap-2 py-1 border-b last:border-0 text-left" style={{ borderColor: "var(--border)" }}><span className="text-xs">{catLabel(x.cat)}<br /><span style={{ color: "var(--text-muted)" }}>{fmtDate(x.date, { day: "2-digit", month: "short" })}</span></span><span className="text-xs font-mono font-semibold" style={{ color: "var(--cc)" }}>{YEN(x.amount)}</span></button>)}<div className="flex justify-between pt-1.5 mt-0.5 border-t" style={{ borderColor: "var(--border)" }}><span className="text-xs" style={{ color: "var(--text-muted)" }}>Total</span><span className="text-xs font-bold font-mono" style={{ color: "var(--negative)" }}>{YEN(total)}</span></div></Card></section>
    </div>

    {entry && <BottomSheet title={entry.id ? "Editar lancamento" : "Novo lancamento"} onClose={() => setEntry(null)}><div className="p-4 flex flex-col gap-4"><input type="date" value={entry.date} onChange={e => setEntry(x => ({ ...x, date: e.target.value }))} className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /><input type="number" inputMode="numeric" value={entry.amount} onChange={e => setEntry(x => ({ ...x, amount: e.target.value }))} placeholder="Valor" className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /><select value={entry.cat} onChange={e => setEntry(x => ({ ...x, cat: e.target.value }))} className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}>{CATS.map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}</select><div className="flex gap-2">{entry.id && <button onClick={() => del(entry.id)} className="py-2.5 px-4 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "var(--negative)", border: "1px solid rgba(239,68,68,0.3)" }}>Excluir</button>}<button onClick={() => setEntry(null)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}>Cancelar</button><button onClick={saveEntry} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--cc)", color: "#fff" }}>Salvar</button></div></div></BottomSheet>}
    {draft && <BottomSheet title="Configurar cartao" onClose={() => setDraft(null)}><div className="p-4 flex flex-col gap-4"><input value={draft.name} onChange={e => setDraft(x => ({ ...x, name: e.target.value }))} placeholder="Nome" className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /><input type="number" value={draft.limit} onChange={e => setDraft(x => ({ ...x, limit: e.target.value }))} placeholder="Limite" className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /><div className="flex gap-3"><input type="number" min="1" max="28" value={draft.closingDay} onChange={e => setDraft(x => ({ ...x, closingDay: e.target.value }))} placeholder="Fechamento" className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /><input type="number" min="1" max="28" value={draft.dueDay} onChange={e => setDraft(x => ({ ...x, dueDay: e.target.value }))} placeholder="Vencimento" className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /></div><p className="text-xs" style={{ color: "var(--text-muted)" }}>Agora o fechamento realoca os lancamentos por fatura. Ex.: fechamento 20 e vencimento 10/07 soma compras de 21/05 ate 20/06.</p><button onClick={saveSetup} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--cc)", color: "#fff" }}>Salvar configuracoes</button></div></BottomSheet>}
  </div>;
}
