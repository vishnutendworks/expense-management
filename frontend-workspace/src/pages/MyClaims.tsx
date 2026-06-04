import React, { useState } from 'react';
import {
  Search, History, CheckCircle2, Clock, AlertCircle, XCircle,
  Undo2, FileEdit, Eye, TrendingUp, DollarSign, Loader2, Ban, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClaimDetailDrawer } from '../components/Claims/ClaimDetailDrawer';
import { useClaims } from '../context/ClaimsContext';
import { useNavigate } from 'react-router-dom';

// --- All status configurations (matches PRD spec) ---
const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; icon: any; label: string }> = {
  approved:     { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Approved' },
  submitted:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    icon: Clock,         label: 'Submitted' },
  under_review: { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  icon: Loader2,       label: 'Under Review' },
  pending:      { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: History,       label: 'Pending' },
  rejected:     { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    icon: XCircle,       label: 'Rejected' },
  draft:        { bg: 'bg-slate-100',  border: 'border-slate-200',   text: 'text-slate-600',   icon: FileEdit,      label: 'Draft' },
  sent_back:    { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  icon: Undo2,         label: 'Sent Back' },
  flagged:      { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  icon: AlertCircle,   label: 'Flagged' },
  paid:         { bg: 'bg-teal-50',    border: 'border-teal-200',    text: 'text-teal-700',    icon: CheckCircle2,  label: 'Paid' },
  fast_track:   { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: TrendingUp,    label: 'Fast Track' },
  escalated:    { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     icon: Ban,           label: 'Escalated' },
};

const FILTER_TABS = [
  { key: 'all',         label: 'All' },
  { key: 'draft',       label: 'Draft' },
  { key: 'submitted',   label: 'Submitted' },
  { key: 'under_review',label: 'Under Review' },
  { key: 'approved',    label: 'Approved' },
  { key: 'paid',        label: 'Paid' },
  { key: 'rejected',    label: 'Rejected' },
];

export const MyClaims: React.FC = () => {
  const navigate = useNavigate();
  const { claims, deleteClaim } = useClaims();

  const [searchQuery, setSearchQuery]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen]   = useState(false);

  // --- Derived stats ---
  const totalAmount   = claims.reduce((s, c) => s + parseFloat(c.totalAmount.replace(/[₹,]/g, '') || '0'), 0);
  const pendingCount  = claims.filter(c => ['submitted', 'under_review', 'pending'].includes(c.status)).length;
  const approvedCount = claims.filter(c => c.status === 'approved').length;
  const paidCount     = claims.filter(c => c.status === 'paid').length;

  // --- Filtered list ---
  const filteredClaims = claims.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchSearch = c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">My Expenses</h2>
          <p className="text-slate-500 mt-1 font-medium text-sm">Manage and track your expense submissions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Claims', value: claims.length.toString(),
            sub: 'all time', icon: FileEdit,
            bg: 'bg-slate-900', text: 'text-white', sub_text: 'text-slate-400'
          },
          {
            label: 'Pending Review', value: pendingCount.toString(),
            sub: 'awaiting approval', icon: Clock,
            bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-900', sub_text: 'text-amber-500'
          },
          {
            label: 'Approved', value: approvedCount.toString(),
            sub: 'this period', icon: CheckCircle2,
            bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-900', sub_text: 'text-emerald-500'
          },
          {
            label: 'Total Reimbursed', value: `₹${paidCount > 0 ? totalAmount.toLocaleString('en-IN') : '0'}`,
            sub: `${paidCount} paid claims`, icon: DollarSign,
            bg: 'bg-blue-50 border border-blue-200', text: 'text-blue-900', sub_text: 'text-blue-500'
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`${stat.bg} rounded-2xl p-5 flex items-start justify-between`}
          >
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${stat.sub_text}`}>{stat.label}</p>
              <p className={`text-2xl font-black mt-1 ${stat.text}`}>{stat.value}</p>
              <p className={`text-[11px] mt-1 font-medium ${stat.sub_text}`}>{stat.sub}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center opacity-20`}>
              <stat.icon size={22} className={stat.text} />
            </div>
          </motion.div>
        ))}
      </div>
      <div className="premium-card p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by title or claim ID…"
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#1E3A5F] transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status tab pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                filterStatus === tab.key
                  ? 'bg-[#1E3A5F] text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' && (
                <span className="ml-1.5 opacity-60">
                  {claims.filter(c => c.status === tab.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="premium-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Claim / ID</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            <AnimatePresence>
              {filteredClaims.map((claim, idx) => {
                const cfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                const isMultiline = claim.items.length > 1;

                return (
                  <motion.tr
                    key={claim.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => { setSelectedClaim(claim); setIsDrawerOpen(true); }}
                    className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-[#1E3A5F] transition-colors">{claim.title}</p>
                      <p className="text-[10px] text-slate-400 font-black mt-0.5 uppercase tracking-tight">{claim.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        isMultiline ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isMultiline ? 'Multiline' : 'Single'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-slate-500">{claim.items.length} item{claim.items.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-400">{claim.date}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">{claim.totalAmount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        <StatusIcon size={11} />
                        {cfg.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {claim.status === 'draft' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); navigate('/add-expense', { state: { draftClaim: claim } }); }}
                              className="p-2 text-[#1E3A5F] hover:bg-blue-50 rounded-xl transition-all"
                              title="Rewrite Draft"
                            >
                              <FileEdit size={17} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); deleteClaim(claim.id); }}
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Delete Draft"
                            >
                              <Trash2 size={17} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedClaim(claim); setIsDrawerOpen(true); }}
                          className="p-2 text-slate-400 hover:text-[#1E3A5F] hover:bg-slate-100 rounded-xl transition-all"
                        >
                          <Eye size={17} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {filteredClaims.length === 0 && (
          <div className="py-20 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <XCircle size={32} className="text-slate-300" />
            </div>
            <div>
              <h3 className="font-black text-slate-800">No claims found</h3>
              <p className="text-sm text-slate-400 mt-1">Try a different filter or submit a new expense.</p>
            </div>
          </div>
        )}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Showing {filteredClaims.length} of {claims.length} records
          </p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Total: ₹{totalAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>
      <ClaimDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        claim={selectedClaim}
      />
    </div>
  );
};
