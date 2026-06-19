import { useState } from "react";
import { Card, SectionLabel, BottomSheet } from "../components/ui.jsx";
import { YEN } from "../utils/fmt.js";

// ── helpers ────────────────────────────────────────────────────────────────────
function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtMesRef(ym) {
  if (!ym) return "";
  const d = new Date(ym + "-01T12:00:00");
  // e.g. "jan/25"
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". de ", "/").replace(".", "");
}

// ── Carro Screen ───────────────────────────────────────────────────────────────
export function Carro({ carro, setCarro }) {
  const fins = carro?.financiamentos || [];

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editMode, setEditMode] = useState(false);

  // modals
  const [addParcelaModal, setAddParcelaModal] = useState(false);
  const [addVeiculoModal, setAddVeiculoModal] = useState(false);
  const [parcelaForm, setParcelaForm] = useState({ valor: "", mesRef: "" });
  const [veiculoForm, setVeiculoForm] = useState({ nome: "", valorTotal: "" });

  const fin = fins[selectedIdx] || null;

  // ── mutators ───────────────────────────────────────────────────────────────
  const update = (fn) => setCarro(prev => fn(structuredClone(prev || { financiamentos: [] })));

  function toggleEntradaPaga(finId, entId) {
    update(c => {
      const f = c.financiamentos.find(f => f.id === finId);
      if (!f) return c;
      const e = (f.entradas || []).find(e => e.id === entId);
      if (e) e.pago = !e.pago;
      return c;
    });
  }

  function toggleParcelaPaga(finId, parId) {
    update(c => {
      const f = c.financiamentos.find(f => f.id === finId);
      if (!f) return c;
      const p = (f.parcelas || []).find(p => p.id === parId);
      if (p) p.pago = !p.pago;
      return c;
    });
  }

  function removeParcela(finId, parId) {
    update(c => {
      const f = c.financiamentos.find(f => f.id === finId);
      if (!f) return c;
      f.parcelas = (f.parcelas || []).filter(p => p.id !== parId);
      return c;
    });
  }

  function addParcela() {
    if (!fin) return;
    const valor = parseFloat(String(parcelaForm.valor).replace(/[^0-9.]/g, "")) || 0;
    const numero = (fin.parcelas || []).length + 1;
    const newPar = { id: nanoid(), numero, valor, mesRef: parcelaForm.mesRef, pago: false };
    update(c => {
      const f = c.financiamentos.find(f => f.id === fin.id);
      if (!f) return c;
      if (!f.parcelas) f.parcelas = [];
      f.parcelas.push(newPar);
      return c;
    });
    setAddParcelaModal(false);
    setParcelaForm({ valor: "", mesRef: "" });
  }

  function addVeiculo() {
    const valorTotal = parseFloat(String(veiculoForm.valorTotal).replace(/[^0-9.]/g, "")) || 0;
    const newFin = { id: nanoid(), nome: veiculoForm.nome, valorTotal, entradas: [], parcelas: [] };
    update(c => {
      if (!c.financiamentos) c.financiamentos = [];
      c.financiamentos.push(newFin);
      return c;
    });
    const newIdx = fins.length; // will be last after add
    setSelectedIdx(newIdx);
    setAddVeiculoModal(false);
    setVeiculoForm({ nome: "", valorTotal: "" });
  }

  function updateFinField(finId, field, value) {
    update(c => {
      const f = c.financiamentos.find(f => f.id === finId);
      if (f) f[field] = value;
      return c;
    });
  }

  // ── calculations ───────────────────────────────────────────────────────────
  let totalPago = 0, totalRestante = 0, percentPago = 0, nextUnpaid = null;
  let totalParcelas = 0, pagoCount = 0;

  if (fin) {
    const paidEntradas = (fin.entradas || []).filter(e => e.pago).reduce((s, e) => s + e.valor, 0);
    const paidParcelas = (fin.parcelas || []).filter(p => p.pago).reduce((s, p) => s + p.valor, 0);
    totalPago = paidEntradas + paidParcelas;
    totalRestante = Math.max(0, (fin.valorTotal || 0) - totalPago);
    percentPago = fin.valorTotal > 0 ? Math.min(100, (totalPago / fin.valorTotal) * 100) : 0;
    nextUnpaid = (fin.parcelas || []).find(p => !p.pago) || null;
    totalParcelas = (fin.parcelas || []).length;
    pagoCount = (fin.parcelas || []).filter(p => p.pago).length;
  }

  const isQuitado = percentPago >= 100;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col pb-28 px-3 pt-3 gap-3" style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100%" }}>

      {/* empty state */}
      {fins.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <span className="text-4xl">🚗</span>
          <p className="text-sm font-medium" style={{ color: "var(--text-sub)" }}>Nenhum financiamento</p>
          <button
            onClick={() => setAddVeiculoModal(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--positive)", color: "#fff" }}
          >
            + Adicionar veículo
          </button>
        </div>
      )}

      {fins.length > 0 && (
        <>
          {/* vehicle selector tabs */}
          {fins.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {fins.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedIdx(i)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={i === selectedIdx
                    ? { background: "var(--text)", color: "var(--bg)" }
                    : { background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }
                  }
                >
                  {f.nome || `Veículo ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* edit mode toggle */}
          <div className="flex justify-end">
            <button
              onClick={() => setEditMode(e => !e)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={editMode
                ? { background: "var(--positive)", color: "#fff" }
                : { background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }
              }
            >
              {editMode ? "✓ Pronto" : "Editar"}
            </button>
          </div>

          {fin && (
            <>
              {/* ── progress card ── */}
              <Card>
                {/* vehicle name */}
                {editMode ? (
                  <input
                    className="w-full rounded-lg px-2 py-1 text-sm font-semibold mb-2 focus:outline-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
                    value={fin.nome}
                    onChange={e => updateFinField(fin.id, "nome", e.target.value)}
                    placeholder="Nome do veículo"
                  />
                ) : (
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>{fin.nome || "Veículo"}</p>
                )}

                {/* total value */}
                {editMode ? (
                  <div className="flex items-center gap-2 rounded-lg px-2 py-1 mb-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)" }}>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>¥</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="flex-1 bg-transparent text-sm focus:outline-none"
                      style={{ color: "var(--text)" }}
                      value={fin.valorTotal}
                      onChange={e => updateFinField(fin.id, "valorTotal", parseFloat(e.target.value) || 0)}
                      placeholder="Valor total"
                    />
                  </div>
                ) : (
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Valor total: {YEN(fin.valorTotal)}</p>
                )}

                {/* percentage */}
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-xl font-bold font-mono" style={{ color: isQuitado ? "var(--positive)" : "var(--text)" }}>
                    {percentPago.toFixed(1)}%
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>pago</span>
                </div>

                {/* progress bar */}
                <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--bg-elevated)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentPago}%`,
                      background: isQuitado ? "var(--positive)" : "var(--warning)"
                    }}
                  />
                </div>

                {/* 3-col grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-lg p-2 flex flex-col items-center" style={{ background: "var(--bg-elevated)" }}>
                    <span className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Pago</span>
                    <span className="text-sm font-bold font-mono" style={{ color: "var(--positive)" }}>{YEN(totalPago)}</span>
                  </div>
                  <div className="rounded-lg p-2 flex flex-col items-center" style={{ background: "var(--bg-elevated)" }}>
                    <span className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Restante</span>
                    <span className="text-sm font-bold font-mono" style={{ color: totalRestante > 0 ? "var(--negative)" : "var(--text-sub)" }}>{YEN(totalRestante)}</span>
                  </div>
                  <div className="rounded-lg p-2 flex flex-col items-center" style={{ background: "var(--bg-elevated)" }}>
                    <span className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Parcelas</span>
                    <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{pagoCount}/{totalParcelas}</span>
                  </div>
                </div>

                {/* next unpaid */}
                {nextUnpaid && !isQuitado && (
                  <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                    <span className="text-xs" style={{ color: "var(--warning)" }}>Próxima parcela</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--warning)" }}>
                      #{nextUnpaid.numero} — {YEN(nextUnpaid.valor)}
                    </span>
                  </div>
                )}

                {/* quitado banner */}
                {isQuitado && (
                  <div className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                    <span className="text-sm font-semibold" style={{ color: "var(--positive)" }}>Financiamento quitado! ✓</span>
                  </div>
                )}
              </Card>

              {/* ── entradas section ── */}
              {(fin.entradas || []).length > 0 && (
                <section>
                  <SectionLabel>Entradas (entrada inicial)</SectionLabel>
                  <Card>
                    {fin.entradas.map(e => (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 py-2 border-b last:border-0"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <button
                          onClick={() => toggleEntradaPaga(fin.id, e.id)}
                          className="shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
                          style={{
                            background: e.pago ? "var(--positive)" : "transparent",
                            border: `2px solid ${e.pago ? "var(--positive)" : "var(--border-strong)"}`,
                          }}
                        >
                          {e.pago && <span className="text-white text-xs font-bold">✓</span>}
                        </button>
                        <span
                          className="flex-1 text-sm"
                          style={{
                            color: e.pago ? "var(--text-muted)" : "var(--text)",
                            textDecoration: e.pago ? "line-through" : "none"
                          }}
                        >
                          {e.descricao}
                        </span>
                        <span
                          className="text-sm font-mono font-semibold"
                          style={{ color: e.pago ? "var(--positive)" : "var(--warning)" }}
                        >
                          {YEN(e.valor)}
                        </span>
                      </div>
                    ))}
                  </Card>
                </section>
              )}

              {/* ── parcelas section ── */}
              <section>
                <SectionLabel>Parcelas ({pagoCount}/{totalParcelas} pagas)</SectionLabel>
                <Card>
                  {(fin.parcelas || []).length === 0 && (
                    <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>Nenhuma parcela cadastrada</p>
                  )}

                  {(fin.parcelas || []).map((p, idx) => {
                    const isNext = nextUnpaid?.id === p.id;
                    const rowColor = p.pago ? "var(--positive)" : isNext ? "var(--warning)" : "var(--text-sub)";
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 py-2 border-b last:border-0"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {/* checkbox */}
                        <button
                          onClick={() => toggleParcelaPaga(fin.id, p.id)}
                          className="shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
                          style={{
                            background: p.pago ? "var(--positive)" : "transparent",
                            border: `2px solid ${p.pago ? "var(--positive)" : isNext ? "var(--warning)" : "var(--border-strong)"}`,
                          }}
                        >
                          {p.pago && <span className="text-white text-xs font-bold">✓</span>}
                        </button>

                        {/* number */}
                        <span
                          className="text-xs font-mono w-6 shrink-0 text-right"
                          style={{ color: rowColor }}
                        >
                          #{p.numero}
                        </span>

                        {/* mes ref */}
                        <span
                          className="text-xs w-14 shrink-0"
                          style={{ color: rowColor, textDecoration: p.pago ? "line-through" : "none" }}
                        >
                          {fmtMesRef(p.mesRef)}
                        </span>

                        {/* valor */}
                        <span
                          className="flex-1 text-sm font-mono font-semibold"
                          style={{ color: rowColor, textDecoration: p.pago ? "line-through" : "none" }}
                        >
                          {YEN(p.valor)}
                        </span>

                        {/* edit mode remove */}
                        {editMode && (
                          <button
                            onClick={() => removeParcela(fin.id, p.id)}
                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold"
                            style={{ background: "rgba(239,68,68,0.12)", color: "var(--negative)" }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* add parcela button */}
                  {editMode && (
                    <button
                      onClick={() => setAddParcelaModal(true)}
                      className="w-full mt-2 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}
                    >
                      + Adicionar parcela
                    </button>
                  )}
                </Card>
              </section>

              {/* add another vehicle (edit mode) */}
              {editMode && (
                <button
                  onClick={() => setAddVeiculoModal(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium mt-1"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px dashed var(--border-mid)" }}
                >
                  + Adicionar outro veículo
                </button>
              )}
            </>
          )}
        </>
      )}

      {/* ── add parcela modal ── */}
      {addParcelaModal && (
        <BottomSheet title="Nova parcela" onClose={() => setAddParcelaModal(false)}>
          <div className="p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Valor</label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>¥</span>
                <input
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: "var(--text)" }}
                  value={parcelaForm.valor}
                  onChange={e => setParcelaForm(f => ({ ...f, valor: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Mês de referência</label>
              <input
                type="month"
                className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
                value={parcelaForm.mesRef}
                onChange={e => setParcelaForm(f => ({ ...f, mesRef: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setAddParcelaModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}
              >
                Cancelar
              </button>
              <button
                onClick={addParcela}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--positive)", color: "#fff" }}
              >
                Adicionar
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ── add veículo modal ── */}
      {addVeiculoModal && (
        <BottomSheet title="Novo veículo" onClose={() => setAddVeiculoModal(false)}>
          <div className="p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Nome</label>
              <input
                autoFocus
                className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
                value={veiculoForm.nome}
                onChange={e => setVeiculoForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Honda Fit 2022"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Valor total</label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>¥</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: "var(--text)" }}
                  value={veiculoForm.valorTotal}
                  onChange={e => setVeiculoForm(f => ({ ...f, valorTotal: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setAddVeiculoModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}
              >
                Cancelar
              </button>
              <button
                onClick={addVeiculo}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--positive)", color: "#fff" }}
              >
                Criar
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
