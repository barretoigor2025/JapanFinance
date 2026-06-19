import { useState } from "react";
import { Card, SectionLabel, BottomSheet, MonthPicker } from "../components/ui.jsx";
import { YEN, fmtDate, currentMonth } from "../utils/fmt.js";

// ── helpers ────────────────────────────────────────────────────────────────────
function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const CATS = [
  { id: "supermercado", label: "Supermercado",  icon: "🛒" },
  { id: "restaurante",  label: "Restaurante",   icon: "🍜" },
  { id: "konbini",      label: "Konbini",       icon: "🏪" },
  { id: "combustivel",  label: "Combustível",   icon: "⛽" },
  { id: "online",       label: "Online/Amazon", icon: "🌐" },
  { id: "farmacia",     label: "Farmácia",      icon: "💊" },
  { id: "outro",        label: "Outro",         icon: "📌" },
];

function getCat(id) {
  return CATS.find(c => c.id === id) || CATS[CATS.length - 1];
}

// ── default setup shape ────────────────────────────────────────────────────────
function defaultSetup() {
  return { name: "Cartão", closingDay: 15, dueDay: 11, limit: 0 };
}

// ── Cartao Screen ──────────────────────────────────────────────────────────────
export function Cartao({ extras, setExtras }) {
  const [month, setMonth] = useState(currentMonth());
  const [entryModal, setEntryModal] = useState(null); // null | { id?, date, amount, cat }
  const [setupModal, setSetupModal] = useState(false);
  const [setupDraft, setSetupDraft] = useState(null);

  // ── derived data ───────────────────────────────────────────────────────────
  const setup = extras?.cartao?.setup || defaultSetup();
  const allLancamentos = extras?.cartao?.lancamentos || [];

  // filter to selected month
  const lancamentos = allLancamentos
    .filter(l => l.date && l.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = lancamentos.reduce((s, l) => s + (l.amount || 0), 0);
  const limit = setup.limit || 0;
  const limitPct = limit > 0 ? Math.min(100, (total / limit) * 100) : 0;

  // category breakdown
  const catTotals = {};
  for (const l of lancamentos) {
    catTotals[l.cat] = (catTotals[l.cat] || 0) + (l.amount || 0);
  }
  const catBreakdown = Object.entries(catTotals)
    .map(([id, amt]) => ({ id, amt }))
    .sort((a, b) => b.amt - a.amt);

  // ── mutators ───────────────────────────────────────────────────────────────
  function saveEntry() {
    if (!entryModal) return;
    const amount = parseFloat(String(entryModal.amount).replace(/[^0-9.]/g, "")) || 0;
    const entry = {
      id: entryModal.id || nanoid(),
      date: entryModal.date || todayStr(),
      amount,
      cat: entryModal.cat || "outro",
      customCat: entryModal.customCat || null,
    };

    setExtras(prev => {
      const cartao = prev?.cartao || {};
      const existing = cartao.lancamentos || [];
      const idx = existing.findIndex(l => l.id === entry.id);
      const updated = idx !== -1
        ? existing.map((l, i) => (i === idx ? entry : l))
        : [...existing, entry];
      return {
        ...prev,
        cartao: { ...cartao, lancamentos: updated },
      };
    });
    setEntryModal(null);
  }

  function deleteEntry(id) {
    setExtras(prev => {
      const cartao = prev?.cartao || {};
      return {
        ...prev,
        cartao: {
          ...cartao,
          lancamentos: (cartao.lancamentos || []).filter(l => l.id !== id),
        },
      };
    });
    setEntryModal(null);
  }

  function openAdd() {
    setEntryModal({ id: null, date: todayStr(), amount: "", cat: "outro", customCat: null });
  }

  function openEdit(l) {
    setEntryModal({ id: l.id, date: l.date, amount: String(l.amount), cat: l.cat, customCat: l.customCat });
  }

  function openSetup() {
    setSetupDraft({ ...setup });
    setSetupModal(true);
  }

  function saveSetup() {
    if (!setupDraft) return;
    const s = {
      name: setupDraft.name || "Cartão",
      closingDay: parseInt(setupDraft.closingDay) || 15,
      dueDay: parseInt(setupDraft.dueDay) || 11,
      limit: parseFloat(String(setupDraft.limit).replace(/[^0-9.]/g, "")) || 0,
    };
    setExtras(prev => ({
      ...prev,
      cartao: { ...(prev?.cartao || {}), setup: s },
    }));
    setSetupModal(false);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ background: "var(--bg)", color: "var(--text)" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h1 className="text-lg font-bold" style={{ color: "var(--cc)" }}>💳 {setup.name}</h1>
        <button
          onClick={openSetup}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-base"
          style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)" }}
          title="Configurar cartão"
        >
          ⚙️
        </button>
      </div>

      {/* ── Month picker ── */}
      <div className="px-3 pb-3">
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="flex flex-col gap-3 px-3">

        {/* ── Summary card ── */}
        <Card>
          <div className="flex items-start justify-between mb-2">
            <div>
              <SectionLabel>Total do mês</SectionLabel>
              <span className="text-2xl font-bold font-mono" style={{ color: "var(--negative)" }}>
                {YEN(total)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{setup.name}</p>
              {limit > 0 && (
                <p className="text-xs font-mono" style={{ color: "var(--text-sub)" }}>
                  Limite: {YEN(limit)}
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Fecha dia {setup.closingDay} · Vence dia {setup.dueDay}
              </p>
            </div>
          </div>

          {limit > 0 && (
            <>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Uso do limite</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: limitPct > 80 ? "var(--negative)" : limitPct > 60 ? "var(--warning)" : "var(--positive)" }}
                >
                  {limitPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${limitPct}%`,
                    background: limitPct > 80 ? "var(--negative)" : limitPct > 60 ? "var(--warning)" : "var(--cc)",
                  }}
                />
              </div>
            </>
          )}
        </Card>

        {/* ── Category breakdown ── */}
        {catBreakdown.length > 0 && (
          <section>
            <SectionLabel>Por categoria</SectionLabel>
            <Card>
              {catBreakdown.map(({ id, amt }) => {
                const cat = getCat(id);
                const pct = total > 0 ? (amt / total) * 100 : 0;
                return (
                  <div key={id} className="py-2 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-mono font-semibold" style={{ color: "var(--cc)" }}>{YEN(amt)}</span>
                        <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: "var(--cc)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>
        )}

        {/* ── Transaction list ── */}
        <section>
          <SectionLabel>Lançamentos</SectionLabel>
          {lancamentos.length === 0 ? (
            <Card>
              <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>
                Nenhum lançamento neste mês
              </p>
            </Card>
          ) : (
            <Card>
              {lancamentos.map(l => {
                const cat = getCat(l.cat);
                return (
                  <button
                    key={l.id}
                    onClick={() => openEdit(l)}
                    className="w-full flex items-center gap-3 py-2.5 border-b last:border-0 text-left"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="text-xl shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{cat.label}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {fmtDate(l.date, { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <span className="text-sm font-mono font-semibold shrink-0" style={{ color: "var(--cc)" }}>
                      {YEN(l.amount)}
                    </span>
                  </button>
                );
              })}

              {/* total row */}
              <div className="flex justify-between items-center pt-2 mt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total</span>
                <span className="text-sm font-bold font-mono" style={{ color: "var(--negative)" }}>{YEN(total)}</span>
              </div>
            </Card>
          )}
        </section>

      </div>

      {/* ── Add button ── */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-30 max-w-lg mx-auto">
        <button
          onClick={openAdd}
          className="w-full py-3 rounded-xl text-sm font-semibold shadow-lg"
          style={{ background: "var(--cc)", color: "#fff" }}
        >
          + Lançamento
        </button>
      </div>

      {/* ── Add/Edit entry modal ── */}
      {entryModal && (
        <BottomSheet
          title={entryModal.id ? "Editar lançamento" : "Novo lançamento"}
          onClose={() => setEntryModal(null)}
        >
          <div className="p-4 flex flex-col gap-4">

            {/* date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Data</label>
              <input
                type="date"
                className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
                value={entryModal.date}
                onChange={e => setEntryModal(m => ({ ...m, date: e.target.value }))}
              />
            </div>

            {/* amount */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Valor</label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>¥</span>
                <input
                  type="number"
                  inputMode="numeric"
                  autoFocus
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: "var(--text)" }}
                  value={entryModal.amount}
                  onChange={e => setEntryModal(m => ({ ...m, amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* quick amount buttons */}
            <div className="flex gap-2 flex-wrap">
              {[500, 1000, 3000, 5000, 10000].map(v => (
                <button
                  key={v}
                  onClick={() => setEntryModal(m => ({ ...m, amount: String(v) }))}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: Number(entryModal.amount) === v ? "var(--text)" : "var(--bg-elevated)",
                    color: Number(entryModal.amount) === v ? "var(--bg)" : "var(--text-sub)",
                    border: "1px solid var(--border-mid)",
                    minWidth: 52,
                  }}
                >
                  {YEN(v)}
                </button>
              ))}
            </div>

            {/* category picker */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Categoria</label>
              <div className="grid grid-cols-4 gap-2">
                {CATS.map(cat => {
                  const active = entryModal.cat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setEntryModal(m => ({ ...m, cat: cat.id }))}
                      className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all"
                      style={active
                        ? { background: "var(--cc)", color: "#fff", border: "1px solid var(--cc)" }
                        : { background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }
                      }
                    >
                      <span className="text-lg leading-none">{cat.icon}</span>
                      <span className="leading-tight text-center" style={{ fontSize: 10 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* save / delete buttons */}
            <div className="flex gap-2 pt-1">
              {entryModal.id && (
                <button
                  onClick={() => deleteEntry(entryModal.id)}
                  className="py-2.5 px-4 rounded-xl text-sm font-medium"
                  style={{ background: "rgba(239,68,68,0.12)", color: "var(--negative)", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  Excluir
                </button>
              )}
              <button
                onClick={() => setEntryModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}
              >
                Cancelar
              </button>
              <button
                onClick={saveEntry}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--cc)", color: "#fff" }}
              >
                Salvar
              </button>
            </div>

          </div>
        </BottomSheet>
      )}

      {/* ── Setup modal ── */}
      {setupModal && setupDraft && (
        <BottomSheet
          title="Configurar cartão"
          onClose={() => setSetupModal(false)}
        >
          <div className="p-4 flex flex-col gap-4">

            {/* card name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Nome do cartão</label>
              <input
                autoFocus
                className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
                value={setupDraft.name}
                onChange={e => setSetupDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Ex: Rakuten"
              />
            </div>

            {/* limit */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Limite</label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>¥</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: "var(--text)" }}
                  value={setupDraft.limit}
                  onChange={e => setSetupDraft(d => ({ ...d, limit: e.target.value }))}
                  placeholder="0 (sem limite)"
                />
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Deixe 0 para não exibir barra de limite</p>
            </div>

            {/* closing day + due day */}
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Dia de fechamento</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
                  value={setupDraft.closingDay}
                  onChange={e => setSetupDraft(d => ({ ...d, closingDay: e.target.value }))}
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Dia de vencimento</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
                  value={setupDraft.dueDay}
                  onChange={e => setSetupDraft(d => ({ ...d, dueDay: e.target.value }))}
                />
              </div>
            </div>

            {/* save */}
            <button
              onClick={saveSetup}
              className="w-full py-3 rounded-xl text-sm font-semibold mt-1"
              style={{ background: "var(--cc)", color: "#fff" }}
            >
              Salvar configurações
            </button>

          </div>
        </BottomSheet>
      )}

    </div>
  );
}
