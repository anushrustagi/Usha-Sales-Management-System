
export enum TradeType {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export enum Outcome {
  WIN = 'WIN',
  LOSS = 'LOSS',
  BREAK_EVEN = 'BREAK_EVEN',
  OPEN = 'OPEN'
}

export enum Emotion {
  CONFIDENT = 'Confident',
  ANXIOUS = 'Anxious',
  FOMO = 'FOMO',
  DISCIPLINED = 'Disciplined',
  REVENGE = 'Revenge',
  BORED = 'Bored',
  NEUTRAL = 'Neutral',
  HESITANT = 'Hesitant',
  GREEDY = 'Greedy',
  HOPEFUL = 'Hopeful'
}

export interface Trade {
  id: string;
  date: string; // Entry Date (ISO)
  exitDate?: string; // Exit Date (ISO)
  symbol: string;
  type: TradeType;
  entryPrice: number;
  exitPrice?: number; // Optional for Open trades
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  pnl?: number; // Optional for Open trades
  outcome: Outcome;
  setup: string; // e.g., "Breakout", "Reversal"
  
  // Lifecycle Fields
  plan?: string; // "Inside the Trade" / Hypothesis
  notes: string; // General notes
  
  // Psychology
  emotionsEntry?: Emotion[];
  emotionsExit?: Emotion[];
  emotions: Emotion[]; // Deprecated, kept for backward compatibility

  // Post-Trade Analysis
  learnings?: string;
  mistakes?: string;
  executionRating?: number; // 1 to 5
  
  screenshotUrl?: string;
}

export interface DailyStats {
  date: string;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  bestTrade: number;
  worstTrade: number;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM for reminders
  notified?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  notified?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  date: string; // ISO String
  lastModified: string; // ISO String
}
