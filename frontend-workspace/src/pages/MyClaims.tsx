import React, { useState } from 'react';
import { Search, History, CheckCircle2, Clock, AlertCircle, XCircle, Undo2, FileEdit, Eye, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { ClaimDetailDrawer } from '../components/Claims/ClaimDetailDrawer';
import { useClaims } from '../context/ClaimsContext';
import { useNavigate } from 'react-router-dom';

// --- UI Configuration: Visual Style for Statuses ---
// Centralizing status styles makes it easy to update the branding across the app
const STATUS_CONFIG = {
  approved: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', icon: CheckCircle2, label: 'Approved' },
  submitted: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', icon: Clock, label: 'Submitted' },
  pending: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', icon: History, label: 'Pending' },
  rejected: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', icon: XCircle, label: 'Rejected' },
  draft: { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-600', icon: FileEdit, label: 'Draft' },
  sent_back: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', icon: Undo2, label: 'Sent Back' },
  flagged: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', icon: AlertCircle, label: 'Flagged' },
  paid: { bg: 'bg-teal-50', border: 'border-teal-150', text: 'text-teal-700', icon: CheckCircle2, label: 'Paid' },
};

// --- Employee Claims Module ---

export const MyClaims: React.FC = () => {
  const navigate = useNavigate();
  const { claims } = useClaims();
  
  // Interaction State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // --- Search & Filter Logic ---
  const filteredClaims = claims.filter(claim => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = claim.title.toLowerCase().includes(query) || 
                          claim.id.toLowerCase().includes(query);
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // --- Handlers ---

  const handleOpenClaim = (claim: any) => {
    setSelectedClaim(claim);
    setIsDrawerOpen(true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      
      {/* Page Header & Primary Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">My Claims</h2>
          <p className="text-slate-500 mt-2 font-medium">Manage and track your expense submissions</p>
        </div>
            <button 
              onClick={() => navigate('/new-claim')}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-xl shadow-black/10 uppercase tracking-widest"
            >
              [ + New Expense ]
            </button>
      </div>

      {/* Control Center - Filters & Search */}
      <div className="flex items-center justify-between bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-6 flex-1 max-w-2xl">
          
          {/* Main Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by ID or Title..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-black transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Quick-Switch */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto">
            {['all', 'submitted', 'approved', 'rejected', 'flagged', 'paid'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shrink-0 ${
                  filterStatus === status 
                    ? 'bg-black text-white shadow-md shadow-black/10' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        
      </div>

      {/* Main Table Content */}
      <div className="premium-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Claim / ID</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-50">
            {filteredClaims.map((claim) => {
              const config = STATUS_CONFIG[claim.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const StatusIcon = config.icon;

              return (
                <motion.tr 
                  key={claim.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleOpenClaim(claim)}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-5">
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-black">{claim.title}</p>
                      <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-tight">{claim.id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-slate-600">{claim.category}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-slate-400 uppercase">{claim.date}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-black text-slate-900">{claim.totalAmount}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${config.bg} ${config.text} ${config.border}`}>
                      <StatusIcon size={12} />
                      {config.label}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-xl transition-all">
                        <Eye size={18} />
                      </button>
                      <button className="p-2.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-xl transition-all">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State Handler */}
        {filteredClaims.length === 0 && (
          <div className="p-24 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 shadow-inner">
              <XCircle size={40} className="text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">No results match your criteria</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto font-medium">
                Try adjusting your search query or filters to find what you're looking for.
              </p>
            </div>
            <button 
              onClick={handleClearFilters}
              className="mt-6 px-8 py-3 bg-black text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-xl shadow-black/10 uppercase tracking-widest"
            >
              Reset Search & Filters
            </button>
          </div>
        )}

        {/* Dynamic Footer with Stats */}
        <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Showing {filteredClaims.length} records out of {claims.length}
          </p>
          <div className="flex items-center gap-4">
            <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-black transition-colors disabled:opacity-30" disabled>Previous</button>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-lg bg-black text-white text-xs font-black shadow-lg shadow-black/20">1</button>
              <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50">2</button>
            </div>
            <button className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-black transition-colors">Next</button>
          </div>
        </div>
      </div>

      {/* Side Drawer for Details */}
      <ClaimDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        claim={selectedClaim} 
      />
    </div>
  );
};
