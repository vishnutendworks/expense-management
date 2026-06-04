import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, ChevronRight, ChevronLeft, Save, X,
  Plus, Trash2, FileText, CheckCircle2, Eye, Paperclip,
  Loader2, Calendar, IndianRupee, Globe, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClaims, type Claim, type ExpenseItem } from '../context/ClaimsContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const AddExpense: React.FC = () => {
  const { addClaim, updateClaim, deleteClaim, categories, claims } = useClaims();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(0); // 0: Selection, 1: Basics, 2: Items
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [claimType, setClaimType] = useState<'single' | 'multiline' | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isRewriting, setIsRewriting] = useState(false);
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);

  const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
  const PAYMENT_MODES = ['Personal Card', 'Company Card', 'Cash', 'UPI'];
  const INVOICE_IDS = ['GENERAL', 'SALES-APAC', 'MARKETING-HQ', 'OPS-INDIA'];

  const [claimData, setClaimData] = useState<Partial<Claim>>({
    title: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    status: 'draft'
  });

  const [mainReceipt, setMainReceipt] = useState<File | null>(null);
  const [bankStatement] = useState<File | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stateDraft = location.state?.draftClaim as Claim | undefined;
    const persistedDraftStr = sessionStorage.getItem('active_edit_draft');
    const persistedDraft = persistedDraftStr ? JSON.parse(persistedDraftStr) as Claim : undefined;
    const draft = stateDraft || persistedDraft;

    if (draft && (draft.id !== claimData.id || !isRewriting)) {
      setIsLoadingDraft(true);
      setTimeout(() => {
        setClaimData({
          id: draft.id,
          description: draft.description,
          title: draft.title,
          category: draft.category,
          date: draft.date,
          items: draft.items,
          status: draft.status
        });
        setClaimType(draft.items && draft.items.length > 1 ? 'multiline' : 'single');
        setSelectedCategories(draft.category ? draft.category.split(', ') : []);
        setIsRewriting(true);
        
        setStep(draft.lastStep || 1); 
        
        setShowRestoredBanner(true);
        setIsLoadingDraft(false);
        sessionStorage.setItem('active_edit_draft', JSON.stringify(draft));
        setClaimData(prev => ({ ...prev, receiptUploaded: true }));
      }, 600);
    }
  }, [location.state]);

  useEffect(() => {
    if (isRewriting && claimData.status === 'draft') { 
      const currentDraft = {
        ...claimData,
        lastStep: step,
        category: claimType === 'multiline' ? selectedCategories.join(', ') : (selectedCategories[0] || '')
      };
      sessionStorage.setItem('active_edit_draft', JSON.stringify(currentDraft));

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        handleFinalAction(true, false);
      }, 5000); // Auto-save every 5 seconds of inactivity
    }
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [claimData, step, selectedCategories]);

  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard this draft? This action cannot be undone.")) {
      sessionStorage.removeItem('active_edit_draft');
      if (claimData.id) deleteClaim(claimData.id);
      navigate('/my-claims');
    }
  };

  const handleCategoryToggle = (catName: string) => {
    if (selectedCategories.includes(catName)) {
      setSelectedCategories(prev => prev.filter(c => c !== catName));
    } else if (selectedCategories.length < (claimType === 'multiline' ? 20 : 1)) {
      setSelectedCategories(prev => [...prev, catName]);
    }
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMainReceipt(file);
    setIsUploading(true);

    setTimeout(() => {
      const mockExtractedItems: ExpenseItem[] = [
        {
          id: Date.now(),
          expense_date: new Date().toISOString().split('T')[0],
          merchant_name: "Indigo Airlines",
          category: selectedCategories[0] || "Travel",
          amount: "1250.00",
          currency_code: "INR",
          payment_mode: "Personal Card",
          project_cost_centre: "Sales-IN",
          description: "Lunch with client",
          ocrConfirmed: true,
          receipt_file: file.name,
        }
      ];
      
      setClaimData(prev => ({
        ...prev,
        items: mockExtractedItems,
        receiptUploaded: true
      }));
      setIsUploading(false);
    }, 1800);
  };



  const handleUpdateItem = (id: number, field: keyof ExpenseItem, value: any) => {
    setClaimData(prev => ({
      ...prev,
      items: prev.items?.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleAddManualItem = () => {
    const newItem: ExpenseItem = {
      id: Date.now(),
      expense_date: new Date().toISOString().split('T')[0],
      merchant_name: "",
      category: selectedCategories[0] || categories[0]?.name || 'General',
      amount: "",
      currency_code: "INR",
      payment_mode: "Personal Card",
      project_cost_centre: "GENERAL",
      description: "",
    };
    setClaimData(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const handleRemoveItem = (id: number) => {
    setClaimData(prev => ({ ...prev, items: prev.items?.filter(item => item.id !== id) }));
  };

  const calculateTotal = () => {
    return claimData.items?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0;
  };

  const handleFinalAction = (isDraft: boolean, shouldRedirect: boolean = true) => {
    const finalCategory = claimType === 'multiline' 
      ? selectedCategories.join(', ') 
      : (selectedCategories[0] || 'General');

    const newClaim: Claim = {
      id: claimData.id || `CLM-${Date.now()}`,
      title: claimData.title || 'Untitled Expense',
      category: finalCategory,
      projectCode: 'GENERAL',
      startDate: claimData.date || '',
      endDate: claimData.date || '',
      totalAmount: `₹${calculateTotal().toLocaleString('en-IN')}`,
      status: isDraft ? 'draft' : 'submitted',
      date: claimData.date || '',
      lastStep: step, // Crucial for restoration
      items: claimData.items || [],
      receiptUploaded: !!(mainReceipt || claimData.receiptUploaded),
      receipt_url: mainReceipt ? URL.createObjectURL(mainReceipt) : (claimData as any).receipt_url,
      bankStatementUploaded: !!(bankStatement || claimData.bankStatementUploaded),
      bank_statement_url: bankStatement ? URL.createObjectURL(bankStatement) : (claimData as any).bank_statement_url,
      trustScore: 85,
      riskCategory: 'low'
    };

    if (claimData.id && claims.some(c => c.id === claimData.id)) {
      updateClaim(newClaim);
    } else {
      addClaim(newClaim);
    }

    if (!isDraft) {
      sessionStorage.removeItem('active_edit_draft');
    }

    if (shouldRedirect) navigate('/my-claims');
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <AnimatePresence>
        {showRestoredBanner && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <p className="text-sm font-bold text-emerald-800 uppercase tracking-tight">Draft restored successfully. You have been returned to the last step you were working on.</p>
            </div>
            <button onClick={() => setShowRestoredBanner(false)} className="text-emerald-400 hover:text-emerald-600"><X size={18} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoadingDraft ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-12 bg-slate-100 rounded-2xl w-1/3" />
          <div className="h-64 bg-slate-100 rounded-3xl w-full" />
          <div className="h-20 bg-slate-100 rounded-2xl w-full" />
        </div>
      ) : (
        <>
      {step === 0 && (
        <div className="space-y-8 py-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Create New Claim</h2>
            <p className="text-slate-500 font-medium">Select how you want to file your expenses</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => { setClaimType('single'); setStep(1); }}
              className="premium-card p-8 text-left hover:border-[#1E3A5F] transition-all group"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <h3 className="font-black text-slate-900 uppercase mb-2">Single Expense</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Fast track a single receipt for reimbursement.</p>
            </button>
            <button 
              onClick={() => { setClaimType('multiline'); setStep(1); }}
              className="premium-card p-8 text-left hover:border-[#1E3A5F] transition-all group"
            >
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <h3 className="font-black text-slate-900 uppercase mb-2">Multi-line Claim</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Group multiple receipts under one business trip or project.</p>
            </button>
          </div>
        </div>
      )}

      {step > 0 && (
        <div className="flex items-center gap-6 mb-10 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${step >= 1 ? 'bg-[#1E3A5F] text-white shadow-lg shadow-[#1E3A5F]/20' : 'bg-slate-100 text-slate-400'}`}>1</div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${step >= 1 ? 'text-[#1E3A5F]' : 'text-slate-400'}`}>Basics & Receipt</span>
          </div>
          <div className="h-px flex-1 bg-slate-100" />
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${step >= 2 ? 'bg-[#1E3A5F] text-white shadow-lg shadow-[#1E3A5F]/20' : 'bg-slate-100 text-slate-400'}`}>2</div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${step >= 2 ? 'text-[#1E3A5F]' : 'text-slate-400'}`}>Line Items</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="premium-card p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Purpose of Claim</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Travel to HQ for training"
                    value={claimData.title}
                    onChange={e => setClaimData({...claimData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    {claimType === 'multiline' ? 'Claim Categories (Multi-select)' : 'Claim Category'}
                  </label>
                  <div className="border border-slate-200 rounded-xl p-2 min-h-[46px] bg-slate-50/30 transition-all">
                    <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                      {selectedCategories.length === 0 && (
                        <span className="text-[10px] text-slate-400 font-bold px-1 py-1 italic uppercase tracking-widest">Pick a category below...</span>
                      )}
                      {selectedCategories.map(cat => (
                        <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1E3A5F] text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm border border-[#1E3A5F]">
                          {cat}
                          <button type="button" onClick={() => handleCategoryToggle(cat)} className="hover:bg-white/20 rounded-full p-0.5 transition-all">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                      {categories.map(c => {
                        const isSelected = selectedCategories.includes(c.name);
                        const isMaxReached = claimType === 'multiline' ? selectedCategories.length >= 20 : selectedCategories.length >= 1;
                        if (isSelected) return null;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleCategoryToggle(c.name)}
                            disabled={isMaxReached}
                            className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border transition-all 
                              bg-white text-slate-500 border-slate-200 hover:border-[#1E3A5F] hover:text-[#1E3A5F]
                              ${isMaxReached ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <Plus size={8} className="inline mr-1" />
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Receipt Upload</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    onChange={handleReceiptChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all ${mainReceipt ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 group-hover:border-[#1E3A5F] group-hover:bg-slate-50'}`}>
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-[#1E3A5F]" size={40} />
                        <p className="text-xs font-black text-[#1E3A5F] uppercase tracking-widest">AI Extraction in Progress...</p>
                      </div>
                    ) : (mainReceipt || (isRewriting && claimData.items?.length)) ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-2">
                          <CheckCircle2 size={28} />
                        </div>
                        <p className="font-black text-slate-900 text-sm">{mainReceipt?.name || 'Receipt Restored from Draft'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Receipt verified & scanned</p>
                        {mainReceipt && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(URL.createObjectURL(mainReceipt), '_blank');
                            }}
                            className="relative z-20 mt-2 flex items-center gap-1.5 text-[10px] font-black text-[#1E3A5F] uppercase hover:underline cursor-pointer"
                          >
                            <Eye size={12} /> Preview Receipt
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-[#1E3A5F] group-hover:bg-white transition-all shadow-sm">
                          <Upload size={28} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Upload claim receipt</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">OCR will automatically populate items</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button 
                onClick={() => { setStep(0); setSelectedCategories([]); }}
                className="px-8 py-4 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Back
              </button>
              <button 
                onClick={() => setStep(2)}
                disabled={!mainReceipt || !claimData.title || selectedCategories.length === 0}
                className="flex items-center gap-2 px-10 py-4 bg-[#1E3A5F] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-[#1E3A5F]/20"
              >
                Next: Verify Items <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Review Extracted Data</p>
              <button 
                onClick={handleAddManualItem}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer"
              >
                <Plus size={14} /> Add Manual Item
              </button>
            </div>

            {claimData.items?.map((item, idx) => (
              <div key={item.id} className="premium-card p-6 border-l-4 border-l-[#1E3A5F] space-y-6">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center text-[#1E3A5F] font-black text-xs">{idx + 1}</div>
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest">Expense Details</h4>
                  </div>
                  <button 
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Merchant / Vendor</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input 
                        type="text" 
                        className="form-input pl-9 text-xs font-bold" 
                        value={item.merchant_name} 
                        onChange={(e) => handleUpdateItem(item.id, 'merchant_name', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount (INR)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input 
                        type="text" 
                        className="form-input pl-9 text-xs font-black" 
                        value={item.amount} 
                        onChange={(e) => handleUpdateItem(item.id, 'amount', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input 
                        type="date" 
                        className="form-input pl-9 text-xs font-bold" 
                        value={item.expense_date} 
                        onChange={(e) => handleUpdateItem(item.id, 'expense_date', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                    <select 
                      className="form-input text-xs font-bold" 
                      value={item.category}
                      onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                    >
                      {categories.filter(c => selectedCategories.length === 0 || selectedCategories.includes(c.name)).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Mode</label>
                    <select 
                      className="form-input text-xs font-bold" 
                      value={item.payment_mode}
                      onChange={(e) => handleUpdateItem(item.id, 'payment_mode', e.target.value)}
                    >
                      {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Currency</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <select 
                        className="form-input pl-9 text-xs font-bold" 
                        value={item.currency_code}
                        onChange={(e) => handleUpdateItem(item.id, 'currency_code', e.target.value)}
                      >
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoice ID / Cost Center</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <select 
                        className="form-input pl-9 text-xs font-bold" 
                        value={item.project_cost_centre}
                        onChange={(e) => handleUpdateItem(item.id, 'project_cost_centre', e.target.value)}
                      >
                        {INVOICE_IDS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea 
                    className="form-input text-xs font-medium min-h-[60px] resize-none"
                    value={item.description}
                    onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                    placeholder="Purpose of expense..."
                  />
                </div>

                {/* ITEM DOCUMENTATION REVIEW SECTION */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip size={14} className="text-slate-400" />
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Line Item Evidence</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Item Receipt */}
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 group hover:border-black transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-800 uppercase">Receipt Review</p>
                        {item.receipt_file && (
                          <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Attached</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 text-[10px] font-bold text-slate-500 truncate">
                          {item.receipt_file || "No receipt selected"}
                        </div>
                        {item.receipt_file && (
                          <button 
                            type="button" 
                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-black transition-colors shadow-sm"
                            title="Preview File"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Item Bank Info */}
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 hover:border-blue-600 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-800 uppercase">Bank Verification</p>
                        <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">Verified</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 text-[10px] font-bold text-slate-500 truncate">
                          Linked to Statement Batch
                        </div>
                        <button type="button" className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-colors shadow-sm">
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ))}

            <div className="bg-slate-50 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Claim Amount</p>
                <p className="text-2xl font-black text-[#1E3A5F]">₹{calculateTotal().toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t border-slate-100">
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-8 py-3.5 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                <ChevronLeft size={16} /> Change Receipt
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDiscard}
                  className="px-6 py-4 text-rose-500 font-black uppercase tracking-widest text-[10px] hover:bg-rose-50 rounded-2xl transition-all"
                >
                  Discard Draft
                </button>
                <button 
                  onClick={() => handleFinalAction(true, true)}
                  className="px-8 py-4 border border-[#1E3A5F] text-[#1E3A5F] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Save as Draft
                </button>
                <button 
                  onClick={() => handleFinalAction(false, true)}
                  className="flex items-center gap-3 px-10 py-4 bg-[#1E3A5F] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-[#1E3A5F]/30"
                >
                  Submit for Approval <Save size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
};