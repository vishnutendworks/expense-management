import React, { useState } from 'react';
import {
  Plus, Tag, Edit2, Trash2, Globe, CheckCircle2, Clock, Search, 
  ChevronRight, X, Save, Send, Shield, Users, 
  Paperclip, Settings2, GitPullRequest
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClaims, type Category, type GlobalRules } from '../context/ClaimsContext';


const BLANK_CATEGORY: Omit<Category, 'id'> = {
  name: '',
  description: '',
  allowedRoles: ['All'],
  allowedDepartments: ['All'],
  allowedEmploymentTypes: ['Full Time'],
  limits: { perTransaction: 0, perTransactionUnlimited: false, perDay: 0, perMonth: 0, perTrip: 0 },
  weekendsAllowed: false,
  holidaysAllowed: false,
  mandatoryAttachments: [],
  approvalChain: ['Manager'],
  approvalChainHighValue: ['Manager', 'Finance'],
  escalationThreshold: 50000,
  backdateLimitDays: 30,
  effectiveDate: new Date().toISOString().split('T')[0],
  status: 'draft',
};

const ROLE_OPTIONS    = ['All', 'Employee', 'Manager', 'Driver', 'Field Executive', 'Intern'];
const DEPT_OPTIONS    = ['All', 'Engineering', 'Sales', 'Operations', 'Finance', 'HR', 'Marketing'];
const EMPLOYMENT_OPTIONS = ['Full Time', 'Contract', 'Intern', 'Consultant'];
const ATTACH_OPTIONS  = ['receipt', 'invoice', 'travel_authorization', 'manager_approval_email'];
const CHAIN_OPTIONS   = ['Manager', 'Finance', 'HR', 'Admin', 'CFO'];

