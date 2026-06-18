export function normalizeExtras(data = {}) {
  return {
    gensen: data.gensen || data.extras?.gensen || [],
    taxVehicles: data.taxVehicles || data.extras?.taxVehicles || [],
    taxPayments: data.taxPayments || data.extras?.taxPayments || [],
    cartao: data.cartao || data.extras?.cartao || {
      setup: { name: "Cartão", closingDay: 15, dueDay: 11, limit: 0 },
      lancamentos: [],
    },
  };
}

export function exportBackup(entries, settings, gastos, carro, auditHistory, extras) {
  const data = {
    version: 5,
    exportedAt: new Date().toISOString(),
    entries: entries || [],
    settings: settings || {},
    gastos: gastos || null,
    carro: carro || null,
    auditHistory: auditHistory || [],
    ...normalizeExtras(extras || {}),
  };
  const json = JSON.stringify(data, null, 2);
  try {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jst-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {}
  return json;
}

export function parseBackup(jsonText) {
  const data = JSON.parse(jsonText);
  if (!data.entries || !Array.isArray(data.entries)) {
    throw new Error("Arquivo inválido");
  }
  const extras = normalizeExtras(data);
  return {
    ...data,
    extras,
    gensen: extras.gensen,
    taxVehicles: extras.taxVehicles,
    taxPayments: extras.taxPayments,
    cartao: extras.cartao,
  };
}
