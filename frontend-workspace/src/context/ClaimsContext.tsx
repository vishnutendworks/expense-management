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
  description?: string;
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
  lastStep?: number;
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
  receipt_url?: string;
  bank_statement_url?: string;
}

export interface Policy {
  category: string;
  limit: number;
  mandatoryAttachment: boolean;
  backdateLimitDays: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  allowedRoles?: string[];
  allowedDepartments?: string[];
  allowedEmploymentTypes?: string[];
  limits: {
    perTransaction: number;
    perTransactionUnlimited?: boolean;
    perDay: number;
    perMonth: number;
    perTrip: number;
  };
  weekendsAllowed: boolean;
  holidaysAllowed: boolean;
  mandatoryAttachments: string[];
  approvalChain: string[];
  approvalChainHighValue: string[];
  escalationThreshold: number;
  backdateLimitDays: number;
  effectiveDate: string;
  status: 'draft' | 'published';
}

export interface GlobalRules {
  backdateLimitDays: number;
  escalationThreshold: number;
  requireReceiptAbove: number;
  duplicatePrevention: boolean;
  autoRejection: {
    missingAttachment: boolean;
    policyViolation: boolean;
    limitExceeded: boolean;
    invalidCategory: boolean;
  };
}

export interface ApprovalWorkflow {
  id: string;
  category: string;
  steps: { id: string; role: string; order: number }[];
  escalationRules: {
    min: number;
    max: number;
    approvers: string[];
  }[];
}

export interface AuditEntry {
  id: string;
  version: string;
  modifiedBy: string;
  modifiedDate: string;
  changeSummary: string;
  status: 'Published' | 'Archived';
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
  targetRoles?: ('employee' | 'manager' | 'finance' | 'admin')[];
  roleMessages?: {
    employee?: { title: string; message: string };
    manager?: { title: string; message: string };
    finance?: { title: string; message: string };
    admin?: { title: string; message: string };
  };
}

