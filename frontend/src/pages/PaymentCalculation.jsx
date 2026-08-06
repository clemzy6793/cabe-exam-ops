import { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { useSession } from '../contexts/SessionContext';

const TYPE_COLORS = {
  senior_member: 'bg-blue-100 text-blue-700',
  lecturer: 'bg-amber-100 text-amber-700',
  it_staff: 'bg-purple-100 text-purple-700',
  office_staff: 'bg-emerald-100 text-emerald-700',
  nss: 'bg-pink-100 text-pink-700',
};

export default function PaymentCalculation() {
  const { currentSession } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const calculate = async () => {
    if (!currentSession?.id) return toast.error('Select a session first');
    setLoading(true);
    try {
      const { data: result } = await api.get('/payments/calculate', { params: { session_id: currentSession.id } });
      setData(result);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n) => `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportCSV = () => {
    if (!data?.staff?.length) return;
    const headers = ['Name', 'Staff Code', 'Department', 'Staff Type', 'Faculty', 'Bank', 'Branch', 'Account', 'Rate/Day', 'Verified Days', 'Gross (GHS)'];
    const rows = filtered.map(s => [
      s.name, s.staff_code, s.department, s.staff_type, s.faculty_code || '',
      s.bank_name || '', s.bank_branch || '', s.account_number || '',
      s.daily_rate, s.verified_days, s.gross.toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-${currentSession?.name || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentSession) return (
    <div className="text-center py-16">
      <p className="text-gray-500">Select an examination session to calculate payments</p>
    </div>
  );

  const filtered = data?.staff?.filter(s => {
    if (typeFilter && s.staff_type !== typeFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.staff_code?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) || [];

  const filteredGross = filtered.reduce((sum, s) => sum + s.gross, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Payment Calculation</h1>
          <p className="text-sm text-gray-500 mt-1">{currentSession.name} — Attendance-gated payments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={calculate} disabled={loading} className="btn-brand text-sm px-4 py-2">
            {loading ? 'Calculating...' : 'Calculate Payments'}
          </button>
          {data?.staff?.length > 0 && (
            <button onClick={exportCSV} className="text-sm px-4 py-2 rounded-lg bg-green-100 text-green-700 font-medium hover:bg-green-200">
              Export CSV
            </button>
          )}
        </div>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-brand/5 border-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Staff</p>
              <p className="text-3xl font-black text-brand">{data.staff.length}</p>
            </div>
            <div className="card bg-green-50 border-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Gross</p>
              <p className="text-2xl font-black text-green-700">{formatCurrency(data.totals.gross)}</p>
            </div>
            {Object.entries(data.totals.byType || {}).map(([type, info]) => (
              <div key={type} className="card bg-gray-50 border-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{type.replace(/_/g, ' ')}</p>
                <p className="text-xl font-black text-gray-800">{info.count} staff</p>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(info.gross)}</p>
              </div>
            ))}
          </div>

          {/* Faculty Subtotals */}
          {Object.keys(data.totals.byFaculty || {}).length > 0 && (
            <div className="card">
              <h3 className="font-bold text-sm text-gray-800 mb-3">By Faculty</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(data.totals.byFaculty).map(([fc, info]) => (
                  <div key={fc} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{fc}</p>
                      <p className="text-xs text-gray-400">{info.count} staff</p>
                    </div>
                    <p className="text-sm font-black text-gray-700">{formatCurrency(info.gross)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="card">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="">All Types</option>
                {[...new Set(data.staff.map(s => s.staff_type))].sort().map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or code..." className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
              <span className="text-xs text-gray-500">
                {filtered.length} staff | {formatCurrency(filteredGross)}
              </span>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No staff with verified attendance found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs text-gray-500">#</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-500">Name</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-500">Code</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-500">Type</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-500">Faculty</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-500">Bank</th>
                      <th className="text-left py-2 px-3 text-xs text-gray-500">Account</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500">Rate/Day</th>
                      <th className="text-center py-2 px-3 text-xs text-gray-500">V.Days</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500">Gross</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((s, i) => (
                      <tr key={s.staff_id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">{s.name}</td>
                        <td className="py-2 px-3 font-mono text-xs text-gray-500">{s.staff_code}</td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[s.staff_type] || 'bg-gray-100 text-gray-600'}`}>
                            {s.staff_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-600">{s.faculty_code || '-'}</td>
                        <td className="py-2 px-3 text-xs text-gray-600">{s.bank_name || '-'}</td>
                        <td className="py-2 px-3 font-mono text-xs text-gray-500">{s.account_number || '-'}</td>
                        <td className="py-2 px-3 text-right text-xs font-medium text-gray-700">{s.daily_rate.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center font-bold text-green-700">{s.verified_days}</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">{s.gross.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={9} className="py-2 px-3 text-right text-xs font-bold text-gray-600 uppercase">Total</td>
                      <td className="py-2 px-3 text-right font-black text-gray-900 text-sm">{formatCurrency(filteredGross)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-500">Click "Calculate Payments" to generate payment summaries</p>
          <p className="text-xs text-gray-400 mt-1">Only staff with verified attendance will be included</p>
        </div>
      )}
    </div>
  );
}
