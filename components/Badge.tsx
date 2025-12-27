
import React from 'react';
import { Network, Status } from '../types';

export const NetworkBadge: React.FC<{ network: Network }> = ({ network }) => {
  const colors: Record<string, string> = {
    [Network.SOLANA]: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
    [Network.ETHEREUM]: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    [Network.BASE]: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    [Network.BSC]: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
    [Network.OTHER]: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[network] || colors[Network.OTHER]}`}>
      {network}
    </span>
  );
};

export const StatusBadge: React.FC<{ status?: Status }> = ({ status }) => {
  if (!status) return null;
  const colors = {
    [Status.GOOD]: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    [Status.EXCELLENT]: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm shadow-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800 dark:shadow-none',
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colors[status]}`}>
      {status}
    </span>
  );
};
