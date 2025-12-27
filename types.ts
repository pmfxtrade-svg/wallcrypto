
// Status enum for token and wallet health/performance
export enum Status {
  GOOD = 'Good',
  EXCELLENT = 'Excellent',
}

export enum Network {
  SOLANA = 'Solana',
  ETHEREUM = 'Ethereum',
  BASE = 'Base',
  BSC = 'BSC',
  OTHER = 'Other',
}

export interface Coin {
  id: string;
  name: string;
  marketCap: string;
  liquidity: string;
  age: string; 
  priceChange: string; // 24h Change percentage
  dateAdded: string;
  network: Network;
  status?: Status;
  customLink?: string;
  isFavorite: boolean;
  dexScreenerUrl?: string;
  notes?: string;
}

export interface Wallet {
  id: string;
  address: string;
  buyVolume: string;
  sellVolume: string;
  profit: string; 
  source: string; 
  network: Network;
  age: string;
  dateAdded: string;
  multiplier: string;
  winRate: number; 
  status?: Status;
  customLink?: string;
  gmgnLink?: string;
  isFavorite: boolean;
  notes?: string;
}

export interface WallWallet {
  id: string;
  address: string;
  name: string; // Name or Label from Hyperdash
  winRate: number;
  roi: string; // Return on Investment
  pnl: string; // Profit and Loss
  totalTrades: number;
  avgEntry: string;
  hyperdashUrl: string;
  dateAdded: string;
  notes?: string;
}

export interface StatsData {
  totalCoins: number;
  totalWallets: number;
  favoriteCoins: number;
  topNetwork: string;
}
