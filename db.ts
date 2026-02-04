
import { AppData, CompanyProfile, AuthState } from './types';

const STORAGE_KEY = 'usha_sales_corp_data';

const getBridge = () => (window as any).pywebview?.api;

const defaultProfile: CompanyProfile = {
  name: 'USHA SALES CORP',
  address: '123 Business Hub, Industrial Area, Mumbai, Maharashtra',
  phone: '+91 98765 43210',
  gstin: '27AAAAA0000A1Z5',
  email: 'contact@ushasales.com',
  currency: 'INR',
  apiKey: 'AIzaSyAx1Ioi2786grsi8kmhCUAMfVJNYLyOwD8'
};

const defaultAuth: AuthState = {
  isEnabled: false
};

const defaultCategories = [
  "Steel Products",
  "Industrial Valves",
  "Pipes & Fittings",
  "Electrical Supplies",
  "Hardware & Tools",
  "Safety Equipment",
  "Consumables",
  "Others"
];

const initialData: AppData = {
  auth: defaultAuth,
  companyProfile: defaultProfile,
  products: [],
  customers: [],
  suppliers: [],
  others: [],
  invoices: [],
  transactions: [],
  inquiries: [],
  opportunities: [],
  walkInRecords: [],
  productCategories: defaultCategories,
  budgetGoals: [],
  plannedTasks: [],
  projects: [],
  attendance: []
};

export const loadData = (): AppData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return initialData;
  try {
    const parsed = JSON.parse(stored);
    return sanitizeData(parsed);
  } catch (e) {
    return initialData;
  }
};

const sanitizeData = (parsed: any): AppData => {
    if (!parsed.auth) parsed.auth = defaultAuth;
    if (!parsed.companyProfile) parsed.companyProfile = defaultProfile;
    if (!parsed.walkInRecords) parsed.walkInRecords = [];
    if (!parsed.others) parsed.others = [];
    if (!parsed.products) parsed.products = [];
    if (!parsed.opportunities) parsed.opportunities = [];
    if (!parsed.budgetGoals) parsed.budgetGoals = [];
    if (!parsed.plannedTasks) parsed.plannedTasks = [];
    if (!parsed.projects) parsed.projects = [];
    if (!parsed.attendance) parsed.attendance = [];
    
    // Ensure products have a lastRestockedDate for ageing analysis
    parsed.products = parsed.products.map((p: any) => ({
      ...p,
      lastRestockedDate: p.lastRestockedDate || new Date().toISOString()
    }));

    if (!parsed.productCategories || parsed.productCategories.length === 0) {
      parsed.productCategories = defaultCategories;
    }
    return parsed;
};

export const saveData = async (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const bridge = getBridge();
  if (bridge) {
    try {
      await bridge.save_data(data);
    } catch (e) {
      console.error("Desktop Vault Save Error", e);
    }
  }
};
