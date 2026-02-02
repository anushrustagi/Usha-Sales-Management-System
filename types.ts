
export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  SALES = 'SALES',
  PURCHASES = 'PURCHASES',
  INVENTORY = 'INVENTORY',
  CRM = 'CRM',
  PAYMENTS = 'PAYMENTS',
  ACCOUNTING = 'ACCOUNTING',
  FORECASTING = 'FORECASTING',
  EXPENSES = 'EXPENSES',
  SETTINGS = 'SETTINGS',
  WALKIN_REPORTS = 'WALKIN_REPORTS',
  BUDGETING = 'BUDGETING',
  PLANNER = 'PLANNER'
}

export interface AuthState {
  pin?: string;
  hint?: string;
  isEnabled: boolean;
}

export interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  gstin: string;
  email: string;
  currency: string;
  logo?: string; 
}

export interface Product {
  id: string;
  name: string;
  hsn: string;
  gstRate: number;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  openingStock: number;
  minStockAlert: number;
  category: string;
  subCategory: string;
  lastRestockedDate: string; // Tracking for Ageing Analysis
  location?: string; // New: Physical location tracker
}

export interface Customer {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  address: string;
  gstin?: string;
  area?: string;
  subArea?: string;
  email?: string;
  remarks?: string;
  outstandingBalance: number;
  paymentReminderDate?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  address: string;
  gstin?: string;
  area?: string;
  subArea?: string;
  email?: string;
  remarks?: string;
  outstandingBalance: number;
  paymentReminderDate?: string;
}

export interface OtherParty {
  id: string;
  name: string;
  type: 'EMPLOYEE' | 'PARTNER' | 'OTHER';
  phone?: string;
  outstandingBalance: number;
  remarks?: string;
  monthlySalary?: number;
  salaryDueDate?: number;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  hsn: string;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  amount: number;
  serialNumber?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  partyId: string;
  partyName: string;
  partyPhone?: string;
  partyAddress?: string;
  partyArea?: string;
  partySubArea?: string;
  items: InvoiceItem[];
  subTotal: number;
  totalGst: number;
  grandTotal: number;
  amountPaid: number;
  type: 'SALE' | 'PURCHASE';
  subType?: 'TAX_INVOICE' | 'DELIVERY_CHALLAN' | 'PROFORMA_INVOICE';
  paymentMode: 'CASH' | 'BANK' | 'UPI' | 'CHEQUE';
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string; 
}

export type CrmStage = 'NEW' | 'QUALIFIED' | 'PROPOSITION' | 'WON';

export interface Opportunity {
  id: string;
  title: string;
  customerId: string;
  customerName: string;
  expectedRevenue: number;
  probability: number;
  stage: CrmStage;
  priority: 1 | 2 | 3;
  date: string;
  notes?: string;
  tags?: string[];
}

export interface Inquiry {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  status: 'OPEN' | 'CONVERTED' | 'LOST';
  notes: string;
}

export interface WalkInRecord {
  id: string;
  date: string;
  count: number;
  remarks: string;
  productName?: string;
  price?: number;
}

export type BudgetPeriod = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY' | 'DAILY';

export interface BudgetGoal {
  id: string;
  category: string;
  subCategory?: string; // New: Specific point/item within the pillar
  amount: number;
  essentialAmount: number; // Smart split for essential vs optional
  period: BudgetPeriod;
}

export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PlannedTask {
  id: string;
  date: string; // ISO string (Date only)
  time?: string; // Format HH:MM
  title: string;
  description?: string;
  priority: PriorityLevel;
  status: 'PENDING' | 'COMPLETED';
  projectId?: string; // Optional: Link to project
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  color: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // ISO Date YYYY-MM-DD
  status: AttendanceStatus;
}

export interface AppData {
  auth: AuthState;
  companyProfile: CompanyProfile;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  others: OtherParty[];
  invoices: Invoice[];
  transactions: Transaction[];
  inquiries: Inquiry[];
  opportunities: Opportunity[];
  walkInRecords: WalkInRecord[];
  productCategories: string[];
  budgetGoals: BudgetGoal[];
  plannedTasks: PlannedTask[];
  projects: Project[];
  attendance: AttendanceRecord[];
}