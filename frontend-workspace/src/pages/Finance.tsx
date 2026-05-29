import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Search, 
  ExternalLink,
  Lock,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Check,
  Send,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClaims, type Claim, type PayoutBatch } from '../context/ClaimsContext';
import { ClaimDetailDrawer } from '../components/Claims/ClaimDetailDrawer';

export const Finance: React.FC = () => {
  const { 
    claims, 
    batches, 
    createPayoutBatch, 
    syncBatchToERP, 
    markBatchAsDisbursed, 
    updateClaimStatus,
    rejectClaimWithReason
  } = useClaims();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'approved' | 'flagged'>('approved');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Batch selection states
  const [selectedApprovedIds, setSelectedApprovedIds] = useState<string[]>([]);
  
  // Modal states
  const [syncingBatch, setSyncingBatch] = useState<PayoutBatch | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'transmitting' | 'success'>('idle');
  const [syncResponse, setSyncResponse] = useState<{ docNum: string; payload: any } | null>(null);

  // Fraud rejection comment modal state
  const [fraudActionModal, setFraudActionModal] = useState<{
    show: boolean;
    claimId?: string;
    commentText: string;
  }>({
    show: false,
    commentText: ''
  });

  // --- Filtering Logic ---
  const approvedClaims = claims.filter(claim => 
    claim.status === 'approved' &&
    (claim.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     claim.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const flaggedClaims = claims.filter(claim => 
    claim.status === 'flagged' &&
    (claim.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     claim.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // --- Handlers ---
  const handleOpenClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setIsDrawerOpen(true);
  };

  const handleToggleSelectApproved = (id: string) => {
    setSelectedApprovedIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSelectAllApproved = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedApprovedIds(approvedClaims.map(c => c.id));
    } else {
      setSelectedApprovedIds([]);
    }
  };

  const handleCreateBatch = () => {
    if (selectedApprovedIds.length === 0) return;
    const newBatchId = createPayoutBatch(selectedApprovedIds);
    // Automatically update claims inside this batch to "batched" by changing statuses to "paid" during markBatchAsDisbursed later, 
    // but for now, they are batched so we clear selected ids
    setSelectedApprovedIds([]);
    alert(`Created payout ledger batch ${newBatchId} containing ${selectedApprovedIds.length} claims.`);
  };

  // Sync to ERP simulation
  const handleSyncClick = (batch: PayoutBatch) => {
    setSyncingBatch(batch);
    setSyncStatus('idle');
    setSyncResponse(null);
  };

  const executeErpSync = async () => {
    if (!syncingBatch) return;
    setSyncStatus('transmitting');
    try {
      const response = await syncBatchToERP(syncingBatch.id);
      setSyncResponse(response);
      setSyncStatus('success');
    } catch (err) {
      alert('Sync failed.');
      setSyncStatus('idle');
    }
  };

  // Force approve flagged items
  const handleForceApproveFlagged = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Override AI warnings and approve this flagged claim for payment routing?')) {
      updateClaimStatus(id, 'approved');
    }
  };

  // Reject flagged items
  const openFraudRejectModal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFraudActionModal({
      show: true,
      claimId: id,
      commentText: ''
    });
  };

  const submitFraudRejection = (e: React.FormEvent) => {
    e.preventDefault();
    const { claimId, commentText } = fraudActionModal;
    if (claimId && commentText.trim()) {
      rejectClaimWithReason(claimId, `FRAUD REJECTION: ${commentText.trim()}`, 'David Miller');
      setFraudActionModal({ show: false, commentText: '' });
    }
  };

  // Calculate selected total
  const selectedApprovedTotal = claims
    .filter(c => selectedApprovedIds.includes(c.id))
    .reduce((sum, c) => sum + parseFloat(c.totalAmount.replace(/[₹,]/g, '')), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Finance Center</h2>
          <p className="text-slate-500 mt-2 font-medium">Verify AI reports, compile disbursement ledgers, and synchronize journal items to ERPs</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleCreateBatch}
            disabled={selectedApprovedIds.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black text-white transition-all shadow-lg uppercase tracking-widest ${
              selectedApprovedIds.length > 0 
                ? 'bg-black hover:bg-slate-800 shadow-black/10' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            [ Generate Payout Batch ]
            {selectedApprovedIds.length > 0 && ` (₹${selectedApprovedTotal.toLocaleString('en-IN')})`}
          </button>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatSmall label="Verified Approved" value={claims.filter(c => c.status === 'approved').length.toString()} color="emerald" icon={<CheckCircle2 size={16} />} />
        <StatSmall label="AI Flagged Queue" value={claims.filter(c => c.status === 'flagged').length.toString()} color="rose" icon={<AlertTriangle size={16} />} />
        <StatSmall label="Active Batches" value={batches.length.toString()} color="blue" icon={<Lock size={16} />} />
        <StatSmall label="Total Disbursements" value={`₹${batches.filter(b => b.status === 'Paid').reduce((sum, b) => sum + parseFloat(b.amount.replace(/[₹,]/g, '')), 0).toLocaleString('en-IN')}`} color="slate" icon={<CreditCard size={16} />} />
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('approved')}
          className={`pb-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'approved' 
              ? 'border-black text-slate-900' 
              : 'border-transparent text-slate-400 hover:text-slate-900'
          }`}
        >
          Approved Pool ({approvedClaims.length})
        </button>
        <button
          onClick={() => setActiveTab('flagged')}
          className={`pb-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'flagged' 
              ? 'border-rose-500 text-rose-700' 
              : 'border-transparent text-slate-400 hover:text-rose-600'
          }`}
        >
          <Cpu size={16} className={flaggedClaims.length > 0 ? 'animate-pulse text-rose-500' : ''} />
          Review AI-Flagged Claims ({flaggedClaims.length})
        </button>
      </div>

      {/* Main Data Queue */}
      <div className="premium-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-6 flex-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {activeTab === 'approved' ? 'Approved Ledger Queue' : 'AI Audited Exceptions Queue'}
            </h3>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search ledger items..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {activeTab === 'approved' ? (
          /* APPROVED QUEUE */
          <>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                  <th className="px-6 py-5 w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-black focus:ring-black h-4 w-4 cursor-pointer"
                      checked={approvedClaims.length > 0 && selectedApprovedIds.length === approvedClaims.length}
                      onChange={handleSelectAllApproved}
                    />
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Claim Details</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost Center</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Approval Date</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-50">
                {approvedClaims.map((claim) => (
                  <tr 
                    key={claim.id} 
                    onClick={() => handleOpenClaim(claim)}
                    className="hover:bg-slate-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedApprovedIds.includes(claim.id)}
                        onChange={() => handleToggleSelectApproved(claim.id)}
                        className="rounded border-slate-300 text-black focus:ring-black h-4 w-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-[10px]">
                          {claim.id.split('-')[1]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-black">{claim.title}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Marcus Richardson • {claim.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-bold text-slate-700">{claim.projectCode || 'GEN-CORP'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">HDFC BANK (XX4920)</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">{claim.totalAmount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase">{claim.date}</span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleOpenClaim(claim)}
                        className="p-2.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-xl transition-all"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {approvedClaims.length === 0 && (
              <div className="p-24 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 shadow-inner">
                  <CreditCard size={40} />
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900">Approved Pool is Empty</p>
                  <p className="text-sm text-slate-500 mt-1 font-medium">No approved claims are pending payout batches.</p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* AI-FLAGGED FRAUD QUEUE */
          <>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Claim Details</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Flagged Reasons</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trust Index</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Override Actions</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-50">
                {flaggedClaims.map((claim) => (
                  <tr 
                    key={claim.id} 
                    onClick={() => handleOpenClaim(claim)}
                    className="hover:bg-slate-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-[10px] shrink-0">
                          {claim.id.split('-')[1]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-black">{claim.title}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Marcus Richardson • {claim.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="space-y-1">
                        {claim.flaggedReasons?.map((reason, idx) => (
                          <p key={idx} className="text-[10px] text-rose-700 font-bold flex items-center gap-1.5 leading-relaxed">
                            <AlertTriangle size={12} className="shrink-0" />
                            {reason}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{claim.trustScore || 24}%</span>
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-rose-500 rounded-full" 
                            style={{ width: `${claim.trustScore || 24}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">{claim.totalAmount}</span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={(e) => handleForceApproveFlagged(e, claim.id)}
                          className="px-4 py-2 border border-emerald-150 text-emerald-700 hover:bg-emerald-50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Override & Approve
                        </button>
                        <button 
                          onClick={(e) => openFraudRejectModal(e, claim.id)}
                          className="px-4 py-2 border border-rose-150 text-rose-700 hover:bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {flaggedClaims.length === 0 && (
              <div className="p-24 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 shadow-inner">
                  <CheckCircle2 size={40} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900">Anomalies Queue Cleared!</p>
                  <p className="text-sm text-slate-500 mt-1 font-medium">AI Audit found no duplicate alerts or statement reconciliation mismatches.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payout Batches Ledger */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ledger: disbursement Payout batches</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <div 
              key={batch.id} 
              className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-slate-50 rounded-xl text-slate-500 group-hover:bg-black group-hover:text-white transition-all">
                  <FileSpreadsheet size={20} />
                </div>
                <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border tracking-wider ${
                  batch.status === 'Paid' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                    : batch.status === 'Synced'
                      ? 'bg-blue-50 border-blue-100 text-blue-700'
                      : 'bg-amber-50 border-amber-100 text-amber-700'
                }`}>
                  {batch.status}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-900 uppercase">{batch.id}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{batch.date} • {batch.count} Claims</p>
                {batch.erpDocNum && (
                  <p className="text-[10px] text-emerald-700 font-black uppercase mt-1">ERP Doc: {batch.erpDocNum}</p>
                )}
              </div>
              <div className="mt-5 pt-5 border-t border-slate-50 flex items-center justify-between">
                <p className="text-base font-black text-slate-900">{batch.amount}</p>
                
                {batch.status === 'Pending Sync' && (
                  <button 
                    onClick={() => handleSyncClick(batch)}
                    className="flex items-center gap-1 bg-black text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <RefreshCw size={10} className="animate-spin-slow" />
                    Sync to ERP
                  </button>
                )}

                {batch.status === 'Synced' && (
                  <button 
                    onClick={() => markBatchAsDisbursed(batch.id)}
                    className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all cursor-pointer"
                  >
                    <Check size={10} />
                    Mark Disbursed
                  </button>
                )}

                {batch.status === 'Paid' && (
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                    ✓ Cleared Payout
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ERP Sync Webhook Simulator Dialog */}
      <AnimatePresence>
        {syncingBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-xl w-full mx-4 shadow-2xl border border-slate-100 space-y-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-150">
                <div className="p-2.5 bg-black text-white rounded-xl">
                  <Send size={18} />
                </div>
                <div>
                  <h3 className="text-md font-black text-slate-900 uppercase tracking-wider">ERP Webhook Synchronization</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Target: Tally / SAP / Oracle GL Ledger API</p>
                </div>
              </div>

              {/* Webhook API JSON payload Display */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Outgoing API Request payload (JSON)</label>
                <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl text-[10px] font-mono leading-relaxed overflow-x-auto shadow-inner border border-slate-800">
                  <pre>{JSON.stringify({
                    webhook_endpoint: "https://api.erp.tendworks.com/v1/journal-entries",
                    batchId: syncingBatch.id,
                    totalValue: syncingBatch.amount,
                    currency: "INR",
                    compiledDate: new Date().toISOString(),
                    entries: claims
                      .filter(c => syncingBatch.claimIds.includes(c.id))
                      .map(c => ({
                        claimId: c.id,
                        title: c.title,
                        debit: parseFloat(c.totalAmount.replace(/[₹,]/g, '')),
                        costCenter: c.projectCode || 'CC-GENERAL'
                      }))
                  }, null, 2)}</pre>
                </div>
              </div>

              {/* Status display */}
              <div className="space-y-4">
                {syncStatus === 'idle' && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-650 font-bold leading-relaxed">
                    💡 This ledger will dispatch Cost Center debits, transaction metadata, and attachments references to target accounting interfaces. Ready to execute webhook transmission?
                  </div>
                )}

                {syncStatus === 'transmitting' && (
                  <div className="flex items-center justify-center gap-3 p-6 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl text-xs font-black uppercase tracking-wider">
                    <RefreshCw size={18} className="animate-spin" />
                    Transmitting ledger entries & waiting for ERP acknowledgment handshake...
                  </div>
                )}

                {syncStatus === 'success' && syncResponse && (
                  <div className="p-5 bg-emerald-50 border border-emerald-150 rounded-2xl space-y-3 animate-in zoom-in duration-300">
                    <div className="flex items-center gap-2 text-emerald-800 font-black">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                      <p className="uppercase tracking-widest text-xs">Sync Successful (HTTP 200 OK)</p>
                    </div>
                    <div className="text-[10px] text-slate-650 space-y-1 font-bold">
                      <p>✨ <span className="font-black text-slate-800">ERP System:</span> Oracle Ledger API</p>
                      <p>✨ <span className="font-black text-slate-800">ERP Doc Number:</span> {syncResponse.docNum}</p>
                      <p>✨ <span className="font-black text-slate-800">Status Code:</span> 200 SUCCESS ACKNOWLEDGEMENT</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setSyncingBatch(null)}
                  disabled={syncStatus === 'transmitting'}
                  className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Close
                </button>
                {syncStatus === 'idle' && (
                  <button 
                    onClick={executeErpSync}
                    className="flex-1 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                  >
                    Sync Webhook
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fraud Rejection comments Modal */}
      <AnimatePresence>
        {fraudActionModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">Fraud Claim Rejection</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                    Provide a mandatory audit reason to decline this claim. It will be sent back to the employee's timeline.
                  </p>
                </div>
              </div>

              <form onSubmit={submitFraudRejection} className="space-y-4">
                <textarea
                  required
                  rows={4}
                  value={fraudActionModal.commentText}
                  onChange={(e) => setFraudActionModal(prev => ({ ...prev, commentText: e.target.value }))}
                  placeholder="Enter audit rejection reason (mandatory)..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-black resize-none"
                />

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setFraudActionModal({ show: false, commentText: '' })}
                    className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-colors"
                  >
                    Reject Claim
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed Audit Drawer */}
      <ClaimDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        claim={selectedClaim} 
      />
    </div>
  );
};

// --- Subcomponents ---

const StatSmall = ({ label, value, color, icon }: any) => (
  <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
      color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
      color === 'rose' ? 'bg-rose-50 text-rose-600' :
      color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-slate-55 text-slate-500'
    }`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{value}</p>
    </div>
  </div>
);
