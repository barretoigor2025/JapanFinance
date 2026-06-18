import { useState } from "react";
import { Card, SectionLabel, BottomSheet } from "../components/ui.jsx";
import { YEN, currentMonth, prevMonth, nextMonth, fmtMonth } from "../utils/fmt.js";

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

export function Cartao({ gastos, setGastos }) {
  const [month, setMonth] = useState(currentMonth());
  const [cartaoModal, setCartaoModal] = useState(null); // {id?, nome, valor}

  const cartaoItems = gastos.cartao?.[month] || [];
  const totalCartao = cartaoItems.reduce((s, c) => s + (c.valor || 0), 0);

  const update = (fn) => setGastos(prev => fn(structuredClone(prev)));

  function saveCartaoModal() {
    if (!cartaoModal) return;
    const valor = parseFloat(String(cartaoModal.valor).replace(/[^0-9.]/g, "")) || 0;
    update(g => {
      if (!g.cartao) g.cartao = {};
      if (!g.cartao[month]) g.cartao[month] = [];
      if (cartaoModal.id) {
        const idx = g.cartao[month].findIndex(c => c.id === cartaoModal.id);
        if (idx !== -1) { g.cartao[month][idx].nome = cartaoModal.nome; g.cartao[month][idx].valor = valor; }
      } else {
        g.cartao[month].push({ id: nanoid(), nome: cartaoModal.nome, valor });
      }
      return g;
    });
    setCartaoModal(null);
  }

  function deleteCartaoItem(id) {
    update(g => {
      if (!g.cartao?.[month]) return g;
      g.cartao[month] = g.cartao[month].filter(c => c.id !== id);
      return g;
    });
  }

  const monthLabel = (() => {
    const s = fmtMonth(month);
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  return (
    <div className="flex flex-col min-h-screen pb-8" style={{ background: "var(--bg)", color: "var(--text)" }}>

      {/* header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(m => prevMonth(m))}
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)" }}
            >‹</button>
            <span className="flex-1 text-sm font-semibold text-center" style={{ color: "var(--text)" }}>{monthLabel}</span>
            <button
              onClick={() => setMonth(m => nextMonth(m))}
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)" }}
            >›</button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-3 pt-2">

        {/* total card */}
        <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "var(--text-muted)" }}>💳 Total Cartão</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{cartaoItems.length} lançamento(s)</div>
          </div>
          <div className="text-2xl font-bold font-mono" style={{ color: "var(--cc, #a78bfa)" }}>{YEN(totalCartao)}</div>
        </div>

        {/* list */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>💳 Cartão de Crédito</SectionLabel>
          </div>
          <Card>
            {cartaoItems.length === 0 && (
              <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>Nenhum lançamento neste mês</p>
            )}
            {cartaoItems.map(c => (
              <div key={c.id} className="flex items-center gap-2 py-2 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                <span className="flex-1 text-sm truncate" style={{ color: "var(--text)" }}>{c.nome}</span>
                <span className="text-sm font-mono font-semibold shrink-0" style={{ color: "var(--cc, #a78bfa)" }}>{YEN(c.valor)}</span>
                <button
                  onClick={() => setCartaoModal({ id: c.id, nome: c.nome, valor: c.valor })}
                  className="w-6 h-6 flex items-center justify-center rounded text-xs"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-sub)" }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteCartaoItem(c.id)}
                  className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold"
                  style={{ background: "rgba(239,68,68,0.12)", color: "var(--negative)" }}
                >
                  ×
                </button>
              </div>
            ))}

            {cartaoItems.length > 0 && (
              <div className="flex justify-between items-center pt-2 mt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Total</span>
                <span className="text-sm font-bold font-mono" style={{ color: "var(--cc, #a78bfa)" }}>{YEN(totalCartao)}</span>
              </div>
            )}

            <button
              onClick={() => setCartaoModal({ id: null, nome: "", valor: "" })}
              className="w-full mt-2 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--bg-elevated)", color: "var(--cc, #a78bfa)", border: "1px solid var(--cc, #a78bfa)" }}
            >
              + Adicionar
            </button>
          </Card>
        </section>

      </div>

      {/* Cartão modal */}
      {cartaoModal && (
        <BottomSheet
          title={cartaoModal.id ? "Editar lançamento" : "Novo lançamento"}
          onClose={() => setCartaoModal(null)}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Descrição</label>
              <input
                autoFocus
                className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
                value={cartaoModal.nome}
                onChange={e => setCartaoModal(m => ({ ...m, nome: e.target.value }))}
                placeholder="Ex: Supermercado"
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
                  value={cartaoModal.valor}
                  onChange={e => setCartaoModal(m => ({ ...m, valor: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {[1000, 3000, 5000, 10000].map(v => (
                <button
                  key={v}
                  onClick={() => setCartaoModal(m => ({ ...m, valor: v }))}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: Number(cartaoModal.valor) === v ? "var(--text)" : "var(--bg-elevated)",
                    color: Number(cartaoModal.valor) === v ? "var(--bg)" : "var(--text-sub)",
                    border: "1px solid var(--border-mid)",
                    minWidth: 56
                  }}
                >
                  {YEN(v)}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setCartaoModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}
              >
                Cancelar
              </button>
              <button
                onClick={saveCartaoModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--cc, #a78bfa)", color: "#fff" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
