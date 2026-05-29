import React, { createContext, useContext, useState, useEffect } from 'react';


export interface ExpenseItem {
  id: number;
  expense_date: string;
  merchant_name: string;
  category: string;
  amount: string;
  currency_code: string;
  payment_mode: string;
  project_cost_centre: string;
  description: string;
  receipt_file?: string;
  ocrConfirmed?: boolean;
  ocrValue?: string;
}

export interface Claim {
  id: string;
  title: string;
  category: string;
  projectCode: string;
  startDate: string;
  endDate: string;
  totalAmount: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending' | 'sent_back' | 'flagged' | 'paid' | 'under_review' | 'fast_track' | 'manager_review' | 'escalated';
  date: string;
  items: ExpenseItem[];
  trustScore?: number;
  riskCategory?: 'low' | 'medium' | 'high';
  flaggedReasons?: string[];
  receiptUploaded?: boolean;
  bankStatementUploaded?: boolean;
  hasBankStatementMismatch?: boolean;
  comments?: { id: string; author: string; role: string; text: string; date: string }[];
  outsideHours?: boolean;
  isFastTrackEligible?: boolean;
  isFastTrackApproved?: boolean;
  ocrConfidence?: number;
  tamperingDetected?: boolean;
  bankStatementReconciled?: 'Verified' | 'Unverified' | 'Mismatch';
  anomalyFlagsCount?: number;
}

export interface Policy {
  category: string;
  limit: number;
  mandatoryAttachment: boolean;
  backdateLimitDays: number;
}

export interface PayoutBatch {
  id: string;
  date: string;
  amount: string;
  count: number;
  status: 'Pending Sync' | 'Synced' | 'Paid';
  claimIds: string[];
  erpDocNum?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  date: string;
  read: boolean;
}

interface ClaimsContextType {
  claims: Claim[];
  policies: Policy[];
  batches: PayoutBatch[];
  notifications: AppNotification[];
  currentRole: 'employee' | 'manager' | 'finance' | 'admin';
  userTrustScore: number;
  setRole: (role: 'employee' | 'manager' | 'finance' | 'admin') => void;
  addClaim: (claim: Claim) => void;
  updateClaimStatus: (id: string, status: Claim['status']) => void;
  addComment: (claimId: string, author: string, role: string, text: string) => void;
  deleteClaim: (id: string) => void;
  resubmitClaim: (id: string, updatedClaim: Partial<Claim>) => void;
  rejectClaimWithReason: (id: string, reason: string, author: string) => void;
  requestClarification: (id: string, reason: string, author: string) => void;
  createPayoutBatch: (claimIds: string[]) => string;
  syncBatchToERP: (batchId: string) => Promise<{ success: boolean; docNum: string; payload: any }>;
  markBatchAsDisbursed: (batchId: string) => void;
  updatePolicy: (category: string, updatedFields: Partial<Policy>) => void;
  addNotification: (title: string, message: string, type: AppNotification['type']) => void;
  clearNotifications: () => void;
  adjustUserTrustScore: (event: string, detail?: string) => void;
  resetUserTrustScore: () => void;
}

const ClaimsContext = createContext<ClaimsContextType | undefined>(undefined);

const DEFAULT_POLICIES: Policy[] = [
  { category: 'Local Travel', limit: 50000, mandatoryAttachment: true, backdateLimitDays: 30 },
  { category: 'Meals & Entertainment', limit: 1500, mandatoryAttachment: true, backdateLimitDays: 30 },
  { category: 'Flights', limit: 75000, mandatoryAttachment: true, backdateLimitDays: 30 },
  { category: 'Lodging', limit: 10000, mandatoryAttachment: true, backdateLimitDays: 45 },
  { category: 'Office Supplies', limit: 5000, mandatoryAttachment: false, backdateLimitDays: 30 },
  { category: 'Fuel', limit: 8000, mandatoryAttachment: false, backdateLimitDays: 30 },
  { category: 'Other', limit: 2000, mandatoryAttachment: false, backdateLimitDays: 30 },
];