interface ClaimsContextType {
  claims: Claim[];
  policies: Policy[];
  batches: PayoutBatch[];
  notifications: AppNotification[];
  categories: Category[];
  workflows: ApprovalWorkflow[];
  configHistory: AuditEntry[];
  globalRules: GlobalRules;
  currentRole: 'employee' | 'manager' | 'finance' | 'admin';
  userTrustScore: number;
  setRole: (role: 'employee' | 'manager' | 'finance' | 'admin') => void;
  addClaim: (claim: Claim) => void;
  updateClaim: (claim: Claim) => void;
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
  addNotification: (
    title: string, 
    message: string, 
    type: AppNotification['type'],
    targetRoles?: AppNotification['targetRoles'],
    roleMessages?: AppNotification['roleMessages']
  ) => void;
  clearNotifications: () => void;
  adjustUserTrustScore: (event: string, detail?: string) => void;
  resetUserTrustScore: () => void;
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  publishCategory: (id: string, effectiveDate: string) => void;
  updateGlobalRules: (updates: Partial<GlobalRules>) => void;
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
  { category: 'Internet/Broadband', limit: 1500, mandatoryAttachment: false, backdateLimitDays: 30 },
];
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-001', name: 'Local Travel',
    description: 'Intra-city travel via cabs or public transport',
    allowedRoles: ['All'], allowedDepartments: ['All'],
    allowedEmploymentTypes: ['Full Time', 'Contract'],
    limits: { perTransaction: 5000, perTransactionUnlimited: false, perDay: 15000, perMonth: 50000, perTrip: 50000 },
    weekendsAllowed: true, holidaysAllowed: false,
    mandatoryAttachments: ['receipt'],
    approvalChain: ['Manager'],
    approvalChainHighValue: ['Manager', 'Finance'],
    escalationThreshold: 20000, backdateLimitDays: 30,
    effectiveDate: '2024-01-01', status: 'published'
  },
  {
    id: 'cat-002', name: 'Outstation Travel',
    allowedRoles: ['All'], allowedDepartments: ['Sales', 'Operations'],
    allowedEmploymentTypes: ['Full Time', 'Contract'],
    limits: { perTransaction: 15000, perTransactionUnlimited: false, perDay: 25000, perMonth: 75000, perTrip: 75000 },
    weekendsAllowed: true, holidaysAllowed: true,
    mandatoryAttachments: ['receipt', 'travel_authorization'],
    approvalChain: ['Manager', 'Finance'],
    approvalChainHighValue: ['Manager', 'Finance', 'CFO'],
    escalationThreshold: 50000, backdateLimitDays: 45,
    effectiveDate: '2024-01-01', status: 'published'
  },
  {
    id: 'cat-003', name: 'Meals & Entertainment',
    allowedRoles: ['All'], allowedDepartments: ['All'],
    allowedEmploymentTypes: ['Full Time', 'Contract', 'Intern'],
    limits: { perTransaction: 1500, perTransactionUnlimited: false, perDay: 3000, perMonth: 15000, perTrip: 5000 },
    weekendsAllowed: true, holidaysAllowed: true,
    mandatoryAttachments: ['receipt'],
    approvalChain: ['Manager'],
    approvalChainHighValue: ['Manager', 'Finance'],
    escalationThreshold: 5000, backdateLimitDays: 30,
    effectiveDate: '2024-01-01', status: 'published'
  },
  {
    id: 'cat-004', name: 'Lodging',
    allowedRoles: ['All'], allowedDepartments: ['All'],
    allowedEmploymentTypes: ['Full Time', 'Contract'],
    limits: { perTransaction: 10000, perTransactionUnlimited: false, perDay: 10000, perMonth: 40000, perTrip: 40000 },
    weekendsAllowed: true, holidaysAllowed: true,
    mandatoryAttachments: ['receipt', 'invoice'],
    approvalChain: ['Manager', 'Finance'],
    approvalChainHighValue: ['Manager', 'Finance', 'CFO'],
    escalationThreshold: 25000, backdateLimitDays: 45,
    effectiveDate: '2024-01-01', status: 'published'
  },
  {
    id: 'cat-005', name: 'Office Supplies',
    allowedRoles: ['All'], allowedDepartments: ['All'],
    allowedEmploymentTypes: ['Full Time', 'Contract', 'Intern', 'Consultant'],
    limits: { perTransaction: 5000, perTransactionUnlimited: false, perDay: 10000, perMonth: 20000, perTrip: 20000 },
    weekendsAllowed: false, holidaysAllowed: false,
    mandatoryAttachments: [],
    approvalChain: ['Manager'],
    approvalChainHighValue: ['Manager', 'Finance'],
    escalationThreshold: 10000, backdateLimitDays: 30,
    effectiveDate: '2024-01-01', status: 'published'
  },
  {
    id: 'cat-006', name: 'Fuel',
    allowedRoles: ['Driver', 'Field Executive', 'Manager'], allowedDepartments: ['Operations', 'Sales'],
    allowedEmploymentTypes: ['Full Time', 'Contract'],
    limits: { perTransaction: 3000, perTransactionUnlimited: false, perDay: 8000, perMonth: 25000, perTrip: 10000 },
    weekendsAllowed: true, holidaysAllowed: false,
    mandatoryAttachments: ['receipt'],
    approvalChain: ['Manager'],
    approvalChainHighValue: ['Manager', 'Finance'],
    escalationThreshold: 8000, backdateLimitDays: 15,
    effectiveDate: '2024-01-01', status: 'published'
  },
  {
    id: 'cat-007', name: 'Internet/Broadband',
    allowedRoles: ['All'], allowedDepartments: ['All'],
    allowedEmploymentTypes: ['Full Time', 'Contract', 'Intern', 'Consultant'],
    limits: { perTransaction: 2000, perTransactionUnlimited: false, perDay: 2000, perMonth: 4000, perTrip: 4000 },
    weekendsAllowed: true, holidaysAllowed: true,
    mandatoryAttachments: ['invoice'],
    approvalChain: ['Manager'],
    approvalChainHighValue: ['Manager', 'Finance'],
    escalationThreshold: 3000, backdateLimitDays: 60,
    effectiveDate: '2024-01-01', status: 'published'
  },
];

