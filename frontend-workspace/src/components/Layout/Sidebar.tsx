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
import { NavLink, useLocation } from 'react-router-dom';
import { useClaims } from '../../context/ClaimsContext';

const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['employee', 'manager', 'finance', 'admin'] },
  { id: 'claims', label: 'My Claims', icon: FileText, path: '/my-claims', roles: ['employee'] },
  { id: 'approvals', label: 'Approvals Queue', icon: CheckSquare, path: '/approvals', roles: ['manager', 'finance'] },
  { 
    id: 'reimbursements', 
    label: 'Reimbursements', 
    icon: CreditCard, 
    path: '/reimbursements', 
    roles: ['finance'],
    subItems: [
      { label: 'Reimbursement Ledger', path: '/reimbursements' },
      { label: 'ERP Sync', path: '/reimbursements/erpsync' }
    ]
  },
];

const adminNavItems = [
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports', roles: ['admin', 'finance'] },
  { id: 'policies', label: 'Policies', icon: ShieldCheck, path: '/policies', roles: ['admin'] },
  { id: 'categories', label: 'Expense Settings', icon: Tag, path: '/categories', roles: ['admin'] },
  { id: 'users', label: 'Users', icon: Users, path: '/users', roles: ['admin'] },
];

export const Sidebar: React.FC = () => {
  const { currentRole } = useClaims();

  const visibleMainItems = mainNavItems.filter(item => item.roles.includes(currentRole));
  const visibleAdminItems = adminNavItems.filter(item => item.roles.includes(currentRole));

  return (
    <div className="w-64 h-screen bg-slate-50/50 border-r border-slate-200 flex flex-col sticky top-0">
      <div className="p-8">
        <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Tendworks</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Expense System</p>
      </div>

      <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
        
        {/* CORE WORKFLOW */}
        <div className="space-y-1">
          {visibleMainItems.length > 0 && <SectionLabel label="Menu" />}
          {visibleMainItems.map(item => <SidebarLink key={item.id} {...item} />)}
        </div>

        {/* MANAGEMENT & AUDIT */}
        {visibleAdminItems.length > 0 && (
          <div className="space-y-1">
            <SectionLabel label="Administration" />
            {visibleAdminItems.map(item => <SidebarLink key={item.id} {...item} />)}
          </div>
        )}

        {/* PREFERENCES */}
        <div className="space-y-1">
          <SectionLabel label="Preferences" />
          <SidebarLink id='notifications' label='Notifications' icon={Bell} path='/notifications' />
          <SidebarLink id='settings' label='Settings' icon={Settings} path='/settings' />
        </div>
      </nav>
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

const SectionLabel = ({ label }: { label: string }) => (
  <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</p>
);

const SidebarLink = ({ label, icon: Icon, path, subItems }: any) => {
  const location = useLocation();
  const isParentActive = subItems 
    ? location.pathname.startsWith(path) 
    : location.pathname === path;

  return (
    <div className="space-y-1">
      <NavLink
        to={path}
        className={() => `
          w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
          ${isParentActive 
            ? 'bg-[#1E3A5F] text-[#FAF8F3] shadow-lg shadow-[#1E3A5F]/10' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
        `}
      >
        <Icon size={18} className="shrink-0" />
        <span className="flex-1 text-left">{label}</span>
      </NavLink>

      {subItems && isParentActive && (
        <div className="pl-9 space-y-1 mt-1 transition-all duration-200">
          {subItems.map((sub: any) => {
            const isSubActive = sub.path === path 
              ? location.pathname === sub.path 
              : location.pathname.startsWith(sub.path);
              
            return (
              <NavLink
                key={sub.path}
                to={sub.path}
                className={() => `
                  block px-4 py-2 rounded-lg text-[11px] font-bold text-left transition-all duration-200
                  ${isSubActive 
                    ? 'bg-slate-200 text-slate-950 font-black' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                • {sub.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};
