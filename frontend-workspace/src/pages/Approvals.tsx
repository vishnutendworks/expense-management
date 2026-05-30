import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Search,
  Brain,
  Sparkles,
  Undo2,
  TrendingUp,
  Cpu,
  CheckCircle
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { useClaims, type Claim } from '../context/ClaimsContext';
import { ClaimDetailDrawer } from '../components/Claims/ClaimDetailDrawer';

export const Approvals: React.FC = () => {
  const {
    claims,
    rejectClaimWithReason,
    requestClarification,
    updateClaimStatus,
  } = useClaims();

  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightedClaimId, setHighlightedClaimId] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState({
    show: false,
    type: 'reject' as 'reject' | 'clarify' | 'bulk_reject',
    claimId: undefined as string | undefined,
    reasonText: ''
  });

  const pendingClaims = claims.filter(
    claim =>
      (claim.status === 'submitted' || claim.status === 'pending') &&
      (claim.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Grouping claims
  const fastTrackClaims = pendingClaims.filter(c => c.isFastTrackEligible);
  const standardClaims = pendingClaims.filter(c => !c.isFastTrackEligible);

  const activeHintClaim =
    pendingClaims.find(c => c.id === highlightedClaimId) ||
    pendingClaims[0] ||
    null;

  const handleOpenClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setIsDrawerOpen(true);
  };

  const handleApproveSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    updateClaimStatus(id, 'approved');
  };

  const handleCheckboxToggle = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const openActionModal = (
    e: React.MouseEvent,
    type: 'reject' | 'clarify' | 'bulk_reject',
    claimId?: string
  ) => {
    e.stopPropagation();
    setActionModal({
      show: true,
      type,
      claimId,
      reasonText: ''
    });
  };

  const handleApproveBatch = () => {
    selectedIds.forEach(id => {
      updateClaimStatus(id, 'approved');
    });
    setSelectedIds([]);
  };

  const handleApproveAllFastTrack = () => {
    if (fastTrackClaims.length === 0) return;
    fastTrackClaims.forEach(c => {
      updateClaimStatus(c.id, 'approved');
    });
    alert(`Zero-Touch Handshake executed! Approved all ${fastTrackClaims.length} Pre-Verified claims.`);
  };

  const handleModalSubmit = () => {
    if ((actionModal.type === 'reject' || actionModal.type === 'bulk_reject') && (!actionModal.reasonText || actionModal.reasonText.trim().length < 20)) {
      alert('Error: Rejection requires a mandatory explanation of at least 20 characters.');
      return;
    }

    if (actionModal.claimId) {
      if (actionModal.type === 'reject') {
        rejectClaimWithReason(actionModal.claimId, actionModal.reasonText, 'Sarah Chen');
      } else if (actionModal.type === 'clarify') {
        requestClarification(actionModal.claimId, actionModal.reasonText, 'Sarah Chen');
      }
    } else if (actionModal.type === 'bulk_reject') {
      selectedIds.forEach(id => {
        rejectClaimWithReason(id, actionModal.reasonText, 'Sarah Chen');
      });
      setSelectedIds([]);
    }

    setActionModal({ show: false, type: 'reject', claimId: undefined, reasonText: '' });
  };

  // Get Trust score band description
  const getTrustBand = (score: number) => {
    if (score >= 80) return { label: 'High Trust', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    if (score >= 55) return { label: 'Moderate', bg: 'bg-blue-50 text-blue-700 border-blue-100' };
    if (score >= 40) return { label: 'Requires Review', bg: 'bg-amber-50 text-amber-700 border-amber-100' };
    return { label: 'Critical / Fraud risk', bg: 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse' };
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Approvals Queue</h2>
          <p className="text-slate-500 mt-2 font-medium">Verify spending anomalies, perform 1-click approvals, and audit pending claims</p>
        </div>

        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search claims by Title or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-black shadow-sm transition-all"
          />
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl flex justify-between items-center shadow-xl">
          <span className="text-xs font-black uppercase tracking-widest">{selectedIds.length} Claims Selected for Bulk Action</span>
          <div className="flex gap-3">
            <button
              onClick={handleApproveBatch}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 size={16} />
              Approve Selected
            </button>
            <button
              onClick={e => openActionModal(e, 'bulk_reject')}
              className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <XCircle size={16} />
              Reject Selected
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Inbox Queues */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* FAST-TRACK QUEUE BUCKET */}
          {fastTrackClaims.length > 0 && (
            <div className="bg-indigo-50/50 border-2 border-indigo-100 p-6 rounded-3xl space-y-5 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-200">
                    <Cpu size={20} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wider">AI Fast-Track Queue</h3>
                    <p className="text-[10px] text-indigo-550 font-bold uppercase mt-0.5">Pre-verified low-risk compliant claims</p>
                  </div>
                </div>
                <button
                  onClick={handleApproveAllFastTrack}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-750 shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  ✓ 1-Click Approve All ({fastTrackClaims.length})
                </button>
              </div>

              {/* Fast Track Claims list */}
              <div className="space-y-3">
                {fastTrackClaims.map(claim => (
                  <div
                    key={claim.id}
                    onClick={() => handleOpenClaim(claim)}
                    onMouseEnter={() => setHighlightedClaimId(claim.id)}
                    className="bg-white p-4 border border-indigo-100 rounded-2xl flex justify-between items-center hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px]">
                        FT
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-black">{claim.title}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{claim.id} • Trust score: {claim.trustScore || 85}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-indigo-950">{claim.totalAmount}</span>
                      <button
                        onClick={e => handleApproveSingle(e, claim.id)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        <CheckCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STANDARD CLAIMS LIST */}
          <div className="premium-card overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {standardClaims.length > 0 ? 'Standard Approvals Pool' : 'Standard Inbox Queue'}
              </h3>
              <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200">
                {standardClaims.length} Claims Pending
              </span>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-5 w-12"/>
                  <th className="px-6 py-5">Employee / Trust</th>
                  <th className="px-6 py-5">Claim Description</th>
                  <th className="px-6 py-5">Requested Amount</th>
                  <th className="px-6 py-5">Risk Category</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50 bg-white">
                {standardClaims.map(claim => {
                  const selected = selectedIds.includes(claim.id);
                  const trustMeta = getTrustBand(claim.trustScore || 82);

                  return (
                    <motion.tr
                      key={claim.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onMouseEnter={() => setHighlightedClaimId(claim.id)}
                      onClick={() => handleOpenClaim(claim)}
                      className={`cursor-pointer hover:bg-slate-50/30 transition-all group ${
                        highlightedClaimId === claim.id ? 'bg-slate-50/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4 w-12" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={e => handleCheckboxToggle(e, claim.id)}
                          className="rounded border-slate-350 text-black focus:ring-black h-4 w-4 cursor-pointer"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-none">Marcus Richardson</p>
                          <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1.5 ${trustMeta.bg}`}>
                            {trustMeta.label} ({claim.trustScore || 82}%)
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-black">{claim.title}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1">{claim.id} • {claim.date}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-slate-900">{claim.totalAmount}</span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          claim.riskCategory === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' :
                          claim.riskCategory === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {claim.riskCategory || 'low'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={e => handleApproveSingle(e, claim.id)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Approve claim"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={e => openActionModal(e, 'reject', claim.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Reject with mandatory reason"
                          >
                            <XCircle size={16} />
                          </button>
                          <button
                            onClick={e => openActionModal(e, 'clarify', claim.id)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Send Back / Dispute Thread"
                          >
                            <Undo2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}

                {standardClaims.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-350 shadow-inner">
                        <CheckCircle size={32} className="text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="text-md font-black text-slate-900">Standard Inbox is Clear</h4>
                        <p className="text-xs text-slate-550 mt-1 max-w-xs mx-auto font-medium">All pending standard claims have been verified or batched.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Smart Approval Hints Panel */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 border border-slate-800 rounded-3xl shadow-xl space-y-6 flex flex-col justify-between min-h-[500px]">
            <div className="space-y-6">
              <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-white/5">
                <Brain size={16} className="text-yellow-500 animate-pulse animate-bounce" />
                Smart Approval Hints
              </h4>

              {activeHintClaim ? (
                <div className="space-y-6">
                  {/* Claim snapshot details */}
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active claim context</p>
                    <p className="text-sm font-black text-white">{activeHintClaim.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{activeHintClaim.id} • {activeHintClaim.totalAmount}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Compliance Check */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Spending Compliance</span>
                      <span className={`px-2 py-0.5 rounded font-black uppercase text-[9px] ${
                        activeHintClaim.riskCategory === 'low' ? 'bg-emerald-500/20 text-emerald-300' :
                        activeHintClaim.riskCategory === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-rose-500/20 text-rose-300'
                      }`}>
                        {activeHintClaim.riskCategory === 'low' ? 'Fully Compliant' : 'Warning/Exceptions'}
                      </span>
                    </div>

                    {/* Trust Index */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Submitter Trust Band</span>
                      <span className="text-white font-black">{activeHintClaim.trustScore || 82}% Score</span>
                    </div>

                    {/* Bank statement match */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Bank Reconciliation</span>
                      <span className={`px-2 py-0.5 rounded font-black uppercase text-[9px] ${
                        activeHintClaim.bankStatementReconciled === 'Verified' ? 'bg-emerald-500/20 text-emerald-300' :
                        activeHintClaim.bankStatementReconciled === 'Mismatch' ? 'bg-rose-500/20 text-rose-300' :
                        'bg-slate-500/20 text-slate-300'
                      }`}>
                        {activeHintClaim.bankStatementReconciled || 'Unverified'}
                      </span>
                    </div>

                    {/* Anomaly parameters */}
                    {activeHintClaim.flaggedReasons && activeHintClaim.flaggedReasons.length > 0 && (
                      <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl space-y-1.5 animate-in zoom-in duration-200">
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">AI Flagged Signals:</p>
                        <ul className="text-[10px] text-slate-300 font-bold list-disc pl-4 space-y-1">
                          {activeHintClaim.flaggedReasons.map((reason: string, idx: number) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Plain Text AI recommendations */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                    <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles size={10} />
                      AI Recommendation
                    </p>
                    <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                      {activeHintClaim.isFastTrackEligible ? (
                        'Low risk and fully compliant with all category limits, accompanied by high-confidence OCR receipts and matching bank statements. Zero-Touch Fast-Track approval is recommended.'
                      ) : activeHintClaim.bankStatementReconciled === 'Mismatch' ? (
                        'High risk anomaly: Bank transaction ledger does not reconcile with user-entered invoice. Potential doctored data or incorrect manual claim. Review receipts closely or reject.'
                      ) : activeHintClaim.tamperingDetected ? (
                        'Critical risk alert: Synthesised file font inconsistencies or incorrect metadata check indicate OCR image tampering. Bypassing line manager and routing directly to Finance Audit.'
                      ) : activeHintClaim.riskCategory === 'high' ? (
                        'Exception triggered: Multiple spending exceptions or low submitter integrity score. Enhanced manual receipt checking recommended.'
                      ) : (
                        'Standard policy-compliant claim. All parameters are clean. Normal manager sign-off recommended.'
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 italic text-xs gap-3">
                  <Cpu size={32} className="text-slate-700 animate-pulse" />
                  No pending claims highlighted. Hover or highlight items to inspect Smart Hints.
                </div>
              )}
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
              <TrendingUp className="text-emerald-400" size={24} />
              <div>
                <h5 className="text-[10px] font-black uppercase text-white tracking-wider">Zero-Touch Fast-Track Enabled</h5>
                <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Manager Bulk approval bucket simplifies workflows.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Action modal for rejection reasons */}
      <AnimatePresence>
        {actionModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 sticky top-0 bg-white">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  {actionModal.type === 'reject' ? 'Reject Expense Claim' : actionModal.type === 'bulk_reject' ? 'Bulk Reject Claims' : 'Request Claim Clarification'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                  {actionModal.type === 'reject' 
                    ? 'Rejections require a mandatory detailed audit justification (minimum 20 characters).' 
                    : 'Provide instructions for the employee to correct their expense lines.'}
                </p>
              </div>

              <div className="p-6 bg-slate-50">
                <textarea
                  value={actionModal.reasonText}
                  onChange={e => setActionModal(prev => ({ ...prev, reasonText: e.target.value }))}
                  className="w-full min-h-[140px] p-4 bg-white border border-slate-200 rounded-2xl focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none text-xs font-semibold"
                  placeholder={actionModal.type === 'reject' ? "Provide dynamic rejection details (minimum 20 characters)..." : "Explain what information is missing..."}
                />
                
                {(actionModal.type === 'reject' || actionModal.type === 'bulk_reject') && (
                  <div className="mt-3 flex justify-between items-center text-[10px] font-black uppercase text-slate-400 px-1">
                    <span>Validation threshold:</span>
                    <span className={actionModal.reasonText.trim().length >= 20 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {actionModal.reasonText.trim().length} / 20 characters
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex gap-3 justify-end">
                <button
                  onClick={() => setActionModal(prev => ({ ...prev, show: false }))}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition-colors uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalSubmit}
                  disabled={(actionModal.type === 'reject' || actionModal.type === 'bulk_reject') && actionModal.reasonText.trim().length < 20}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black text-white transition-all uppercase tracking-widest flex items-center gap-2 cursor-pointer ${
                    (actionModal.type === 'reject' || actionModal.type === 'bulk_reject') && actionModal.reasonText.trim().length < 20
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                      : actionModal.type === 'clarify'
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/10'
                        : 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/10'
                  }`}
                >
                  {actionModal.type === 'clarify' ? <Undo2 size={16} /> : <XCircle size={16} />}
                  {actionModal.type === 'clarify' ? 'Request Info' : 'Reject Claim'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ClaimDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        claim={selectedClaim}
      />
    </div>
  );
};