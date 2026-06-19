import { BottomSheet, StatRow } from "./ui.jsx";
import { calcDay } from "../utils/calc.js";
import { YEN, formatMinutes } from "../utils/fmt.js";

export function CalcDetailModal({ entry, settings, onClose }) {
  const calc = calcDay(entry, settings);

  const rows = [
    calc.breakdown?.isYukyu
      ? { label: "有給休暇", value: "8h remuneradas", sub: "folga remunerada" }
      : { label: "Horas líquidas", value: formatMinutes(calc.totalMin), sub: `${entry.start}→${entry.end}, break ${entry.breakMinutes}m` },
    !calc.breakdown?.isYukyu && { label: "Horas normais", value: calc.breakdown.jpSaturdayIsAllOT ? "—" : formatMinutes(calc.normalMin), sub: calc.breakdown.jpSaturdayIsAllOT ? "sábado: tudo é HE" : "até 8h/dia" },
    !calc.breakdown?.isYukyu && { label: "Horas extras", value: formatMinutes(Math.round((calc.breakdown.overtimeNormal + calc.breakdown.overtimeHigh) * 60)), sub: "" },
    calc.nightHours > 0 && { label: "Noturno (22h–05h)", value: formatMinutes(calc.nightMin), sub: "+25% adicional" },
    calc.isHoliday && { label: "Feriado", value: formatMinutes(calc.totalMin), sub: "+35%" },
    { label: "divider" },
    { label: "Pagamento base", value: YEN(calc.normalPay), sub: `${calc.normalHours.toFixed(1)}h × ¥${settings.hourlyRate}` },
    calc.overtimePay > 0 && { label: "Hora extra", value: YEN(calc.overtimePay), sub: [calc.breakdown.overtimeNormal > 0 && `${calc.breakdown.overtimeNormal.toFixed(1)}h×${Math.round((1 + calc.breakdown.rates.overtimeRate) * 100)}%`, calc.breakdown.overtimeHigh > 0 && `${calc.breakdown.overtimeHigh.toFixed(1)}h×${Math.round((1 + calc.breakdown.rates.overtimeHighRate) * 100)}% (acima 60h)`].filter(Boolean).join(' + ') },
    calc.nightPay > 0 && { label: "Adicional noturno", value: YEN(calc.nightPay), sub: `+${Math.round(calc.breakdown.rates.nightRate * 100)}%` },
    calc.holidayPay > 0 && { label: "Adicional feriado", value: YEN(calc.holidayPay), sub: `+${Math.round(calc.breakdown.rates.holidayRate * 100)}%` },
    { label: "divider" },
    { label: "BRUTO DO DIA", value: YEN(calc.grossPay), bold: true },
  ].filter(Boolean);

  return (
    <BottomSheet onClose={onClose} title="Detalhamento">
      <div className="p-4 space-y-0">
        {rows.map((r, i) =>
          r.label === "divider" ? (
            <div key={i} className="border-t my-2" style={{ borderColor: "var(--border)" }} />
          ) : (
            <div key={i} className="flex items-start justify-between py-1.5">
              <div>
                <div className="text-sm" style={{ color: r.bold ? "var(--warning)" : "var(--text-sub)" }}>{r.label}</div>
                {r.sub && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.sub}</div>}
              </div>
              <div className="font-mono text-sm" style={{ color: r.bold ? "var(--warning)" : "var(--text)", fontWeight: r.bold ? "700" : "normal" }}>{r.value}</div>
            </div>
          )
        )}
      </div>
      <div className="px-4 pb-4">
        <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--text)", color: "var(--bg)" }}>Fechar</button>
      </div>
    </BottomSheet>
  );
}
