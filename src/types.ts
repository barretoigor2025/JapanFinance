export type DayType = 'normal' | 'saturday' | 'sunday' | 'holiday' | 'yukyu' | 'overtime_special';

export type WorkEntry = {
  id: string;
  date: string;
  start: string;
  end: string;
  breakMinutes: number;
  dayType: DayType;
  note?: string;
};

export type Allowance = {
  id: string;
  name: string;
  label: string;
  amount: number;
  taxable: boolean;
  active: boolean;
};

export type Settings = {
  name: string;
  hourlyRate: number;
  mode: 'japan' | 'simple';
  age: number;
  healthInsurance: boolean;
  pension: boolean;
  employmentInsurance: boolean;
  municipalTax: boolean;
  saturdayRate: number;
  sundayRate: number;
  defaultBreak: number;
  prefecture: string;
  hireDate: string;
  dependents: number;
  spouseDependent: boolean;
  dependentChildren: number;
  teate: Allowance[];
  customRules: {
    dailyHours: number;
    weeklyHours: number;
    monthlyOvertimeThreshold: number;
    overtimeRate: number;
    nightRate: number;
    holidayRate: number;
    overtimeHighRate: number;
    nightStart: number;
    nightEnd: number;
  };
};

export type FixedItem = {
  id: string;
  name: string;
  amount: number;
  tipo?: 'debito' | 'hagaki' | 'outro';
  active: boolean;
};

export type CardLaunch = {
  id: string;
  date: string;
  desc: string;
  cat: string;
  customCat?: string;
  amount: number;
};

export type VehicleTax = {
  name: string;
  type: string;
  displacement: number;
  registrationYear: number;
  weight: string;
  fuel: string;
  id: string;
  shakenExpiry?: string;
  calc?: Record<string, number | boolean | string>;
};

export type TaxPayment = {
  vehicleId: string;
  year: number;
  customAmount: number;
  parcelado: boolean;
  parcelas: { num: number; value: number; dueDate: string; paid: boolean; paidDate: string | null }[];
};

export type JapanFinanceBackup = {
  version: number;
  exportedAt: string;
  entries: WorkEntry[];
  settings: Settings;
  gastos: {
    rendas: FixedItem[];
    despesas: FixedItem[];
    overrides?: Record<string, Record<string, number>>;
    monthHidden?: Record<string, string[]>;
    monthItems?: Record<string, Omit<FixedItem, 'active'>[]>;
  };
  carro?: { financiamentos: unknown[] };
  auditHistory?: unknown[];
  gensen?: unknown[];
  taxVehicles?: VehicleTax[];
  taxPayments?: TaxPayment[];
  cartao?: {
    setup: { name: string; closingDay: number; dueDay: number; limit: number };
    seedV?: number;
    lancamentos: CardLaunch[];
    parcelas?: unknown[];
    conferencias?: unknown[];
  };
};

export type AppState = JapanFinanceBackup;
