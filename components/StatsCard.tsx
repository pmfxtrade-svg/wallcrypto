
import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, trend, trendUp, icon }) => {
  return (
    <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-slate-200 dark:border-dark-border transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-dark-muted">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{value}</h3>
        </div>
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
          {icon || <Activity size={20} />}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`flex items-center text-sm font-medium ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {trendUp ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
            {trend}
          </span>
          <span className="text-sm text-slate-400 dark:text-slate-500 ml-2">vs last week</span>
        </div>
      )}
    </div>
  );
};
