import { useState } from "react";
import { Card, BottomSheet, MonthPicker } from "../components/ui.jsx";
import { YEN, fmtDate } from "../utils/fmt.js";

function nanoid() { return Math.random().toString(36).slice(2, 10); }
function pad2(v) { return String(v).padStart(2, "0"); }
function dateStr(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function monthStr(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }
function todayStr() { return dateStr(new Date()); }
function day(v, fallback) { return Math.min(Math.max(parseInt(v, 10) || fallback, 1), 28); }

function currentInvoiceMonth(closingDay) {
  const now = new Date();
  const offset = now.getDate() > day(closingDay, 15) ? 2 : 1;
  return monthStr(new Date(now.getFullYear(), now.getMonth() + offset, 1));
}

function invoiceRange(invoiceMonth, closingDay) {
  const [year, month] = invoiceMonth.split("-").map(Number);
  const close = day(closingDay, 15);
  return {
    start: dateStr(new Date(year, month - 3, close + 1)),
    end: dateStr(new Date(year, month - 2, close)),
  };
}

function dueDate(invoiceMonth, dueDay) {
  const [year, month] = invoiceMonth.split("-").map(Number);
  return dateStr(new Date(year, month - 1, day(dueDay, 10)));
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
function catLabel(id) {
  const mapped = LEGACY[id] || id;
  return CATS.find(c => c[0] === mapped)?.[1] || "Outro";
}

function defaultSetup() { return { name: "Cartao", closingDay: 15, dueDay: 10, limit: 0 }; }

export function Cartao({ extras, setExtras }) {
  const setup = extras?.cartao?.setup || defaultSetup();
  const [month, setMonth] = useState(() => currentInvoiceMonth(setup.closingDay));
  const [entry, setEntry] = useState(null);
  const [setupDraft, setSetupDraft] = useState(null);

  const range = invoiceRange(month, setup.closingDay);
  const due = dueDate(month, setup.dueDay);
  const all = extras?.cartao?.lancamentos || [];
  const lancamentos = all
    .filter(l => l.date && l.date >= range.start && l.date <= range.end)
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = lancamentos.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const limit = Number(setup.limit) || 0;
  const limitPct = limit > 0 ? Math.min(100, (total / limit) * 100) : 0;

  const byCat = {};
  for (const l of lancamentos) byCat[LEGACY[l.cat] || l.cat || "outro"] = (byCat[LEGACY[l.cat] || l.cat || "outro"] || 0) + (Number(l.amount) || 0);
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  function saveEntry() {
    const amount = parseFloat(String(entry.amount).replace(/[^0-9.]/g, "")) || 0;
    const item = { id: entry.id || nanoid(), date: entry.date || todayStr(), amount, cat: entry.cat || "outro", customCat: null };
    setExtras(prev => {
      const cartao = prev?.cartao || {};
      const current = cartao.lancamentos || [];
      const exists = current.some(l => l.id === item.id);
      const next = exists ? current.map(l => l.id === item.id ? item : l) : [...current, item];
      return { ...prev, cartao: { ...cartao, lancamentos: next } };
    });
    setEntry(null);
  }

  function removeEntry(id) {
    setExtras(prev => {
      const cartao = prev?.cartao || {};
      return { ...prev, cartao: { ...cartao, lancamentos: (cartao.lancamentos || []).filter(l => l.id !== id) } };
    });
    setEntry(null);
  }

  function saveSetup() {
    const s = {
      name: setupDraft.name || "Cartao",
      closingDay: parseInt(setupDraft.closingDay, 10) || 15,
      dueDay: parseInt(setupDraft.dueDay, 10) || 10,
      limit: parseFloat(String(setupDraft.limit).replace(/[^0-9.]/g, "")) || 0,
    };
    setExtras(prev => ({ ...prev, cartao: { ...(prev?.cartao || {}), setup: s } }));
    setMonth(currentInvoiceMonth(s.closingDay));
    setSetupDraft(null);
  }

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="flex items-center justify-between px-3 pt-3 pb-2 gap-2">
        <h1 className="text-base font-bold" style={{ color: "var(--cc)" }}>{setup.name}</h1>
        <div className="flex gap-2">
          <button onClick={() => setEntry({ date: todayStr(), amount: "", cat: "outro" })} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: "var(--cc)", color: "#fff" }}>Lancar</button>
          <button onClick={() => setSetupDraft({ ...setup })} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)" }}>Config</button>
        </div>
      </div>

      <div className="px-3 pb-1.5">
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Fatura com vencimento em</div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="flex flex-col gap-2 px-3">
        <Card>
          <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Total da fatura</div>
          <div className="text-base font-bold font-mono" style={{ color: "var(--negative)" }}>{YEN(total)}</div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Compras de {fmtDate(range.start, { day: "2-digit", month: "short" })} ate {fmtDate(range.end, { day: "2-digit", month: "short" })}. Vencimento {fmtDate(due, { day: "2-digit", month: "short" })}.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Fecha dia {setup.closingDay}. Limite {limit > 0 ? `${limitPct.toFixed(1)}%` : "nao definido"}.</p>
        </Card>

        {catRows.length > 0 && <Card>{catRows.map(([id, amount]) => <div key={id} className="flex justify-between py-1 border-b last:border-0" style={{ borderColor: "var(--border)" }}><span className="text-xs">{catLabel(id)}</span><span className="text-xs font-mono">{YEN(amount)}</span></div>)}</Card>}

        <section>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Lancamentos desta fatura</div>
          <Card>
            {lancamentos.length === 0 && <p className="text-xs py-1.5 text-center" style={{ color: "var(--text-muted)" }}>Nenhum lancamento nesta fatura</p>}
            {lancamentos.map(l => <button key={l.id} onClick={() => setEntry({ ...l, amount: String(l.amount) })} className="w-full flex justify-between gap-2 py-1 border-b last:border-0 text-left" style={{ borderColor: "var(--border)" }}><span className="text-xs">{catLabel(l.cat)}<br /><span style={{ color: "var(--text-muted)" }}>{fmtDate(l.date, { day: "2-digit", month: "short" })}</span></span><span className="text-xs font-mono">{YEN(l.amount)}</span></button>)}
          </Card>
        </section>
      </div>

      {entry && <BottomSheet title={entry.id ? "Editar lancamento" : "Novo lancamento"} onClose={() => setEntry(null)}><div className="p-4 flex flex-col gap-4"><input type="date" value={entry.date} onChange={e => setEntry(x => ({ ...x, date: e.target.value }))} className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /><input type="number" inputMode="numeric" value={entry.amount} onChange={e => setEntry(x => ({ ...x, amount: e.target.value }))} placeholder="Valor" className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /><select value={entry.cat} onChange={e => setEntry(x => ({ ...x, cat: e.target.value }))} className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}>{CATS.map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}</select><div className="flex gap-2">{entry.id && <button onClick={() => removeEntry(entry.id)} className="py-2.5 px-4 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "var(--negative)", border: "1px solid rgba(239,68,68,0.3)" }}>Excluir</button>}<button onClick={() => setEntry(null)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}>Cancelar</button><button onClick={saveEntry} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--cc)", color: "#fff" }}>Salvar</button></div></div></BottomSheet>}

      {setupDraft && <BottomSheet title="Configurar cartao" onClose={() => setSetupDraft(null)}><div className="p-4 flex flex-col gap-4"><input value={setupDraft.name} onChange={e => setSetupDraft(x => ({ ...x, name: e.target.value }))} placeholder="Nome" className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /><input type="number" value={setupDraft.limit} onChange={e => setSetupDraft(x => ({ ...x, limit: e.target.value }))} placeholder="Limite" className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /><div className="flex gap-3"><input type="number" min="1" max="28" value={setupDraft.closingDay} onChange={e => setSetupDraft(x => ({ ...x, closingDay: e.target.value }))} placeholder="Fechamento" className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /><input type="number" min="1" max="28" value={setupDraft.dueDay} onChange={e => setSetupDraft(x => ({ ...x, dueDay: e.target.value }))} placeholder="Vencimento" className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }} /></div><p className="text-xs" style={{ color: "var(--text-muted)" }}>Exemplo: fechamento 15 e fatura 10/08 soma compras de 16/06 ate 15/07.</p><button onClick={saveSetup} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--cc)", color: "#fff" }}>Salvar configuracoes</button></div></BottomSheet>}
    </div>
  );
}
