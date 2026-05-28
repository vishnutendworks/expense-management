import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  CreditCard, 
  BarChart3, 
  ShieldCheck, 
  Tag, 
  Users, 
  Bell, 
  Settings, 
  HelpCircle, 
  LogOut 
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

// --- Menu Configuration ---

const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'claims', label: 'My Claims', icon: FileText, path: '/my-claims' },
  { id: 'approvals', label: 'Approvals Queue', icon: CheckSquare, path: '/approvals' },
  { id: 'reimbursements', label: 'Reimbursements', icon: CreditCard, path: '/reimbursements' },
];

const adminNavItems = [
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
  { id: 'policies', label: 'Policies', icon: ShieldCheck, path: '/policies' },
  { id: 'categories', label: 'Categories', icon: Tag, path: '/categories' },
  { id: 'users', label: 'Users', icon: Users, path: '/users' },
];

const supportNavItems = [
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

// --- Sidebar Component ---

export const Sidebar: React.FC = () => {
  return (
    <div className="w-64 h-screen bg-slate-50/50 border-r border-slate-200 flex flex-col sticky top-0">
      {/* Brand Identity */}
      <div className="p-8">
        <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Tendworks</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Expense System</p>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
        
        {/* CORE WORKFLOW */}
        <div className="space-y-1">
          <SectionLabel label="Menu" />
          {mainNavItems.map(item => <SidebarLink key={item.id} {...item} />)}
        </div>

        {/* MANAGEMENT & AUDIT */}
        <div className="space-y-1">
          <SectionLabel label="Administration" />
          {adminNavItems.map(item => <SidebarLink key={item.id} {...item} />)}
        </div>

        {/* PREFERENCES */}
        <div className="space-y-1">
          <SectionLabel label="Preferences" />
          {supportNavItems.map(item => <SidebarLink key={item.id} {...item} />)}
        </div>

      </nav>

      {/* Footer Support Actions */}
      <div className="p-4 border-t border-slate-200 space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
          <HelpCircle size={18} />
          Support Center
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

// --- Sub-components ---

const SectionLabel = ({ label }: { label: string }) => (
  <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</p>
);

const SidebarLink = ({ label, icon: Icon, path }: any) => (
  <NavLink
    to={path}
    className={({ isActive }) => `
      w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
      ${isActive 
        ? 'bg-black text-white shadow-lg shadow-black/10' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
    `}
  >
    <Icon size={18} />
    {label}
  </NavLink>
);
