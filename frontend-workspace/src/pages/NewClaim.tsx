import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClaims, type Claim } from '../context/ClaimsContext';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
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
  FileCheck,
  Loader2,
  BarChart3
} from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Step Definitions ---
type Step = 'details' | 'items' | 'review';
type ClaimType = 'single' | 'multiline';

interface ItemEntry {
  id: number;
  date: string;
  category: string;
  amount: string;
  tax: string;
  desc: string;
  billable: boolean;
  currency: string;       // INR / USD / EUR / GBP / AED
  paymentMode: string;    // Cash / Personal Card / Company Card / UPI
  projectCode: string;    // Per-line project/cost-center
  merchantName: string;   // Merchant name for this line
  receiptFile?: string;   // Per-line receipt filename
  receiptUrl?: string;    // Per-line receipt preview URL
  bankFile?: string;      // Per-line bank statement filename
  bankUrl?: string;       // Per-line bank statement preview URL
  ocrValue?: string;
  ocrConfirmed?: boolean;
  ocrStatus?: 'idle' | 'processing' | 'ready' | 'error';
  ocrError?: string;
}

const OCR_SIDECAR_URL = '/ocr-api/api/v1/ocr/parse';
const AI_SIDECAR_URL = '/ai-api/api/v1/evaluate-claim';
export const NewClaim: React.FC = () => {
  const navigate = useNavigate();
  const { addClaim, policies, claims, userTrustScore, categories, currentRole } = useClaims();

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

  const [claimType, setClaimType] = useState<ClaimType | null>(null);

  const [items, setItems] = useState<ItemEntry[]>([
    {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      category: 'Local Travel',
      amount: '', tax: '', desc: '',
      billable: false,
      currency: 'INR',
      paymentMode: 'Personal Card',
      projectCode: '',
      merchantName: '',
    }
  ]);
  const [_livePolicyResult, setLivePolicyResult] = useState<any>(null);

  // --- PRD Specific State (AI OCR / Bank Statement Uploads) ---
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [bankStatementFile, setBankStatementFile] = useState<string | null>(null);
  const [bankUrl, setBankUrl] = useState<string | null>(null);
  const [aiOcrStatus, setAiOcrStatus] = useState<'idle' | 'processing' | 'ready' | 'autofilled' | 'error'>('idle');
  const [ocrErrorMessage, setOcrErrorMessage] = useState<string | null>(null);
  const [reconciliationMismatch, setReconciliationMismatch] = useState<boolean>(false);
  const [userGradeTrust, setUserGradeTrust] = useState<'high' | 'normal' | 'low'>('normal');
  const [ocrTamperingDetected, setOcrTamperingDetected] = useState<boolean>(false);
  const [outsideBusinessHours, setOutsideBusinessHours] = useState<boolean>(false);
  const [ocrData, setOcrData] = useState<any>(null);

  const hasUploadedBankStatement = bankStatementFile !== null || (claimType === 'multiline' && items.some(item => !!item.bankFile));

  const getCategoryBreakdown = () => {
    const breakdown: Record<string, { total: number; currency: string }> = {};
    items.forEach(item => {
      const cat = item.category || 'Uncategorized';
      const amt = parseFloat(item.amount || '0') + parseFloat(item.tax || '0');
      const cur = item.currency || 'INR';
      
      const key = `${cat}_${cur}`;
      if (!breakdown[key]) {
        breakdown[key] = { total: 0, currency: cur };
      }
      breakdown[key].total += amt;
    });
    return Object.entries(breakdown).map(([key, data]) => {
      const cat = key.substring(0, key.lastIndexOf('_'));
      return { category: cat, total: data.total, currency: data.currency };
    });
  };

  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    duplicateClaimId?: string;
    itemIndex?: number;
    amount?: string;
    date?: string;
  } | null>(null);

  const [routingStep, setRoutingStep] = useState<number>(0);
  const [routingPathResult, setRoutingPathResult] = useState<'pathA' | 'pathB' | 'pathC' | null>(null);


  const isStepValid = () => {
    // [CONTINUE DEBUG]
    console.log('[CONTINUE DEBUG] step:', currentStep, 'claimType:', claimType, 'items:', JSON.parse(JSON.stringify(items)), 'claimTitle:', claimTitle, 'projectCode:', projectCode, 'receiptFile:', receiptFile, 'bankStatementFile:', bankStatementFile);

    if (currentStep === 'details') {
      return (
        claimTitle.trim() !== '' &&
        reportCategory.trim() !== '' &&
        projectCode.trim() !== '' &&
        receiptFile !== null &&
        bankStatementFile !== null
      );
    }
    if (currentStep === 'items') {
      const itemsValid = items.every(
        (item) =>
          item.amount.trim() !== '' &&
          item.tax.trim() !== '' &&
          item.merchantName.trim() !== ''
      );

      if (claimType === 'multiline') {
        const filesValid = items.every((item) => item.receiptFile && item.bankFile);
        // Multiline skips the details step, so projectCode is NOT required globally
        return itemsValid && filesValid && claimTitle.trim() !== '';
      }
      return itemsValid;
    }
    return true;
  };

  const calculateTotal = () => {
    const total = items.reduce((sum, item) =>
      sum + (parseFloat(item.amount) || 0) + (parseFloat(item.tax) || 0), 0
    );
    return total.toLocaleString('en-IN');
  };

  const handleItemBankUpload = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      setItems(prev => prev.map((item, i) => i === idx ? {
        ...item,
        bankFile: file.name,
        bankUrl: URL.createObjectURL(file)
      } : item));
    }
  };

  const handleItemReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      setItems(prev => prev.map((item, i) => i === idx ? {
        ...item,
        receiptFile: file.name,
        receiptUrl: URL.createObjectURL(file)
      } : item));
      triggerLineItemOcr(file, idx);
    }
  };

  const handleMainReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file.name);
      setReceiptUrl(URL.createObjectURL(file)); 
      triggerAiParsing(file);
    }
  };

  const handleBankStatementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBankStatementFile(file.name); 
      setBankUrl(URL.createObjectURL(file));
    }
  };

  const triggerAiParsing = async (file: File) => {
    setAiOcrStatus('processing');
    setOcrErrorMessage(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(OCR_SIDECAR_URL, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      console.log('[OCR] Response:', data); 

      if (response.ok && data.status === 'success' && data.extracted_data) {
        const extracted = data.extracted_data;
        console.log('[OCR] Extracted data:', extracted);
        setOcrData(extracted);
        setAiOcrStatus('autofilled');

        if (extracted.tampering_detected) {
          setOcrTamperingDetected(true);
        }

        const merchant = extracted.merchant_name || 'Unknown Merchant';
        const expenseDate = extracted.expense_date || new Date().toISOString().split('T')[0];
        // Fix 4: use amount_before_tax (pre-tax subtotal); calculateTotal() adds tax on top
        const amountBeforeTax = (extracted.amount_before_tax ?? extracted.amount ?? '0').toString();
        const taxAmount = (extracted.tax_amount ?? extracted.tax ?? '0').toString();
        const category = extracted.category || 'Local Travel';
        // Fix 5: wire currency from OCR response
        const currency = extracted.currency_code || 'INR';

        const invoiceId = extracted.invoice_id || '';

        // End date: use OCR end_date if present, otherwise fall back to the same as start date
        const endDate = extracted.end_date || expenseDate;

        setClaimTitle(`Expense at ${merchant}`);
        setReportCategory(category);
        setTripStartDate(expenseDate);
        setTripEndDate(endDate);
        // Wire invoice_id from OCR into the Invoice ID field
        setProjectCode(invoiceId);

        setItems([
          {
            id: Date.now(),
            date: expenseDate,
            category: category,
            // Fix 4: amount = pre-tax subtotal so that amount + tax = grand total
            amount: amountBeforeTax,
            tax: taxAmount,
            desc: `Automated scan from ${merchant}`,
            billable: false,
            // Fix 5: set currency from OCR
            currency: currency,
            paymentMode: 'Personal Card',
            projectCode: invoiceId,
            merchantName: merchant,
            receiptFile: file.name,
            receiptUrl: URL.createObjectURL(file),
            ocrValue: amountBeforeTax,
            ocrConfirmed: true
          }
        ]);
      } else {
        console.warn('[OCR] Unexpected response structure:', data);
        setOcrErrorMessage(data.detail || 'Unexpected response structure from OCR.');
        setAiOcrStatus('error');
      }
    } catch (error: any) {
      console.error('[OCR] Network/parse error:', error);
      setOcrErrorMessage(error.message || 'Network/connection error.');
      setAiOcrStatus('error');
    }
  };

  const triggerLineItemOcr = async (file: File, idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ocrStatus: 'processing', ocrError: undefined, receiptFile: file.name } : item));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(OCR_SIDECAR_URL, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json(); 
      console.log(`[OCR line ${idx}] Response:`, data);

      if (response.ok && data.status === 'success' && data.extracted_data) {
        const extracted = data.extracted_data;
        const merchant = extracted.merchant_name || 'Unknown Merchant';
        const expenseDate = extracted.expense_date || new Date().toISOString().split('T')[0];
        // Fix 4: use amount_before_tax for line items too
        const amountBeforeTax = (extracted.amount_before_tax ?? extracted.amount ?? '').toString();
        const taxAmount = (extracted.tax_amount ?? extracted.tax ?? '').toString();
        const category = extracted.category || categories[0]?.name || 'Local Travel';
        // Fix 5: wire currency from OCR response for line items
        const currency = extracted.currency_code || 'INR';
        // Wire invoice_id into per-item projectCode
        const lineInvoiceId = extracted.invoice_id || '';

        if (extracted.tampering_detected) {
          setOcrTamperingDetected(true);
        }

        setItems(prev => prev.map((item, i) => i === idx ? {
          ...item,
          date: expenseDate,
          category: category,
          // Fix 4: amount = pre-tax subtotal
          amount: amountBeforeTax,
          tax: taxAmount,
          merchantName: merchant,
          desc: `Automated scan from ${merchant}`,
          // Fix 5: set currency from OCR
          currency: currency,
          // Wire invoice_id to per-item projectCode field
          projectCode: lineInvoiceId,
          ocrValue: amountBeforeTax,
          ocrConfirmed: true,
          ocrStatus: 'ready'
        } : item));

        if (!claimTitle) {
          setClaimTitle(`Expense: ${merchant}`);
        }
      } else {
        const errMsg = data.detail || 'Failed to extract data.';
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, ocrStatus: 'error', ocrError: errMsg } : item));
      } 
    } catch (error: any) {
      console.error('[OCR] Error:', error);
      const errMsg = error.message || 'Connection error.';
      setItems(prev => prev.map((item, i) => i === idx ? { ...item, ocrStatus: 'error', ocrError: errMsg } : item));
    }
  };

  const performLiveCheck = useCallback(async () => {
    const payload = {
      current_trust_score: userTrustScore,
      policy_violations_count: items.filter(i => evaluateItemPolicy(i).status === 'error').length,
      ocr_results: { tampering_detected: ocrTamperingDetected },
      outside_business_hours: outsideBusinessHours
    };

    try {
      const response = await fetch(AI_SIDECAR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setLivePolicyResult(data);
    } catch (e) {
      console.error('Live AI check failed');
    }
  }, [userTrustScore, items, ocrTamperingDetected, outsideBusinessHours]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performLiveCheck();
    }, 500);
    return () => clearTimeout(timer);
  }, [items, ocrTamperingDetected, outsideBusinessHours, performLiveCheck]);

  const evaluateRoutingPath = (): 'pathA' | 'pathB' | 'pathC' => {
    const totalVal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0) + (parseFloat(item.tax) || 0), 0);
    const maxLineVal = items.reduce((max, item) => Math.max(max, (parseFloat(item.amount) || 0) + (parseFloat(item.tax) || 0)), 0);
    const allLinesPolicyCompliant = items.every(item => evaluateItemPolicy(item).status === 'pass');

    const hasDup = checkForDuplicates() !== null;

    const resolvedTrustScore = userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore);

    if (ocrTamperingDetected || reconciliationMismatch || resolvedTrustScore < 40) {
      return 'pathC';
    }

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
          histItem.expense_date === line.date &&
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
      finalStatus = 'submitted';
      riskCategoryVal = 'low';
    } else if (calculatedPath === 'pathC') { 
      finalStatus = 'flagged';
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
      items: items.map(item => ({
        id: Math.random(),
        expense_date: item.date || new Date().toISOString().split('T')[0],
        merchant_name: item.desc ? (item.desc.startsWith('Automated scan from ') ? item.desc.replace('Automated scan from ', '') : 'Merchant') : 'Merchant',
        category: item.category,
        amount: item.amount,
        currency_code: 'INR',
        payment_mode: 'cash',
        project_cost_centre: projectCode || 'GEN-CORP',
        description: item.desc || 'No description',
        ocrConfirmed: !!item.ocrConfirmed,
        ocrValue: item.ocrValue,
        receipt_url: item.receiptUrl,
        bank_url: item.bankUrl
      })),
      trustScore: resolvedTrustScore,
      riskCategory: riskCategoryVal,
      receiptUploaded: !!receiptFile,
      receipt_url: receiptUrl || undefined,
      bankStatementUploaded: hasUploadedBankStatement,
      bank_statement_url: bankUrl || undefined,
      hasBankStatementMismatch: reconciliationMismatch,
      outsideHours: outsideBusinessHours,
      isFastTrackEligible: calculatedPath === 'pathA',
      ocrConfidence: receiptFile ? 0.94 : undefined,
      tamperingDetected: ocrTamperingDetected,
      bankStatementReconciled: !hasUploadedBankStatement ? 'Unverified' : (reconciliationMismatch ? 'Mismatch' : 'Verified'),
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
      items: items.map(item => ({
        id: Math.random(),
        expense_date: item.date || new Date().toISOString().split('T')[0],
        merchant_name: item.merchantName || item.desc?.replace('Automated scan from ', '') || 'Merchant',
        category: item.category,
        amount: item.amount,
        currency_code: item.currency || 'INR',
        payment_mode: item.paymentMode ? item.paymentMode.toLowerCase() : 'cash',
        project_cost_centre: item.projectCode || projectCode || 'DRAFT',
        description: item.desc || 'No description',
        ocrConfirmed: !!item.ocrConfirmed,
        ocrValue: item.ocrValue,
        receipt_file: item.receiptFile,
        receipt_url: item.receiptUrl,
        bank_url: item.bankUrl
      })),
      receiptUploaded: items.some(item => !!item.receiptFile),
      receipt_url: receiptUrl || undefined,
      bankStatementUploaded: hasUploadedBankStatement,
      bank_statement_url: bankUrl || undefined,
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
    if (currentStep === 'items') {
      if (claimType === 'multiline') setClaimType(null);
      else setCurrentStep('details');
    }
    else if (currentStep === 'review') setCurrentStep('items');
    else if (currentStep === 'details') setClaimType(null);
  };

  const addItem = () => {
    const newItem: ItemEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      category: categories[0]?.name || 'Local Travel',
      amount: '',
      tax: '',
      desc: '',
      billable: false,
      currency: 'INR',
      paymentMode: 'Personal Card',
      projectCode: '',
      merchantName: '',
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const evaluateItemPolicy = (item: ItemEntry): { status: 'pass' | 'warning' | 'error'; message: string } => {
    if (!item.amount || !item.category) return { status: 'pass', message: 'Enter values to evaluate policy.' };

    const catRule = categories.find(c => c.name === item.category);
    if (!catRule) {
      // fallback to legacy policy check
      const policy = policies.find(p => p.category === item.category);
      if (!policy) return { status: 'pass', message: 'Within allowed limits.' };
      const amountVal = parseFloat(item.amount);
      if (amountVal > policy.limit) {
        return {
          status: 'error',
          message: `Exceeds the category limit of ₹${policy.limit.toLocaleString('en-IN')} by ₹${(amountVal - policy.limit).toLocaleString('en-IN')}. Requires justification.`
        };
      }
      return { status: 'pass', message: 'Within allowed limits.' };
    }

    const amountVal = parseFloat(item.amount);

    // 1. Transaction Limit check
    if (catRule.limits.perTransaction > 0 && amountVal > catRule.limits.perTransaction) {
      return {
        status: 'error',
        message: `Exceeds per-transaction limit of ₹${catRule.limits.perTransaction.toLocaleString('en-IN')} for ${catRule.name}.`
      };
    }

    if (item.date && catRule.backdateLimitDays > 0) {
      const today = new Date();
      const claimDate = new Date(item.date);
      const diffTime = Math.abs(today.getTime() - claimDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > catRule.backdateLimitDays) {
        return {
          status: 'error',
          message: `Claim date exceeds category backdate limit of ${catRule.backdateLimitDays} days (claimed ${diffDays} days ago).`
        };
      }
    }

    if (item.date && !catRule.weekendsAllowed) {
      const claimDate = new Date(item.date);
      const day = claimDate.getDay(); // 0 is Sunday, 6 is Saturday
      if (day === 0 || day === 6) {
        return {
          status: 'error',
          message: `Weekend claims are disabled for ${catRule.name}.`
        };
      }
    }

    if (currentRole && catRule.allowedRoles && catRule.allowedRoles.length > 0 && !catRule.allowedRoles.includes('All')) {
      const isAllowed = catRule.allowedRoles.some(r => r.toLowerCase() === currentRole.toLowerCase());
      if (!isAllowed) {
        return {
          status: 'error',
          message: `Your role (${currentRole}) is not authorized to claim under ${catRule.name}.`
        };
      }
    }

    if (catRule.mandatoryAttachments && catRule.mandatoryAttachments.length > 0 && !item.receiptFile) {
      return {
        status: 'error',
        message: `A receipt or attachment is mandatory for category ${catRule.name}.`
      };
    }

    if (catRule.limits.perTransaction > 0 && amountVal >= catRule.limits.perTransaction * 0.85) {
      return {
        status: 'warning',
        message: `Close to the maximum single transaction limit of ₹${catRule.limits.perTransaction.toLocaleString('en-IN')}.`
      };
    }

    return { status: 'pass', message: 'Compliant with policy rules.' };
  };

  if (claimType === null) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
        <div className="text-center space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Claim Setup</p>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase font-outfit">Select Claim Type</h2>
          <p className="text-slate-500 max-w-md mx-auto text-sm font-medium">
            Choose how you want to submit your business expenses to start the workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <motion.div
            whileHover={{ y: -6 }}
            onClick={() => {
              setClaimType('single');
              setClaimTitle('Single Expense Claim');
              setItems([
                {
                  id: Date.now(),
                  date: new Date().toISOString().split('T')[0],
                  category: categories[0]?.name || 'Local Travel',
                  amount: '', tax: '', desc: '',
                  billable: false,
                  currency: 'INR',
                  paymentMode: 'Personal Card',
                  projectCode: '',
                  merchantName: '',
                }
              ]);
              setCurrentStep('details');
            }}
            className="premium-card p-8 cursor-pointer flex flex-col justify-between space-y-6 border-t-4 border-t-blue-500 group"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-650 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 uppercase">Single Expense</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Submit a claim containing exactly one expense item (e.g. a single meal, a single taxi receipt, a software subscription).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-blue-650 uppercase tracking-wider">
              Create Single Claim <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -6 }}
            onClick={() => {
              setClaimType('multiline');
              setClaimTitle('Multiline Business Expenses');
              setItems([
                {
                  id: Date.now(),
                  date: new Date().toISOString().split('T')[0],
                  category: categories[0]?.name || 'Local Travel',
                  amount: '', tax: '', desc: '',
                  billable: false,
                  currency: 'INR',
                  paymentMode: 'Personal Card',
                  projectCode: '',
                  merchantName: '',
                }
              ]);
              setCurrentStep('items');
            }}
            className="premium-card p-8 cursor-pointer flex flex-col justify-between space-y-6 border-t-4 border-t-[#1E3A5F] group"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 uppercase">Multiline Claim</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Group multiple line items together under a single claim folder (e.g. "Chennai Client Trip - May" containing taxi, lodging, flights, meals).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-[#1E3A5F] uppercase tracking-wider">
              Create Multiline Report <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>

        <div className="pt-8 text-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">New Expense Claim</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Submit your expenses for reimbursement</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          {claimType !== 'multiline' && (
            <>
              <StepItem active={currentStep === 'details'} done={currentStep !== 'details'} num={1} label="Basic Details" />
              <div className="w-8 h-[1px] bg-slate-200"></div>
            </>
          )}
          <StepItem active={currentStep === 'items'} done={currentStep === 'review'} num={claimType === 'multiline' ? 1 : 2} label="Line Items" />
          <div className="w-8 h-[1px] bg-slate-200"></div>
          <StepItem active={currentStep === 'review'} num={claimType === 'multiline' ? 2 : 3} label="Review" />
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
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Expense Overview</h3>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                      Mode: <span className="text-primary font-black">{claimType === 'single' ? 'Single' : 'Multiline'}</span>
                      <button onClick={() => setClaimType(null)} className="ml-1 text-blue-650 hover:underline cursor-pointer">Change</button>
                    </span>
                  </div>
 
                  <div className="grid grid-cols-2 gap-6"> 
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Claim Title <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={claimTitle}
                        onChange={(e) => setClaimTitle(e.target.value)}
                        placeholder="e.g. Q4 Client Summit - Mumbai"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Report Category <span className="text-rose-500">*</span></label>
                      <select
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold cursor-pointer"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Invoice ID <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={projectCode}
                        onChange={(e) => setProjectCode(e.target.value)}
                        placeholder="INV-2024-001"
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

                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Evidence & Automated Verification</label>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 border border-slate-250 rounded-2xl bg-slate-50/50 flex flex-col justify-between hover:border-black transition-colors">
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Receipt or Invoice <span className="text-rose-500">*</span></p>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">Upload a JPG, PNG or PDF copy of the transaction receipt.</p>
                        </div>
                        <div className="mt-4">
                          <input
                            id="receipt-file-picker"
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={handleMainReceiptUpload}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('receipt-file-picker')?.click()}
                            className="w-full bg-[#FAF8F3] border border-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors uppercase tracking-widest cursor-pointer"
                          >
                            [ Upload Receipt ]
                          </button>
                        </div>
                        {receiptFile && (
                          <div className="mt-2 space-y-2">
                            <div className="text-[10px] text-slate-650 font-black bg-[#FAF8F3] border border-slate-200 p-2.5 rounded-xl truncate flex items-center gap-1.5">
                              <Paperclip size={12} className="text-slate-400 shrink-0" />
                              {receiptFile}
                            </div>
                            <div className="flex items-center gap-3">
                              {receiptUrl && (
                                <button 
                                  type="button" 
                                  onClick={() => window.open(receiptUrl, '_blank')}
                                  className="flex items-center gap-1.5 text-[10px] font-black text-blue-650 uppercase hover:underline cursor-pointer ml-1"
                                >
                                  <Eye size={12} /> View Preview
                                </button>
                              )}
                              {/* Fix 6: Remove button for main receipt */}
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptFile(null);
                                  setReceiptUrl(null);
                                  setOcrData(null);
                                  setAiOcrStatus('idle');
                                  setOcrTamperingDetected(false);
                                  setClaimTitle('');
                                  setReportCategory('Travel Expenses');
                                  setTripStartDate('');
                                  setTripEndDate('');
                                  setItems([{
                                    id: Date.now(),
                                    date: new Date().toISOString().split('T')[0],
                                    category: categories[0]?.name || 'Local Travel',
                                    amount: '', tax: '', desc: '',
                                    billable: false,
                                    currency: 'INR',
                                    paymentMode: 'Personal Card',
                                    projectCode: '',
                                    merchantName: '',
                                  }]);
                                  const picker = document.getElementById('receipt-file-picker') as HTMLInputElement;
                                  if (picker) picker.value = '';
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase hover:underline cursor-pointer ml-1"
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-5 border border-slate-250 rounded-2xl bg-slate-50/50 flex flex-col justify-between hover:border-[#1E3A5F] transition-colors">
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Bank Statement (PDF/CSV) <span className="text-rose-500">*</span></p>
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
                            className="w-full bg-[#FAF8F3] border border-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors uppercase tracking-widest cursor-pointer"
                          >
                            [ Upload Bank Statement ]
                          </button>
                        </div>
                        {bankStatementFile && (
                          <div className="mt-2 space-y-2">
                            <div className="text-[10px] text-slate-650 font-black bg-[#FAF8F3] border border-slate-200 p-2.5 rounded-xl truncate flex items-center gap-1.5">
                              <Paperclip size={12} className="text-slate-400 shrink-0" />
                              {bankStatementFile}
                            </div>
                            <div className="flex items-center gap-3">
                              {bankUrl && (
                                <button 
                                  type="button" 
                                  onClick={() => window.open(bankUrl, '_blank')}
                                  className="flex items-center gap-1.5 text-[10px] font-black text-[#1E3A5F] uppercase hover:underline cursor-pointer ml-1"
                                >
                                  <Eye size={12} /> View Preview
                                </button>
                              )}
                              {/* Fix 6: Remove button for bank statement */}
                              <button
                                type="button"
                                onClick={() => {
                                  setBankStatementFile(null);
                                  setBankUrl(null);
                                  setReconciliationMismatch(false);
                                  const picker = document.getElementById('bank-file-picker') as HTMLInputElement;
                                  if (picker) picker.value = '';
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase hover:underline cursor-pointer ml-1"
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {aiOcrStatus !== 'idle' && (
                      <div className="p-5 bg-primary text-[#FAF8F3] rounded-2xl space-y-3 shadow-xl">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-yellow-400">
                            <Zap size={14} className="animate-pulse" />
                            AI OCR Smart Auto-Fill
                          </p>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                              aiOcrStatus === 'processing' ? 'bg-amber-500/20 text-amber-300 animate-pulse' :
                              aiOcrStatus === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                            {aiOcrStatus === 'processing' ? 'Analyzing file...' : 
                             aiOcrStatus === 'error' ? 'Analysis Failed' : 'Analysis Ready'}
                          </span> 
                        </div>
          
          {aiOcrStatus === 'processing' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 font-medium">Reading merchant name, date, total amount, taxes, and transaction details...</p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  className="bg-[#FAF8F3] h-full"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5 }}
                />
              </div>
            </div>
          )}

          {aiOcrStatus === 'error' && (
            <div className="text-[11px] text-rose-300 font-semibold space-y-1">
              <p>⚠️ Failed to auto-fill details from receipt:</p>
              <p className="bg-black/20 p-2.5 rounded-xl border border-rose-500/30 text-rose-200 break-words font-mono text-[10px]">
                {ocrErrorMessage}
              </p>
            </div>
          )}

          {aiOcrStatus !== 'processing' && aiOcrStatus !== 'error' && (
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-350 space-y-0.5 font-semibold">
                <p>📌 <span className="font-black text-[#FAF8F3]">Merchant:</span> {ocrData ? ocrData.merchant_name : 'Indigo Cabs / Airlines'}</p>
                <p>💰 <span className="font-black text-[#FAF8F3]">Scanned Total:</span> {(() => { const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' }; const sym = ocrData ? (CURRENCY_SYMBOLS[ocrData.currency_code || 'INR'] ?? ocrData.currency_code) : '₹'; return `${sym}${ocrData ? parseFloat(ocrData.amount_before_tax || '0').toLocaleString('en-IN') : '8,500.00'} (Tax ${sym}${ocrData ? parseFloat(ocrData.tax_amount || '0').toLocaleString('en-IN') : '1,530.00'})`; })()}</p>
                <p>📅 <span className="font-black text-[#FAF8F3]">Scanned Date:</span> {ocrData ? ocrData.expense_date : '2024-10-18'}</p>
              </div>
            </div>
          )}
        </div>
                    )}
      </div>
                </div >
              </motion.div >
            )}

{/* STEP 2: Line Items */ }
{
  currentStep === 'items' && (
    <motion.div
      key="items"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between"> 
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Expense Items</h3> 
        {claimType === 'multiline' && (
          <button
            onClick={addItem}
            className="flex items-center gap-2 text-xs font-black bg-accent text-[#FAF8F3] px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-all uppercase tracking-widest cursor-pointer"
          >
            <Plus size={16} />
            ADD ITEM
          </button>
        )}
      </div>

      <div className="space-y-6">
        {items.map((item, idx) => {
          const policyCheck = evaluateItemPolicy(item);
          const isOcrModified = item.ocrValue && parseFloat(item.amount) > parseFloat(item.ocrValue) * 1.5;
          // Fix 2: dynamic currency symbol per item
          const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
          const currSymbol = CURRENCY_SYMBOLS[item.currency || 'INR'] ?? item.currency;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`premium-card p-6 space-y-4 border-l-4 transition-all ${policyCheck.status === 'error' ? 'border-l-rose-500' :
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
                {claimType === 'multiline' && items.length > 1 && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* Row 1: Date, Category, Amount, Tax/GST */}
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
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Amount <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    {/* Fix 2: dynamic currency symbol */}
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currSymbol}</span>
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
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Tax/GST <span className="text-rose-500">*</span></label>
                  {/* Fix 2: wrap Tax/GST in relative div to show dynamic symbol */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currSymbol}</span>
                    <input
                      type="number"
                      value={item.tax}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].tax = e.target.value;
                        setItems(newItems);
                      }}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Currency, Payment Mode, Project Code, Merchant Name */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Currency</label>
                  <select
                    value={item.currency || 'INR'}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[idx].currency = e.target.value;
                      setItems(newItems);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold cursor-pointer"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Payment Mode</label>
                  <select
                    value={item.paymentMode || 'Personal Card'}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[idx].paymentMode = e.target.value;
                      setItems(newItems);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold cursor-pointer"
                  >
                    <option value="Personal Card">Personal Card</option>
                    <option value="Company Card">Company Card</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Invoice ID / Cost Center</label>
                  <input
                    type="text"
                    value={item.projectCode || ''}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[idx].projectCode = e.target.value;
                      setItems(newItems);
                    }}
                    placeholder="INV-ID"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Merchant Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={item.merchantName || ''}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[idx].merchantName = e.target.value;
                      setItems(newItems);
                    }}
                    placeholder="e.g. Uber, Amazon, Marriott"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold"
                  />
                </div>
              </div>

              {/* Row 3: Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Short Description / Justification</label>
                <input
                  type="text"
                  value={item.desc}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[idx].desc = e.target.value;
                    setItems(newItems);
                  }}
                  placeholder="Provide transaction details or business justification"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold"
                />
              </div>

                {/* ITEM EVIDENCE SECTION */}
                {claimType === 'multiline' && (
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Paperclip size={14} className="text-slate-400" />
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Documentation</h5>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Per-item Receipt */}
                      <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 hover:border-black transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-[10px] font-black text-slate-800 uppercase">Receipt or Invoice <span className="text-rose-500">*</span></p>
                          {item.receiptUrl && (
                            <button 
                              type="button" 
                              onClick={() => window.open(item.receiptUrl, '_blank')}
                              className="text-[9px] font-black text-blue-650 uppercase flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Eye size={10} /> Preview
                            </button>
                          )}
                        </div>
                        <input
                          id={`item-receipt-${idx}`}
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleItemReceiptUpload(e, idx)}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById(`item-receipt-${idx}`)?.click()}
                          className={`w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            item.receiptFile 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-white border border-slate-250 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {item.receiptFile ? `[ ${item.receiptFile} ]` : '[ Upload Receipt ]'}
                        </button>
                        {item.ocrStatus === 'processing' && (
                          <div className="mt-2 flex items-center gap-2 text-blue-650 text-[8px] font-black uppercase">
                            <Loader2 size={10} className="animate-spin" /> AI Analyzing...
                          </div>
                        )}
                        {item.ocrStatus === 'error' && (
                          <div className="mt-2 text-rose-600 text-[9px] font-bold flex flex-col gap-1 bg-rose-550/5 border border-rose-100 p-2 rounded-lg">
                            <span className="flex items-center gap-1 text-[8px] uppercase tracking-wider text-rose-700">⚠️ AI OCR Error</span>
                            <span className="font-mono text-[8px] text-rose-500 break-words">{item.ocrError || 'Unable to read receipt.'}</span>
                          </div>
                        )}
                        {item.receiptFile && item.ocrStatus !== 'processing' && (
                          <button
                            type="button"
                            onClick={() => {
                              const picker = document.getElementById(`item-receipt-${idx}`) as HTMLInputElement;
                              if (picker) picker.value = '';
                              setItems(prev => prev.map((it, i) => i === idx ? {
                                ...it,
                                receiptFile: undefined,
                                receiptUrl: undefined,
                                amount: '',
                                tax: '',
                                merchantName: '',
                                desc: '',
                                projectCode: '',
                                currency: 'INR',
                                ocrValue: undefined,
                                ocrConfirmed: false,
                                ocrStatus: 'idle',
                              } : it));
                            }}
                            className="mt-1 flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase hover:underline cursor-pointer"
                          >
                            <Trash2 size={9} /> Remove
                          </button>
                        )}
                      </div>

                      {/* Per-item Bank Statement */}
                      <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 hover:border-blue-650 transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-[10px] font-black text-slate-800 uppercase">Bank Statement (PDF/CSV) <span className="text-rose-500">*</span></p>
                          {item.bankUrl && (
                            <button 
                              type="button" 
                              onClick={() => window.open(item.bankUrl, '_blank')}
                              className="text-[9px] font-black text-blue-650 uppercase flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Eye size={10} /> Preview
                            </button>
                          )}
                        </div>
                        <input
                          id={`item-bank-${idx}`}
                          type="file"
                          accept=".pdf,.csv"
                          className="hidden"
                          onChange={(e) => handleItemBankUpload(e, idx)}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById(`item-bank-${idx}`)?.click()}
                          className={`w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            item.bankFile 
                              ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                              : 'bg-white border border-slate-250 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {item.bankFile ? `[ ${item.bankFile} ]` : '[ Upload Statement ]'}
                        </button>
                        {item.bankFile && (
                          <button
                            type="button"
                            onClick={() => {
                              const picker = document.getElementById(`item-bank-${idx}`) as HTMLInputElement;
                              if (picker) picker.value = '';
                              setItems(prev => prev.map((it, i) => i === idx ? {
                                ...it,
                                bankFile: undefined,
                                bankUrl: undefined,
                              } : it));
                            }}
                            className="mt-1 flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase hover:underline cursor-pointer"
                          >
                            <Trash2 size={9} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
              <div className={`p-3 rounded-xl border flex gap-2 items-center text-[10px] font-bold ${policyCheck.status === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                  policyCheck.status === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                    'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}>
                <div className={`w-2 h-2 rounded-full ${policyCheck.status === 'error' ? 'bg-rose-500 animate-ping' :
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
  )
}

{/* STEP 3: Review */ }
 {
  currentStep === 'review' && (
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
            {/* Fix 4: use first item's currency symbol, or mixed if multiple currencies */}
            <h4 className="text-3xl font-black text-slate-900">{(() => {
              const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
              const currencies = [...new Set(items.map(it => it.currency || 'INR'))];
              if (currencies.length === 1) {
                return `${CURRENCY_SYMBOLS[currencies[0]] ?? currencies[0]}${calculateTotal()}`;
              }
              // Multiple currencies: show each item's total separately
              return items.map(it => {
                const sym = CURRENCY_SYMBOLS[it.currency || 'INR'] ?? it.currency;
                const amt = (parseFloat(it.amount || '0') + parseFloat(it.tax || '0'));
                return `${sym}${amt.toLocaleString('en-IN')}`;
              }).join(' + ');
            })()}</h4>
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
              <ReviewRow label="Invoice ID" value={projectCode || 'N/A'} />
              <ReviewRow label="Dates" value={tripStartDate ? `${tripStartDate} - ${tripEndDate || tripStartDate}` : 'N/A'} />
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

        {/* Multiline: show all individual line items in the review */}
        {claimType === 'multiline' && items.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Receipt size={14} />
              Line Items ({items.length})
            </h4>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="bg-slate-50 rounded-2xl px-6 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Item #{idx + 1} — {item.merchantName || 'Unknown'}</span>
                    {/* Fix 4: per-item currency symbol */}
                    <span className="text-xs font-black text-slate-900">{(() => { const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' }; return (CURRENCY_SYMBOLS[item.currency || 'INR'] ?? item.currency) + (parseFloat(item.amount || '0') + parseFloat(item.tax || '0')).toLocaleString('en-IN'); })()}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <ReviewRow label="Category" value={item.category || 'N/A'} />
                    <ReviewRow label="Date" value={item.date || 'N/A'} />
                    <ReviewRow label="Invoice ID" value={item.projectCode || 'N/A'} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Fix 4: per-item currency symbol on Amount and Tax rows */}
                    <ReviewRow label="Amount" value={`${(() => { const S: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' }; return S[item.currency || 'INR'] ?? item.currency; })()}${parseFloat(item.amount || '0').toLocaleString('en-IN')}`} />
                    <ReviewRow label="Tax" value={`${(() => { const S: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' }; return S[item.currency || 'INR'] ?? item.currency; })()}${parseFloat(item.tax || '0').toLocaleString('en-IN')}`} />
                    <ReviewRow label="Currency" value={item.currency || 'INR'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Breakdown list for multiline */}
        {claimType === 'multiline' && items.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={14} />
              Category Breakdown Summary
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getCategoryBreakdown().map((breakItem, idx) => {
                const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
                const sym = CURRENCY_SYMBOLS[breakItem.currency] ?? breakItem.currency;
                return (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 shadow-inner">
                    <span className="text-xs font-bold text-slate-700">{breakItem.category}</span>
                    <span className="text-xs font-black text-slate-900">{sym}{breakItem.total.toLocaleString('en-IN')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
          </AnimatePresence >

  {/* Form Actions */ }
  < div className = "flex items-center justify-between pt-6 border-t border-slate-100" >
            <button 
              onClick={prevStep}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                (currentStep === 'details' && claimType !== 'multiline') ? 'text-slate-350 cursor-not-allowed' : 'text-slate-650 hover:bg-slate-100'
              }`}
              disabled={currentStep === 'details' && claimType !== 'multiline'}
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
                disabled={isSubmitting || !isStepValid()}
                className="bg-accent text-[#FAF8F3] px-8 py-3 rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-accent/10 flex items-center gap-2 uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStep === 'review' ? '[ Submit Claim ]' : 'Continue'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div >
        </div >

  {/* Side Panel: Dynamic Engine parameters controls & Live audit validation */ }
  < div className = "space-y-6" >
    <div className="bg-[#FAF8F3] p-6 border border-slate-200 rounded-3xl shadow-sm space-y-6">
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
              className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${userGradeTrust === lvl ? 'bg-primary text-[#FAF8F3]' : 'text-slate-500 hover:bg-slate-150'
                }`}
                >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Reconciliation mismatch trigger */}
      {hasUploadedBankStatement && (
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
            status={!hasUploadedBankStatement ? 'skipped' : reconciliationMismatch ? 'warning' : 'pass'}
            desc={!hasUploadedBankStatement ? 'No statement loaded' : reconciliationMismatch ? 'Discrepancy: bank ledger amount mismatch' : '100% exact ledger value match found'}
          />
          <LiveCheck
            label="Employee Trust Indicator"
            status={
              (userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore)) >= 80 ? 'pass' :
                (userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore)) >= 55 ? 'pass' : 'warning'
            }
            desc={`Trust score: ${userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore)}% (${(userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore)) >= 80 ? 'High' :
                (userGradeTrust === 'low' ? 30 : (userGradeTrust === 'high' ? 95 : userTrustScore)) >= 55 ? 'Moderate' : 'Requires Review'
              })`}
          />
        </div>
      </div>
    </div>
        </div >

  {/* AI Trust & Anomaly Routing Engine Modal */ }
  <AnimatePresence>
{
  isSubmitting && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
    >
      <div className="bg-[#FAF8F3] rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-[#1E3A5F] text-[#FAF8F3] rounded-xl">
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
  )
}
        </AnimatePresence >

  {/* Duplicate and Anomaly Warning Popup */ }
  <AnimatePresence>
{
  duplicateWarning && duplicateWarning.show && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-[#FAF8F3] rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-100 space-y-4">
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
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              // Remove duplicate line
              if (duplicateWarning.itemIndex !== undefined) {
                const newItems = [...items];
                if (newItems.length === 0) {
                  newItems.push({
                    id: Date.now(),
                    date: '',
                    category: categories[0]?.name || 'Local Travel',
                    amount: '',
                    tax: '',
                    desc: '',
                    billable: false,
                    currency: 'INR',
                    paymentMode: 'Personal Card',
                    projectCode: '',
                    merchantName: '',
                  }); 
                }
                setItems(newItems);
              }
              setDuplicateWarning(null);
            }}
            className="flex-1 py-3 bg-rose-600 text-[#FAF8F3] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-colors"
          >
            [ Remove Line ]
          </button>
          <button
            onClick={() => {
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
  )
}
        </AnimatePresence >

  {/* Success Modal */ }
  <AnimatePresence>
{
  isSuccess && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF8F3]/95 backdrop-blur-sm"
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
  )
}
        </AnimatePresence >
      </div >
    </div >
  );
};

// --- Sub-components ---

const StepItem = ({ active, done, num, label }: { active: boolean, done?: boolean, num: number, label: string }) => (
  <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${active ? 'bg-[#FAF8F3] shadow-md' : ''}`}>
    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${done ? 'bg-accent text-[#FAF8F3]' : active ? 'bg-accent text-[#FAF8F3]' : 'bg-slate-200 text-slate-500'

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
    <div className={`w-3.5 h-3.5 rounded-full border-2 ${status === 'pending' ? 'bg-[#FAF8F3] border-[#1E3A5F] ring-4 ring-slate-100' : 'bg-slate-200 border-[#FAF8F3]'}`} />
    <div>
      <p className="text-xs font-bold text-slate-900">{name}</p>
      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{role}</p>
    </div>
  </div>
);

const LiveCheck = ({ label, status, desc }: { label: string; status: 'pass' | 'warning' | 'skipped'; desc: string }) => {
  return (
    <div className="flex items-start gap-3 text-xs p-2 bg-slate-50 rounded-xl border border-slate-100">
      <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${status === 'pass' ? 'bg-emerald-500' : status === 'warning' ? 'bg-rose-500' : 'bg-slate-300'
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
    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${active ? 'bg-primary text-[#FAF8F3] border-primary scale-[1.02] shadow-lg shadow-primary/15' :
        completed ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-[#FAF8F3] text-slate-300 border-slate-100'
      }`}>
      <div className="flex items-center gap-3">
        <Icon size={16} className={active ? 'text-[#FAF8F3]' : completed ? 'text-emerald-500' : 'text-slate-300'} />
        <span className="text-[10px] font-black uppercase tracking-wider">{title}</span>
      </div>
      {completed && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
      {active && <div className="w-4 h-4 border-2 border-[#FAF8F3]/20 border-t-white rounded-full animate-spin shrink-0" />}
    </div>
  );
};
