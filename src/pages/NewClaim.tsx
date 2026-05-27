import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClaims, type Claim } from '../context/ClaimsContext';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  ArrowRight,
  Paperclip,
  AlertTriangle,
  Receipt,
  Zap,
  Activity,
  ShieldCheck,
  UserCheck,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Step Definitions ---
type Step = 'details' | 'items' | 'review';

interface ItemEntry {
  id: number;
  date: string;
  category: string;
  amount: string;
  tax: string;
  desc: string;
  billable: boolean;
  ocrValue?: string; // Original OCR scanned value if populated
  ocrConfirmed?: boolean;
}

export const NewClaim: React.FC = () => {
  const navigate = useNavigate();
  const { addClaim, policies, claims, userTrustScore } = useClaims();

  // --- Step & Lifecycle State ---
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- Form Content State ---
  const [claimTitle, setClaimTitle] = useState('');
  const [reportCategory, setReportCategory] = useState('Travel Expenses');
  const [projectCode, setProjectCode] = useState('');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  
  const [items, setItems] = useState<ItemEntry[]>([
    { id: 1, date: new Date().toISOString().split('T')[0], category: 'Travel Expenses', amount: '', tax: '', desc: '', billable: false }
  ]);

  // --- PRD Specific State (AI OCR / Bank Statement Uploads) ---
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [bankStatementFile, setBankStatementFile] = useState<string | null>(null);
  const [aiOcrStatus, setAiOcrStatus] = useState<'idle' | 'processing' | 'ready' | 'autofilled'>('idle');
  const [reconciliationMismatch, setReconciliationMismatch] = useState<boolean>(false);
  const [userGradeTrust, setUserGradeTrust] = useState<'high' | 'normal' | 'low'>('normal');
  const [ocrTamperingDetected, setOcrTamperingDetected] = useState<boolean>(false);
  const [outsideBusinessHours, setOutsideBusinessHours] = useState<boolean>(false);

  // --- Duplicate & Anomaly Warning Modal State ---
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    duplicateClaimId?: string;
    itemIndex?: number;
    amount?: string;
    date?: string;
  } | null>(null);

  // --- Routing Pipeline Execution state ---
  const [routingStep, setRoutingStep] = useState<number>(0);
  const [routingPathResult, setRoutingPathResult] = useState<'pathA' | 'pathB' | 'pathC' | null>(null);

  // Mock parsed OCR values ready to fill
  const ocrMockData = {
    title: 'Q4 Product Sync - Bangalore Offsite',
    category: 'Travel Expenses',
    projectCode: 'PRJ-2024-009',
    startDate: '2024-10-18',
    endDate: '2024-10-20',
    itemAmount: '8500',
    itemTax: '1530',
    itemDesc: 'Indigo Ticket: DEL -> BLR'
  };

  const calculateTotal = () => {
    const total = items.reduce((sum, item) => 
      sum + (parseFloat(item.amount) || 0) + (parseFloat(item.tax) || 0), 0
    );
    return total.toLocaleString('en-IN');
  };

  // Launches camera/file picker simulation for Receipt
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file.name);
      triggerAiParsing(file.name, 'Receipt');
    }
  };

  // Launches bulk upload simulation for Bank Statement
  const handleBankStatementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBankStatementFile(file.name);
      triggerAiParsing(file.name, 'Bank Statement');
    }
  };

  // Simulation of background system parsing
  const triggerAiParsing = (_filename: string, _type: 'Receipt' | 'Bank Statement') => {
    setAiOcrStatus('processing');
    setTimeout(() => {
      setAiOcrStatus('ready');
    }, 1500);
  };

  // Auto-fill logic from the AI OCR parsed data
  const handleAutoFill = () => {
    setAiOcrStatus('autofilled');
    setClaimTitle(ocrMockData.title);
    setReportCategory(ocrMockData.category);
    setProjectCode(ocrMockData.projectCode);
    setTripStartDate(ocrMockData.startDate);
    setTripEndDate(ocrMockData.endDate);

    // Populate line item with OCR reference value for checking overrides later
    setItems([
      {
        id: Date.now(),
        date: ocrMockData.startDate,
        category: ocrMockData.category,
        amount: ocrMockData.itemAmount,
        tax: ocrMockData.itemTax,
        desc: ocrMockData.itemDesc,
        billable: true,
        ocrValue: ocrMockData.itemAmount,
        ocrConfirmed: true
      }
    ]);
  };

  // Evaluates risk categories to determine the pipeline routing path
  const evaluateRoutingPath = (): 'pathA' | 'pathB' | 'pathC' => {
    const totalVal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0) + (parseFloat(item.tax) || 0), 0);
    const maxLineVal = items.reduce((max, item) => Math.max(max, (parseFloat(item.amount) || 0) + (parseFloat(item.tax) || 0)), 0);
    const allLinesPolicyCompliant = items.every(item => evaluateItemPolicy(item).status === 'pass');
    
    // Check duplicates
    const hasDup = checkForDuplicates() !== null;

    // Check tampering and low trust
    const resolvedTrustScore = userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore);

    // Path C: Compliance Escalation to Finance
    if (ocrTamperingDetected || reconciliationMismatch || resolvedTrustScore < 40) {
      return 'pathC';
    }

    // Path A: Zero-Touch AI Fast-Track
    const isAmountFT = maxLineVal <= 5000 && totalVal <= 15000;
    const isReceiptFT = !!receiptFile; 
    const isBankStatementFT = !bankStatementFile ? (resolvedTrustScore >= 80) : !reconciliationMismatch;
    const isTrustFT = resolvedTrustScore >= 75;

    if (isAmountFT && allLinesPolicyCompliant && !hasDup && isReceiptFT && isBankStatementFT && isTrustFT) {
      return 'pathA';
    }

    // Path B: Standard Manager Route
    return 'pathB';
  };

  // Checks for duplicates inside the context against historical claims
  const checkForDuplicates = (): { hasDup: boolean; dupId?: string; index?: number; amount?: string; date?: string } | null => {
    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      if (!line.amount || !line.date) continue;
      
      // Look for a claim containing an item with matching date and amount
      const matchingClaim = claims.find(c => 
        c.items.some(histItem => 
          histItem.date === line.date && 
          parseFloat(histItem.amount) === parseFloat(line.amount)
        )
      );

      if (matchingClaim) {
        return {
          hasDup: true,
          dupId: matchingClaim.id,
          index: i,
          amount: line.amount,
          date: line.date
        };
      }
    }
    return null;
  };

  const handleFinalSubmit = async () => {
    // Check duplicates first
    const dupCheck = checkForDuplicates();
    if (dupCheck && dupCheck.hasDup && !duplicateWarning?.show) {
      setDuplicateWarning({
        show: true,
        duplicateClaimId: dupCheck.dupId,
        itemIndex: dupCheck.index,
        amount: dupCheck.amount,
        date: dupCheck.date
      });
      return;
    }

    setIsSubmitting(true);
    setRoutingStep(1);

    const calculatedPath = evaluateRoutingPath();
    setRoutingPathResult(calculatedPath);

    // Cycle through automated routing steps simulation
    await new Promise(r => setTimeout(r, 800));
    setRoutingStep(2); // Anomaly Check
    await new Promise(r => setTimeout(r, 800));
    setRoutingStep(3); // Statement Reconciliation
    await new Promise(r => setTimeout(r, 800));
    setRoutingStep(4); // Employee Trust Check
    await new Promise(r => setTimeout(r, 1200));

    const resolvedTrustScore = userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore);
    let finalStatus: Claim['status'] = 'submitted';
    let riskCategoryVal: Claim['riskCategory'] = 'medium';

    if (calculatedPath === 'pathA') {
      finalStatus = 'submitted'; // manager sign-off is required, pre-verified tag applied
      riskCategoryVal = 'low';
    } else if (calculatedPath === 'pathC') {
      finalStatus = 'flagged'; // escalated to Finance directly, bypassing manager
      riskCategoryVal = 'high';
    }

    const newClaim: Claim = {
      id: `CLM-${Math.floor(1000 + Math.random() * 9000)}`,
      title: claimTitle || 'Untitled Claim',
      category: reportCategory,
      projectCode: projectCode || 'GEN-CORP',
      startDate: tripStartDate || new Date().toISOString().split('T')[0],
      endDate: tripEndDate || new Date().toISOString().split('T')[0],
      totalAmount: `₹${calculateTotal()}`,
      status: finalStatus,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      items: items.map(item => ({ ...item, id: Math.random(), ocrConfirmed: !!item.ocrConfirmed })),
      trustScore: resolvedTrustScore,
      riskCategory: riskCategoryVal,
      receiptUploaded: !!receiptFile,
      bankStatementUploaded: !!bankStatementFile,
      hasBankStatementMismatch: reconciliationMismatch,
      outsideHours: outsideBusinessHours,
      isFastTrackEligible: calculatedPath === 'pathA',
      ocrConfidence: receiptFile ? 0.94 : undefined,
      tamperingDetected: ocrTamperingDetected,
      bankStatementReconciled: !bankStatementFile ? 'Unverified' : (reconciliationMismatch ? 'Mismatch' : 'Verified'),
      anomalyFlagsCount: (calculatedPath === 'pathC' ? 1 : 0) + (reconciliationMismatch ? 1 : 0) + (ocrTamperingDetected ? 1 : 0),
      flaggedReasons: calculatedPath === 'pathC'
        ? [
            ...(reconciliationMismatch ? ['Bank statement reconciliation mismatch (Variance exceeded)'] : []),
            ...(ocrTamperingDetected ? ['Direct OCR Image tampering detected (confidence > 0.85)'] : []),
            ...(resolvedTrustScore < 40 ? [`Submitter trust score below critical threshold (${resolvedTrustScore}%)`] : [])
          ]
        : undefined,
      comments: [
        {
          id: 'init',
          author: 'Marcus Richardson',
          role: 'Initiator',
          text: `Claim submitted with ${receiptFile || 'no'} receipt attachments. Submitter trust level is ${resolvedTrustScore}% (${calculatedPath === 'pathA' ? 'Fast-Track Pre-Verified' : (calculatedPath === 'pathC' ? 'Escalated straight to Finance/Audit due to high anomalies' : 'Standard Path')}).`,
          date: 'Just Now'
        }
      ]
    };

    addClaim(newClaim);
    setIsSubmitting(false);
    setIsSuccess(true);

    setTimeout(() => {
      navigate('/my-claims');
    }, 3500);
  };

  const saveDraft = () => {
    const draftClaim: Claim = {
      id: `CLM-${Math.floor(1000 + Math.random() * 9000)}`,
      title: claimTitle || 'Draft Expense Claim',
      category: reportCategory,
      projectCode: projectCode || 'DRAFT',
      startDate: tripStartDate || new Date().toISOString().split('T')[0],
      endDate: tripEndDate || new Date().toISOString().split('T')[0],
      totalAmount: `₹${calculateTotal()}`,
      status: 'draft',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      items: items.map(item => ({ ...item, id: Math.random() })),
      receiptUploaded: !!receiptFile,
      bankStatementUploaded: !!bankStatementFile,
      comments: []
    };
    addClaim(draftClaim);
    navigate('/my-claims');
  };

  const nextStep = () => {
    if (currentStep === 'details') setCurrentStep('items');
    else if (currentStep === 'items') setCurrentStep('review');
    else if (currentStep === 'review') handleFinalSubmit();
  };

  const prevStep = () => {
    if (currentStep === 'items') setCurrentStep('details');
    else if (currentStep === 'review') setCurrentStep('items');
  };

  const addItem = () => {
    const newItem: ItemEntry = { 
      id: Date.now(), 
      date: new Date().toISOString().split('T')[0], 
      category: reportCategory,
      amount: '', 
      tax: '', 
      desc: '', 
      billable: false 
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // --- Real-time Policy Coach Evaluator ---
  const evaluateItemPolicy = (item: ItemEntry): { status: 'pass' | 'warning' | 'error'; message: string } => {
    if (!item.amount || !item.category) return { status: 'pass', message: 'Enter values to evaluate policy.' };
    
    const policy = policies.find(p => p.category === item.category);
    if (!policy) return { status: 'pass', message: 'Within allowed limits.' };

    const amountVal = parseFloat(item.amount);
    
    // Check category limit
    if (amountVal > policy.limit) {
      return { 
        status: 'error', 
        message: `Exceeds the category limit of ₹${policy.limit.toLocaleString('en-IN')} by ₹${(amountVal - policy.limit).toLocaleString('en-IN')}. Requires justification.` 
      };
    }
    
    if (amountVal >= policy.limit * 0.8) {
      return { 
        status: 'warning', 
        message: `This expense brings you close to your monthly category limit (₹${policy.limit.toLocaleString('en-IN')}).` 
      };
    }

    // Check backdate limit
    if (item.date) {
      const today = new Date();
      const claimDate = new Date(item.date);
      const diffTime = Math.abs(today.getTime() - claimDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > policy.backdateLimitDays) {
        return {
          status: 'error',
          message: `Claim date exceeds allowed backdate limit of ${policy.backdateLimitDays} days (claimed ${diffDays} days ago).`
        };
      }
    }

    return { status: 'pass', message: 'Within your allowed limit.' };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Header & Stepper */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">New Expense Claim</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Submit your expenses for reimbursement</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <StepItem active={currentStep === 'details'} done={currentStep !== 'details'} num={1} label="Basic Details" />
          <div className="w-8 h-[1px] bg-slate-200"></div>
          <StepItem active={currentStep === 'items'} done={currentStep === 'review'} num={2} label="Line Items" />
          <div className="w-8 h-[1px] bg-slate-200"></div>
          <StepItem active={currentStep === 'review'} num={3} label="Review" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {/* STEP 1: Basic Details */}
            {currentStep === 'details' && (
              <motion.div 
                key="details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="premium-card p-8 space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">Expense Overview</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Claim Title</label>
                      <input 
                        type="text" 
                        value={claimTitle}
                        onChange={(e) => setClaimTitle(e.target.value)}
                        placeholder="e.g. Q4 Client Summit - Mumbai" 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Report Category</label>
                      <select 
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold cursor-pointer"
                      >
                        <option>Travel Expenses</option>
                        <option>Mileage Allowance</option>
                        <option>Meal and Entertainment</option>
                        <option>Internet/Broadband Allowances</option>
                        <option>Children Education Allowances</option>
                        <option>Others</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Project Code</label>
                      <input 
                        type="text" 
                        value={projectCode}
                        onChange={(e) => setProjectCode(e.target.value)}
                        placeholder="PRJ-2024-001" 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-semibold focus:border-black" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Start Date</label>
                      <input 
                        type="date" 
                        value={tripStartDate}
                        onChange={(e) => setTripStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-semibold focus:border-black" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">End Date</label>
                      <input 
                        type="date" 
                        value={tripEndDate}
                        onChange={(e) => setTripEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-semibold focus:border-black" 
                      />
                    </div>
                  </div>

                  {/* Capture & AI Pre-Processing Panel */}
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Evidence & Automated Verification</label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Upload Receipt */}
                      <div className="p-5 border border-slate-250 rounded-2xl bg-slate-50/50 flex flex-col justify-between hover:border-black transition-colors">
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Receipt or Invoice</p>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">Upload a JPG, PNG or PDF copy of the transaction receipt.</p>
                        </div>
                        <div className="mt-4">
                          <input 
                            id="receipt-file-picker" 
                            type="file" 
                            accept="image/*,application/pdf" 
                            className="hidden" 
                            onChange={handleReceiptUpload}
                          />
                          <button 
                            type="button"
                            onClick={() => document.getElementById('receipt-file-picker')?.click()}
                            className="w-full bg-white border border-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors uppercase tracking-widest cursor-pointer"
                          >
                            [ Upload Receipt ]
                          </button>
                        </div>
                        {receiptFile && (
                          <div className="mt-2 text-[10px] text-slate-650 font-black bg-white border border-slate-200 p-2.5 rounded-xl truncate flex items-center gap-1.5">
                            <Paperclip size={12} className="text-slate-400 shrink-0" />
                            {receiptFile}
                          </div>
                        )}
                      </div>

                      {/* Upload Bank Statement */}
                      <div className="p-5 border border-slate-250 rounded-2xl bg-slate-50/50 flex flex-col justify-between hover:border-black transition-colors">
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Bank Statement (PDF/CSV)</p>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">Provide statement for dynamic reconciliation check.</p>
                        </div>
                        <div className="mt-4">
                          <input 
                            id="bank-file-picker" 
                            type="file" 
                            accept=".csv,.pdf" 
                            className="hidden" 
                            onChange={handleBankStatementUpload}
                          />
                          <button 
                            type="button"
                            onClick={() => document.getElementById('bank-file-picker')?.click()}
                            className="w-full bg-white border border-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors uppercase tracking-widest cursor-pointer"
                          >
                            [ Upload Bank Statement ]
                          </button>
                        </div>
                        {bankStatementFile && (
                          <div className="mt-2 text-[10px] text-slate-650 font-black bg-white border border-slate-200 p-2.5 rounded-xl truncate flex items-center gap-1.5">
                            <Paperclip size={12} className="text-slate-400 shrink-0" />
                            {bankStatementFile}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI OCR background status & Auto-fill */}
                    {aiOcrStatus !== 'idle' && (
                      <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-3 shadow-xl">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-yellow-400">
                            <Zap size={14} className="animate-pulse" />
                            AI OCR Smart Auto-Fill
                          </p>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                            aiOcrStatus === 'processing' ? 'bg-amber-500/20 text-amber-300 animate-pulse' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {aiOcrStatus === 'processing' ? 'Analyzing file...' : 'Analysis Ready'}
                          </span>
                        </div>

                        {aiOcrStatus === 'processing' && (
                          <div className="space-y-2">
                            <p className="text-[11px] text-slate-400 font-medium">Reading merchant name, date, total amount, taxes, and transaction details...</p>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <motion.div 
                                className="bg-white h-full" 
                                initial={{ width: 0 }} 
                                animate={{ width: '100%' }} 
                                transition={{ duration: 1.5 }}
                              />
                            </div>
                          </div>
                        )}

                        {aiOcrStatus !== 'processing' && (
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] text-slate-350 space-y-0.5 font-semibold">
                              <p>📌 <span className="font-black text-white">Merchant:</span> Indigo Cabs / Airlines</p>
                              <p>💰 <span className="font-black text-white">Scanned Total:</span> ₹8,500.00 (Tax ₹1,530.00)</p>
                              <p>📅 <span className="font-black text-white">Scanned Date:</span> 2024-10-18</p>
                            </div>
                            {aiOcrStatus === 'ready' && (
                              <button 
                                type="button"
                                onClick={handleAutoFill}
                                className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-xs font-black hover:bg-slate-100 transition-all uppercase tracking-widest cursor-pointer"
                              >
                                [ Auto-Fill ]
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Line Items */}
            {currentStep === 'items' && (
              <motion.div 
                key="items"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Expense Items</h3>
                  <button 
                    onClick={addItem}
                    className="flex items-center gap-2 text-xs font-black bg-black text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all uppercase tracking-widest cursor-pointer"
                  >
                    <Plus size={16} />
                    ADD ITEM
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, idx) => {
                    const policyCheck = evaluateItemPolicy(item);
                    const isOcrModified = item.ocrValue && parseFloat(item.amount) > parseFloat(item.ocrValue) * 1.5;

                    return (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`premium-card p-6 space-y-4 border-l-4 transition-all ${
                          policyCheck.status === 'error' ? 'border-l-rose-500' :
                          policyCheck.status === 'warning' ? 'border-l-amber-500' : 'border-l-slate-200 hover:border-l-black'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shadow-inner">
                              <Receipt size={20} />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">Expense Item #{idx + 1}</h4>
                              <p className="text-xs text-slate-500 font-medium">Add details for this item</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Date</label>
                            <input 
                              type="date" 
                              value={item.date}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].date = e.target.value;
                                setItems(newItems);
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Category</label>
                            <select 
                              value={item.category}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].category = e.target.value;
                                setItems(newItems);
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold cursor-pointer"
                            >
                              <option>Travel Expenses</option>
                              <option>Mileage Allowance</option>
                              <option>Meal and Entertainment</option>
                              <option>Internet/Broadband Allowances</option>
                              <option>Children Education Allowances</option>
                              <option>Others</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Amount</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                              <input 
                                type="number" 
                                value={item.amount}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[idx].amount = e.target.value;
                                  setItems(newItems);
                                }}
                                placeholder="0.00" 
                                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold" 
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Tax/GST</label>
                            <input 
                              type="number" 
                              value={item.tax}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].tax = e.target.value;
                                setItems(newItems);
                              }}
                              placeholder="0.00" 
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold" 
                            />
                          </div>
                        </div>

                        {/* OCR Verification Mismatch Warning */}
                        {isOcrModified && (
                          <div className="p-3 bg-amber-50 border border-amber-250 rounded-xl space-y-2">
                            <p className="text-[11px] text-amber-900 font-bold flex items-center gap-1.5">
                              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                              OCR Mismatch: Scanned amount was ₹{parseFloat(item.ocrValue || '0').toLocaleString('en-IN')}, entered amount is significantly higher.
                            </p>
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id={`ocr-confirm-${idx}`} 
                                checked={!!item.ocrConfirmed}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[idx].ocrConfirmed = e.target.checked;
                                  setItems(newItems);
                                }}
                                className="rounded border-slate-300 text-black focus:ring-black h-4 w-4"
                              />
                              <label htmlFor={`ocr-confirm-${idx}`} className="text-[10px] font-bold text-slate-700 select-none cursor-pointer">
                                Please confirm this difference is correct
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Real-time Policy Coach Notification bar */}
                        <div className={`p-3 rounded-xl border flex gap-2 items-center text-[10px] font-bold ${
                          policyCheck.status === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                          policyCheck.status === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                          'bg-emerald-50 border-emerald-100 text-emerald-700'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            policyCheck.status === 'error' ? 'bg-rose-500 animate-ping' :
                            policyCheck.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="uppercase tracking-wider mr-1">Policy Coach:</span>
                          <span>{policyCheck.message}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Review */}
            {currentStep === 'review' && (
              <motion.div 
                key="review"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="premium-card p-8 space-y-8">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Claim Summary</h3>
                      <p className="text-sm text-slate-500 mt-1">Review all details before submission</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Payable</p>
                      <h4 className="text-3xl font-black text-slate-900">₹{calculateTotal()}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} />
                        Basic Information
                      </h4>
                      <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                        <ReviewRow label="Title" value={claimTitle || 'N/A'} />
                        <ReviewRow label="Category" value={reportCategory} />
                        <ReviewRow label="Project" value={projectCode || 'N/A'} />
                        <ReviewRow label="Dates" value={tripStartDate ? `${tripStartDate} - ${tripEndDate || '...'}` : 'N/A'} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        Approval Chain
                      </h4>
                      <div className="space-y-3 pl-4 border-l-2 border-slate-100 ml-2">
                        <ApprovalStep name="Sarah Chen" role="Reporting Manager" status="pending" />
                        <ApprovalStep name="David Miller" role="Department Head" status="waiting" />
                        <ApprovalStep name="Finance Team" role="Audit & Payment" status="waiting" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button 
              onClick={prevStep}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                currentStep === 'details' ? 'text-slate-350 cursor-not-allowed' : 'text-slate-650 hover:bg-slate-100'
              }`}
              disabled={currentStep === 'details'}
            >
              Back
            </button>
            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={saveDraft}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                [ Save Draft ]
              </button>
              <button 
                onClick={nextStep}
                disabled={isSubmitting}
                className="bg-black text-white px-8 py-3 rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2 uppercase tracking-widest cursor-pointer"
              >
                {currentStep === 'review' ? '[ Submit Claim ]' : 'Continue'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel: Dynamic Engine parameters controls & Live audit validation */}
        <div className="space-y-6">
          <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm space-y-6">
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-100">
              <Zap size={14} className="text-yellow-500 animate-bounce" />
              AI Simulation settings
            </h4>

            {/* Submitter trust settings */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">Employee Trust Level (Risk Score)</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-250">
                {(['high', 'normal', 'low'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setUserGradeTrust(lvl)}
                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      userGradeTrust === lvl ? 'bg-black text-white' : 'text-slate-500 hover:bg-slate-150'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Reconciliation mismatch trigger */}
            {bankStatementFile && (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-850">Reconciliation Discrepancy</p>
                  <p className="text-[9px] text-slate-500 font-medium">Force Path C (Flagged Admin Queue)</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={reconciliationMismatch}
                  onChange={(e) => setReconciliationMismatch(e.target.checked)}
                  className="rounded border-slate-350 text-black focus:ring-black h-4 w-4 cursor-pointer"
                />
              </div>
            )}

            {/* OCR Tampering trigger */}
            {receiptFile && (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-850">OCR Image Tampering</p>
                  <p className="text-[9px] text-slate-500 font-medium">Simulate doctored receipt image</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={ocrTamperingDetected}
                  onChange={(e) => setOcrTamperingDetected(e.target.checked)}
                  className="rounded border-slate-350 text-black focus:ring-black h-4 w-4 cursor-pointer"
                />
              </div>
            )}

            {/* Outside business hours trigger */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-850">Outside Business Hours</p>
                <p className="text-[9px] text-slate-500 font-medium">Simulate odd hour submission</p>
              </div>
              <input 
                type="checkbox" 
                checked={outsideBusinessHours}
                onChange={(e) => setOutsideBusinessHours(e.target.checked)}
                className="rounded border-slate-350 text-black focus:ring-black h-4 w-4 cursor-pointer"
              />
            </div>

            {/* Live AI checks feedback panel */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Live AI Intelligence Check results</h5>
              <div className="space-y-3">
                <LiveCheck 
                  label="Policy Rules Check" 
                  status={items.some(item => evaluateItemPolicy(item).status === 'error') ? 'warning' : 'pass'}
                  desc={items.some(item => evaluateItemPolicy(item).status === 'error') ? 'Some entries exceed policy limits.' : 'Compliant with dynamic category guidelines'}
                />
                <LiveCheck 
                  label="Fraud Detection Engine" 
                  status={ocrTamperingDetected || checkForDuplicates() !== null ? 'warning' : 'pass'}
                  desc={ocrTamperingDetected ? 'Tampering alert: font/metadata anomalies' : (checkForDuplicates() !== null ? 'Duplicate claim detected' : 'Clean image signature. No duplicates.')} 
                />
                <LiveCheck 
                  label="Statement Reconciliation" 
                  status={!bankStatementFile ? 'skipped' : reconciliationMismatch ? 'warning' : 'pass'}
                  desc={!bankStatementFile ? 'No statement loaded' : reconciliationMismatch ? 'Discrepancy: bank ledger amount mismatch' : '100% exact ledger value match found'}
                />
                <LiveCheck 
                  label="Employee Trust Indicator" 
                  status={
                    (userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore)) >= 80 ? 'pass' : 
                    (userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore)) >= 55 ? 'pass' : 'warning'
                  }
                  desc={`Trust score: ${userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore)}% (${
                    (userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore)) >= 80 ? 'High' : 
                    (userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore)) >= 55 ? 'Moderate' : 'Requires Review'
                  })`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Trust & Anomaly Routing Engine Modal */}
        <AnimatePresence>
          {isSubmitting && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
            >
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-slate-100 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="p-2.5 bg-black text-white rounded-xl">
                    <Activity size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-md font-black text-slate-900 uppercase tracking-wider">AI Trust & Anomaly Routing Engine</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Executing 4 Automated Pipeline Checks</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <RoutingPipelineStep 
                    title="1. Spending Policy Validation" 
                    active={routingStep === 1} 
                    completed={routingStep > 1} 
                    icon={ShieldCheck} 
                  />
                  <RoutingPipelineStep 
                    title="2. Anomaly & Duplicate Detection" 
                    active={routingStep === 2} 
                    completed={routingStep > 2} 
                    icon={AlertTriangle} 
                  />
                  <RoutingPipelineStep 
                    title="3. Mathematical Statement Reconciliation" 
                    active={routingStep === 3} 
                    completed={routingStep > 3} 
                    icon={FileCheck} 
                  />
                  <RoutingPipelineStep 
                    title="4. Submitter Trust Index Calculation" 
                    active={routingStep === 4} 
                    completed={routingStep > 4} 
                    icon={UserCheck} 
                  />
                </div>

                {routingStep === 4 && (
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl animate-in fade-in zoom-in duration-300">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Routing Outcome</p>
                    {routingPathResult === 'pathA' && (
                      <div className="mt-2 text-xs text-emerald-850 font-bold space-y-1">
                        <p className="text-emerald-700 font-black">🚀 PATH A: AUTO-APPROVAL TRIPPED</p>
                        <p className="text-[11px] text-slate-500 font-medium">Claim meets high-trust threshold & low-value policy guidelines. Bypassing manager review entirely; moving direct to Finance disbursement.</p>
                      </div>
                    )}
                    {routingPathResult === 'pathB' && (
                      <div className="mt-2 text-xs text-blue-850 font-bold space-y-1">
                        <p className="text-blue-700 font-black">📨 PATH B: ROUTED FOR MANAGER AUDIT</p>
                        <p className="text-[11px] text-slate-500 font-medium">Standard validation score. Claim successfully routed to assigned manager Sarah Chen for manual review.</p>
                      </div>
                    )}
                    {routingPathResult === 'pathC' && (
                      <div className="mt-2 text-xs text-rose-850 font-bold space-y-1">
                        <p className="text-rose-700 font-black">🚨 PATH C: CRITICAL ANOMALY ESCALATION</p>
                        <p className="text-[11px] text-slate-500 font-medium">Critical anomaly flagged or low trust rating. Bypassing line manager and escalating claim straight to Admin Fraud Queue.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duplicate and Anomaly Warning Popup */}
        <AnimatePresence>
          {duplicateWarning && duplicateWarning.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-100 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">Duplicate Alert Guard</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                      A similar expense of <span className="font-bold text-slate-800">₹{parseFloat(duplicateWarning.amount || '0').toLocaleString('en-IN')}</span> on <span className="font-bold text-slate-800">{duplicateWarning.date}</span> matches an existing claim (<span className="font-bold text-slate-800">{duplicateWarning.duplicateClaimId}</span>).
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl text-[11px] text-rose-900 leading-relaxed font-semibold">
                  ⚠️ Submitting a duplicate invoice might downgrade your Employee Trust Score and route your expenses directly to Audit.
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      // Remove duplicate line
                      if (duplicateWarning.itemIndex !== undefined) {
                        const newItems = [...items];
                        newItems.splice(duplicateWarning.itemIndex, 1);
                        if (newItems.length === 0) {
                          newItems.push({ id: Date.now(), date: '', category: 'Travel Expenses', amount: '', tax: '', desc: '', billable: false });
                        }
                        setItems(newItems);
                      }
                      setDuplicateWarning(null);
                    }}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-colors"
                  >
                    [ Remove Line ]
                  </button>
                  <button 
                    onClick={() => {
                      // Bypassed
                      setDuplicateWarning(null);
                      // Force proceed
                      setTimeout(() => {
                        handleFinalSubmit();
                      }, 100);
                    }}
                    className="flex-1 py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    Separate Claim
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Success Modal */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center space-y-4"
              >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Claim Routed Successfully</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">
                  The routing engine has successfully processed the pipeline checks. Redirecting to Claims dashboard...
                </p>
                <div className="pt-4 flex justify-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Sub-components ---

const StepItem = ({ active, done, num, label }: { active: boolean, done?: boolean, num: number, label: string }) => (
  <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${active ? 'bg-white shadow-md' : ''}`}>
    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
      done ? 'bg-black text-white' : active ? 'bg-black text-white' : 'bg-slate-200 text-slate-500'
    }`}>
      {done ? <CheckCircle2 size={14} /> : num}
    </div>
    <span className={`text-xs font-black uppercase tracking-wider ${active || done ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
  </div>
);

const ReviewRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center border-b border-slate-200/50 pb-2.5">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
    <span className="text-xs font-bold text-slate-800">{value}</span>
  </div>
);

const ApprovalStep = ({ name, role, status }: { name: string, role: string, status: 'pending' | 'waiting' }) => (
  <div className="flex items-center gap-3 relative">
    <div className={`w-3.5 h-3.5 rounded-full border-2 ${status === 'pending' ? 'bg-white border-black ring-4 ring-slate-100' : 'bg-slate-200 border-white'}`} />
    <div>
      <p className="text-xs font-bold text-slate-900">{name}</p>
      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{role}</p>
    </div>
  </div>
);

const LiveCheck = ({ label, status, desc }: { label: string; status: 'pass' | 'warning' | 'skipped'; desc: string }) => {
  return (
    <div className="flex items-start gap-3 text-xs p-2 bg-slate-50 rounded-xl border border-slate-100">
      <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
        status === 'pass' ? 'bg-emerald-500' : status === 'warning' ? 'bg-rose-500' : 'bg-slate-300'
      }`} />
      <div>
        <p className="font-bold text-slate-800">{label}</p>
        <p className="text-[10px] text-slate-500 leading-tight mt-0.5 font-medium">{desc}</p>
      </div>
    </div>
  );
};

const RoutingPipelineStep = ({ title, active, completed, icon: Icon }: any) => {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
      active ? 'bg-black text-white border-black scale-[1.02] shadow-lg shadow-black/15' :
      completed ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-white text-slate-300 border-slate-100'
    }`}>
      <div className="flex items-center gap-3">
        <Icon size={16} className={active ? 'text-white' : completed ? 'text-emerald-500' : 'text-slate-300'} />
        <span className="text-[10px] font-black uppercase tracking-wider">{title}</span>
      </div>
      {completed && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
      {active && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />}
    </div>
  );
};
