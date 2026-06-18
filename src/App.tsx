import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, CalendarClock, Car, Cloud, Download, FileUp, PiggyBank, ReceiptText, ShieldCheck, Trash2 } from 'lucide-react';
import type { AppState, WorkEntry } from './types';
import { backupStats, downloadBackup, readBackupFile } from './lib/backup';
import { clearLocalState, loadState, saveState } from './lib/storage';
import { currentMonth, formatYen, summarizeBudget, summarizeCard, summarizeWork } from './lib/calculations';
import { firebaseEnabled, syncToFirebase } from './lib/firebase';

const dayTypeLabel: Record<string, string> = {
  normal: 'Normal',
  saturday: 'Sábado',
  sunday: 'Domingo',
  holiday: 'Feriado',
  yukyu: 'Yūkyū',
  overtime_special: 'Tōshi / especial',
};

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [month, setMonth] = useState(() => currentMonth());
  const [message, setMessage] = useState('Backup local ativo. Importe seu JSON para começar.');

  useEffect(() => saveState(state), [state]);

  const work = useMemo(() => summarizeWork(state.entries, state, month), [state, month]);
  const budget = useMemo(() => summarizeBudget(state, month), [state, month]);
  const card = useMemo(() => summarizeCard(state.cartao?.lancamentos ?? [], month), [state, month]);
  const stats = backupStats(state);

  const chartData = useMemo(() => {
    const byMonth = new Map<string, { month: string; bruto: number; gastos: number; cartao: number }>();
    for (const entry of state.entries) {
      const ym = entry.date.slice(0, 7);
      if (!byMonth.has(ym)) byMonth.set(ym, { month: ym, bruto: 0, gastos: 0, cartao: 0 });
    }
    for (const ym of Object.keys(state.gastos.overrides ?? {})) {
      if (!byMonth.has(ym)) byMonth.set(ym, { month: ym, bruto: 0, gastos: 0, cartao: 0 });
    }
    for (const row of Array.from(byMonth.values())) {
      row.bruto = summarizeWork(state.entries, state, row.month).gross;
      row.gastos = summarizeBudget(state, row.month).expenseTotal;
      row.cartao = summarizeCard(state.cartao?.lancamentos ?? [], row.month).total;
    }
    return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-8);
  }, [state]);

  async function importFile(file?: File) {
    if (!file) return;
    try {
      const imported = await readBackupFile(file);
      setState(imported);
      setMonth(imported.entries.at(-1)?.date.slice(0, 7) || currentMonth());
      setMessage(`Backup importado: ${imported.entries.length} dias, ${imported.cartao?.lancamentos.length ?? 0} lançamentos.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao importar backup.');
    }
  }

  function addTodayEntry() {
    const today = new Date().toISOString().slice(0, 10);
    const entry: WorkEntry = {
      id: String(Date.now()),
      date: today,
      start: '05:45',
      end: '17:00',
      breakMinutes: state.settings.defaultBreak,
      dayType: 'normal',
      note: '',
    };
    setState({ ...state, entries: [...state.entries, entry] });
    setMonth(today.slice(0, 7));
  }

  async function handleCloudSync() {
    try {
      await syncToFirebase(state);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro no Firebase.');
    }
  }

  return (
    <main className="app-shell">
      <section className="hero glass">
        <div>
          <p className="eyebrow">JapanFinance</p>
          <h1>Controle financeiro pensado pra vida no Japão.</h1>
          <p className="hero-copy">Salário por hora, adicional noturno, yūkyū, gastos fixos, cartão, carros, shaken e impostos. Tudo com backup JSON como fonte da verdade.</p>
          <div className="actions">
            <label className="button primary">
              <FileUp size={18} /> Importar backup
              <input type="file" accept="application/json" onChange={(event) => importFile(event.target.files?.[0])} />
            </label>
            <button className="button" onClick={() => downloadBackup(state)}><Download size={18} /> Exportar JSON</button>
            <button className="button" onClick={handleCloudSync}><Cloud size={18} /> Firebase {firebaseEnabled ? 'ativo' : 'off'}</button>
          </div>
        </div>
        <div className="hero-card">
          <span>Saldo previsto</span>
          <strong className={budget.balance >= 0 ? 'positive' : 'negative'}>{formatYen(budget.balance)}</strong>
          <small>{message}</small>
        </div>
      </section>

      <section className="toolbar glass">
        <label>Mês de análise <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
        <button onClick={addTodayEntry}>+ Adicionar dia padrão</button>
        <button className="danger" onClick={() => { clearLocalState(); setState(loadState()); }}> <Trash2 size={16} /> Limpar local</button>
      </section>

      <section className="grid cards-4">
        <Metric icon={<CalendarClock />} label="Horas no mês" value={`${(work.totalMinutes / 60).toFixed(1)}h`} sub={`${work.monthEntries.length} dias · ${work.paidLeaveDays} yūkyū`} />
        <Metric icon={<Banknote />} label="Bruto estimado" value={formatYen(work.gross)} sub={`Extra ${formatYen(work.overtimePay)} · noite ${formatYen(work.nightPay)}`} />
        <Metric icon={<ReceiptText />} label="Gastos fixos" value={formatYen(budget.expenseTotal)} sub={`${budget.expenses.length} contas no mês`} />
        <Metric icon={<PiggyBank />} label="Cartão" value={formatYen(card.total)} sub={`${card.filtered.length} compras lançadas`} />
      </section>

      <section className="grid main-grid">
        <article className="panel glass span-2">
          <div className="panel-title"><h2>Raio-X mensal</h2><span>{month}</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ left: 0, right: 16, top: 16, bottom: 0 }}>
              <defs>
                <linearGradient id="bruto" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopOpacity={0.45}/><stop offset="95%" stopOpacity={0.05}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip formatter={(value) => formatYen(Number(value))} />
              <Area type="monotone" dataKey="bruto" strokeWidth={3} fill="url(#bruto)" />
              <Area type="monotone" dataKey="gastos" strokeWidth={2} fillOpacity={0.1} />
              <Area type="monotone" dataKey="cartao" strokeWidth={2} fillOpacity={0.05} />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="panel glass">
          <div className="panel-title"><h2>Backup</h2><ShieldCheck /></div>
          <ul className="stat-list">
            <li><span>Dias</span><strong>{stats.workEntries}</strong></li>
            <li><span>Cartão</span><strong>{stats.cardLaunches}</strong></li>
            <li><span>Veículos</span><strong>{stats.vehicles}</strong></li>
            <li><span>Impostos</span><strong>{stats.taxPayments}</strong></li>
          </ul>
          <p className="hint">O JSON exportado preserva o formato do app antigo, então dá pra migrar, testar e voltar sem gambiarra.</p>
        </article>
      </section>

      <section className="grid main-grid">
        <article className="panel glass">
          <div className="panel-title"><h2>Trabalho</h2><span>{work.monthEntries.length} registros</span></div>
          <div className="table compact">
            {work.monthEntries.slice(-8).reverse().map((entry) => <div className="row" key={entry.id}><span>{entry.date}</span><strong>{entry.start} → {entry.end}</strong><em>{dayTypeLabel[entry.dayType]}</em></div>)}
          </div>
        </article>
        <article className="panel glass">
          <div className="panel-title"><h2>Maiores gastos</h2><span>{formatYen(budget.expenseTotal)}</span></div>
          <div className="table compact">
            {budget.expenses.sort((a, b) => b.amount - a.amount).slice(0, 8).map((item) => <div className="row" key={item.id}><span>{item.name}</span><strong>{formatYen(item.amount)}</strong><em>{item.tipo ?? 'fixo'}</em></div>)}
          </div>
        </article>
        <article className="panel glass">
          <div className="panel-title"><h2>Carros & impostos</h2><Car /></div>
          <div className="table compact">
            {(state.taxVehicles ?? []).map((car) => <div className="row" key={car.id}><span>{car.name}</span><strong>{car.shakenExpiry ?? 'sem shaken'}</strong><em>{formatYen(Number(car.calc?.annualTax ?? 0))}/ano</em></div>)}
          </div>
        </article>
      </section>
    </main>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return <article className="metric glass"><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{sub}</small></article>;
}
