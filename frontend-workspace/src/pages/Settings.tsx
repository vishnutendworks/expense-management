import React, { useState, useEffect } from 'react';
import { useClaims } from '../context/ClaimsContext';
import { 
  User, 
  Mail, 
  Briefcase, 
  Shield, 
  Zap, 
  RotateCcw, 
  Sliders, 
  CheckCircle
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    globalRules, 
    updateGlobalRules, 
    userTrustScore, 
    resetUserTrustScore, 
    currentRole, 
    setRole,
    adjustUserTrustScore
  } = useClaims();

  // Load profile settings from localStorage or fall back to defaults
  const getProfileDefaults = (role: string) => {
    switch (role) {
      case 'manager':
        return { name: 'Sarah Chen', email: 'sarah@tendworks.com', department: 'Operations', employmentType: 'Full Time' };
      case 'finance':
        return { name: 'David Miller', email: 'david@tendworks.com', department: 'Finance', employmentType: 'Full Time' };
      case 'admin':
        return { name: 'Alex Sobel', email: 'alex@tendworks.com', department: 'IT/Admin', employmentType: 'Full Time' };
      default:
        return { name: 'Marcus Richardson', email: 'marcus@tendworks.com', department: 'Engineering', employmentType: 'Full Time' };
    }
  };

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('tendworks_profile');
    return saved ? JSON.parse(saved) : getProfileDefaults(currentRole);
  });

  // Sync profile if current role changes and no custom profile is saved
  useEffect(() => {
    const saved = localStorage.getItem('tendworks_profile');
    if (!saved) {
      setProfile(getProfileDefaults(currentRole));
    }
  }, [currentRole]);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('tendworks_profile', JSON.stringify(profile));
    alert('User Profile settings updated successfully!');
  };

  const handleToggleAutoRejection = (key: keyof typeof globalRules.autoRejection) => {
    const currentVal = globalRules.autoRejection[key];
    updateGlobalRules({
      autoRejection: {
        ...globalRules.autoRejection,
        [key]: !currentVal
      }
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Platform Settings</h2>
        <p className="text-slate-500 mt-2 font-medium">Manage user profiles, active views, trust metrics, and global automated rejection engines</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Profile & Automation Rules */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* User Profile Settings Card */}
          <div className="premium-card p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
              <User size={14} className="text-primary" />
              Corporate Profile settings
            </h3>

            <form onSubmit={handleProfileSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="email" 
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Department</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      value={profile.department}
                      onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Employment Type</label>
                  <div className="relative">
                    <Sliders className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <select 
                      value={profile.employmentType}
                      onChange={(e) => setProfile({ ...profile, employmentType: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-colors cursor-pointer appearance-none"
                    >
                      <option value="Full Time">Full Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                      <option value="Consultant">Consultant</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  className="bg-black text-[#FAF8F3] px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* AI Auto-Rejection Engines settings */}
          <div className="premium-card p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-slate-100">
                <Zap size={14} className="text-yellow-500" />
                Global Auto-Rejection Switches
              </h3>
              <p className="text-slate-500 text-[11px] mt-2 font-medium">Configure rules to instantly reject non-compliant claims before manual review workflows trigger.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                { 
                  key: 'missingAttachment', 
                  label: 'Missing Mandatory Attachments', 
                  desc: 'Auto-reject claim line items that do not include required receipts or authorization PDFs.'
                },
                { 
                  key: 'policyViolation', 
                  label: 'Enforce Out-Of-Hours & Weekends Policies', 
                  desc: 'Instantly reject claims filed on restricted holidays or weekends.'
                },
                { 
                  key: 'limitExceeded', 
                  label: 'Strict Budget Limit Restrictions', 
                  desc: 'Instantly reject claims that exceed category limits by more than the critical variance threshold.'
                },
                { 
                  key: 'invalidCategory', 
                  label: 'Unmatched OCR Merchant Mapping', 
                  desc: 'Reject claim items where the merchant classification is blacklisted or cannot be resolved.'
                }
              ].map(rule => (
                <div key={rule.key} className="py-4 flex items-center justify-between gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">{rule.label}</p>
                    <p className="text-[10px] text-slate-500 leading-normal font-medium">{rule.desc}</p>
                  </div>
                  <button
                    onClick={() => handleToggleAutoRejection(rule.key as any)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      globalRules.autoRejection[rule.key as keyof typeof globalRules.autoRejection] ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        globalRules.autoRejection[rule.key as keyof typeof globalRules.autoRejection] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: View Settings & Trust Controls */}
        <div className="space-y-8">
          
          {/* Active View / Simulation Role */}
          <div className="premium-card p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-slate-100">
              <Sliders size={14} className="text-primary" />
              View Preferences
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">Switch Active Role View</label>
                <div className="space-y-2">
                  {[
                    { id: 'employee', label: 'Employee Submitter' },
                    { id: 'manager', label: 'Reporting Manager' },
                    { id: 'finance', label: 'Financial Controller' },
                    { id: 'admin', label: 'System Administrator' }
                  ].map(role => (
                    <button
                      key={role.id}
                      onClick={() => setRole(role.id as any)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        currentRole === role.id 
                          ? 'bg-primary text-[#FAF8F3] border-primary shadow-md' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {role.label}
                      {currentRole === role.id && <CheckCircle size={14} className="text-yellow-400 animate-pulse" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submitter Integrity & Trust controls */}
          <div className="premium-card p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-slate-100">
              <Shield size={14} className="text-primary" />
              Trust Score Manager
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current Score Rating</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black text-slate-900">{userTrustScore}%</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    userTrustScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 
                    userTrustScore >= 55 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {userTrustScore >= 80 ? 'High Trust' : userTrustScore >= 55 ? 'Moderate' : 'Critical'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={resetUserTrustScore}
                  className="w-full py-2.5 bg-slate-50 border border-slate-200 hover:border-black rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer text-slate-700 hover:text-black"
                >
                  <RotateCcw size={13} />
                  Reset to Baseline
                </button>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Simulate Score Adjustments</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => adjustUserTrustScore('COMPLIANT_CLAIM_APPROVED')}
                      className="py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-200/50 cursor-pointer"
                    >
                      Approved (+2)
                    </button>
                    <button
                      onClick={() => adjustUserTrustScore('OCR_HIGH_CONFIDENCE')}
                      className="py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-200/50 cursor-pointer"
                    >
                      High OCR (+1)
                    </button>
                    <button
                      onClick={() => adjustUserTrustScore('STATEMENT_RECON_MISMATCH')}
                      className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-rose-200/50 cursor-pointer"
                    >
                      Mismatch (-20)
                    </button>
                    <button
                      onClick={() => adjustUserTrustScore('OCR_TAMPERING')}
                      className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-rose-200/50 cursor-pointer"
                    >
                      Tamper (-30)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
