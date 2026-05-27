import React from 'react';
import { useClaims } from '../context/ClaimsContext';
import { 
  Bell, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Notifications: React.FC = () => {
  const { notifications, clearNotifications } = useClaims();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'alert':
        return <AlertTriangle className="text-rose-500 animate-bounce" size={18} />;
      case 'warning':
        return <AlertTriangle className="text-amber-500" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50/50 border-emerald-100/50';
      case 'alert':
        return 'bg-rose-50/50 border-rose-100/50';
      case 'warning':
        return 'bg-amber-50/50 border-amber-100/50';
      default:
        return 'bg-blue-50/50 border-blue-100/50';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Audit Timeline Notifications</h2>
          <p className="text-slate-500 mt-2 font-medium">Timeline history of auto-approvals, audit flags, and ERP handshakes</p>
        </div>
        
        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="flex items-center gap-2 px-5 py-3 text-slate-600 bg-white border border-slate-200 rounded-xl text-xs font-black hover:text-black hover:border-black transition-all uppercase tracking-widest cursor-pointer"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

      {/* Notifications Queue */}
      <div className="premium-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Bell size={14} />
            Event Inbox
          </h3>
          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200">
            {notifications.length} Unread
          </span>
        </div>

        <div className="divide-y divide-slate-55 bg-white">
          <AnimatePresence initial={false}>
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`p-6 border-l-4 flex gap-4 transition-all ${getBgColor(notif.type)} ${
                    notif.type === 'success' ? 'border-l-emerald-500' :
                    notif.type === 'alert' ? 'border-l-rose-500' :
                    notif.type === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500'
                  }`}
                >
                  <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100/50 shrink-0 self-start">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{notif.date}</span>
                    </div>
                    <p className="text-xs text-slate-550 leading-relaxed font-semibold">{notif.message}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              /* EMPTY STATE */
              <div className="p-24 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 shadow-inner">
                  <Inbox size={40} className="text-slate-350" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">Your Inbox is Clear</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto font-medium">Timeline alerts will pop up here when claims change statuses, trigger policy warnings, or get batched.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
    </div>
  );
};