const DEFAULT_GLOBAL_RULES: GlobalRules = {
  backdateLimitDays: 30,
  escalationThreshold: 50000,
  requireReceiptAbove: 500,
  duplicatePrevention: true,
  autoRejection: {
    missingAttachment: true,
    policyViolation: false,
    limitExceeded: false,
    invalidCategory: true,
  }
};

const DEFAULT_WORKFLOWS: ApprovalWorkflow[] = [
  {
    id: 'wf-1',
    category: 'Local Travel',
    steps: [
      { id: '1', role: 'Employee', order: 0 },
      { id: '2', role: 'Manager', order: 1 },
      { id: '3', role: 'Finance', order: 2 },
    ],
    escalationRules: [
      { min: 0, max: 10000, approvers: ['Manager'] },
      { min: 10001, max: 50000, approvers: ['Manager', 'Finance'] },
    ]
  }
];

export const ClaimsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setRole] = useState<'employee' | 'manager' | 'finance' | 'admin'>('employee');

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('tendworks_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch { return DEFAULT_CATEGORIES; }
  });

  const [workflows] = useState<ApprovalWorkflow[]>(DEFAULT_WORKFLOWS);
  const [configHistory] = useState<AuditEntry[]>([
    { id: '1', version: 'v2.4', modifiedBy: 'Sneha Patel', modifiedDate: '2024-10-20', changeSummary: 'Updated Local Travel limits and added intern eligibility', status: 'Published' },
    { id: '2', version: 'v2.3', modifiedBy: 'Sneha Patel', modifiedDate: '2024-09-15', changeSummary: 'Global backdate limit adjusted to 30 days', status: 'Archived' },
  ]);

  const [globalRules, setGlobalRules] = useState<GlobalRules>(() => {
    try {
      const saved = localStorage.getItem('tendworks_global_rules');
      return saved ? JSON.parse(saved) : DEFAULT_GLOBAL_RULES;
    } catch { return DEFAULT_GLOBAL_RULES; }
  });

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

  useEffect(() => {
    localStorage.setItem('tendworks_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('tendworks_global_rules', JSON.stringify(globalRules));
  }, [globalRules]);

  const addNotification = (
    title: string, 
    message: string, 
    type: AppNotification['type'],
    targetRoles?: AppNotification['targetRoles'],
    roleMessages?: AppNotification['roleMessages']
  ) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(),
      title,
      message,
      type,
      date: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      read: false,
      targetRoles,
      roleMessages
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const adjustUserTrustScore = (event: string, _detail?: string) => {
    let delta = 0;
    switch (event) {
      case 'COMPLIANT_CLAIM_APPROVED': delta = 2; break;
      case 'OCR_HIGH_CONFIDENCE': delta = 1; break;
      case 'STATEMENT_RECON_VERIFIED': delta = 3; break;
      case 'DUPLICATE_CLAIM_CONFIRMED': delta = -10; break;
      case 'ANOMALY_WATCH': delta = -5; break;
      case 'ANOMALY_HIGH': delta = -15; break;
      case 'STATEMENT_RECON_MISMATCH': delta = -20; break;
      case 'OCR_TAMPERING': delta = -30; break;
      case 'SUBMIT_OUTSIDE_HOURS': delta = -3; break;
      case 'POLICY_FINANCE_OVERRIDE': delta = -8; break;
      case 'DISPUTE_FAVORABLE_RESOLVED': delta = 5; break;
      case 'REJECT_POLICY_VIOLATION': delta = -5; break;
      default: break;
    }
    if (delta !== 0) {
      setUserTrustScore(prev => Math.max(0, Math.min(100, prev + delta)));
    }
  };

  const resetUserTrustScore = () => {
    setUserTrustScore(80);
    addNotification(
      'Trust Score Reset',
      'Employee trust score reset to baseline (80%) upon dispute resolution.',
      'info',
      ['employee', 'manager', 'finance', 'admin'],
      {
        employee: { title: 'Trust Score Reset', message: 'Your trust score has been reset to the baseline of 80%.' },
        manager: { title: 'Trust Score Reset', message: 'Employee trust score reset to baseline (80%).' },
        finance: { title: 'Trust Score Reset', message: 'Employee trust score reset to baseline (80%) upon dispute resolution.' },
        admin: { title: 'System: Trust Score Reset', message: 'Trust score baseline reset (80%) for dispute resolution.' }
      }
    );
  };

  const addClaim = (claim: Claim) => {
    setClaims(prev => [claim, ...prev]);
    addNotification(
      'New Claim Submitted',
      `Claim ${claim.id} containing ${claim.items.length} items was submitted.`,
      'info',
      ['employee', 'manager', 'finance', 'admin'],
      {
        employee: {
          title: 'Claim Submitted Successfully',
          message: `Your claim ${claim.id} containing ${claim.items.length} items has been submitted for approval.`
        },
        manager: {
          title: 'New Claim Received',
          message: `You have received a new claim ${claim.id} containing ${claim.items.length} items to check and approve.`
        },
        finance: {
          title: 'New Claim Queued',
          message: `Claim ${claim.id} containing ${claim.items.length} items has been submitted and is in manager review.`
        },
        admin: {
          title: 'System: Claim Submitted',
          message: `Claim ${claim.id} containing ${claim.items.length} items was successfully created in the database.`
        }
      }
    );
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

  const updateClaim = (claim: Claim) => {
    setClaims(prev => prev.map(c => c.id === claim.id ? claim : c));
    addNotification('Draft Updated', `Draft ${claim.id} has been updated.`, 'success', ['employee']);
  };

  const updateClaimStatus = (id: string, status: Claim['status']) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    addNotification(
      'Status Updated',
      `Claim ${id} status changed to ${status.toUpperCase()}.`,
      status === 'approved' || status === 'paid' ? 'success' : status === 'flagged' || status === 'rejected' ? 'alert' : 'info',
      ['employee', 'manager', 'finance', 'admin'],
      {
        employee: {
          title: `Claim ${status === 'approved' ? 'Approved' : status === 'paid' ? 'Paid' : status === 'rejected' ? 'Rejected' : status === 'sent_back' ? 'Clarification Requested' : 'Status Updated'}`,
          message: status === 'approved' ? `Your claim ${id} has been approved.` :
                   status === 'paid' ? `Reimbursement for claim ${id} has been processed.` :
                   status === 'rejected' ? `Your claim ${id} was rejected by the manager/finance.` :
                   status === 'sent_back' ? `Your claim ${id} was sent back for clarification.` :
                   `Your claim ${id} status changed to ${status.toUpperCase()}.`
        },
        manager: {
          title: `Claim ${status.toUpperCase()}`,
          message: `Claim ${id} status is now ${status.toUpperCase()}.`
        },
        finance: {
          title: `Claim ${status.toUpperCase()}`,
          message: `Claim ${id} status has been updated to ${status.toUpperCase()}.`
        },
        admin: {
          title: 'System: Status Updated',
          message: `Claim ${id} status updated to ${status.toUpperCase()}.`
        }
      }
    );

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

    // Trigger comment notification
    addNotification(
      'New Comment Added',
      `${author} (${role}) added a comment to claim ${claimId}: "${text.substring(0, 30)}..."`,
      'info',
      ['employee', 'manager', 'finance', 'admin'],
      {
        employee: {
          title: 'New Comment / Reply',
          message: `${author} (${role}) commented on claim ${claimId}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
        },
        manager: {
          title: 'New Comment / Reply',
          message: `${author} (${role}) commented on claim ${claimId}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
        },
        finance: {
          title: 'New Comment / Reply',
          message: `${author} (${role}) commented on claim ${claimId}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
        },
        admin: {
          title: 'System: Comment Logged',
          message: `${author} (${role}) commented on claim ${claimId}.`
        }
      }
    );
  };

  const deleteClaim = (id: string) => {
    if (window.confirm('Are you sure you want to delete this claim?')) {
      setClaims(prev => prev.filter(c => c.id !== id));
      addNotification('Claim Deleted', `Claim ${id} has been removed.`, 'warning', ['employee']);
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
    addNotification(
      'Claim Resubmitted',
      `Claim ${id} has been reinjected into approval cycle.`,
      'info',
      ['employee', 'manager', 'finance', 'admin'],
      {
        employee: { title: 'Claim Resubmitted', message: `Your claim ${id} has been successfully resubmitted.` },
        manager: { title: 'Claim Resubmitted', message: `Claim ${id} has been resubmitted and is back in your queue.` },
        finance: { title: 'Claim Resubmitted', message: `Claim ${id} has been resubmitted by the employee.` },
        admin: { title: 'System: Claim Resubmitted', message: `Claim ${id} has been reinjected into approval cycle.` }
      }
    );
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
    addNotification(
      'Claim Rejected',
      `Claim ${id} was rejected. Reason: ${reason}`,
      'alert',
      ['employee', 'manager', 'finance', 'admin'],
      {
        employee: { title: 'Claim Rejected', message: `Your claim ${id} was rejected. Reason: ${reason}` },
        manager: { title: 'Claim Rejected', message: `You rejected claim ${id}. Reason: ${reason}` },
        finance: { title: 'Claim Rejected', message: `Claim ${id} was rejected by manager. Reason: ${reason}` },
        admin: { title: 'System: Claim Rejected', message: `Claim ${id} rejected by ${author}.` }
      }
    );
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
    addNotification(
      'Clarification Requested',
      `Clarification requested on claim ${id}.`,
      'warning',
      ['employee', 'manager', 'finance', 'admin'],
      {
        employee: { title: 'Clarification Needed', message: `Clarification requested on your claim ${id}: "${reason.substring(0, 50)}${reason.length > 50 ? '...' : ''}"` },
        manager: { title: 'Clarification Requested', message: `You requested clarification on claim ${id}.` },
        finance: { title: 'Clarification Requested', message: `Claim ${id} was sent back to employee for clarification.` },
        admin: { title: 'System: Clarification Requested', message: `Clarification requested on claim ${id} by ${author}.` }
      }
    );
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

  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat: Category = { ...cat, id: `cat-${Date.now()}` };
    setCategories(prev => [...prev, newCat]);
    addNotification('Category Created', `Category "${cat.name}" has been added.`, 'info');
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat && window.confirm(`Delete category "${cat.name}"?`)) {
      setCategories(prev => prev.filter(c => c.id !== id));
      addNotification('Category Deleted', `Category "${cat.name}" removed.`, 'warning');
    }
  };

  const publishCategory = (id: string, effectiveDate: string) => {
    setCategories(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'published', effectiveDate } : c
    ));
    const cat = categories.find(c => c.id === id);
    addNotification('Category Published', `"${cat?.name}" published with effect from ${effectiveDate}.`, 'success');
  };

  const updateGlobalRules = (updates: Partial<GlobalRules>) => {
    setGlobalRules(prev => ({ ...prev, ...updates }));
    addNotification('Global Rules Updated', 'Expense policy rules have been updated.', 'info');
  };

  return (
    <ClaimsContext.Provider value={{
      claims,
      policies,
      batches,
      notifications,
      categories,
      workflows,
      configHistory,
      globalRules,
      currentRole,
      userTrustScore,
      setRole,
      updateClaim,
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
      resetUserTrustScore,
      addCategory,
      updateCategory,
      deleteCategory,
      publishCategory,
      updateGlobalRules
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