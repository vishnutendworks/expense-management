import React from 'react';
import { Bell, Settings, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useClaims } from '../../context/ClaimsContext';

export const Navbar: React.FC = () => {
  const { currentRole, setRole, notifications } = useClaims();
  const navigate = useNavigate();
  const unreadCount = notifications.length;

  const roleMeta = {
<<<<<<< HEAD
    employee: { name: 'Arjun Sharma', label: 'Employee Submitter', seed: 'Arjun' },
    manager: { name: 'Priya Nair', label: 'Reporting Manager', seed: 'Priya' },
    finance: { name: 'Rahul Mehta', label: 'Financial Controller', seed: 'Rahul' },
    admin: { name: 'Sneha Patel', label: 'System Admin', seed: 'Sneha' },
=======
    employee: { name: 'Marcus Richardson', label: 'Employee Submitter', seed: 'Marcus' },
    manager: { name: 'Sarah Chen', label: 'Reporting Manager', seed: 'Sarah' },
    finance: { name: 'David Miller', label: 'Financial Controller', seed: 'David' },
    admin: { name: 'Alex Sobel', label: 'System Admin', seed: 'Alex' },
>>>>>>> main
  };

  const meta = roleMeta[currentRole] || roleMeta.employee;

  return (
<<<<<<< HEAD
    <header className="h-20 border-b border-slate-100 bg-[#FAF8F3]/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
=======
    <header className="h-20 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
>>>>>>> main
      {/* Brand Identity / Search replacement with Role Selector */}
      <div className="flex items-center gap-4">
        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Demo Role Switcher:</label>
        <select 
          value={currentRole}
          onChange={(e) => {
            const chosen = e.target.value as any;
            setRole(chosen);
            if (chosen === 'employee') navigate('/my-claims');
            else if (chosen === 'manager') navigate('/approvals');
            else if (chosen === 'finance') navigate('/reimbursements');
            else navigate('/dashboard');
          }}
<<<<<<< HEAD
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#1E3A5F] cursor-pointer"
=======
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black cursor-pointer"
>>>>>>> main
        >
          <option value="employee">Employee View (Submitter)</option>
          <option value="manager">Manager View (Approver)</option>
          <option value="finance">Finance View (Controller)</option>
          <option value="admin">System Admin (Policies/Config)</option>
        </select>
      </div>

      <div className="flex items-center gap-4">
        <Link 
          to="/notifications" 
          className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors relative"
          title="Notifications Alert Queue"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
<<<<<<< HEAD
            <span className="absolute top-1.5 right-1.5 bg-red-500 text-[8px] font-black text-[#FAF8F3] px-1 py-0.25 rounded-full border-2 border-[#FAF8F3] min-w-4 h-4 flex items-center justify-center animate-bounce">
=======
            <span className="absolute top-1.5 right-1.5 bg-red-500 text-[8px] font-black text-white px-1 py-0.25 rounded-full border-2 border-white min-w-4 h-4 flex items-center justify-center animate-bounce">
>>>>>>> main
              {unreadCount}
            </span>
          )}
        </Link>
        
        <Link to="/settings" className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
          <Settings size={20} />
        </Link>
        
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
        
        <Link 
          to="/new-claim"
<<<<<<< HEAD
          className="flex items-center gap-2 bg-[#1E3A5F] text-[#FAF8F3] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-[#1E3A5F]/10 active:scale-95"
=======
          className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-black/10 active:scale-95"
>>>>>>> main
        >
          <Plus size={18} />
          New Claim
        </Link>
        
        <div className="flex items-center gap-3 pl-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900 leading-none">{meta.name}</p>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-wider">{meta.label}</p>
          </div>
<<<<<<< HEAD
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-[#FAF8F3] shadow-sm overflow-hidden">
=======
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
>>>>>>> main
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${meta.seed}`} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
