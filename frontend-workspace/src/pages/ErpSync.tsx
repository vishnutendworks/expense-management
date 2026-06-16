import React, { useState } from 'react';
import { 
  FileSpreadsheet,
  RefreshCw,
  Download,
  Check,
  Send,
  CheckCircle2,
  Search,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClaims, type PayoutBatch } from '../context/ClaimsContext';
import { useNavigate, Link } from 'react-router-dom';

export const ErpSync: React.FC = () => {
  const navigate = useNavigate();
  const { claims, batches, syncBatchToERP, markBatchAsDisbursed } = useClaims();
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingBatch, setSyncingBatch] = useState<PayoutBatch | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'transmitting' | 'success'>('idle');
  const [syncResponse, setSyncResponse] = useState<{ docNum: string; payload: any } | null>(null);

  const filteredBatches = batches.filter(batch => 
    batch.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleDownloadGLExport = (batch: PayoutBatch) => {
    const batchClaims = claims.filter(c => batch.claimIds.includes(c.id));
    const headers = ["GL_Account", "Cost_Center", "Employee", "Amount", "Currency", "Description", "Reference_ID"];
    const rows = batchClaims.map(c => [
      "610200_EXPENSE",
      c.projectCode || "GENERAL_CORP",
      "Marcus Richardson",
      c.totalAmount.replace(/[₹,]/g, ''),
      "INR",
      c.title,
      c.id
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `GL_EXPORT_${batch.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/reimbursements')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">ERP Synchronization</h2>
            <p className="text-slate-500 mt-1 font-medium text-sm">Synchronize disbursement ledgers to external accounting systems</p>
          </div>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search batches..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ERP Sub-Menu Navigation */}
      <div className="bg-white p-1 rounded-2xl border border-slate-100 flex gap-1 shadow-sm w-fit mb-4">
        <Link to="/reimbursements" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50">Reimbursement Ledger</Link>
        <Link to="/reimbursements/erpsync" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white">ERP Sync</Link>
      </div>

      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ledger: disbursement Payout batches</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredBatches.map((batch) => (
          <div key={batch.id} className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500 group-hover:bg-black group-hover:text-white transition-all">
                <FileSpreadsheet size={20} />
              </div>
              <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border tracking-wider ${
                batch.status === 'Paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                batch.status === 'Synced' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-amber-50 border-amber-100 text-amber-700'
              }`}>
                {batch.status}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-900 uppercase">{batch.id}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{batch.date} • {batch.count} Claims</p>
              {batch.erpDocNum && <p className="text-[10px] text-emerald-700 font-black uppercase mt-1">ERP Doc: {batch.erpDocNum}</p>}
            </div>
            <div className="mt-5 pt-5 border-t border-slate-50 flex items-center justify-between">
              <p className="text-base font-black text-slate-900">{batch.amount}</p>
              {batch.status === 'Pending Sync' && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleDownloadGLExport(batch)} className="p-2 text-slate-400 hover:text-black hover:bg-slate-100 rounded-xl transition-all" title="Download GL Export File">
                    <Download size={16} />
                  </button>
                  <button type="button" onClick={() => handleSyncClick(batch)} className="flex items-center gap-1 bg-black text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer">
                    <RefreshCw size={10} /> Sync to ERP
                  </button>
                </div>
              )}
              {batch.status === 'Synced' && (
                <button type="button" onClick={() => markBatchAsDisbursed(batch.id)} className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all cursor-pointer">
                  <Check size={10} /> Mark Disbursed
                </button>
              )}
              {batch.status === 'Paid' && <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">✓ Cleared Payout</span>}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {syncingBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-8 max-w-xl w-full mx-4 shadow-2xl border border-slate-100 space-y-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-150">
                <div className="p-2.5 bg-black text-white rounded-xl"><Send size={18} /></div>
                <div>
                  <h3 className="text-md font-black text-slate-900 uppercase tracking-wider">ERP Webhook Synchronization</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Target: Tally / SAP / Oracle GL Ledger API</p>
                </div>
              </div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Outgoing API Request payload (JSON)</label>
              <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl text-[10px] font-mono leading-relaxed overflow-x-auto shadow-inner border border-slate-800">
                <pre>{JSON.stringify({
                  webhook_endpoint: "https://api.erp.tendworks.com/v1/journal-entries",
                  header: {
                    batchId: syncingBatch.id,
                    totalValue: syncingBatch.amount,
                    currency: "INR",
                    compiledDate: new Date().toISOString(),
                  },
                  entries: claims
                    .filter(c => syncingBatch.claimIds.includes(c.id))
                    .map(c => ({
                      gl_account: "610200_GEN_EXP",
                      debit_amount: parseFloat((c.totalAmount || "0").replace(/[₹,]/g, '')),
                      costCenter: c.projectCode || 'CC-GENERAL'
                    }))
                }, null, 2)}</pre>
              </div>
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
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setSyncingBatch(null)} disabled={syncStatus === 'transmitting'} className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer">
                  Close
                </button>
                {syncStatus === 'idle' && (
                  <button type="button" onClick={executeErpSync} className="flex-1 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors cursor-pointer">
                    Sync Webhook
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {filteredBatches.length === 0 && (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <FileSpreadsheet size={40} className="text-slate-200" />
          <p className="font-black text-slate-400">No payout batches generated yet.</p>
        </div>
      )}
    </div>
  );
};