export const ClaimsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setRole] = useState<'employee' | 'manager' | 'finance' | 'admin'>('employee');
  
  const [userTrustScore, setUserTrustScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tendworks_trust_score');
      return saved ? parseInt(saved, 10) : 100;
    } catch {
      return 100;
    }
  });

  const [claims, setClaims] = useState<Claim[]>(() => {
    try {
      const saved = localStorage.getItem('tendworks_claims');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [policies, setPolicies] = useState<Policy[]>(() => {
    try {
      const saved = localStorage.getItem('tendworks_policies');
      return saved ? JSON.parse(saved) : DEFAULT_POLICIES;
    } catch {
      return DEFAULT_POLICIES;
    }
  });

  const [batches, setBatches] = useState<PayoutBatch[]>(() => {
    try {
      const saved = localStorage.getItem('tendworks_batches');
      return saved ? JSON.parse(saved) : [
        { id: 'BCH-2024-07', date: '10 Oct, 2024', amount: '₹2,45,600', count: 12, status: 'Paid', claimIds: [] },
        { id: 'BCH-2024-06', date: '25 Sep, 2024', amount: '₹1,89,200', count: 8, status: 'Paid', claimIds: [] }
      ];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    localStorage.setItem('tendworks_claims', JSON.stringify(claims));
  }, [claims]);

  useEffect(() => {
    localStorage.setItem('tendworks_policies', JSON.stringify(policies));
  }, [policies]);

  useEffect(() => {
    localStorage.setItem('tendworks_batches', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('tendworks_trust_score', userTrustScore.toString());
  }, [userTrustScore]);

  const addNotification = (title: string, message: string, type: AppNotification['type']) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(),
      title,
      message,
      type,
      date: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const adjustUserTrustScore = (event: string, detail?: string) => {
    let delta = 0;
    switch (event) {
      case 'COMPLIANT_CLAIM_APPROVED':   delta = 2;   break;
      case 'OCR_HIGH_CONFIDENCE':        delta = 1;   break;
      case 'STATEMENT_RECON_VERIFIED':   delta = 3;   break;
      case 'DUPLICATE_CLAIM_CONFIRMED':  delta = -10; break;
      case 'ANOMALY_WATCH':              delta = -5;  break;
      case 'ANOMALY_HIGH':               delta = -15; break;
      case 'STATEMENT_RECON_MISMATCH':   delta = -20; break;
      case 'OCR_TAMPERING':              delta = -30; break;
      case 'SUBMIT_OUTSIDE_HOURS':       delta = -3;  break;
      case 'POLICY_FINANCE_OVERRIDE':    delta = -8;  break;
      case 'DISPUTE_FAVORABLE_RESOLVED': delta = 5;   break;
      case 'REJECT_POLICY_VIOLATION':    delta = -5;  break;
      default: break;
    }
    if (delta !== 0) {
      setUserTrustScore(prev => Math.max(0, Math.min(100, prev + delta)));
    }
  };

  const resetUserTrustScore = () => {
    setUserTrustScore(80);
    addNotification('Trust Score Reset', 'Employee trust score reset to baseline (80%) upon dispute resolution.', 'info');
  };

  const addClaim = (claim: Claim) => {
    setClaims(prev => [claim, ...prev]);
    addNotification('New Claim Submitted', `Claim ${claim.id} containing ${claim.items.length} items was submitted.`, 'info');
    if (claim.outsideHours) {
      adjustUserTrustScore('SUBMIT_OUTSIDE_HOURS');
    }
    if (claim.hasBankStatementMismatch) {
      adjustUserTrustScore('STATEMENT_RECON_MISMATCH');
    } else if (claim.bankStatementUploaded) {
      adjustUserTrustScore('STATEMENT_RECON_VERIFIED');
    }
    if (claim.receiptUploaded && claim.items.some(item => item.ocrConfirmed)) {
      adjustUserTrustScore('OCR_HIGH_CONFIDENCE', claim.id);
    }
    if (claim.riskCategory === 'high') {
      adjustUserTrustScore('ANOMALY_HIGH', 'High risk indicators detected');
    } else if (claim.riskCategory === 'medium') {
      adjustUserTrustScore('ANOMALY_WATCH', 'Watch level risk indicators detected');
    }
  };

  const updateClaimStatus = (id: string, status: Claim['status']) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    addNotification('Status Updated', `Claim ${id} status changed to ${status.toUpperCase()}.`, status === 'approved' || status === 'paid' ? 'success' : status === 'flagged' || status === 'rejected' ? 'alert' : 'info');

    if (status === 'approved' || status === 'paid') {
      const claim = claims.find(c => c.id === id);
      if (claim && (!claim.flaggedReasons || claim.flaggedReasons.length === 0)) {
        adjustUserTrustScore('COMPLIANT_CLAIM_APPROVED');
      }
    }
  };

  const addComment = (claimId: string, author: string, role: string, text: string) => {
    setClaims(prev => prev.map(c => {
      if (c.id === claimId) {
        const existingComments = c.comments || [];
        const newComment = {
          id: Math.random().toString(),
          author,
          role,
          text,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        if (role.toLowerCase().includes('finance') && text.toUpperCase().includes('DISPUTE RESOLVED')) {
          adjustUserTrustScore('DISPUTE_FAVORABLE_RESOLVED');
        }

        return { ...c, comments: [...existingComments, newComment] };
      }
      return c;
    }));
  };

  const deleteClaim = (id: string) => {
    if (window.confirm('Are you sure you want to delete this claim?')) {
      setClaims(prev => prev.filter(c => c.id !== id));
      addNotification('Claim Deleted', `Claim ${id} has been removed.`, 'warning');
    }
  };

  const resubmitClaim = (id: string, updatedClaim: Partial<Claim>) => {
    setClaims(prev => prev.map(c => {
      if (c.id === id) {
        const resetComments = c.comments || [];
        const resubmitMsg = {
          id: Math.random().toString(),
          author: updatedClaim.title ? 'System' : 'Employee',
          role: 'Submissions',
          text: 'Claim resubmitted with corrected entries.',
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        return {
          ...c,
          ...updatedClaim,
          status: 'submitted',
          comments: [...resetComments, resubmitMsg],
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        };
      }
      return c;
    }));
    addNotification('Claim Resubmitted', `Claim ${id} has been reinjected into approval cycle.`, 'info');
  };

  const rejectClaimWithReason = (id: string, reason: string, author: string) => {
    if (!reason || reason.trim().length < 20) {
      alert('Error: Rejection requires a mandatory reason of at least 20 characters.');
      return;
    }

    setClaims(prev => prev.map(c => {
      if (c.id === id) {
        const currentComments = c.comments || [];
        const newComment = {
          id: Math.random().toString(),
          author,
          role: 'Approver',
          text: `REJECTION JUSTIFICATION: ${reason}`,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        return {
          ...c,
          status: 'rejected',
          comments: [...currentComments, newComment]
        };
      }
      return c;
    }));
    adjustUserTrustScore('REJECT_POLICY_VIOLATION');
    addNotification('Claim Rejected', `Claim ${id} was rejected. Reason: ${reason}`, 'alert');
  };

  const requestClarification = (id: string, reason: string, author: string) => {
    setClaims(prev => prev.map(c => {
      if (c.id === id) {
        const currentComments = c.comments || [];
        const newComment = {
          id: Math.random().toString(),
          author,
          role: 'Approver',
          text: `CLARIFICATION REQUEST: ${reason}`,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + 
                ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        return {
          ...c,
          status: 'sent_back',
          comments: [...currentComments, newComment]
        };
      }
      return c;
    }));
    addNotification('Clarification Requested', `Clarification requested on claim ${id}.`, 'warning');
  };

  const createPayoutBatch = (claimIds: string[]) => {
    const batchId = `BCH-2024-${Math.floor(10 + Math.random() * 90)}`;
    const batchClaims = claims.filter(c => claimIds.includes(c.id));
    const totalAmount = batchClaims.reduce((sum, c) => sum + parseFloat(c.totalAmount.replace(/[₹,]/g, '')), 0);
    
    const newBatch: PayoutBatch = {
      id: batchId,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      amount: `₹${totalAmount.toLocaleString('en-IN')}`,
      count: batchClaims.length,
      status: 'Pending Sync',
      claimIds
    };
    
    setBatches(prev => [newBatch, ...prev]);
    setClaims(prev => prev.map(c => claimIds.includes(c.id) ? { ...c, projectCode: c.projectCode || 'BATCHED' } : c));
    addNotification('Batch Created', `Payout batch ${batchId} compiles ${batchClaims.length} approved expenses.`, 'info');
    return batchId;
  };

  const syncBatchToERP = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    
    const docNum = `ERP-DOC-${Math.floor(100000 + Math.random() * 900000)}`;
    const payload = {
      batchId: batch.id,
      ledgerDate: new Date().toISOString(),
      disbursementAmount: batch.amount,
      totalClaims: batch.count,
      systems: ['Tally', 'SAP', 'Oracle'],
      journalEntries: claims
        .filter(c => batch.claimIds.includes(c.id))
        .map(c => ({
          claimId: c.id,
          title: c.title,
          debit: parseFloat(c.totalAmount.replace(/[₹,]/g, '')),
          costCenter: c.projectCode || 'CC-GENERAL'
        }))
    };

    await new Promise(r => setTimeout(r, 1500));
    
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, status: 'Synced', erpDocNum: docNum } : b));
    addNotification('ERP Sync Success', `Batch ${batchId} transmitted. Document: ${docNum}`, 'success');

    return { success: true, docNum, payload };
  };

  const markBatchAsDisbursed = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, status: 'Paid' } : b));
    setClaims(prev => prev.map(c => batch.claimIds.includes(c.id) ? { ...c, status: 'paid' } : c));
    addNotification('Reimbursements Disbursed', `Batch ${batchId} is paid. Alerts sent to ${batch.count} employees.`, 'success');
  };

  const updatePolicy = (category: string, updatedFields: Partial<Policy>) => {
    setPolicies(prev => prev.map(p => p.category === category ? { ...p, ...updatedFields } : p));
  };

  return (
    <ClaimsContext.Provider value={{
      claims,
      policies,
      batches,
      notifications,
      currentRole,
      userTrustScore,
      setRole,
      addClaim,
      updateClaimStatus,
      addComment,
      deleteClaim,
      resubmitClaim,
      rejectClaimWithReason,
      requestClarification,
      createPayoutBatch,
      syncBatchToERP,
      markBatchAsDisbursed,
      updatePolicy,
      addNotification,
      clearNotifications,
      adjustUserTrustScore,
      resetUserTrustScore
    }}>
      {children}
    </ClaimsContext.Provider>
  );
};

export const useClaims = () => {
  const context = useContext(ClaimsContext);
  if (!context) {
    throw new Error('useClaims must be used within a ClaimsProvider');
  }
  return context;
};