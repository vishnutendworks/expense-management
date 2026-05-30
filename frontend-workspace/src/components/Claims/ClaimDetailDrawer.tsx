import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Undo2, 
  History, 
  FileText, 
  Download, 
  ExternalLink,
  Calendar,
  Paperclip,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClaims } from '../../context/ClaimsContext';

// --- Types & Props ---

interface ClaimDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  claim: any;
}



export const ClaimDetailDrawer: React.FC<ClaimDetailDrawerProps> = ({ isOpen, onClose, claim }) => {
  const { addComment, resubmitClaim, currentRole } = useClaims();
  
  // Interaction State
  const [commentText, setCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');

  if (!claim) return null;

  const roleMeta = {
    employee: { name: 'Marcus Richardson', label: 'Employee Submitter' },
    manager: { name: 'Sarah Chen', label: 'Reporting Manager' },
    finance: { name: 'David Miller', label: 'Financial Controller' },
    admin: { name: 'Alex Sobel', label: 'System Admin' },
  };

  const startEditMode = () => {
    setEditTitle(claim.title);
    setEditAmount(claim.totalAmount);
    setIsEditing(true);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    const meta = roleMeta[currentRole] || roleMeta.employee;
    addComment(claim.id, meta.name, meta.label, commentText.trim());
    setCommentText('');
  };

  const handleResubmit = () => {
    resubmitClaim(claim.id, {
      title: editTitle,
      totalAmount: editAmount,
      flaggedReasons: undefined,
      hasBankStatementMismatch: false
    });
    setIsEditing(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          />

          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-4">
                <button 
                  onClick={onClose}
                  className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                  <X size={20} />
                </button>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{claim.title}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{claim.id}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="p-3 text-slate-500 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 shadow-sm">
                  <Download size={18} />
                </button>
                {(claim.status === 'rejected' || claim.status === 'sent_back') && !isEditing && (
                  <button 
                    onClick={startEditMode}
                    className="bg-black text-white px-6 py-3 rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-xl shadow-black/10 uppercase tracking-widest"
                  >
                    Resubmit Claim
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 p-8 space-y-12">
              {isEditing ? (
                /* RESUBMIT EDIT FORM */
                <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                    <Undo2 className="text-black animate-bounce" size={20} />
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Resubmit Corrections</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Corrected Title</label>
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-250 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Corrected Total Amount</label>
                      <input 
                        type="text" 
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-250 rounded-xl text-sm font-bold focus:outline-none focus:border-black"
                      />
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-[11px] text-amber-800 font-bold leading-relaxed">
                      💡 Resubmitting this claim will clear any active validation flags and route the updated claim back into the manager review cycle (Path B).
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleResubmit}
                        className="flex-1 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-850"
                      >
                        Submit Correction
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-6">
                    <SummaryCard label="Requested Total" value={claim.totalAmount} />
                    <SummaryCard 
                      label="Current Status" 
                      value={
                        <div className="flex items-center gap-2">
                          <StatusIcon status={claim.status} />
                          <span className={statusColor(claim.status)}>{claim.status.replace('_', ' ')}</span>
                        </div>
                      } 
                    />
                    <SummaryCard label="Submission Date" value={claim.date} />
                  </div>

                  {/* Smart Approval Hints inside Drawer */}
                  {(currentRole === 'manager' || currentRole === 'finance') && (
                    <div className="p-5 bg-slate-900 text-white rounded-3xl space-y-4 shadow-lg border border-slate-800">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Sparkles size={16} className="text-yellow-500 animate-bounce" />
                        <h4 className="text-xs font-black uppercase tracking-wider">Smart Approval Hint</h4>
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed font-semibold">
                        <p className="mb-2">💰 <span className="text-white">Trust score snapshot:</span> {claim.trustScore || 82}% Band</p>
                        <p className="mb-2">🔍 <span className="text-white">Reconciliation:</span> {claim.bankStatementReconciled === 'Verified' ? 'Verified by Bank Statement' : claim.bankStatementReconciled === 'Mismatch' ? 'Statement Mismatch Alert!' : 'Unverified - No Bank Statement'}</p>
                        <p>💡 <span className="text-white">Suggested Action:</span> {
                          claim.isFastTrackEligible 
                            ? "Low risk, fully compliant, Verified by Bank Statement — Fast-Track approval recommended" 
                            : claim.bankStatementReconciled === 'Mismatch'
                              ? "High risk anomaly: Bank transaction ledger does not reconcile with user-entered invoice. Manual review or rejection required."
                              : claim.tamperingDetected
                                ? "Critical Risk: Image font/metadata check indicates potential OCR tampering! Escalated to Finance Audit."
                                : "Compliant standard claim — normal approval recommended."
                        }</p>
                      </div>
                    </div>
                  )}

                  {claim.flaggedReasons && claim.flaggedReasons.length > 0 && (
                    <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-rose-700">
                        <AlertTriangle size={18} />
                        <h4 className="text-xs font-black uppercase tracking-wider">AI Audit Flags & Anomalies</h4>
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-900 font-bold">
                        {claim.flaggedReasons.map((reason: string, idx: number) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-6">
                    <SectionHeader icon={FileText} label="Line Item Breakdown" count={claim.items?.length || 2} />
                    <div className="space-y-4">
                      {claim.items && claim.items.length > 0 ? (
                        claim.items.map((item: any, idx: number) => (
                          <ItemRow key={idx} {...item} />
                        ))
                      ) : (
                        <>
                          <ItemRow date={claim.startDate || "Oct 12, 2024"} category={claim.category || "Travel"} desc={claim.title} amount={claim.totalAmount} tax="₹1,530.00" />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <SectionHeader icon={Paperclip} label="Evidence & Receipts" />
                    <div className="grid grid-cols-2 gap-4">
                      {claim.receiptUploaded && <ReceiptCard name="indigo_boarding_pass.pdf" size="1.2 MB" />}
                      {claim.bankStatementUploaded && <ReceiptCard name="bank_statement_extract.pdf" size="740 KB" />}
                      {!claim.receiptUploaded && !claim.bankStatementUploaded && (
                        <p className="text-xs font-bold text-slate-400 italic col-span-2">No evidence documents uploaded.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <SectionHeader icon={History} label="Timeline & Dispute Thread" />
                    
                    {(claim.status === 'rejected' || claim.status === 'sent_back') && (
                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-[11px] text-indigo-900 font-bold leading-relaxed animate-pulse">
                        ⚠️ Dispute Thread is active. Employees and Managers can leave timestamped, immutable comments here to clarify limits or coordinate corrections.
                      </div>
                    )}

                    <div className="relative space-y-10 pl-5 border-l-2 border-slate-100 ml-2.5">
                      {/* Submitter's original action */}
                      <TimelineStep 
                        name="Marcus Richardson" 
                        role="Initiator" 
                        action="Claim Submitted" 
                        date={claim.date}
                        status="completed"
                      />

                      {claim.comments && claim.comments.map((comment: any) => (
                        <TimelineStep 
                          key={comment.id}
                          name={comment.author}
                          role={comment.role}
                          action={comment.text.startsWith('REJECTION JUSTIFICATION') ? 'Claim Rejected' : comment.text.startsWith('CLARIFICATION REQUEST') ? 'Clarification Requested' : 'Dispute Comment Added'}
                          date={comment.date}
                          status={comment.text.startsWith('REJECTION JUSTIFICATION') ? 'rejected' : comment.text.startsWith('CLARIFICATION REQUEST') ? 'pending' : 'comment'}
                          comment={comment.text}
                        />
                      ))}

                      {claim.status === 'submitted' && (
                        <TimelineStep 
                          name="Sarah Chen" 
                          role="Reporting Manager" 
                          action="Pending Review" 
                          status="pending"
                        />
                      )}
                    </div>

                    <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-100 space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MessageSquare size={12} />
                        Add Dispute Note / Reply
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          placeholder={claim.status === 'rejected' ? "Explain corrections, justify policy exception, or reply to manager's rejection reason..." : "Add contextual information for audit review..."}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          rows={2}
                          className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black resize-none"
                        />
                        <button
                          type="submit"
                          className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all self-end shrink-0"
                        >
                          [ Reply ]
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 bg-white border border-slate-200 text-slate-700 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
              >
                Close Panel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};


const SummaryCard = ({ label, value }: { label: string, value: React.ReactNode }) => (
  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <div className="text-sm font-black text-slate-900 mt-2 truncate">{value}</div>
  </div>
);

const SectionHeader = ({ icon: Icon, label, count }: { icon: any, label: string, count?: number }) => (
  <div className="flex items-center justify-between">
    <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2.5">
      <div className="p-1.5 bg-slate-900 text-white rounded-lg shadow-sm">
        <Icon size={14} />
      </div>
      {label}
    </h4>
    {count !== undefined && (
      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200">
        {count} Records
      </span>
    )}
  </div>
);

const ItemRow = ({ date, category, desc, amount, tax }: any) => (
  <div className="p-5 bg-white border border-slate-100 rounded-2xl hover:border-black/10 transition-all group shadow-sm hover:shadow-md">
    <div className="flex justify-between items-start">
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-black group-hover:text-white transition-all shadow-inner">
          <Calendar size={20} />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-slate-900 group-hover:text-black transition-colors">{desc}</p>
            <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-widest border border-slate-200">{category}</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-tighter">{date}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-slate-900">{amount}</p>
        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tight">GST {tax}</p>
      </div>
    </div>
  </div>
);

const ReceiptCard = ({ name, size }: any) => (
  <div className="flex items-center justify-between p-5 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:border-slate-200 transition-all cursor-pointer group shadow-sm">
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-white rounded-xl text-slate-400 group-hover:text-black shadow-sm transition-all border border-slate-100">
        <ExternalLink size={18} />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{name}</p>
        <p className="text-[10px] text-slate-500 font-medium">{size}</p>
      </div>
    </div>
    <ChevronRight size={16} className="text-slate-300 group-hover:text-black transition-colors" />
  </div>
);

const TimelineStep = ({ name, role, action, date, status, comment }: any) => (
  <div className="relative">
    <div className={`absolute -left-[30px] top-1 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
      status === 'completed' ? 'border-emerald-500 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 
      status === 'pending' ? 'border-blue-500 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 
      status === 'comment' ? 'border-amber-500 bg-amber-500' : 'border-slate-200 bg-slate-50'
    }`}>
      {(status === 'completed' || status === 'comment') && <CheckCircle2 size={12} className="text-white" />}
    </div>

    {/* Content */}
    <div className="flex justify-between items-start">
      <div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-slate-900">{name}</p>
          <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-widest border border-slate-200">{role}</span>
        </div>
        <p className={`text-xs mt-1.5 uppercase tracking-wide font-black ${
          status === 'completed' ? 'text-emerald-650 font-bold' : 
          status === 'pending' ? 'text-blue-650 font-bold animate-pulse' : 
          'text-amber-600 font-bold'
        }`}>
          {action}
        </p>
        {comment && (
          <div className="mt-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-inner italic">
            <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">"{comment}"</p>
          </div>
        )}
      </div>
      {date && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{date}</p>}
    </div>
  </div>
);

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'approved' || status === 'paid') return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (status === 'submitted') return <Clock size={16} className="text-blue-600" />;
  if (status === 'rejected' || status === 'flagged') return <XCircle size={16} className="text-rose-600" />;
  return <History size={16} className="text-amber-600" />;
};

const statusColor = (status: string) => {
  if (status === 'approved' || status === 'paid') return 'text-emerald-600 font-black uppercase tracking-widest';
  if (status === 'submitted') return 'text-blue-600 font-black uppercase tracking-widest';
  if (status === 'rejected' || status === 'flagged') return 'text-rose-600 font-black uppercase tracking-widest';
  return 'text-amber-600 font-black uppercase tracking-widest';
};
