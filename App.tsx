
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  List, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Star, 
  Search, 
  Loader2, 
  X, 
  Activity, 
  Filter, 
  Calendar, 
  Copy, 
  Check, 
  Database, 
  Terminal, 
  Info, 
  Pencil,
  Zap,
  StickyNote,
  TrendingUp,
  Link as LinkIcon,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Rocket,
  ShieldCheck,
  Award,
  Hash,
  Moon,
  Sun,
  Download,
  Upload,
  LogOut,
  LayoutGrid,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';
import { createClient, Session } from '@supabase/supabase-js';
import { Network, Coin, Wallet as WalletType, Status } from './types.ts';
import { parseDexScreenerData } from './services/geminiService.ts';
import { StatsCard } from './components/StatsCard.tsx';
import { NetworkBadge, StatusBadge } from './components/Badge.tsx';
import { Auth } from './components/Auth.tsx';

const SUPABASE_URL = 'https://pnstqimjxpjoakqrpcev.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuc3RxaW1qeHBqb2FrcXJwY2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDgwMDQsImV4cCI6MjA4MjI4NDAwNH0.7MOHIxNRj8CwkgN-bVJ4Hr0FNcbyUGGi0wl4IzM1l-o';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const supabaseSql = `
-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  market_cap TEXT,
  liquidity TEXT,
  age TEXT,
  price_change TEXT,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  network TEXT,
  status TEXT,
  custom_link TEXT,
  dex_screener_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  address TEXT NOT NULL,
  buy_volume TEXT,
  sell_volume TEXT,
  profit TEXT,
  source TEXT,
  network TEXT,
  age TEXT,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT,
  multiplier TEXT,
  win_rate INTEGER DEFAULT 50,
  custom_link TEXT,
  gmgn_link TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Copy of wallets table structure for Wallet Wall
CREATE TABLE IF NOT EXISTS wallet_wall (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  address TEXT NOT NULL,
  buy_volume TEXT,
  sell_volume TEXT,
  profit TEXT,
  source TEXT,
  network TEXT,
  age TEXT,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT,
  multiplier TEXT,
  win_rate INTEGER DEFAULT 50,
  custom_link TEXT,
  gmgn_link TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_wall ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Users can only see/edit their own data)
CREATE POLICY "Users can all on own tokens" ON tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can all on own wallets" ON wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can all on own wallet_wall" ON wallet_wall FOR ALL USING (auth.uid() = user_id);
`;

const formatMiladiDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

const formatShamsiDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

const getDateKey = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const ensureValidUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

const parseCurrencyToNumber = (val: string): number => {
  if (!val) return 0;
  let numStr = val.replace(/[$,]/g, '').trim();
  let multiplier = 1;
  const upper = numStr.toUpperCase();
  if (upper.endsWith('K')) { multiplier = 1000; numStr = numStr.slice(0, -1); }
  else if (upper.endsWith('M')) { multiplier = 1000000; numStr = numStr.slice(0, -1); }
  else if (upper.endsWith('B')) { multiplier = 1000000000; numStr = numStr.slice(0, -1); }
  return parseFloat(numStr) * multiplier;
};

const parsePercentage = (val: string): number => {
  if (!val) return 0;
  return parseFloat(val.replace(/[+%]/g, '')) || 0;
};

const parseMultiplier = (val: string): number => {
  if (!val) return 0;
  return parseFloat(val.replace(/[xX]/g, '')) || 0;
};

const simpleParseWalletText = (text: string) => {
  const moneyRegex = /[-+]?\$?\d+(?:,\d+)*(?:\.\d+)?[KMB]?|\$[-+]?\d+(?:,\d+)*(?:\.\d+)?[KMB]?/gi;
  const allMatches = text.match(moneyRegex) || [];
  const currencyMatches = allMatches.filter(m => m.includes('$'));
  let buy = '', sell = '', profit = '', multStr = '1x';
  if (currencyMatches.length >= 3) { buy = currencyMatches[0]; sell = currencyMatches[1]; profit = currencyMatches[2]; }
  else if (allMatches.length >= 3) { buy = allMatches[0]; sell = allMatches[1]; profit = allMatches[2]; }
  const normalize = (val: string, isProfit = false) => {
    if (!val) return '';
    let res = val.trim();
    if (!res.includes('$')) {
      if (res.startsWith('-') || res.startsWith('+')) res = res[0] + '$' + res.slice(1);
      else res = '$' + res;
    }
    if (isProfit && !res.startsWith('-') && !res.startsWith('+')) res = '+' + res;
    return res;
  };
  buy = normalize(buy); sell = normalize(sell); profit = normalize(profit, true);
  const bNum = Math.abs(parseCurrencyToNumber(buy));
  const sNum = Math.abs(parseCurrencyToNumber(sell));
  const pNum = parseCurrencyToNumber(profit);
  if (bNum > 0) multStr = (sNum > 0 ? (sNum / bNum) : ((bNum + pNum) / bNum)).toFixed(1) + 'x';
  return { buy, sell, profit, multStr };
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] border border-slate-200 dark:border-dark-border">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-dark-border shrink-0">
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const WinRateGauge: React.FC<{ rate: number }> = ({ rate }) => {
  const radius = 18; const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;
  const getColor = (r: number) => r >= 70 ? '#10b981' : r >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-700" />
        <circle cx="28" cy="28" r={radius} stroke={getColor(rate)} strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <span className="absolute text-[10px] font-bold text-slate-700 dark:text-slate-200">{rate}%</span>
    </div>
  );
};

