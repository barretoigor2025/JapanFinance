import { useState } from "react";
import { Card, MonthPicker, Badge } from "../components/ui.jsx";
import { calcDay, estimateDeductions } from "../utils/calc.js";
import { getYukyuEntitlement } from "../utils/yukyu.js";
import { YEN, formatMinutes, fmtDate, currentMonth } from "../utils/fmt.js";
import { EntryForm } from "../components/EntryForm.jsx";
import { YukyuModal } from "../components/YukyuModal.jsx";
import { CalcDetailModal } from "../components/CalcDetailModal.jsx";

export function Dashboard({ entries, settings, onAddEntry }) {
  const [month, setMonth] = useState(currentMonth);
  const [showForm, setShowForm] = useState(false);
  const [showYukyu, setShowYukyu] = useState(false);
  const [detailEntry, setDetailEntry] = useState(null);

  const monthEntries = entries
    .filter(e => e.date.slice(0, 7) === month)
    .sort((a, b) => a.date.localeCompare(b.date));

  let accOT = 0;
  const calcs = monthEntries.map(e => {
    const c = calcDay(e, settings, accOT);
    accOT += c.overtimeHours;
    return c;
  });

  const totalHours = calcs.reduce((a, c) => a + c.totalHours, 0);
  const otHours = calcs.reduce((a, c) => a + c.overtimeHours, 0);
  const grossSalary = calcs.reduce((a, c) => a + c.grossPay, 0);
  const totalTeate = (settings.teate || []).filter(t => t.active).reduce((a, t) => a + (t.amount || 0), 0);
  const grossWithTeate = Math.round(grossSalary + totalTeate);
  const { netPay, totalDeductions } = estimateDeductions(grossWithTeate, settings);

  const workedDays = monthEntries.filter(e => e.dayType !== "yukyu").length;
  const yukyuDays = monthEntries.filter(e => e.dayType === "yukyu").length;

  const entitlement = getYukyuEntitlement(settings.hireDate);
  const yukyuUsed = entries.filter(e => e.dayType === "yukyu").length;
  const yukyuBalance = Math.max(0, (entitlement?.daysTotal || 0) - yukyuUsed);
  const lastEntry = [...entries].sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <div className="space-y-3 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Início</div>
          <h1 className="text-lg font-bold leading-tight" style={{ color: "var(--text)" }}>
            {settings.name ? `Olá, ${settings.name.split(" ")[0]}` : "Dashboard"}
          </h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          + Lançar
        </button>
      </div>

      <MonthPicker value={month} onChange={setMonth} />

      {/* Key metrics — 2×2 grid with moderate sizing */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Bruto</div>
          <div className="text-xl font-mono font-bold" style={{ color: "var(--positive)" }}>{YEN(grossWithTeate)}</div>
          {totalTeate > 0 && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>+{YEN(totalTeate)} 手当</div>}
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Líquido (est.)</div>
          <div className="text-xl font-mono font-bold" style={{ color: "var(--warning)" }}>{YEN(netPay)}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--negative)" }}>-{YEN(totalDeductions)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Horas</div>
          <div className="text-xl font-mono font-bold" style={{ color: "var(--text)" }}>{totalHours.toFixed(1)}h</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{workedDays} dias{yukyuDays > 0 ? ` +${yukyuDays}有給` : ""}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Hora Extra</div>
          <div className="text-xl font-mono font-bold" style={{ color: otHours > 60 ? "var(--negative)" : otHours > 0 ? "var(--warning)" : "var(--text)" }}>{otHours.toFixed(1)}h</div>
          {otHours > 60 && <div className="text-xs mt-0.5" style={{ color: "var(--negative)" }}>⚠️ acima de 60h</div>}
          {otHours > 0 && otHours <= 60 && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{((otHours / 60) * 100).toFixed(0)}% do limite</div>}
        </Card>
      </div>

      {/* OT bar */}
      {otHours > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Hora Extra acumulada</span>
            <span>{otHours.toFixed(1)}h / 60h</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (otHours / 60) * 100)}%`, background: otHours > 60 ? "var(--negative)" : "var(--warning)" }}
            />
          </div>
        </div>
      )}

      {/* Yukyu */}
      {entitlement?.eligible && (
        <button onClick={() => setShowYukyu(true)} className="w-full text-left" style={{ borderRadius: 12 }}>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "var(--text-muted)" }}>有給休暇</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold font-mono" style={{ color: "var(--positive)" }}>{yukyuBalance}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>dias disponíveis · {yukyuUsed} usados</span>
                </div>
              </div>
              <span style={{ color: "var(--text-muted)" }}>›</span>
            </div>
            {entitlement.expiringAlerts?.length > 0 && (
              <div className="mt-2 text-xs" style={{ color: "var(--negative)" }}>
                ⚠️ {entitlement.expiringAlerts[0].days} dias vencem em {entitlement.expiringAlerts[0].daysLeft} dias
              </div>
            )}
          </Card>
        </button>
      )}

      {/* Last entry */}
      {lastEntry && (
        <Card>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Último Lançamento</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {fmtDate(lastEntry.date, { weekday: "short", day: "2-digit", month: "short" })}
              </div>
              {lastEntry.dayType !== "yukyu" && (
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{lastEntry.start} → {lastEntry.end}</div>
              )}
            </div>
            <div className="text-right">
              {(() => {
                const c = calcDay(lastEntry, settings);
                return (
                  <>
                    <div className="text-sm font-mono font-bold" style={{ color: "var(--positive)" }}>{YEN(c.grossPay)}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatMinutes(c.totalMin)}</div>
                  </>
                );
              })()}
            </div>
          </div>
        </Card>
      )}

      {monthEntries.length === 0 && (
        <Card>
          <div className="text-center py-6">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum lançamento este mês</div>
            <button onClick={() => setShowForm(true)} className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "var(--text)", color: "var(--bg)" }}>
              + Lançar agora
            </button>
          </div>
        </Card>
      )}

      {showForm && (
        <EntryForm
          settings={settings}
          entries={entries}
          onSave={e => { onAddEntry(e); setShowForm(false); }}
          onClose={() => setShowForm(false)}
        />
      )}
      {showYukyu && (
        <YukyuModal
          entries={entries}
          settings={settings}
          onAddEntry={e => { onAddEntry(e); }}
          onClose={() => setShowYukyu(false)}
        />
      )}
    </div>
  );
}
