import React from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: number;
  trendType: 'up' | 'down';
  subtitle?: string;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendType,
  subtitle,
  color = "black"
}) => {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="premium-card p-6 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl bg-slate-50 text-${color}`}>
          <Icon size={24} />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${trendType === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trendType === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trend}%
        </div>
      </div>
      
      <div className="mt-6">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
          {subtitle && <span className="text-xs text-slate-400 font-medium">{subtitle}</span>}
        </div>
      </div>
    </motion.div>
  );
};
