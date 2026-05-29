import React, { useState } from 'react';
import { useClaims } from '../context/ClaimsContext';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  ShieldAlert,
  Calendar,
  Layers,
  Zap,
  Brain,
  AlertTriangle,
  CheckCircle2,
  ScanLine,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function trustBand(score?: number): 'High Trust' | 'Moderate' | 'Requires Review' | 'Critical' {
  if (!score) return 'Critical';
  if (score >= 80) return 'High Trust';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Requires Review';
  return 'Critical';
}

const BAND_COLORS: Record<string, string> = {
  'High Trust': '#10b981',
  'Moderate': '#f59e0b',
  'Requires Review': '#f97316',
  'Critical': '#ef4444',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const Reports: React.FC = () => {
  const { claims, userTrustScore } = useClaims();
  const [showAllRows, setShowAllRows] = useState(false);

  // ── Core KPIs ──────────────────────────────────────────────────────────────
  const approvedClaims = claims.filter(
    (c) => c.status !== 'draft' && c.status !== 'rejected'
  );
  const totalSpend = approvedClaims.reduce(
    (sum, c) => sum + parseFloat(c.totalAmount.replace(/[₹,]/g, '') || '0'),
    0
  );
  const averageClaim = claims.length > 0 ? totalSpend / claims.length : 0;

  const flaggedCount = claims.filter(
    (c) => c.flaggedReasons && c.flaggedReasons.length > 0
  ).length;
  const violationRate =
    claims.length > 0 ? (flaggedCount / claims.length) * 100 : 0;

  // ── AI KPIs ────────────────────────────────────────────────────────────────
  const fastTrackCount = claims.filter((c) => c.isFastTrackEligible).length;
  const fastTrackRate =
    claims.length > 0 ? (fastTrackCount / claims.length) * 100 : 0;

  const tamperCount = claims.filter((c) => c.tamperingDetected).length;
  const tamperRate =
    claims.length > 0 ? (tamperCount / claims.length) * 100 : 0;

  const claimsWithOCR = claims.filter((c) => c.ocrConfidence !== undefined);
  const avgOCR =
    claimsWithOCR.length > 0
      ? claimsWithOCR.reduce((s, c) => s + (c.ocrConfidence ?? 0), 0) /
        claimsWithOCR.length
      : 0;

  const reconMismatch = claims.filter(
    (c) => c.bankStatementReconciled === 'Mismatch'
  ).length;

  // ── Trust Score Distribution (band breakdown) ──────────────────────────────
  const bandCounts: Record<string, number> = {
    'High Trust': 0,
    Moderate: 0,
    'Requires Review': 0,
    Critical: 0,
  };
  claims.forEach((c) => {
    bandCounts[trustBand(c.trustScore)]++;
  });
  const trustDistData = Object.keys(bandCounts).map((band) => ({
    name: band,
    count: bandCounts[band],
    color: BAND_COLORS[band],
  }));

  // ── Category Spend ──────────────────────────────────────────────────────────
  const categoryMap: Record<string, number> = {};
  approvedClaims.forEach((c) => {
    const amt = parseFloat(c.totalAmount.replace(/[₹,]/g, '') || '0');
    categoryMap[c.category] = (categoryMap[c.category] || 0) + amt;
  });
  const categoryData = Object.keys(categoryMap).map((key) => ({
    name: key.replace(' Expenses', '').replace(' Allowances', ''),
    amount: categoryMap[key],
  }));

  // ── Expenditure Trend (mock 6-month distribution) ──────────────────────────
  const trendData = [
    { name: 'Jan', amount: Math.round(totalSpend * 0.12) },
    { name: 'Feb', amount: Math.round(totalSpend * 0.18) },
    { name: 'Mar', amount: Math.round(totalSpend * 0.15) },
    { name: 'Apr', amount: Math.round(totalSpend * 0.2) },
    { name: 'May', amount: Math.round(totalSpend * 0.25) },
    { name: 'Jun', amount: Math.round(totalSpend * 0.1) },
  ];

  // ── Routing Breakdown ──────────────────────────────────────────────────────
  const pathData = [
    { name: 'Path A · Fast-Track', value: claims.filter((c) => c.isFastTrackEligible).length, color: '#10b981' },
    { name: 'Path B · Manager', value: claims.filter((c) => !c.isFastTrackEligible && c.riskCategory !== 'high').length, color: '#6366f1' },
    { name: 'Path C · Finance', value: claims.filter((c) => c.riskCategory === 'high').length, color: '#ef4444' },
  ];

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      'Claim ID', 'Title', 'Category', 'Amount', 'Status', 'Date',
      'Trust Score', 'Risk Category', 'Routing Path',
      'Fast-Track Eligible', 'Fast-Track Approved',
      'OCR Confidence', 'Tampering Detected',
      'Bank Reconciliation', 'Anomaly Flags', 'Flagged Reasons',
    ];
    const rows = claims.map((c) => [
      c.id,
      `"${c.title}"`,
      c.category,
      c.totalAmount,
      c.status.toUpperCase(),
      c.date,
      c.trustScore ?? 'N/A',
      c.riskCategory ?? 'N/A',
      c.isFastTrackEligible ? 'Path A' : c.riskCategory === 'high' ? 'Path C' : 'Path B',
      c.isFastTrackEligible ? 'Yes' : 'No',
      c.isFastTrackApproved ? 'Yes' : 'No',
      c.ocrConfidence != null ? `${c.ocrConfidence}%` : 'N/A',
      c.tamperingDetected ? 'YES ⚠' : 'No',
      c.bankStatementReconciled ?? 'N/A',
      c.anomalyFlagsCount ?? 0,
      `"${(c.flaggedReasons ?? []).join('; ')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `claims_audit_ledger_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayedClaims = showAllRows ? claims : claims.slice(0, 10);

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
            Spend Analytics &amp; Reports
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            Policy exceptions · Trust distribution · AI anomaly intelligence · Disbursement analytics
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-xl shadow-black/10 uppercase tracking-widest cursor-pointer"
        >
          <Download size={18} />
          Export Full Audit Ledger
        </button>
      </div>

      {/* ── Spend KPI Row ── */}
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <TrendingUp size={12} /> Spend Overview
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <StatCard
            label="Total Approved Spend"
            value={`₹${totalSpend.toLocaleString('en-IN')}`}
            desc="Approved + disbursed claims"
            color="indigo"
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label="Average Claim Value"
            value={`₹${Math.round(averageClaim).toLocaleString('en-IN')}`}
            desc="Mean value across all claims"
            color="slate"
            icon={<Layers size={16} />}
          />
          <StatCard
            label="Policy Exception Rate"
            value={`${Math.round(violationRate)}%`}
            desc={`${flaggedCount} claim${flaggedCount !== 1 ? 's' : ''} triggered AI warnings`}
            color="rose"
            icon={<ShieldAlert size={16} />}
            pulse
          />
          <StatCard
            label="Avg Approval Turnaround"
            value="2.4 Hours"
            desc="Pending → Approved cycle"
            color="emerald"
            icon={<Clock size={16} />}
          />
        </div>
      </div>

      {/* ── AI Intelligence KPI Row ── */}
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Brain size={12} /> AI Intelligence Summary
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <StatCard
            label="Fast-Track Utilisation"
            value={`${Math.round(fastTrackRate)}%`}
            desc={`${fastTrackCount} claim${fastTrackCount !== 1 ? 's' : ''} routed via Path A`}
            color="emerald"
            icon={<Zap size={16} />}
          />
          <StatCard
            label="Tampering Detected"
            value={`${Math.round(tamperRate)}%`}
            desc={`${tamperCount} claim${tamperCount !== 1 ? 's' : ''} flagged by OCR AI`}
            color={tamperCount > 0 ? 'rose' : 'slate'}
            icon={<AlertTriangle size={16} />}
            pulse={tamperCount > 0}
          />
          <StatCard
            label="Avg OCR Confidence"
            value={claimsWithOCR.length > 0 ? `${Math.round(avgOCR)}%` : '—'}
            desc="Receipt AI read confidence"
            color="indigo"
            icon={<ScanLine size={16} />}
          />
          <StatCard
            label="Statement Mismatches"
            value={`${reconMismatch}`}
            desc="Bank recon discrepancies found"
            color={reconMismatch > 0 ? 'rose' : 'emerald'}
            icon={<CheckCircle2 size={16} />}
            pulse={reconMismatch > 0}
          />
        </div>
      </div>

      {/* ── Trust Score Card ── */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-slate-900/30">
        <div className="flex-1 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Users size={12} /> Your Current Trust Score
          </p>
          <div className="text-6xl font-black text-white tracking-tight">{userTrustScore}</div>
          <div
            className="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-1"
            style={{
              background: BAND_COLORS[trustBand(userTrustScore)] + '33',
              color: BAND_COLORS[trustBand(userTrustScore)],
            }}
          >
            {trustBand(userTrustScore)}
          </div>
          <p className="text-slate-500 text-xs font-medium mt-2">
            Score affects AI routing path, fast-track eligibility, and approval friction.
          </p>
        </div>
        {/* Score bar */}
        <div className="flex-1 w-full">
          <div className="relative w-full h-5 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(userTrustScore, 2)}%`,
                background: `linear-gradient(90deg, ${BAND_COLORS['Critical']}, ${BAND_COLORS['Requires Review']}, ${BAND_COLORS['Moderate']}, ${BAND_COLORS['High Trust']})`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] font-black text-slate-500 uppercase">
            <span>0 · Critical</span>
            <span>40 · Review</span>
            <span>60 · Moderate</span>
            <span>80 · High</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Expenditure Trend */}
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-5">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={13} /> Expenditure Trend (6 Months)
            </h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Monthly aggregate</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  formatter={(value) => [
                    typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : '',
                    'Spend',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorAmt)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-5">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <BarChart3 size={13} /> Spend By Category
            </h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Approved spend allocation</p>
          </div>
          <div className="h-64 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [
                      typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : '',
                      'Amount',
                    ]}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 italic">
                No approved expenditure data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Trust Distribution + AI Routing ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Trust Score Distribution */}
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-5">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={13} /> Trust Score Distribution
            </h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Band breakdown across all claims</p>
          </div>
          <div className="h-64 w-full">
            {claims.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trustDistData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Claims']} />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                    {trustDistData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 italic">
                No claim data to compute trust distribution.
              </div>
            )}
          </div>
          {/* Band legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(BAND_COLORS).map(([band, color]) => (
              <div key={band} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-[9px] font-black text-slate-500 uppercase">{band}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Routing Breakdown Donut */}
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-5">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={13} /> AI Routing Path Breakdown
            </h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Fast-Track vs Manager vs Finance</p>
          </div>
          <div className="h-64 w-full">
            {claims.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pathData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pathData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-[10px] font-black text-slate-600 uppercase">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 italic">
                No routing data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Historical Audit Ledger ── */}
      <div className="premium-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Historical Expense Ledger
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">
              {claims.length} total record{claims.length !== 1 ? 's' : ''} · Includes AI audit metadata
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 hover:text-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-left">
                {[
                  'Claim ID', 'Title', 'Category', 'Date', 'Amount', 'Status',
                  'Trust', 'Risk', 'OCR', 'Recon', 'Tamper',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {displayedClaims.map((claim) => (
                <tr
                  key={claim.id}
                  className="hover:bg-slate-50/30 transition-all text-xs font-semibold text-slate-700"
                >
                  <td className="px-4 py-3.5 font-black text-slate-900 text-[10px]">{claim.id}</td>
                  <td className="px-4 py-3.5 truncate max-w-[160px] text-[10px]">{claim.title}</td>
                  <td className="px-4 py-3.5 text-[10px] text-slate-500">{claim.category.replace(' Expenses', '').replace(' Allowances', '')}</td>
                  <td className="px-4 py-3.5 font-medium uppercase text-slate-500 text-[9px]">{claim.date}</td>
                  <td className="px-4 py-3.5 font-black text-slate-900 text-[10px]">{claim.totalAmount}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        claim.status === 'paid'
                          ? 'bg-teal-50 text-teal-700'
                          : claim.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : claim.status === 'flagged'
                          ? 'bg-rose-50 text-rose-700 animate-pulse'
                          : claim.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700'
                          : claim.status === 'submitted'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {claim.status}
                    </span>
                  </td>
                  {/* Trust Score */}
                  <td className="px-4 py-3.5">
                    {claim.trustScore != null ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black"
                        style={{
                          background: BAND_COLORS[trustBand(claim.trustScore)] + '22',
                          color: BAND_COLORS[trustBand(claim.trustScore)],
                        }}
                      >
                        {claim.trustScore}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">—</span>
                    )}
                  </td>
                  {/* Risk */}
                  <td className="px-4 py-3.5">
                    {claim.riskCategory ? (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          claim.riskCategory === 'high'
                            ? 'bg-rose-50 text-rose-700'
                            : claim.riskCategory === 'medium'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {claim.riskCategory}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">—</span>
                    )}
                  </td>
                  {/* OCR */}
                  <td className="px-4 py-3.5 text-[9px] font-black text-slate-500">
                    {claim.ocrConfidence != null ? `${claim.ocrConfidence}%` : '—'}
                  </td>
                  {/* Bank Recon */}
                  <td className="px-4 py-3.5">
                    {claim.bankStatementReconciled ? (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          claim.bankStatementReconciled === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700'
                            : claim.bankStatementReconciled === 'Mismatch'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {claim.bankStatementReconciled}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">—</span>
                    )}
                  </td>
                  {/* Tampering */}
                  <td className="px-4 py-3.5">
                    {claim.tamperingDetected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[8px] font-black uppercase animate-pulse">
                        <AlertTriangle size={9} /> Yes
                      </span>
                    ) : (
                      <span className="text-[9px] text-emerald-600 font-black">✓ Clean</span>
                    )}
                  </td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-xs font-bold text-slate-400 italic">
                    No records exist in the ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Show More / Less toggle */}
        {claims.length > 10 && (
          <div className="border-t border-slate-100 p-4 flex justify-center bg-white">
            <button
              onClick={() => setShowAllRows((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              {showAllRows ? (
                <>
                  <ChevronUp size={13} /> Show Less
                </>
              ) : (
                <>
                  <ChevronDown size={13} /> Show All {claims.length} Records
                </>
              )}
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

// ─── Sub-component ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  desc: string;
  color: 'indigo' | 'rose' | 'emerald' | 'slate';
  icon: React.ReactNode;
  pulse?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, desc, color, icon, pulse }) => (
  <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-4">
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        color === 'indigo'
          ? 'bg-indigo-50 text-indigo-600'
          : color === 'rose'
          ? 'bg-rose-50 text-rose-600'
          : color === 'emerald'
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-slate-50 text-slate-500'
      } ${pulse ? 'animate-pulse' : ''}`}
    >
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{value}</p>
      <p className="text-[9px] text-slate-400 mt-1 font-bold">{desc}</p>
    </div>
  </div>
);
