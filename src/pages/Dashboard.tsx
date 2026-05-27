import React from 'react';
import { useClaims } from '../context/ClaimsContext';
import { StatCard } from '../components/Dashboard/StatCard';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  DollarSign, 
  Zap, 
  ShieldCheck,
  TrendingUp,
  Activity
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const Dashboard: React.FC = () => {
  const { claims, currentRole } = useClaims();

  const roleMeta = {
    employee: { name: 'Marcus Richardson', label: 'Employee Submitter' },
    manager: { name: 'Sarah Chen', label: 'Reporting Manager' },
    finance: { name: 'David Miller', label: 'Financial Controller' },
    admin: { name: 'Alex Sobel', label: 'System Admin' },
  };

  const activeUser = roleMeta[currentRole] || roleMeta.employee;

  const totalClaims = claims.length;
  const approved = claims.filter(c => c.status === 'approved').length;
  const pending = claims.filter(c => c.status === 'pending' || c.status === 'submitted').length;
  const flagged = claims.filter(c => c.status === 'flagged').length;
  const paid = claims.filter(c => c.status === 'paid').length;
  
  // Calculate total amount correctly by stripping non-numeric characters
  const totalAmountNum = claims.reduce((sum, c) => {
    if (c.status === 'draft' || c.status === 'rejected') return sum;
    const amtStr = c.totalAmount ? c.totalAmount.replace(/[₹,]/g, '') : '0';
    return sum + (parseFloat(amtStr) || 0);
  }, 0);

  const totalAmountFormatted = totalAmountNum.toLocaleString('en-IN');

  // Calculate average trust score
  const avgTrustScore = claims.length > 0
    ? Math.round(claims.reduce((sum, c) => sum + (c.trustScore || 82), 0) / claims.length)
    : 82;

  // Chart Data compilation
  const categoryMap: { [key: string]: number } = {};
  claims.forEach(c => {
    if (c.status === 'draft' || c.status === 'rejected') return;
    const amt = parseFloat(c.totalAmount.replace(/[₹,]/g, '') || '0');
    categoryMap[c.category] = (categoryMap[c.category] || 0) + amt;
  });

  const categoryData = Object.keys(categoryMap).map(key => ({
    name: key.replace(' Expenses', '').replace(' Allowances', ''),
    amount: categoryMap[key]
  }));

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">WELCOME BACK, {activeUser.name.split(' ')[0]}</h2>
          <p className="text-slate-500 mt-2 font-medium">Logged in as {activeUser.label} • Here is your expense processing overview</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100/50 px-4 py-2 rounded-2xl">
          <Activity size={16} className="text-indigo-600 animate-pulse" />
          <span className="text-[10px] font-black text-indigo-750 uppercase tracking-wider">AI Operations Active</span>
        </div>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="All Expense Claims"
          value={totalClaims.toString()}
          icon={DollarSign}
          trend={12}
          trendType="up"
          subtitle="Submitted items"
          color="black"
        />
        <StatCard
          title="Approved Ledger"
          value={approved.toString()}
          icon={CheckCircle2}
          trend={8}
          trendType="up"
          subtitle="Waiting for batch"
          color="emerald"
        />
        <StatCard
          title="Audit Pending"
          value={pending.toString()}
          icon={Clock}
          trend={14}
          trendType="down"
          subtitle="Manager review queue"
          color="amber"
        />
        <StatCard
          title="AI Flagged Alerts"
          value={flagged.toString()}
          icon={AlertCircle}
          trend={5}
          trendType="down"
          subtitle="High risk anomalies"
          color="rose"
        />
        <StatCard
          title="Reimbursements Paid"
          value={paid.toString()}
          icon={XCircle}
          trend={22}
          trendType="up"
          subtitle="Disbursed items"
          color="teal"
        />
        <StatCard
          title="Total Audited Spend"
          value={`₹${totalAmountFormatted}`}
          icon={DollarSign}
          trend={15}
          trendType="up"
          subtitle="Active corporate cost"
          color="emerald"
        />
      </div>

      {/* Visual Charts & Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Spend Distribution chart */}
        <div className="lg:col-span-2 bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-6">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={14} />
              Approved Expenditures by Category
            </h3>
            <p className="text-[10px] uppercase font-black text-slate-500 mt-1">Real-time category spending ledger</p>
          </div>
          <div className="h-64 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value) => [typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : '', 'Amount']} />
                  <Bar dataKey="amount" fill="#000000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 italic">
                No active expenditures found to display charts.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: AI Trust Index & Operations */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-yellow-400 flex items-center gap-1.5">
              <Zap size={14} className="animate-pulse" />
              AI Trust Index Monitor
            </h4>
            <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
              The AI routing engine calculates historical employee integrity rating based on policy breaches, document matching, and manual overrides.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Average Trust Score</span>
              <span className="text-sm font-black text-white">{avgTrustScore}%</span>
            </div>
            
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 rounded-full" 
                style={{ width: `${avgTrustScore}%` }} 
              />
            </div>

            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-right">
              Rating Status: High Integrity
            </p>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <ShieldCheck className="text-emerald-400 shrink-0" size={24} />
            <div>
              <h5 className="text-[10px] font-black uppercase text-white tracking-wider">Policy Enforcement Active</h5>
              <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Category limits mapped to grade hierarchies.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
