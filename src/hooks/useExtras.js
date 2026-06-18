import { useEffect, useState } from "react";
import { dbGet, dbSet } from "../db/db.js";

export const defaultExtras = {
  gensen: [],
  taxVehicles: [],
  taxPayments: [],
  cartao: {
    setup: {
      name: "Cartão",
      closingDay: 15,
      dueDay: 11,
      limit: 0,
    },
    lancamentos: [],
  },
};

const KEY = "extras";

function mergeExtras(value) {
  const src = value || {};
  return {
    ...defaultExtras,
    ...src,
    cartao: {
      ...defaultExtras.cartao,
      ...(src.cartao || {}),
      setup: {
        ...defaultExtras.cartao.setup,
        ...(src.cartao?.setup || {}),
      },
      lancamentos: src.cartao?.lancamentos || [],
    },
    gensen: src.gensen || [],
    taxVehicles: src.taxVehicles || [],
    taxPayments: src.taxPayments || [],
  };
}

export function useExtras() {
  const [extras, setExtrasState] = useState(defaultExtras);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dbGet(KEY, defaultExtras).then(v => {
      setExtrasState(mergeExtras(v));
      setLoading(false);
    });
  }, []);

  function setExtras(next) {
    const raw = typeof next === "function" ? next(extras) : next;
    const val = mergeExtras(raw);
    setExtrasState(val);
    dbSet(KEY, val);
  }

  return { extras, setExtras, loading };
}