export const Categories: React.FC = () => {
  const { categories, globalRules, addCategory, updateCategory, deleteCategory, publishCategory, updateGlobalRules } = useClaims();

  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [editingCat, setEditingCat]           = useState<Category | null>(null);
  const [publishTarget, setPublishTarget]     = useState<{ id: string; name: string } | null>(null);
  const [publishDate, setPublishDate]         = useState(new Date().toISOString().split('T')[0]);
  const [showGlobalRules, setShowGlobalRules] = useState(false);
  const [isSavingGlobal, setIsSavingGlobal]   = useState(false);
  const [globalDraft, setGlobalDraft]         = useState<GlobalRules>(globalRules);
  const [filterStatus, setFilterStatus]       = useState<'all' | 'draft' | 'published'>('all');
  const [searchTerm, setSearchTerm]           = useState('');

  const filtered = categories.filter(c => 
    (filterStatus === 'all' || c.status === filterStatus) &&
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openCreate = () => { setEditingCat(null); setIsModalOpen(true); };
  const openEdit   = (cat: Category) => { setEditingCat(cat); setIsModalOpen(true); };

  const handlePublish = () => {
    if (!publishTarget) return;
    publishCategory(publishTarget.id, publishDate);
    setPublishTarget(null);
  };

  const handleSaveGlobalRules = async () => {
    setIsSavingGlobal(true);
    await new Promise(r => setTimeout(r, 600)); // Simulate API feedback
    updateGlobalRules(globalDraft);
    setIsSavingGlobal(false);
    setShowGlobalRules(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Administration</p>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Expense Categories</h2>
          <p className="text-slate-500 mt-1 font-medium text-sm">Configure categories, limits, approval chains and publish with an effective date.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setGlobalDraft(globalRules); setShowGlobalRules(v => !v); }}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-black hover:bg-slate-50 transition-all uppercase tracking-widest"
          >
            <Settings2 size={15} />
            Global Rules
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all uppercase tracking-widest shadow-lg shadow-[#1E3A5F]/20"
          >
            <Plus size={15} />
            Add Category
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showGlobalRules && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="premium-card p-6 space-y-5 border-l-4 border-l-[#1E3A5F] shadow-xl mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-[#1E3A5F]" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Global Expense Rules</h3>
                </div>
                <button onClick={() => setShowGlobalRules(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <LimitField
                  label="Backdate Limit (days)"
                  value={globalDraft.backdateLimitDays}
                  onChange={v => setGlobalDraft(p => ({ ...p, backdateLimitDays: v }))}
                  prefix="days"
                />
                <LimitField
                  label="Escalation Threshold (₹)"
                  value={globalDraft.escalationThreshold}
                  onChange={v => setGlobalDraft(p => ({ ...p, escalationThreshold: v }))}
                  prefix="₹"
                />
                <LimitField
                  label="Require Receipt Above (₹)"
                  value={globalDraft.requireReceiptAbove}
                  onChange={v => setGlobalDraft(p => ({ ...p, requireReceiptAbove: v }))}
                  prefix="₹"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button onClick={() => setShowGlobalRules(false)} className="px-4 py-2 text-xs font-black text-slate-500 hover:text-slate-700 uppercase tracking-widest">Cancel</button>
                <button
                  onClick={handleSaveGlobalRules}
                  className="flex items-center gap-2 px-5 py-2 bg-[#1E3A5F] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                  disabled={isSavingGlobal}
                >
                  {isSavingGlobal ? <Clock className="animate-spin" size={14} /> : <Save size={14} />}
                  {isSavingGlobal ? 'Saving...' : 'Save Rules'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Categories', value: categories.length, icon: Tag, color: 'bg-slate-900 text-white' },
          { label: 'Published',        value: categories.filter(c => c.status === 'published').length, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
          { label: 'Draft',            value: categories.filter(c => c.status === 'draft').length,     icon: Clock,        color: 'bg-amber-50 text-amber-700 border border-amber-200' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`${s.color} rounded-2xl p-5 flex items-center justify-between`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.label}</p>
              <p className="text-3xl font-black mt-0.5">{s.value}</p>
            </div>
            <s.icon size={28} className="opacity-20" />
          </motion.div>
        ))}
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/10 focus:border-[#1E3A5F] transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
        {(['all', 'published', 'draft'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filterStatus === s ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {s === 'all' ? 'All' : s}
            <span className="ml-1.5 opacity-60">
              {s === 'all' ? categories.length : categories.filter(c => c.status === s).length}
            </span>
          </button>
        ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <AnimatePresence>
          {filtered.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1E3A5F]/10 rounded-xl flex items-center justify-center">
                    <Tag size={18} className="text-[#1E3A5F]" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{cat.name}</h4>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      cat.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {cat.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#1E3A5F] transition-all">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] premium-card p-6 space-y-4 group">
                {[
                  ['Per Transaction', cat.limits.perTransaction],
                  ['Per Day',         cat.limits.perDay],
                  ['Per Month',       cat.limits.perMonth],
                  ['Per Trip',        cat.limits.perTrip],
                ].map(([label, val]) => (
                  <div key={String(label)} className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-slate-400 font-black text-[9px] uppercase tracking-wider">{label}</p>
                    <p className="font-black text-slate-900 mt-0.5">₹{Number(val).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">Std Approval:</span>
                  <div className="flex flex-wrap gap-1 items-center">
                    {cat.approvalChain.map((a, idx) => (
                      <React.Fragment key={a}>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-wider rounded-full border border-blue-100">
                          {a}
                        </span>
                        {idx < cat.approvalChain.length - 1 && <ChevronRight size={10} className="text-slate-300" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                {cat.approvalChainHighValue && cat.approvalChainHighValue.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">Escalated:</span>
                    <div className="flex flex-wrap gap-1 items-center">
                      {cat.approvalChainHighValue.map((a, idx) => (
                        <React.Fragment key={a}>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-wider rounded-full border border-indigo-100">
                            {a}
                          </span>
                          {idx < cat.approvalChainHighValue.length - 1 && <ChevronRight size={10} className="text-slate-300" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
                {cat.mandatoryAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cat.mandatoryAttachments.map(a => (
                      <span key={a} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-black uppercase tracking-wider rounded-full border border-purple-100 flex items-center gap-1">
                        <Paperclip size={9} /> {a.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                  <span className={cat.weekendsAllowed ? 'text-emerald-600' : 'text-slate-300'}>
                    ✓ Weekends
                  </span>
                  <span className={cat.holidaysAllowed ? 'text-emerald-600' : 'text-slate-300'}>
                    ✓ Holidays
                  </span>
                </div>
                {cat.status === 'draft' ? (
                  <button
                    onClick={() => setPublishTarget({ id: cat.id, name: cat.name })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                  >
                    <Send size={11} /> Publish
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-black">
                    <CheckCircle2 size={12} />
                    Effective {cat.effectiveDate}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        </div>
        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="col-span-3 py-20 flex flex-col items-center gap-4 text-center">
            <Tag size={40} className="text-slate-200" />
            <p className="font-black text-slate-400">No categories found. Create your first one.</p>
            <button onClick={openCreate} className="px-6 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-xs font-black uppercase tracking-widest">
              + Add Category
            </button>
          </div>
        )}
      <AnimatePresence>
        {isModalOpen && (
          <CategoryModal
            initial={editingCat}
            onClose={() => setIsModalOpen(false)}
            onSave={(data) => {
              if (editingCat) updateCategory(editingCat.id, data);
              else addCategory(data as Omit<Category, 'id'>);
              setIsModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {publishTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-2xl flex items-center justify-center">
                  <Send size={22} className="text-[#1E3A5F]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">Publish Category</h3>
                  <p className="text-sm text-slate-500 font-medium">"{publishTarget.name}"</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Effective Date</label>
                <input
                  type="date"
                  value={publishDate}
                  onChange={e => setPublishDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#1E3A5F]"
                />
                <p className="text-[11px] text-slate-400 font-medium">
                  The category will go live and be available for employees to use from this date.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setPublishTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handlePublish} className="flex-1 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                  <CheckCircle2 size={15} /> Confirm Publish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CategoryModalProps {
  initial: Category | null;
  onClose: () => void;
  onSave: (data: Partial<Category>) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ initial, onClose, onSave }) => {
  const [form, setForm] = useState<Omit<Category, 'id'>>(
    initial ? { ...initial } : { ...BLANK_CATEGORY }
  );
  const [activeSection, setActiveSection] = useState<string>('basics');

  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const sections = [
    { key: 'basics',      label: 'Basic Information', icon: Tag },
    { key: 'eligibility', label: 'Eligibility',       icon: Users },
    { key: 'limits',      label: 'Expense Limits',    icon: Shield },
    { key: 'attachments', label: 'Mandatory Docs',    icon: Paperclip },
    { key: 'approvals',   label: 'Approval Chains',   icon: GitPullRequest },
    { key: 'rules',       label: 'Rules & Logic',     icon: Globe },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl flex overflow-hidden border border-white"
        style={{ maxHeight: '90vh' }}
      >
        <div className="w-64 bg-slate-50/50 border-r border-slate-100 p-6 space-y-2 shrink-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 mb-6">Config Steps</p>
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black text-left transition-all ${
                activeSection === s.key
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <s.icon size={15} />
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Modal header */}
          <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-black text-slate-900">{initial ? 'Edit Category' : 'Create Category'}</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Configure policy attributes for {form.name || 'new category'}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8">


            {activeSection === 'basics' && (
              <div className="space-y-5">
                <FormField label="Category Name">
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Local Travel, Lodging, Fuel…"
                    className="form-input"
                  />
                </FormField>
                <FormField label="Category Description">
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe how this category should be used by employees..."
                    className="form-input min-h-[100px] resize-none"
                  />
                </FormField>
                <FormField label="Status">
                  <div className="flex gap-3">
                    {(['draft', 'published'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setForm(p => ({ ...p, status: s }))}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                          form.status === s
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </FormField>
                <FormField label="Effective Date">
                  <input
                    type="date"
                    value={form.effectiveDate}
                    onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))}
                    className="form-input"
                  />
                </FormField>
              </div>
            )}

            {activeSection === 'limits' && (
              <div className="space-y-8">
                <div className="space-y-5">
                  <p className="text-xs text-slate-400 font-medium">Set maximum claimable amounts per time period.</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.limits.perTransactionUnlimited} onChange={e => setForm({...form, limits: {...form.limits, perTransactionUnlimited: e.target.checked}})} 
                      className="w-4 h-4 accent-emerald-600 rounded" 
                    />
                    <span className="text-[10px] font-black uppercase text-slate-600">No Per-Transaction Limit</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Per Transaction (₹)', key: 'perTransaction', disabled: form.limits.perTransactionUnlimited },
                    { label: 'Per Day (₹)',          key: 'perDay' },
                    { label: 'Per Month (₹)',         key: 'perMonth' },
                    { label: 'Per Trip (₹)',          key: 'perTrip' },
                  ].map(f => (
                    <FormField key={f.key} label={f.label}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                        <input
                          type="number"
                          value={(form.limits as any)[f.key]}
                          disabled={(f as any).disabled}
                          onChange={e => setForm(p => ({
                            ...p,
                            limits: { ...p.limits, [f.key]: parseFloat(e.target.value) || 0 }
                          }))}
                          className="form-input pl-7 disabled:bg-slate-50 disabled:text-slate-300"
                          placeholder="0"
                        />
                      </div>
                    </FormField>
                  ))}
                </div>
                <FormField label="Escalation Threshold (₹)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      value={form.escalationThreshold}
                      onChange={e => setForm(p => ({ ...p, escalationThreshold: parseFloat(e.target.value) || 0 }))}
                      className="form-input pl-7"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">Claims above this amount will be escalated to Finance for additional approval.</p>
                </FormField>
              </div>
            )}

            {activeSection === 'eligibility' && (
              <div className="space-y-6">
                <FormField label="Allowed Roles">
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map(role => (
                      <BadgeToggle key={role} label={role} active={form.allowedRoles?.includes(role) || false} onClick={() => setForm({...form, allowedRoles: toggle(form.allowedRoles || [], role)})} />
                    ))}
                  </div>
                </FormField>
                <FormField label="Allowed Departments">
                  <div className="flex flex-wrap gap-2">
                    {DEPT_OPTIONS.map(dept => (
                      <BadgeToggle key={dept} label={dept} active={form.allowedDepartments?.includes(dept) || false} onClick={() => setForm({...form, allowedDepartments: toggle(form.allowedDepartments || [], dept)})} />
                    ))}
                  </div>
                </FormField>
                <FormField label="Allowed Employment Types">
                  <div className="flex flex-wrap gap-2">
                    {EMPLOYMENT_OPTIONS.map(type => (
                      <BadgeToggle key={type} label={type} active={form.allowedEmploymentTypes?.includes(type) || false} onClick={() => setForm({...form, allowedEmploymentTypes: toggle(form.allowedEmploymentTypes || [], type)})} />
                    ))}
                  </div>
                </FormField>
              </div>
            )}

            {activeSection === 'attachments' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  {ATTACH_OPTIONS.map(att => (
                    <label key={att} className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-[#1E3A5F]/50 hover:bg-slate-50 transition-all">
                      <input
                        type="checkbox"
                        checked={form.mandatoryAttachments.includes(att)}
                        onChange={() => setForm(p => ({ ...p, mandatoryAttachments: toggle(p.mandatoryAttachments, att) }))}
                        className="w-4 h-4 accent-[#1E3A5F] rounded"
                      />
                      <div>
                        <p className="text-xs font-black text-slate-800 capitalize">{att.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Required document</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'approvals' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Standard Approval Chain (Tier 1)
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Flow for normal expense claims (within/below escalation threshold).
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CHAIN_OPTIONS.map(approver => (
                      <label key={`std-${approver}`} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-[#1E3A5F]/50 hover:bg-slate-50 transition-all">
                        <input
                          type="checkbox"
                          checked={form.approvalChain.includes(approver)}
                          onChange={() => setForm(p => ({ ...p, approvalChain: toggle(p.approvalChain, approver) }))}
                          className="w-4 h-4 accent-[#1E3A5F] rounded"
                        />
                        <span className="text-xs font-bold text-slate-800">{approver}</span>
                        {form.approvalChain.includes(approver) && (
                          <span className="ml-auto text-[9px] font-black text-[#1E3A5F] bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Step {form.approvalChain.indexOf(approver) + 1}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    High-Value / Escalated Approval Chain (Tier 2)
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Flow triggered for claims exceeding the category escalation threshold (₹{form.escalationThreshold.toLocaleString('en-IN')}).
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CHAIN_OPTIONS.map(approver => (
                      <label key={`high-${approver}`} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-[#1E3A5F]/50 hover:bg-slate-50 transition-all">
                        <input
                          type="checkbox"
                          checked={form.approvalChainHighValue?.includes(approver) || false}
                          onChange={() => setForm(p => ({
                            ...p,
                            approvalChainHighValue: toggle(p.approvalChainHighValue || [], approver)
                          }))}
                          className="w-4 h-4 accent-[#1E3A5F] rounded"
                        />
                        <span className="text-xs font-bold text-slate-800">{approver}</span>
                        {form.approvalChainHighValue?.includes(approver) && (
                          <span className="ml-auto text-[9px] font-black text-[#1E3A5F] bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Step {form.approvalChainHighValue.indexOf(approver) + 1}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'rules' && (
              <div className="space-y-5">
                <LimitField label="Backdate Limit (days)" value={form.backdateLimitDays} onChange={v => setForm({...form, backdateLimitDays: v})} />
                <RuleGroup label="Weekend Claims" value={form.weekendsAllowed ? 'allowed' : 'not_allowed'} onChange={v => setForm({...form, weekendsAllowed: v === 'allowed'})} />
                <RuleGroup label="Holiday Claims" value={form.holidaysAllowed ? 'allowed' : 'not_allowed'} onChange={v => setForm({...form, holidaysAllowed: v === 'allowed'})} />
              </div>
            )}
          </div>

          <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex gap-2">
              {sections.map(s => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`w-2 h-2 rounded-full transition-all ${activeSection === s.key ? 'bg-[#1E3A5F] w-5' : 'bg-slate-200'}`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => onSave(form)}
                disabled={!form.name.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                {initial ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const BadgeToggle: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
    active ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-500 hover:text-emerald-600'
  }`}>
    {label}
  </button>
);

const RuleGroup: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="p-6 border border-slate-100 rounded-[2rem] space-y-4">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <div className="flex gap-3">
      {['allowed', 'not_allowed', 'approval_required'].map(opt => (
        <button key={opt} onClick={() => onChange(opt)} 
          className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${
            value === opt ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-300'
          }`}
        >
          {opt.replace('_', ' ')}
        </button>
      ))}
    </div>
    <p className="text-[10px] text-slate-400 font-medium">
      {value === 'allowed' && `Claims submitted on ${label.toLowerCase()} will be processed normally.`}
      {value === 'not_allowed' && `Claims submitted on ${label.toLowerCase()} will be auto-rejected.`}
      {value === 'approval_required' && `Claims on ${label.toLowerCase()} will require additional manager justification.`}
    </p>
  </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

const LimitField: React.FC<{ label: string; value: number; onChange: (v: number) => void; prefix?: string }> = ({ label, value, onChange, prefix }) => (
  <FormField label={label}>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className={`form-input ${prefix ? 'pl-7' : ''}`}
      />
    </div>
  </FormField>
);
