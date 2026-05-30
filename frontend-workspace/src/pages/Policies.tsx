import React, { useState } from 'react';
import { useClaims, type Policy } from '../context/ClaimsContext';
import { 
  Save, 
  Sliders, 
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export const Policies: React.FC = () => {
  const { policies, updatePolicy } = useClaims();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState<number>(0);
  const [editBackdate, setEditBackdate] = useState<number>(0);
  const [editMandatory, setEditMandatory] = useState<boolean>(false);
  const [activeGrade, setActiveGrade] = useState<'L1' | 'L2' | 'L3' | 'L4'>('L2');

  const handleEditClick = (policy: Policy) => {
    setEditingCategory(policy.category);
    setEditLimit(policy.limit);
    setEditBackdate(policy.backdateLimitDays);
    setEditMandatory(policy.mandatoryAttachment);
  };

  const handleSave = (category: string) => {
    updatePolicy(category, {
      limit: editLimit,
      backdateLimitDays: editBackdate,
      mandatoryAttachment: editMandatory
    });
    setEditingCategory(null);
  };

  // Grade Tier templates that automatically scale policies
  const applyGradeTemplate = (grade: 'L1' | 'L2' | 'L3' | 'L4') => {
    setActiveGrade(grade);
    let scalar = 1.0;
    if (grade === 'L1') scalar = 0.6;
    if (grade === 'L3') scalar = 1.8;
    if (grade === 'L4') scalar = 3.0;

    // Apply scaling to the policies in context
    policies.forEach(p => {
      // Travel scale
      let newLimit = p.limit;
      if (p.category === 'Travel Expenses') newLimit = Math.round(50000 * scalar);
      else if (p.category === 'Meal and Entertainment') newLimit = Math.round(1500 * scalar);
      else if (p.category === 'Internet/Broadband Allowances') newLimit = Math.round(3000 * scalar);
      else if (p.category === 'Children Education Allowances') newLimit = Math.round(5000 * scalar);
      else if (p.category === 'Mileage Allowance') newLimit = Math.round(10000 * scalar);
      else if (p.category === 'Others') newLimit = Math.round(2000 * scalar);

      updatePolicy(p.category, { limit: newLimit });
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Corporate Policies</h2>
          <p className="text-slate-500 mt-2 font-medium">Configure spend limits, backdate thresholds, and receipt auditing parameters</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Category Policies Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Category Rules</h3>
              <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200">
                {policies.length} Categories
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {policies.map((policy) => {
                const isEditing = editingCategory === policy.category;

                return (
                  <div key={policy.category} className="p-6 hover:bg-slate-50/20 transition-all">
                    {isEditing ? (
                      /* EDIT MODE */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900">{policy.category}</h4>
                          <span className="text-[9px] font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase">Editing</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Spend Limit (₹)</label>
                            <input 
                              type="number" 
                              value={editLimit}
                              onChange={(e) => setEditLimit(parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs font-bold focus:outline-none focus:border-black"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Backdate Limit (Days)</label>
                            <input 
                              type="number" 
                              value={editBackdate}
                              onChange={(e) => setEditBackdate(parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs font-bold focus:outline-none focus:border-black"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Receipt Required</label>
                            <button
                              type="button"
                              onClick={() => setEditMandatory(!editMandatory)}
                              className="w-full py-2 bg-white border border-slate-250 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer"
                            >
                              {editMandatory ? (
                                <>
                                  <ToggleRight className="text-black" size={20} />
                                  <span>Mandatory</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="text-slate-400" size={20} />
                                  <span>Optional</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button 
                            onClick={() => setEditingCategory(null)}
                            className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleSave(policy.category)}
                            className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-1.5"
                          >
                            <Save size={12} />
                            Save Rules
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* VIEW MODE */
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900">{policy.category}</h4>
                          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                            <span>Limit: <strong className="text-slate-850">₹{policy.limit.toLocaleString('en-IN')}</strong></span>
                            <span>•</span>
                            <span>Audit Age: <strong className="text-slate-850">{policy.backdateLimitDays} Days</strong></span>
                            <span>•</span>
                            <span>Receipt: <strong className={policy.mandatoryAttachment ? 'text-indigo-650' : 'text-slate-400'}>{policy.mandatoryAttachment ? 'MANDATORY' : 'OPTIONAL'}</strong></span>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleEditClick(policy)}
                          className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-black hover:border-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Configure
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Grade Tier Presets Settings & Info */}
        <div className="space-y-6">
          {/* Grade Preset Settings */}
          <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Sliders size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest">Grade Policy Presets</h4>
                <p className="text-[10px] text-slate-400 uppercase font-black">Assign Category limits dynamically</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Toggling these tiers simulates assigning template policy guidelines according to employee hierarchy grades.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <GradeButton 
                  label="L1: Executive" 
                  active={activeGrade === 'L1'} 
                  onClick={() => applyGradeTemplate('L1')} 
                  desc="60% of std limits"
                />
                <GradeButton 
                  label="L2: Manager" 
                  active={activeGrade === 'L2'} 
                  onClick={() => applyGradeTemplate('L2')} 
                  desc="Standard limits"
                />
                <GradeButton 
                  label="L3: Director" 
                  active={activeGrade === 'L3'} 
                  onClick={() => applyGradeTemplate('L3')} 
                  desc="1.8x std limits"
                />
                <GradeButton 
                  label="L4: Vice Pres" 
                  active={activeGrade === 'L4'} 
                  onClick={() => applyGradeTemplate('L4')} 
                  desc="3.0x std limits"
                />
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[10px] text-indigo-900 leading-relaxed font-semibold">
              💡 <span className="font-black">Active Tier Note:</span> Limits on the left table will automatically scale depending on the selected Grade preset to showcase policy updates.
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4 shadow-xl">
            <h4 className="text-xs font-black uppercase tracking-widest text-yellow-400 flex items-center gap-1.5">
              <Sparkles size={14} className="animate-pulse" />
              Policy Coach Engine
            </h4>
            <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
              The AI Policy Coach monitors entries in real-time as claimants add line items, calculating dynamic warning alerts and preventing out-of-limit claim submissions before routing.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Sub-components ---

interface GradeButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  desc: string;
}

const GradeButton: React.FC<GradeButtonProps> = ({ label, active, onClick, desc }) => (
  <button 
    onClick={onClick}
    className={`p-3 text-left rounded-2xl border transition-all cursor-pointer ${
      active 
        ? 'bg-black text-white border-black shadow-lg shadow-black/10' 
        : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
    }`}
  >
    <p className="text-[10px] font-black uppercase tracking-wider">{label}</p>
    <p className={`text-[8px] mt-0.5 font-bold ${active ? 'text-slate-300' : 'text-slate-400'}`}>{desc}</p>
  </button>
);