const CopyButton: React.FC<{ text: string; label?: string; big?: boolean }> = ({ text, label, big }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={handleCopy} className={`flex items-center gap-1.5 p-1.5 rounded transition-all ${big ? 'bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 font-bold shadow-lg' : label ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
      {copied ? <Check size={big ? 18 : 14} className={big ? "text-white" : "text-emerald-500"} /> : <Copy size={big ? 18 : 14} />}
      {(label || (big && 'Copy SQL Code')) && <span className={`${big ? 'text-sm' : 'text-xs font-medium text-slate-600 dark:text-slate-300'}`}>{copied ? 'Copied!' : (label || 'Copy SQL Code')}</span>}
    </button>
  );
};

type SortDirection = 'asc' | 'desc';
type CoinSortField = 'dateAdded' | 'priceChange' | 'marketCap';
type WalletSortField = 'dateAdded' | 'multiplier' | 'winRate';

const INITIAL_WALLET_STATE: Partial<WalletType> = { 
  network: Network.SOLANA, 
  status: Status.GOOD, 
  winRate: 50, 
  notes: '',
  gmgnLink: '',
  customLink: '',
  address: '',
  source: '',
  buyVolume: '',
  sellVolume: '',
  profit: '',
  multiplier: '1x',
  age: '',
  isFavorite: false
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'wallets' | 'wallet_wall'>('watchlist');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNetwork, setFilterNetwork] = useState<string>('All');
  const [filterSource, setFilterSource] = useState<string>('All');
  const [filterOnlyFavorites, setFilterOnlyFavorites] = useState(false);
  
  const [coins, setCoins] = useState<Coin[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [walletWall, setWalletWall] = useState<WalletType[]>([]);
  const [selectedWalletIds, setSelectedWalletIds] = useState<Set<string>>(new Set());
  
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const [coinSort, setCoinSort] = useState<{ field: CoinSortField, direction: SortDirection }>({ field: 'dateAdded', direction: 'desc' });
  const [walletSort, setWalletSort] = useState<{ field: WalletSortField, direction: SortDirection }>({ field: 'dateAdded', direction: 'desc' });

  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [editingCoinId, setEditingCoinId] = useState<string | null>(null);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  
  const [newCoinUrl, setNewCoinUrl] = useState('');
  const [isParsingCoin, setIsParsingCoin] = useState(false);
  const [isManualCoinEntry, setIsManualCoinEntry] = useState(false);
  const [parsedCoinData, setParsedCoinData] = useState<Partial<Coin> | null>(null);
  const [rawWalletText, setRawWalletText] = useState('');
  const [newWallet, setNewWallet] = useState<Partial<WalletType>>(INITIAL_WALLET_STATE);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { 
    if (session) fetchData(); 
  }, [session]);

  // Clear selections and filters when tab changes
  useEffect(() => {
    setSelectedWalletIds(new Set());
    setFilterSource('All');
  }, [activeTab]);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      const [{ data: tokensData }, { data: walletsData }, { data: walletWallData }] = await Promise.all([
        supabase.from('tokens').select('*').eq('user_id', session.user.id).order('date_added', { ascending: false }),
        supabase.from('wallets').select('*').eq('user_id', session.user.id).order('date_added', { ascending: false }),
        supabase.from('wallet_wall').select('*').eq('user_id', session.user.id).order('date_added', { ascending: false })
      ]);
      
      if (tokensData) setCoins(tokensData.map(t => ({
        id: t.id, name: t.name, marketCap: t.market_cap, liquidity: t.liquidity, age: t.age, priceChange: t.price_change || '0%',
        dateAdded: t.date_added, network: t.network as Network, status: t.status as Status, customLink: t.custom_link, 
        isFavorite: t.is_favorite || false, dexScreenerUrl: t.dex_screener_url, notes: t.notes || ''
      })));
      
      const mapWallet = (w: any) => ({
        id: w.id, address: w.address, buyVolume: w.buy_volume, sellVolume: w.sell_volume, profit: w.profit, source: w.source,
        network: w.network as Network, age: w.age, dateAdded: w.date_added, status: w.status as Status, multiplier: w.multiplier,
        winRate: w.win_rate || 50, customLink: w.custom_link, gmgnLink: w.gmgn_link, isFavorite: w.is_favorite || false, notes: w.notes || ''
      });

      if (walletsData) setWallets(walletsData.map(mapWallet));
      if (walletWallData) setWalletWall(walletWallData.map(mapWallet));

    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const toggleFavorite = async (id: string, currentStatus: boolean, table: 'tokens' | 'wallets' | 'wallet_wall') => {
    try {
      if (table === 'tokens') {
        setCoins(prev => prev.map(c => c.id === id ? { ...c, isFavorite: !currentStatus } : c));
      } else if (table === 'wallets') {
        setWallets(prev => prev.map(w => w.id === id ? { ...w, isFavorite: !currentStatus } : w));
      } else if (table === 'wallet_wall') {
        setWalletWall(prev => prev.map(w => w.id === id ? { ...w, isFavorite: !currentStatus } : w));
      }
      await supabase.from(table).update({ is_favorite: !currentStatus }).eq('id', id);
    } catch (e) { console.error(e); }
  };

  const handleCoinSort = (field: CoinSortField) => {
    setCoinSort(prev => ({ field, direction: prev.field === field ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'desc' }));
  };

  const handleWalletSort = (field: WalletSortField) => {
    setWalletSort(prev => ({ field, direction: prev.field === field ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'desc' }));
  };

  const getSortedList = (list: any[], type: 'coin' | 'wallet') => {
    return [...list].sort((a, b) => {
      let valA: any, valB: any;
      if (type === 'coin') {
        if (coinSort.field === 'dateAdded') { valA = new Date(a.dateAdded).getTime(); valB = new Date(b.dateAdded).getTime(); }
        else if (coinSort.field === 'priceChange') { valA = parsePercentage(a.priceChange); valB = parsePercentage(b.priceChange); }
        else if (coinSort.field === 'marketCap') { valA = parseCurrencyToNumber(a.marketCap); valB = parseCurrencyToNumber(b.marketCap); }
        return coinSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      } else {
        if (walletSort.field === 'dateAdded') { valA = new Date(a.dateAdded).getTime(); valB = new Date(b.dateAdded).getTime(); }
        else if (walletSort.field === 'multiplier') { valA = parseMultiplier(a.multiplier); valB = parseMultiplier(b.multiplier); }
        else if (walletSort.field === 'winRate') { valA = a.winRate; valB = b.winRate; }
        return walletSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      }
    });
  };

  const sortedCoins = useMemo(() => getSortedList(coins, 'coin'), [coins, coinSort]);
  const sortedWallets = useMemo(() => getSortedList(wallets, 'wallet'), [wallets, walletSort]);
  const sortedWalletWall = useMemo(() => getSortedList(walletWall, 'wallet'), [walletWall, walletSort]);

  const filterList = (list: any[]) => list.filter(item => {
    const matchesSearch = (item.name || item.source || item.address || '').toLowerCase().includes(searchQuery.toLowerCase()) || (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = !filterOnlyFavorites || item.isFavorite;
    const matchesNetwork = filterNetwork === 'All' || item.network === filterNetwork;
    const matchesSource = filterSource === 'All' || item.source === filterSource;
    
    // Only apply source filter for wallets tabs
    if (activeTab === 'watchlist') {
      return matchesSearch && matchesFavorite && matchesNetwork;
    }
    
    return matchesSearch && matchesFavorite && matchesNetwork && matchesSource;
  });

  const filteredCoins = filterList(sortedCoins);
  const filteredWallets = filterList(sortedWallets);
  const filteredWalletWall = filterList(sortedWalletWall);

  // Extract unique sources for the current active wallet tab
  const availableSources = useMemo(() => {
    const list = activeTab === 'wallets' ? wallets : (activeTab === 'wallet_wall' ? walletWall : []);
    const sources = new Set(list.map(w => w.source).filter(s => s && s.trim() !== ''));
    return Array.from(sources).sort();
  }, [wallets, walletWall, activeTab]);

  const handleParseCoin = async () => {
    if (!newCoinUrl) return;
    setIsParsingCoin(true);
    try {
      const data = await parseDexScreenerData(newCoinUrl);
      setParsedCoinData({ ...data, customLink: newCoinUrl, dexScreenerUrl: newCoinUrl, notes: '', isFavorite: false });
    } catch (e) { alert("Failed to parse"); } finally { setIsParsingCoin(false); }
  };

  const handleManualSmartParse = () => {
    if (!rawWalletText) return;
    const { buy, sell, profit, multStr } = simpleParseWalletText(rawWalletText);
    setNewWallet(prev => ({ ...prev, buyVolume: buy, sellVolume: sell, profit: profit, multiplier: multStr }));
  };

  const saveCoin = async () => {
    if (!parsedCoinData || !parsedCoinData.name || !session?.user?.id) return;
    
    // Check for duplicates on the same day
    if (!editingCoinId) {
      const today = new Date();
      const duplicate = coins.find(c => {
        const cDate = new Date(c.dateAdded);
        const isSameDay = cDate.getDate() === today.getDate() && 
                          cDate.getMonth() === today.getMonth() && 
                          cDate.getFullYear() === today.getFullYear();
        return isSameDay && 
               c.name.toLowerCase() === (parsedCoinData.name || '').toLowerCase() && 
               c.network === parsedCoinData.network;
      });

      if (duplicate) {
        alert("این ارز در تاریخ امروز قبلاً به واچ‌لیست اضافه شده است!");
        return;
      }
    }

    const payload = {
      user_id: session.user.id,
      name: parsedCoinData.name, market_cap: parsedCoinData.marketCap || '$0', liquidity: parsedCoinData.liquidity || '$0',
      age: parsedCoinData.age || 'New', price_change: parsedCoinData.priceChange || '0%', network: parsedCoinData.network || Network.SOLANA,
      status: parsedCoinData.status || Status.GOOD, custom_link: parsedCoinData.customLink || '', 
      dex_screener_url: parsedCoinData.dexScreenerUrl || parsedCoinData.customLink || '', is_favorite: parsedCoinData.isFavorite ?? false, notes: parsedCoinData.notes || ''
    };
    try {
      if (editingCoinId) await supabase.from('tokens').update(payload).eq('id', editingCoinId);
      else await supabase.from('tokens').insert([{ ...payload, date_added: new Date().toISOString() }]);
      await fetchData(); closeCoinModal();
    } catch (e) { alert("Error saving"); }
  };

  const saveWallet = async () => {
    if (!newWallet.address || !session?.user?.id) return;
    const targetTable = activeTab === 'wallet_wall' ? 'wallet_wall' : 'wallets';
    
    const payload = {
      user_id: session.user.id,
      address: newWallet.address, buy_volume: newWallet.buyVolume, sell_volume: newWallet.sellVolume, profit: newWallet.profit,
      source: newWallet.source, network: newWallet.network, age: newWallet.age || 'New', status: newWallet.status || Status.GOOD,
      multiplier: newWallet.multiplier || '1x', win_rate: newWallet.winRate || 50, custom_link: newWallet.customLink || '',
      gmgn_link: newWallet.gmgnLink || '', is_favorite: newWallet.isFavorite ?? false, notes: newWallet.notes || ''
    };
    try {
      if (editingWalletId) {
        const { error } = await supabase.from(targetTable).update(payload).eq('id', editingWalletId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(targetTable).insert([{ ...payload, date_added: new Date().toISOString() }]);
        if (error) throw error;
      }
      await fetchData(); closeWalletModal();
    } catch (e) { console.error(e); alert("Error saving wallet"); }
  };

  const deleteItem = async (id: string, table: 'tokens' | 'wallets' | 'wallet_wall') => { 
    if (window.confirm('آیا از حذف این آیتم اطمینان دارید؟')) { 
      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        if (table === 'tokens') setCoins(prev => prev.filter(c => c.id !== id));
        else if (table === 'wallets') setWallets(prev => prev.filter(w => w.id !== id));
        else setWalletWall(prev => prev.filter(w => w.id !== id));
      } catch (e) { alert("خطا در حذف آیتم"); }
    } 
  };

  // Bulk Selection Logic
  const toggleSelectWallet = (id: string) => {
    const newSet = new Set(selectedWalletIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedWalletIds(newSet);
  };

  const toggleSelectAllWallets = (list: WalletType[]) => {
    if (list.every(w => selectedWalletIds.has(w.id))) {
      setSelectedWalletIds(new Set());
    } else {
      const newSet = new Set(selectedWalletIds);
      list.forEach(w => newSet.add(w.id));
      setSelectedWalletIds(newSet);
    }
  };

  const handleBulkCopy = (list: WalletType[]) => {
    const addresses = list
      .filter(w => selectedWalletIds.has(w.id))
      .map(w => w.address)
      .join('\n');
    
    if (addresses) {
      navigator.clipboard.writeText(addresses);
      alert(`${selectedWalletIds.size} wallet addresses copied to clipboard!`);
      setSelectedWalletIds(new Set()); // Optional: Clear selection after copy
    }
  };

  const closeCoinModal = () => { setIsCoinModalOpen(false); setEditingCoinId(null); setParsedCoinData(null); setNewCoinUrl(''); setIsManualCoinEntry(false); };
  const closeWalletModal = () => { setIsWalletModalOpen(false); setEditingWalletId(null); setNewWallet(INITIAL_WALLET_STATE); setRawWalletText(''); };

  const SortIndicator = ({ active, direction }: { active: boolean, direction: SortDirection }) => {
    if (!active) return <ArrowUpDown size={14} className="ml-1 text-slate-300 dark:text-slate-600" />;
    return direction === 'asc' ? <ChevronUp size={14} className="ml-1 text-indigo-600 dark:text-indigo-400" /> : <ChevronDown size={14} className="ml-1 text-indigo-600 dark:text-indigo-400" />;
  };

  const DateSeparator = ({ dateStr }: { dateStr: string }) => (
    <div className="flex items-center gap-4 py-6 px-2">
      <div className="flex-1 h-px bg-slate-200 dark:bg-dark-border"></div>
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border px-4 py-1.5 rounded-full flex items-center gap-3 shadow-sm shrink-0">
        <Calendar size={14} className="text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatMiladiDate(dateStr)}</span>
        <div className="w-px h-3 bg-slate-200 dark:bg-dark-border"></div>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400" dir="rtl">{formatShamsiDate(dateStr)}</span>
      </div>
      <div className="flex-1 h-px bg-slate-200 dark:bg-dark-border"></div>
    </div>
  );

  const handleExport = () => {
    const data = { tokens: coins, wallets: wallets, walletWall: walletWall, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto-trackr-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.tokens) setCoins(json.tokens);
        if (json.wallets) setWallets(json.wallets);
        if (json.walletWall) setWalletWall(json.walletWall);
        alert('Backup loaded successfully! (View only)');
      } catch (err) { alert('Invalid backup file'); }
    };
    reader.readAsText(file);
  };

  const currentStats = useMemo(() => {
    let list: any[] = [];
    if (activeTab === 'watchlist') list = coins;
    else if (activeTab === 'wallets') list = wallets;
    else list = walletWall;
    
    return {
      total: list.length,
      good: list.filter(i => i.status === Status.GOOD).length,
      excellent: list.filter(i => i.status === Status.EXCELLENT).length,
      favorites: list.filter(i => i.isFavorite).length
    };
  }, [activeTab, coins, wallets, walletWall]);

  if (!session) return <Auth supabase={supabase} />;

  // Component to render a list of wallets (reused for Wallets and Wallet Wall tabs)
  const WalletList = ({ list, table }: { list: WalletType[], table: 'wallets' | 'wallet_wall' }) => {
    const isAllSelected = list.length > 0 && list.every(w => selectedWalletIds.has(w.id));
    const selectedCount = list.filter(w => selectedWalletIds.has(w.id)).length;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-100 dark:bg-dark-card border border-transparent dark:border-dark-border rounded-lg px-3 py-2 shadow-sm mb-2">
          {/* Bulk Action Left Side */}
          <div className="flex items-center gap-3">
             <button 
                onClick={() => toggleSelectAllWallets(list)} 
                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
             >
                {isAllSelected ? <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" /> : <Square size={16} />}
                Select All
             </button>
             {selectedCount > 0 && (
                <>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-700"></div>
                  <button 
                    onClick={() => handleBulkCopy(list)} 
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-md font-bold transition-all shadow-sm animate-in fade-in zoom-in duration-200"
                  >
                    <Copy size={12} />
                    Copy Selected ({selectedCount})
                  </button>
                </>
             )}
          </div>

          {/* Sort Right Side */}
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>Sort By:</span>
            <button onClick={() => handleWalletSort('dateAdded')} className={`flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${walletSort.field === 'dateAdded' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>Date <SortIndicator active={walletSort.field === 'dateAdded'} direction={walletSort.direction} /></button>
            <button onClick={() => handleWalletSort('winRate')} className={`flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${walletSort.field === 'winRate' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>Win Rate <SortIndicator active={walletSort.field === 'winRate'} direction={walletSort.direction} /></button>
            <button onClick={() => handleWalletSort('multiplier')} className={`flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${walletSort.field === 'multiplier' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>Multiplier <SortIndicator active={walletSort.field === 'multiplier'} direction={walletSort.direction} /></button>
          </div>
        </div>

        {list.map((wallet, index) => {
          const prevWallet = list[index - 1];
          const currentDateKey = getDateKey(wallet.dateAdded);
          const prevDateKey = prevWallet ? getDateKey(prevWallet.dateAdded) : null;
          const showDivider = currentDateKey !== prevDateKey;
          const linkUrl = ensureValidUrl(wallet.customLink);
          const gmgnUrl = ensureValidUrl(wallet.gmgnLink);
          const isSelected = selectedWalletIds.has(wallet.id);

          return (
            <React.Fragment key={wallet.id}>
              {showDivider && <DateSeparator dateStr={wallet.dateAdded} />}
              <div className={`group relative bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border transition-all hover:shadow-md dark:shadow-none dark:hover:bg-dark-hover ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' : (wallet.isFavorite ? 'border-amber-200 ring-1 ring-amber-100 dark:border-amber-900/50 dark:ring-amber-900/20' : 'border-slate-200 dark:border-dark-border')}`}>
                
                {/* Checkbox Overlay/Side */}
                <div className="absolute left-3 top-6 bottom-0 w-8 flex flex-col items-center">
                    <button onClick={() => toggleSelectWallet(wallet.id)} className="text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors">
                        {isSelected ? <CheckSquare size={20} className="text-indigo-600 dark:text-indigo-400 fill-white dark:fill-dark-card" /> : <Square size={20} />}
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row justify-between gap-6 pl-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <button onClick={() => toggleFavorite(wallet.id, !!wallet.isFavorite, table)} className="transition-colors">
                        <Star size={20} className={`${wallet.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-200 dark:text-slate-700 hover:text-amber-400'}`} />
                      </button>
                      <NetworkBadge network={wallet.network} />
                      {linkUrl ? (
                        <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors">
                          {wallet.source} <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="font-bold text-slate-700 dark:text-white">{wallet.source}</span>
                      )}
                      <span className="font-mono text-slate-400 dark:text-slate-500 text-[10px] bg-slate-50 dark:bg-dark-bg px-2 py-1 rounded border border-slate-100 dark:border-dark-border">{wallet.address}</span>
                      <CopyButton text={wallet.address} />
                      <StatusBadge status={wallet.status} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
                      <div><span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1 tracking-wider">Buy Vol</span><span className="font-bold text-blue-600 dark:text-blue-400">{wallet.buyVolume || '$0'}</span></div>
                      <div><span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1 tracking-wider">Sell Vol</span><span className="font-bold text-rose-600 dark:text-rose-400">{wallet.sellVolume || '$0'}</span></div>
                      <div><span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1 tracking-wider">Profit</span><span className={`font-extrabold text-lg ${wallet.profit.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{wallet.profit || '$0'}</span></div>
                      <div><span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1 tracking-wider">Mult.</span><span className="font-extrabold text-indigo-600 dark:text-indigo-400">{wallet.multiplier}</span></div>
                    </div>
                    
                    {wallet.notes && (
                      <div className="bg-slate-50 dark:bg-dark-bg p-3 rounded-lg border border-slate-100 dark:border-dark-border mb-4">
                          <p className="text-xs text-slate-600 dark:text-slate-400 flex gap-2"><StickyNote size={14} className="text-indigo-400 shrink-0" /> {wallet.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold border-t border-slate-50 dark:border-dark-border pt-3">
                        <div className="flex items-center gap-1"><Calendar size={12} /> {formatMiladiDate(wallet.dateAdded)} / {formatShamsiDate(wallet.dateAdded)}</div>
                        {(wallet.age && wallet.age !== 'New') && <div className="flex items-center gap-1"><Clock size={12} /> {wallet.age}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-dark-border pt-4 lg:pt-0 pl-0 lg:pl-8 shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="text-right"><span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-wider">Win Rate</span><span className="font-bold text-slate-700 dark:text-slate-300">Performance</span></div>
                        <WinRateGauge rate={wallet.winRate} />
                      </div>
                      <div className="flex gap-2">
                      {gmgnUrl && (
                        <a href={gmgnUrl} target="_blank" rel="noopener noreferrer" className="p-3 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="Open GMGN"><Rocket size={20} /></a>
                      )}
                      <button onClick={() => { setEditingWalletId(wallet.id); setNewWallet({ ...wallet }); setIsWalletModalOpen(true); }} className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all" title="Edit Wallet"><Pencil size={20} /></button>
                      <button onClick={() => deleteItem(wallet.id, table)} className="p-3 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all" title="Delete Wallet"><Trash2 size={20} /></button>
                      </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {list.length === 0 && !isLoading && (
            <div className="p-12 text-center text-slate-400 dark:text-slate-600 flex flex-col items-center gap-3 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl">
              <LayoutGrid size={48} className="text-slate-200 dark:text-slate-700" />
              <p>No items found in this section.</p>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-dark-text flex flex-col font-sans overflow-hidden transition-colors duration-200">
      
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-dark-card border-b border-slate-200 dark:border-dark-border shrink-0 z-30 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-lg text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <Activity size={20} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">CryptoTrackr</h1>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-dark-bg p-1 rounded-xl border border-slate-100 dark:border-dark-border">
          <button onClick={handleExport} className="p-2 hover:bg-white dark:hover:bg-dark-card hover:shadow-sm rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all" title="Backup Data">
            <Download size={18} />
          </button>
          <label className="p-2 hover:bg-white dark:hover:bg-dark-card hover:shadow-sm rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all cursor-pointer" title="Restore Data">
            <Upload size={18} />
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <div className="w-px h-6 bg-slate-200 dark:bg-dark-border mx-1"></div>
          <button onClick={() => setIsSqlModalOpen(true)} className="p-2 hover:bg-white dark:hover:bg-dark-card hover:shadow-sm rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-all" title="Database Config">
            <Database size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-white dark:bg-dark-card border-r border-slate-200 dark:border-dark-border shrink-0 flex flex-col transition-colors z-20">
          <nav className="p-4 space-y-2 flex-1 mt-2">
            <button onClick={() => setActiveTab('watchlist')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'watchlist' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-hover'}`}><List size={20} /> Watchlist</button>
            <button onClick={() => setActiveTab('wallets')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'wallets' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-hover'}`}><Wallet size={20} /> Wallets</button>
            <button onClick={() => setActiveTab('wallet_wall')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'wallet_wall' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-hover'}`}><LayoutGrid size={20} /> Wallet Wall</button>
          </nav>
          <div className="p-4 border-t border-slate-100 dark:border-dark-border space-y-2">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-hover transition-colors"
            >
              <span className="flex items-center gap-3">{theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />} Theme</span>
              <span className="text-xs uppercase font-bold tracking-wider">{theme}</span>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors"
            >
              <LogOut size={20} /> Sign Out
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto w-full h-full">
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard title={`TOTAL ${activeTab === 'watchlist' ? 'TOKENS' : (activeTab === 'wallets' ? 'WALLETS' : 'WALL ITEMS')}`} value={currentStats.total} icon={<Hash size={20} className="text-slate-500 dark:text-slate-400" />} />
              <StatsCard title="GOOD" value={currentStats.good} icon={<ShieldCheck size={20} className="text-emerald-500 dark:text-emerald-400" />} />
              <StatsCard title="EXCELLENT" value={currentStats.excellent} icon={<Award size={20} className="text-indigo-500 dark:text-indigo-400" />} />
              <StatsCard title="Total Favorites" value={currentStats.favorites} icon={<Star size={20} className="text-amber-500 fill-amber-500" />} />
            </div>

            <div className="bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-slate-200 dark:border-dark-border mb-6 flex flex-col md:flex-row gap-4 items-center justify-between transition-colors">
              <div className="flex flex-1 gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none md:min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder-slate-400 dark:placeholder-slate-600" />
                </div>
                <select value={filterNetwork} onChange={e=>setFilterNetwork(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-dark-border rounded-lg text-sm outline-none bg-white dark:bg-dark-bg text-slate-900 dark:text-white">
                  <option value="All">All Networks</option>
                  {Object.values(Network).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                
                {/* Source Filter - Only visible in Wallets Tabs */}
                {activeTab !== 'watchlist' && (
                  <select value={filterSource} onChange={e=>setFilterSource(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-dark-border rounded-lg text-sm outline-none bg-white dark:bg-dark-bg text-slate-900 dark:text-white">
                    <option value="All">All Sources</option>
                    {availableSources.map(source => <option key={source} value={source}>{source}</option>)}
                  </select>
                )}

                <button 
                  onClick={() => setFilterOnlyFavorites(!filterOnlyFavorites)} 
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-all ${filterOnlyFavorites ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' : 'bg-white dark:bg-dark-bg border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-hover'}`}
                >
                  <Star size={16} className={filterOnlyFavorites ? "fill-amber-500" : ""} />
                  Only Favorites
                </button>
              </div>
              <button onClick={() => activeTab === 'watchlist' ? setIsCoinModalOpen(true) : setIsWalletModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md">
                <Plus size={18} /> Add Item
              </button>
            </div>

            {activeTab === 'watchlist' && (
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 dark:bg-dark-card/50 border-b border-slate-200 dark:border-dark-border">
                      <tr>
                        <th className="px-6 py-4 font-bold w-12 text-center text-slate-700 dark:text-slate-300">Fav</th>
                        <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">Token</th>
                        <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">Network</th>
                        <th className="px-6 py-4 font-bold cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 select-none transition-colors text-slate-700 dark:text-slate-300" onClick={() => handleCoinSort('priceChange')}>
                          <div className="flex items-center">24h Change <SortIndicator active={coinSort.field === 'priceChange'} direction={coinSort.direction} /></div>
                        </th>
                        <th className="px-6 py-4 font-bold cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 select-none transition-colors text-slate-700 dark:text-slate-300" onClick={() => handleCoinSort('marketCap')}>
                          <div className="flex items-center">Market Cap <SortIndicator active={coinSort.field === 'marketCap'} direction={coinSort.direction} /></div>
                        </th>
                        <th className="px-6 py-4 font-bold cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 select-none transition-colors text-slate-700 dark:text-slate-300" onClick={() => handleCoinSort('dateAdded')}>
                          <div className="flex items-center">Date Added <SortIndicator active={coinSort.field === 'dateAdded'} direction={coinSort.direction} /></div>
                        </th>
                        <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">Age</th>
                        <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">Status</th>
                        <th className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                      {filteredCoins.map((coin, index) => {
                        const prevCoin = filteredCoins[index - 1];
                        const currentDateKey = getDateKey(coin.dateAdded);
                        const prevDateKey = prevCoin ? getDateKey(prevCoin.dateAdded) : null;
                        const showDivider = currentDateKey !== prevDateKey;
                        const linkUrl = ensureValidUrl(coin.dexScreenerUrl || coin.customLink);

                        return (
                          <React.Fragment key={coin.id}>
                            {showDivider && (
                              <tr className="bg-slate-50/50 dark:bg-dark-bg/50">
                                <td colSpan={9} className="p-0">
                                  <DateSeparator dateStr={coin.dateAdded} />
                                </td>
                              </tr>
                            )}
                            <tr className="hover:bg-slate-50 dark:hover:bg-dark-hover transition-colors">
                              <td className="px-6 py-4 text-center">
                                <button onClick={() => toggleFavorite(coin.id, !!coin.isFavorite, 'tokens')} className="transition-colors group">
                                  <Star size={18} className={`${coin.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-200 dark:text-slate-700 group-hover:text-amber-400'}`} />
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  {linkUrl ? (
                                    <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1.5 transition-colors">
                                      {coin.name} <ExternalLink size={12} className="shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="text-slate-900 dark:text-white font-bold">{coin.name}</span>
                                  )}
                                  {coin.notes && (
                                    <div className="flex items-center gap-1 mt-1 text-slate-400 dark:text-slate-500 text-xs italic truncate max-w-[150px]" title={coin.notes}>
                                      <StickyNote size={10} /> {coin.notes}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4"><NetworkBadge network={coin.network} /></td>
                              <td className={`px-6 py-4 font-bold ${coin.priceChange.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : coin.priceChange.startsWith('-') ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>{coin.priceChange}</td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{coin.marketCap}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300" title="Miladi Date">{formatMiladiDate(coin.dateAdded)}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium" title="Shamsi Date">{formatShamsiDate(coin.dateAdded)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">{coin.age}</td>
                              <td className="px-6 py-4"><StatusBadge status={coin.status} /></td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => { setEditingCoinId(coin.id); setParsedCoinData(coin); setIsCoinModalOpen(true); setIsManualCoinEntry(true); }} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Edit Token"><Pencil size={16} /></button>
                                  <button onClick={() => deleteItem(coin.id, 'tokens')} className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors" title="Delete Token"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredCoins.length === 0 && !isLoading && (
                    <div className="p-12 text-center text-slate-400 dark:text-slate-600 flex flex-col items-center gap-3">
                      <Search size={48} className="text-slate-200 dark:text-slate-700" />
                      <p>No tokens found matching your criteria.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'wallets' && <WalletList list={filteredWallets} table="wallets" />}
            {activeTab === 'wallet_wall' && <WalletList list={filteredWalletWall} table="wallet_wall" />}
          </div>
        </main>

        <Modal isOpen={isSqlModalOpen} onClose={() => setIsSqlModalOpen(false)} title="Supabase Database Setup">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-400">
              <Info size={24} className="shrink-0" /><p className="text-sm">Copy the code below and paste it into the <b>SQL Editor</b> in Supabase.</p>
            </div>
            <div className="relative group">
              <div className="absolute right-4 top-4 z-10"><CopyButton text={supabaseSql} big /></div>
              <div className="bg-slate-900 dark:bg-black rounded-xl p-6 overflow-hidden border border-slate-800 dark:border-dark-border"><pre className="text-indigo-300 text-[13px] font-mono h-64 overflow-auto select-all">{supabaseSql}</pre></div>
            </div>
          </div>
        </Modal>

        <Modal isOpen={isCoinModalOpen} onClose={closeCoinModal} title={editingCoinId ? "Edit Token" : "Add Token"}>
          <div className="space-y-4">
            {!editingCoinId && !isManualCoinEntry && (
              <div className="flex flex-col gap-4">
                 <div className="flex gap-2">
                  <input type="text" value={newCoinUrl} onChange={e=>setNewCoinUrl(e.target.value)} placeholder="DexScreener URL or Symbol..." className="flex-1 p-3 border border-slate-300 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button onClick={handleParseCoin} disabled={isParsingCoin} className="bg-indigo-600 text-white px-4 py-3 rounded-lg flex items-center justify-center min-w-[60px]">{isParsingCoin ? <Loader2 className="animate-spin" /> : <Search />}</button>
                </div>
                <button onClick={() => { setIsManualCoinEntry(true); setParsedCoinData({ name: '', marketCap: '', liquidity: '', age: 'New', priceChange: '0%', network: Network.SOLANA, status: Status.GOOD, dexScreenerUrl: '', isFavorite: false, notes: '' }); }} className="text-indigo-600 dark:text-indigo-400 text-sm font-bold flex items-center justify-center gap-1 hover:underline"><Pencil size={14} /> Register Manually (ثبت دستی)</button>
              </div>
            )}

            {(isManualCoinEntry || parsedCoinData) && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Token Symbol</label><input type="text" value={parsedCoinData?.name || ''} onChange={e=>setParsedCoinData({...parsedCoinData, name:e.target.value})} placeholder="e.g. BTC" className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Network</label><select value={parsedCoinData?.network} onChange={e=>setParsedCoinData({...parsedCoinData, network:e.target.value as Network})} className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500">{Object.values(Network).map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Status</label><select value={parsedCoinData?.status} onChange={e=>setParsedCoinData({...parsedCoinData, status:e.target.value as Status})} className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500">{Object.values(Status).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                  <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Liquidity</label><input type="text" value={parsedCoinData?.liquidity || ''} onChange={e=>setParsedCoinData({...parsedCoinData, liquidity:e.target.value})} placeholder="$500K" className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Market Cap</label><input type="text" value={parsedCoinData?.marketCap || ''} onChange={e=>setParsedCoinData({...parsedCoinData, marketCap:e.target.value})} placeholder="$10M" className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">24H Change</label><input type="text" value={parsedCoinData?.priceChange || ''} onChange={e=>setParsedCoinData({...parsedCoinData, priceChange:e.target.value})} placeholder="+15%" className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
                </div>
                <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Token Link / URL</label><input type="text" value={parsedCoinData?.dexScreenerUrl || ''} onChange={e=>setParsedCoinData({...parsedCoinData, dexScreenerUrl:e.target.value})} placeholder="https://..." className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
                
                <div className="flex items-center gap-2 py-2">
                  <input type="checkbox" id="coin-fav" checked={parsedCoinData?.isFavorite} onChange={e=>setParsedCoinData({...parsedCoinData, isFavorite: e.target.checked})} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                  <label htmlFor="coin-fav" className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none">Mark as Favorite (علاقه‌مندی)</label>
                </div>

                <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Notes (یادداشت)</label><textarea value={parsedCoinData?.notes || ''} onChange={e=>setParsedCoinData({...parsedCoinData, notes:e.target.value})} placeholder="Extra details about this token..." className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded h-20 resize-none outline-none focus:border-indigo-500" /></div>

                <button onClick={saveCoin} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all">Save Token</button>
              </div>
            )}
          </div>
        </Modal>

        <Modal isOpen={isWalletModalOpen} onClose={closeWalletModal} title={editingWalletId ? (activeTab === 'wallet_wall' ? "Edit Wall Item" : "Edit Wallet") : (activeTab === 'wallet_wall' ? "Add to Wallet Wall" : "Add Wallet")}>
          <div className="space-y-4">
            {!editingWalletId && activeTab !== 'wallet_wall' && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <label className="text-[10px] font-extrabold text-indigo-400 block mb-2 tracking-widest uppercase">Smart Auto-Fill</label>
                <textarea value={rawWalletText} onChange={e=>setRawWalletText(e.target.value)} placeholder="Paste stats here (e.g. from Telegram bots)..." className="w-full h-20 p-2 border border-indigo-200 dark:border-indigo-800 dark:bg-dark-bg dark:text-white rounded text-sm outline-none resize-none mb-2 focus:ring-1 focus:ring-indigo-300" />
                <button onClick={handleManualSmartParse} className="w-full bg-indigo-600 text-white py-2 rounded font-bold text-sm flex justify-center items-center gap-1 hover:bg-indigo-700 transition-all"><Zap size={14} /> Parse Stats</button>
              </div>
            )}
            <div className="space-y-4">
              <div className={`grid ${activeTab === 'wallet_wall' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                {activeTab !== 'wallet_wall' && (
                  <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Network</label><select value={newWallet.network} onChange={e=>setNewWallet({...newWallet, network:e.target.value as Network})} className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500">{Object.values(Network).map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                )}
                <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Status</label><select value={newWallet.status} onChange={e=>setNewWallet({...newWallet, status:e.target.value as Status})} className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500">{Object.values(Status).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Address / Link</label><input type="text" value={newWallet.address || ''} onChange={e=>setNewWallet({...newWallet, address:e.target.value})} placeholder="Wallet Address" className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
              <div className={`grid ${activeTab === 'wallet_wall' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                {activeTab !== 'wallet_wall' && (
                  <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Source / Label</label><input type="text" value={newWallet.source || ''} onChange={e=>setNewWallet({...newWallet, source:e.target.value})} placeholder="e.g. Whale Hunter" className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
                )}
                <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Win Rate (%)</label><input type="number" value={newWallet.winRate || 50} onChange={e=>setNewWallet({...newWallet, winRate: parseInt(e.target.value) || 0})} className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
              </div>
              {activeTab !== 'wallet_wall' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Buy Vol</label><input type="text" value={newWallet.buyVolume || ''} onChange={e=>setNewWallet({...newWallet, buyVolume:e.target.value})} placeholder="$100" className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Sell Vol</label><input type="text" value={newWallet.sellVolume || ''} onChange={e=>setNewWallet({...newWallet, sellVolume:e.target.value})} placeholder="$200" className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
                </div>
              )}
              <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Profit / PnL</label><input type="text" value={newWallet.profit || ''} onChange={e=>setNewWallet({...newWallet, profit:e.target.value})} placeholder="+$100" className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
              <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Custom Link</label><input type="text" value={newWallet.customLink || ''} onChange={e=>setNewWallet({...newWallet, customLink:e.target.value})} placeholder="https://..." className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
              {activeTab !== 'wallet_wall' && (
                <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">GMGN Link</label><input type="text" value={newWallet.gmgnLink || ''} onChange={e=>setNewWallet({...newWallet, gmgnLink:e.target.value})} placeholder="https://gmgn.ai/sol/address/..." className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>
              )}
              
              <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">{activeTab === 'wallet_wall' ? 'Trade Duration' : 'Wallet Age'}</label><input type="text" value={newWallet.age || ''} onChange={e=>setNewWallet({...newWallet, age:e.target.value})} placeholder="e.g. 2d 5h" className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded outline-none focus:border-indigo-500" /></div>

              <div className="flex items-center gap-2 py-2">
                <input type="checkbox" id="wallet-fav" checked={newWallet.isFavorite} onChange={e=>setNewWallet({...newWallet, isFavorite: e.target.checked})} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                <label htmlFor="wallet-fav" className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none">Mark as Favorite (علاقه‌مندی)</label>
              </div>

              <div><label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">Notes (یادداشت)</label><textarea value={newWallet.notes || ''} onChange={e=>setNewWallet({...newWallet, notes:e.target.value})} placeholder="Extra info..." className="w-full p-2 border border-slate-200 dark:border-dark-border dark:bg-dark-bg dark:text-white rounded h-20 resize-none outline-none focus:border-indigo-500" /></div>
              
              <button onClick={saveWallet} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-indigo-700 transition-all">Save {activeTab === 'wallet_wall' ? 'Item' : 'Wallet'}</button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
