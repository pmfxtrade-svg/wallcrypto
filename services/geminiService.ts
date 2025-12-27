
import { Network, Status } from "../types";

/**
 * این تابع به طور کامل از API عمومی DexScreener استفاده می‌کند
 * و هیچ وابستگی به هوش مصنوعی (AI) یا کلید API گوگل ندارد.
 */
export const parseDexScreenerData = async (query: string) => {
  try {
    let searchTerm = query.trim();
    
    // استخراج آدرس توکن از URL اگر ورودی یک لینک باشد
    const urlMatch = searchTerm.match(/dexscreener\.com\/[^\/]+\/([a-zA-Z0-9]+)/);
    if (urlMatch && urlMatch[1]) {
        searchTerm = urlMatch[1];
    } else if (searchTerm.includes('/')) {
        const parts = searchTerm.split('/');
        searchTerm = parts[parts.length - 1];
    }

    // فراخوانی مستقیم API رایگان DexScreener
    const apiUrl = `https://api.dexscreener.com/latest/dex/search?q=${searchTerm}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
        throw new Error(`خطا در برقراری ارتباط با سرویس داده: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.pairs || data.pairs.length === 0) {
        throw new Error("هیچ اطلاعاتی برای این توکن پیدا نشد.");
    }

    // انتخاب بهترین جفت معاملاتی (معمولاً اولین مورد معتبرترین است)
    const pair = data.pairs[0];
    
    // تشخیص شبکه
    let network = Network.OTHER;
    const chainId = (pair.chainId || '').toLowerCase();
    if (chainId.includes('sol')) network = Network.SOLANA;
    else if (chainId.includes('eth')) network = Network.ETHEREUM;
    else if (chainId.includes('base')) network = Network.BASE;
    else if (chainId.includes('bsc')) network = Network.BSC;

    // تعیین وضعیت بر اساس نقدینگی
    let status = Status.GOOD;
    const liquidity = pair.liquidity?.usd || 0;
    if (liquidity > 500000) {
        status = Status.EXCELLENT;
    }

    // محاسبه سن توکن
    let age = "New";
    if (pair.pairCreatedAt) {
        const created = new Date(pair.pairCreatedAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffMonths = Math.floor(diffDays / 30);

        if (diffMinutes < 60) age = `${diffMinutes}m`;
        else if (diffHours < 24) age = `${diffHours}h`;
        else if (diffDays < 30) age = `${diffDays}d`;
        else age = `${diffMonths}mo`;
    }

    const priceChange = pair.priceChange?.h24 ? `${pair.priceChange.h24 > 0 ? '+' : ''}${pair.priceChange.h24}%` : '0%';

    // فرمت‌دهی اعداد بزرگ
    const fmt = (num: number) => {
        if (!num) return '$0';
        if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
        if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
        return `$${num.toFixed(2)}`;
    };

    return {
        name: pair.baseToken.symbol,
        marketCap: fmt(pair.marketCap || pair.fdv || 0),
        liquidity: fmt(liquidity),
        age: age,
        priceChange: priceChange,
        network: network,
        status: status,
        customLink: pair.url,
        dexScreenerUrl: pair.url
    };

  } catch (error) {
    console.error("DexScreener API Error:", error);
    throw error;
  }
};

/**
 * پارسر مخصوص سایت Hyperdash
 * توجه: به دلیل محدودیت CORS مرورگرها، امکان دریافت مستقیم HTML سایت‌های دیگر وجود ندارد.
 * این تابع آدرس را استخراج کرده و داده‌های نمونه را برمی‌گرداند.
 */
export const parseHyperdashData = async (url: string) => {
    // 1. اعتبارسنجی لینک و استخراج آدرس
    const cleanUrl = url.trim();
    if (!cleanUrl.includes('hyperdash.com')) {
        throw new Error('Invalid Hyperdash URL');
    }

    // تلاش برای پیدا کردن آدرس کیف پول در URL
    // فرمت معمول: https://legacy.hyperdash.com/wallet/ADDRESS یا مشابه
    // ما فرض می‌کنیم هر رشته طولانی در URL آدرس است
    const addressMatch = cleanUrl.match(/[a-zA-Z0-9]{32,44}/);
    const address = addressMatch ? addressMatch[0] : 'Unknown Address';

    // شبیه‌سازی تاخیر شبکه
    await new Promise(resolve => setTimeout(resolve, 1500));

    // در یک محیط واقعی، اینجا باید به یک پروکسی سرور درخواست بفرستید
    // فعلا داده‌های تصادفی اما واقعی‌گرایانه تولید می‌کنیم تا UI تست شود
    
    const randomPnL = (Math.random() * 10000).toFixed(2);
    const isPositive = Math.random() > 0.3;
    const pnl = isPositive ? `+$${randomPnL}` : `-$${randomPnL}`;
    const roi = isPositive ? `+${(Math.random() * 500).toFixed(0)}%` : `-${(Math.random() * 50).toFixed(0)}%`;
    const winRate = Math.floor(Math.random() * (90 - 30) + 30);
    const trades = Math.floor(Math.random() * 500);

    return {
        address: address,
        name: `HyperDash Wallet ${address.slice(0, 4)}`,
        winRate: winRate,
        roi: roi,
        pnl: pnl,
        totalTrades: trades,
        avgEntry: `$${(Math.random() * 0.5).toFixed(4)}`,
        hyperdashUrl: cleanUrl
    };
};
