import { useState, useCallback } from "react";
import { Card, SectionLabel, Badge, Input, BottomSheet } from "../components/ui.jsx";
import { YEN, fmtDate, currentMonth, prevMonth, nextMonth } from "../utils/fmt.js";

// ── helpers ────────────────────────────────────────────────────────────────────
function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtMonthLabel(ym) {
  if (!ym) return "";
  const d = new Date(ym + "-01T12:00:00");
  const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Gastos Screen ──────────────────────────────────────────────────────────────
export function Gastos({ gastos, setGastos }) {
  const [month, setMonth] = useState(currentMonth());
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState("");

  // modal states
  const [itemModal, setItemModal] = useState(null); // {tipo, id?, name, amount, isMonth}
  const [deleteConfirm, setDeleteConfirm] = useState(null); // id to delete

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const overrides = gastos.overrides?.[month] || {};
  const monthHidden = gastos.monthHidden?.[month] || [];
  const monthItems = gastos.monthItems?.[month] || [];
  function getVal(item) {
    return overrides[item.id] !== undefined ? overrides[item.id] : item.amount;
  }
  function isHidden(id) {
    return monthHidden.includes(id);
  }

  const activeRendas = (gastos.rendas || []).filter(r => r.active && !isHidden(r.id));
  const hiddenRendas = (gastos.rendas || []).filter(r => !r.active || isHidden(r.id));
  const monthRendas = monthItems.filter(i => i.tipo === "renda");

  const activeDebito = (gastos.despesas || []).filter(d => d.tipo === "debito" && d.active && !isHidden(d.id));
  const hiddenDebito = (gastos.despesas || []).filter(d => d.tipo === "debito" && (!d.active || isHidden(d.id)));
  const monthDebito = monthItems.filter(i => i.tipo === "debito");

  const activeHagaki = (gastos.despesas || []).filter(d => d.tipo === "hagaki" && d.active && !isHidden(d.id));
  const hiddenHagaki = (gastos.despesas || []).filter(d => d.tipo === "hagaki" && (!d.active || isHidden(d.id)));
  const monthHagakiItems = monthItems.filter(i => i.tipo === "hagaki");

  const totalRenda =
    activeRendas.reduce((s, r) => s + getVal(r), 0) +
    monthRendas.reduce((s, r) => s + r.amount, 0);

  const totalDebito =
    activeDebito.reduce((s, d) => s + getVal(d), 0) +
    monthDebito.reduce((s, d) => s + d.amount, 0);

  const totalHagaki =
    activeHagaki.reduce((s, d) => s + getVal(d), 0) +
    monthHagakiItems.reduce((s, d) => s + d.amount, 0);

  const totalDespesas = totalDebito + totalHagaki;
  const saldo = totalRenda - totalDespesas;

  const expenseRatio = totalRenda > 0 ? Math.min(100, (totalDespesas / totalRenda) * 100) : 0;

  // ── mutators ───────────────────────────────────────────────────────────────
  const update = useCallback((fn) => setGastos(prev => fn(structuredClone(prev))), [setGastos]);

  function toggleActive(type, id) {
    update(g => {
      if (type === "renda") {
        const i = g.rendas.find(r => r.id === id);
        if (i) i.active = !i.active;
      } else {
        const i = g.despesas.find(d => d.id === id);
        if (i) i.active = !i.active;
      }
      return g;
    });
  }

  function hideItem(id) {
    update(g => {
      if (!g.monthHidden) g.monthHidden = {};
      if (!g.monthHidden[month]) g.monthHidden[month] = [];
      if (!g.monthHidden[month].includes(id)) g.monthHidden[month].push(id);
      return g;
    });
  }

  function unhideItem(id) {
    update(g => {
      if (!g.monthHidden?.[month]) return g;
      g.monthHidden[month] = g.monthHidden[month].filter(x => x !== id);
      return g;
    });
  }

  function deleteMonthItem(id) {
    update(g => {
      if (!g.monthItems) g.monthItems = {};
      if (!g.monthItems[month]) g.monthItems[month] = [];
      g.monthItems[month] = g.monthItems[month].filter(i => i.id !== id);
      return g;
    });
  }

  function saveItemModal() {
    if (!itemModal) return;
    const amount = parseFloat(String(itemModal.amount).replace(/[^0-9.]/g, "")) || 0;
    if (itemModal.isMonth) {
      if (itemModal.id) {
        // edit existing month item
        update(g => {
          const arr = g.monthItems?.[month] || [];
          const idx = arr.findIndex(i => i.id === itemModal.id);
          if (idx !== -1) { arr[idx].name = itemModal.name; arr[idx].amount = amount; }
          if (!g.monthItems) g.monthItems = {};
          g.monthItems[month] = arr;
          return g;
        });
      } else {
        // new month item
        const newItem = { id: nanoid(), name: itemModal.name, amount, tipo: itemModal.tipo };
        update(g => {
          if (!g.monthItems) g.monthItems = {};
          if (!g.monthItems[month]) g.monthItems[month] = [];
          g.monthItems[month].push(newItem);
          return g;
        });
      }
    } else if (itemModal.id) {
      // override or edit recurring item name+value
      update(g => {
        if (itemModal.nameChanged) {
          // find and update name
          const arr = itemModal.tipo === "renda" ? g.rendas : g.despesas;
          const item = arr.find(i => i.id === itemModal.id);
          if (item) { item.name = itemModal.name; item.amount = amount; }
        }
        // set override for this month
        if (!g.overrides) g.overrides = {};
        if (!g.overrides[month]) g.overrides[month] = {};
        g.overrides[month][itemModal.id] = amount;
        return g;
      });
    } else {
      // new fixed item
      const newItem = { id: nanoid(), name: itemModal.name, amount, active: true };
      if (itemModal.tipo === "renda") {
        update(g => { g.rendas = [...(g.rendas || []), newItem]; return g; });
      } else {
        update(g => { g.despesas = [...(g.despesas || []), { ...newItem, tipo: itemModal.tipo }]; return g; });
      }
    }
    setItemModal(null);
  }

  function resetOverride(id) {
    update(g => {
      if (g.overrides?.[month]?.[id] !== undefined) delete g.overrides[month][id];
      return g;
    });
  }

  function resetSection(tipo) {
    // set all active items of tipo to 0 for this month via overrides
    update(g => {
      if (!g.overrides) g.overrides = {};
      if (!g.overrides[month]) g.overrides[month] = {};
      (g.despesas || []).filter(d => d.tipo === tipo && d.active).forEach(d => {
        g.overrides[month][d.id] = 0;
      });
      (g.monthItems?.[month] || []).filter(i => i.tipo === tipo).forEach(i => {
        i.amount = 0;
      });
      return g;
    });
  }

  // ── WhatsApp report ────────────────────────────────────────────────────────
  function copyReport() {
    const monthLabel = fmtMonthLabel(month);
    const lines = [];
    lines.push("📊 *Resumo Financeiro*");
    lines.push(monthLabel);
    lines.push("");

    lines.push("💴 *RENDA*");
    activeRendas.forEach(r => lines.push(`  ${r.name}: ${YEN(getVal(r))}`));
    monthRendas.forEach(r => lines.push(`  ${r.name}: ${YEN(r.amount)}`));
    lines.push(`  Total: ${YEN(totalRenda)}`);
    lines.push("");

    if (totalDebito > 0) {
      lines.push("🏦 *DÉBITO AUTOMÁTICO*");
      activeDebito.forEach(d => lines.push(`  ${d.name}: ${YEN(getVal(d))}`));
      monthDebito.forEach(d => lines.push(`  ${d.name}: ${YEN(d.amount)}`));
      lines.push(`  Total: ${YEN(totalDebito)}`);
      lines.push("");
    }

    if (totalHagaki > 0) {
      lines.push("📮 *HAGAKI (Boleto)*");
      activeHagaki.forEach(d => lines.push(`  ${d.name}: ${YEN(getVal(d))}`));
      monthHagakiItems.forEach(d => lines.push(`  ${d.name}: ${YEN(d.amount)}`));
      lines.push(`  Total: ${YEN(totalHagaki)}`);
      lines.push("");
    }

    lines.push("———————————");
    lines.push(`Renda: ${YEN(totalRenda)}`);
    lines.push(`Débito Auto: ${YEN(totalDebito)}`);
    lines.push(`Hagaki: ${YEN(totalHagaki)}`);
    lines.push(`*Total Despesas: ${YEN(totalDespesas)}*`);
    lines.push(saldo >= 0 ? `*Saldo Final: +${YEN(saldo)}*` : `*Saldo Final: -${YEN(Math.abs(saldo))}*`);
    if (totalHagaki > 0) lines.push(`💵 Precisa sacar em mãos: ${YEN(totalHagaki)}`);

    navigator.clipboard.writeText(lines.join("\n")).then(() => showToast("✓ Copiado!"));
  }

  // ── open item modal helpers ────────────────────────────────────────────────
  function openAddFixed(tipo) {
    setItemModal({ tipo, id: null, name: "", amount: "", isMonth: false });
  }
  function openAddMonth(tipo) {
    setItemModal({ tipo, id: null, name: "", amount: "", isMonth: true });
  }
  function openEditRecurring(item, tipo) {
    if (!editMode) return;
    setItemModal({ tipo, id: item.id, name: item.name, amount: getVal(item), isMonth: false, nameChanged: false });
  }
  function openEditMonthItem(item, tipo) {
    if (!editMode) return;
    setItemModal({ tipo, id: item.id, name: item.name, amount: item.amount, isMonth: true });
  }

  // ── render helpers ─────────────────────────────────────────────────────────
  function ItemRow({ item, tipo, isMonthItem = false }) {
    const val = isMonthItem ? item.amount : getVal(item);
    const overridden = !isMonthItem && overrides[item.id] !== undefined;
    const active = isMonthItem ? true : item.active;

    return (
      <div
        className="flex items-center gap-2 py-2 border-b last:border-0"
        style={{ borderColor: "var(--border)", opacity: active ? 1 : 0.45 }}
      >
        {/* active toggle */}
        {!isMonthItem && (
          <button
            onClick={() => toggleActive(tipo === "renda" ? "renda" : "despesa", item.id)}
            className="shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors"
            style={{
              background: active ? "var(--positive)" : "transparent",
              borderColor: active ? "var(--positive)" : "var(--border-strong)",
            }}
          />
        )}

        {/* name */}
        <span
          className="flex-1 text-sm truncate"
          style={{ color: "var(--text)" }}
          onClick={() => isMonthItem ? openEditMonthItem(item, tipo) : openEditRecurring(item, tipo)}
        >
          {item.name || item.nome}
        </span>

        {/* MÊS badge */}
        {isMonthItem && <Badge color="blue">MÊS</Badge>}

        {/* override indicator */}
        {overridden && (
          <button
            onClick={() => resetOverride(item.id)}
            className="text-xs px-1.5 rounded"
            style={{ color: "var(--warning)", background: "rgba(245,158,11,0.1)" }}
            title="Restaurar padrão"
          >
            ↺
          </button>
        )}

        {/* value */}
        <button
          className="text-sm font-mono font-semibold shrink-0"
          style={{ color: tipo === "renda" ? "var(--positive)" : "var(--negative)" }}
          onClick={() => isMonthItem ? openEditMonthItem(item, tipo) : openEditRecurring(item, tipo)}
        >
          {YEN(val)}
        </button>

        {/* edit mode actions */}
        {editMode && (
          <button
            onClick={() => {
              if (isMonthItem) deleteMonthItem(item.id);
              else hideItem(item.id);
            }}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold"
            style={{ background: "rgba(239,68,68,0.12)", color: "var(--negative)" }}
          >
            ×
          </button>
        )}
      </div>
    );
  }

  function HiddenRow({ item, tipo }) {
    return (
      <div className="flex items-center gap-2 py-1.5" style={{ opacity: 0.5 }}>
        <button
          onClick={() => unhideItem(item.id)}
          className="shrink-0 text-base"
          title="Mostrar"
          style={{ color: "var(--text-muted)" }}
        >
          👁
        </button>
        <span className="flex-1 text-xs truncate" style={{ color: "var(--text-muted)" }}>{item.name}</span>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{YEN(getVal(item))}</span>
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen pb-8" style={{ background: "var(--bg)", color: "var(--text)" }}>

      {/* header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 gap-2">
        <div className="flex-1">
          <MonthPickerInline month={month} setMonth={setMonth} />
        </div>
        <button
          onClick={() => setEditMode(e => !e)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-base"
          style={{ background: editMode ? "var(--positive)" : "var(--bg-elevated)", color: editMode ? "#fff" : "var(--text-sub)", border: "1px solid var(--border)" }}
          title={editMode ? "Sair do modo edição" : "Editar"}
        >
          {editMode ? "✓" : "✏️"}
        </button>
        <button
          onClick={copyReport}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-base"
          style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)" }}
          title="Copiar relatório WhatsApp"
        >
          📋
        </button>
      </div>

      <div className="flex flex-col gap-3 px-3 pt-2">

        {/* ── summary cards ── */}
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard label="Renda" value={totalRenda} color="var(--positive)" />
          <SummaryCard label="Despesas" value={totalDespesas} color="var(--negative)" />
          <div className="rounded-xl p-3 flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <span className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Saldo</span>
            <span className="text-lg font-bold font-mono leading-tight" style={{ color: saldo >= 0 ? "var(--positive)" : "var(--negative)" }}>
              {saldo >= 0 ? YEN(saldo) : `-${YEN(Math.abs(saldo))}`}
            </span>
            <div className="text-xs mt-1 leading-snug" style={{ color: "var(--text-muted)" }}>
              <span>Déb {YEN(totalDebito)}</span>
              <span className="mx-0.5">·</span>
              <span>Hag {YEN(totalHagaki)}</span>
            </div>
          </div>
        </div>

        {/* expense ratio bar */}
        {totalRenda > 0 && (
          <div className="rounded-xl px-3 py-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Comprometimento da renda</span>
              <span className="text-xs font-semibold" style={{ color: expenseRatio > 80 ? "var(--negative)" : expenseRatio > 60 ? "var(--warning)" : "var(--positive)" }}>
                {expenseRatio.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${expenseRatio}%`,
                  background: expenseRatio > 80 ? "var(--negative)" : expenseRatio > 60 ? "var(--warning)" : "var(--positive)"
                }}
              />
            </div>
          </div>
        )}

        {/* precisa sacar warning */}
        {totalHagaki > 0 && (
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <span className="text-base">💴</span>
            <div>
              <span className="text-xs font-semibold" style={{ color: "var(--warning)" }}>Precisa sacar em mãos:</span>
              <span className="text-sm font-mono font-bold ml-2" style={{ color: "var(--warning)" }}>{YEN(totalHagaki)}</span>
            </div>
          </div>
        )}

        {/* ── Renda section ── */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>💴 Renda</SectionLabel>
          </div>
          <Card>
            {activeRendas.map(r => (
              <ItemRow key={r.id} item={r} tipo="renda" />
            ))}
            {monthRendas.map(r => (
              <ItemRow key={r.id} item={r} tipo="renda" isMonthItem />
            ))}
            {activeRendas.length === 0 && monthRendas.length === 0 && (
              <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>Nenhuma renda</p>
            )}

            {/* hidden items */}
            {hiddenRendas.length > 0 && (
              <div className="mt-1 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Ocultos</p>
                {hiddenRendas.map(r => <HiddenRow key={r.id} item={r} tipo="renda" />)}
              </div>
            )}

            {/* totals row */}
            <div className="flex justify-between items-center pt-2 mt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total</span>
              <span className="text-sm font-bold font-mono" style={{ color: "var(--positive)" }}>{YEN(totalRenda)}</span>
            </div>

            {/* edit mode add buttons */}
            {editMode && (
              <div className="flex gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => openAddFixed("renda")} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-elevated)", color: "var(--positive)", border: "1px solid var(--positive)" }}>
                  + Fixo (todos os meses)
                </button>
                <button onClick={() => openAddMonth("renda")} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}>
                  + Só este mês
                </button>
              </div>
            )}
          </Card>
        </section>

        {/* ── Débito section ── */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>🏦 Débito Automático</SectionLabel>
            {editMode && (
              <button
                onClick={() => resetSection("debito")}
                className="text-xs px-2 py-0.5 rounded"
                style={{ color: "var(--warning)", background: "rgba(245,158,11,0.1)" }}
                title="Zerar seção este mês"
              >
                ↺ Zerar
              </button>
            )}
          </div>
          <Card>
            {activeDebito.map(d => (
              <ItemRow key={d.id} item={d} tipo="debito" />
            ))}
            {monthDebito.map(d => (
              <ItemRow key={d.id} item={d} tipo="debito" isMonthItem />
            ))}
            {activeDebito.length === 0 && monthDebito.length === 0 && (
              <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>Nenhum débito</p>
            )}

            {hiddenDebito.length > 0 && (
              <div className="mt-1 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Ocultos</p>
                {hiddenDebito.map(d => <HiddenRow key={d.id} item={d} tipo="debito" />)}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 mt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total</span>
              <span className="text-sm font-bold font-mono" style={{ color: "var(--negative)" }}>{YEN(totalDebito)}</span>
            </div>

            {editMode && (
              <div className="flex gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => openAddFixed("debito")} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-elevated)", color: "var(--negative)", border: "1px solid var(--negative)" }}>
                  + Fixo (todos os meses)
                </button>
                <button onClick={() => openAddMonth("debito")} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}>
                  + Só este mês
                </button>
              </div>
            )}
          </Card>
        </section>

        {/* ── Hagaki section ── */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>📮 Hagaki (Boleto)</SectionLabel>
            {editMode && (
              <button
                onClick={() => resetSection("hagaki")}
                className="text-xs px-2 py-0.5 rounded"
                style={{ color: "var(--warning)", background: "rgba(245,158,11,0.1)" }}
                title="Zerar seção este mês"
              >
                ↺ Zerar
              </button>
            )}
          </div>
          <Card>
            {activeHagaki.map(d => (
              <ItemRow key={d.id} item={d} tipo="hagaki" />
            ))}
            {monthHagakiItems.map(d => (
              <ItemRow key={d.id} item={d} tipo="hagaki" isMonthItem />
            ))}
            {activeHagaki.length === 0 && monthHagakiItems.length === 0 && (
              <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>Nenhum boleto</p>
            )}

            {hiddenHagaki.length > 0 && (
              <div className="mt-1 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Ocultos</p>
                {hiddenHagaki.map(d => <HiddenRow key={d.id} item={d} tipo="hagaki" />)}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 mt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total</span>
              <span className="text-sm font-bold font-mono" style={{ color: "var(--negative)" }}>{YEN(totalHagaki)}</span>
            </div>

            {editMode && (
              <div className="flex gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => openAddFixed("hagaki")} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-elevated)", color: "var(--negative)", border: "1px solid var(--negative)" }}>
                  + Fixo (todos os meses)
                </button>
                <button onClick={() => openAddMonth("hagaki")} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}>
                  + Só este mês
                </button>
              </div>
            )}
          </Card>
        </section>

      </div>

      {/* ── Item edit modal ── */}
      {itemModal && (
        <BottomSheet
          title={itemModal.id ? "Editar item" : itemModal.isMonth ? "Adicionar (este mês)" : "Adicionar fixo"}
          onClose={() => setItemModal(null)}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Nome</label>
              <input
                autoFocus
                className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
                value={itemModal.name}
                onChange={e => setItemModal(m => ({ ...m, name: e.target.value, nameChanged: true }))}
                placeholder="Nome do item"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Valor</label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>¥</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: "var(--text)" }}
                  value={itemModal.amount}
                  onChange={e => setItemModal(m => ({ ...m, amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* quick amount buttons */}
            <div className="flex gap-2 flex-wrap">
              {[0, 5000, 10000, 50000].map(v => (
                <button
                  key={v}
                  onClick={() => setItemModal(m => ({ ...m, amount: v }))}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: Number(itemModal.amount) === v ? "var(--text)" : "var(--bg-elevated)",
                    color: Number(itemModal.amount) === v ? "var(--bg)" : "var(--text-sub)",
                    border: "1px solid var(--border-mid)",
                    minWidth: 56
                  }}
                >
                  {v === 0 ? "¥0" : YEN(v)}
                </button>
              ))}
            </div>

            {/* restore default */}
            {itemModal.id && !itemModal.isMonth && overrides[itemModal.id] !== undefined && (
              <button
                onClick={() => { resetOverride(itemModal.id); setItemModal(null); }}
                className="w-full py-2 rounded-lg text-sm"
                style={{ background: "rgba(245,158,11,0.08)", color: "var(--warning)", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                ↺ Restaurar padrão
              </button>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setItemModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}
              >
                Cancelar
              </button>
              <button
                onClick={saveItemModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--positive)", color: "#fff" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-semibold z-50 pointer-events-none"
          style={{ background: "var(--positive)", color: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ── tiny internal helpers ──────────────────────────────────────────────────────
function SummaryCard({ label, value, color }) {
  return (
    <div className="rounded-xl p-3 flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <span className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-lg font-bold font-mono leading-tight" style={{ color }}>{YEN(value)}</span>
    </div>
  );
}

function MonthPickerInline({ month, setMonth }) {
  const label = new Date(month + "-01T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setMonth(m => prevMonth(m))}
        className="w-8 h-8 flex items-center justify-center rounded-lg"
        style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)" }}
      >‹</button>
      <span className="flex-1 text-sm font-semibold text-center" style={{ color: "var(--text)" }}>{cap}</span>
      <button
        onClick={() => setMonth(m => nextMonth(m))}
        className="w-8 h-8 flex items-center justify-center rounded-lg"
        style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)" }}
      >›</button>
    </div>
  );
}
