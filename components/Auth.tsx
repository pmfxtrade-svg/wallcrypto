
import React, { useState } from 'react';
import { Mail, Lock, Loader2, Activity, ArrowRight, AlertCircle } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';

interface AuthProps {
  supabase: SupabaseClient;
}

export const Auth: React.FC<AuthProps> = ({ supabase }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('ثبت‌نام موفقیت‌آمیز بود! اگر ایمیل تایید نیاز است، لطفا اینباکس خود را چک کنید.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'خطایی رخ داده است');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg px-4 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-dark-border overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none mb-4">
              <Activity size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CryptoTrackr</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm text-center">
              {isSignUp ? 'ایجاد حساب کاربری جدید' : 'ورود به حساب کاربری'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">ایمیل</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">رمز عبور</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'ثبت‌نام' : 'ورود'} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isSignUp ? 'حساب کاربری دارید؟' : 'حساب کاربری ندارید؟'}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-indigo-600 dark:text-indigo-400 font-bold ml-1 hover:underline outline-none"
              >
                {isSignUp ? 'وارد شوید' : 'ثبت‌نام کنید'}
              </button>
            </p>
          </div>
        </div>
        
        {/* Footer decoration */}
        <div className="bg-slate-50 dark:bg-dark-bg/50 border-t border-slate-100 dark:border-dark-border p-4 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-600 font-mono">Secured by Supabase Authentication</p>
        </div>
      </div>
    </div>
  );
};
