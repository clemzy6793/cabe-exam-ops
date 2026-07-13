import { useState, useRef } from 'react';
import api from '../api';

const RATE_LABELS = {
  senior: 'Academic / Senior Member (per invigilation session)',
  senior_staff: 'Senior Staff / Administrative (per verification)',
  contract: 'Contract Staff (per verification)',
  junior: 'Junior Staff (per verification)',
};

const MODE_BADGE = {
  invigilation: 'bg-blue-100 text-blue-700',
  biometric: 'bg-amber-100 text-amber-700',
};

export default function InvigilationAllowances() {
  const [rates, setRates] = useState({ senior: 100, senior_staff: 50, contract: 40, junior: 30 });
  const [results, setResults] = useState(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const fileRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) { setError('Please select an Excel file'); return; }
    setError('');
    setLoading(true);
    setResults(null);

    const form = new FormData();
    form.append('file', file);
    Object.entries(rates).forEach(([k, v]) => form.append(`rate_${k}`, v));

    try {
      const { data } = await api.post('/allowances/calculate', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(data.results);
      setGrandTotal(data.grandTotal);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = results
    ? results.filter(r =>
        r.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.staffId.toLowerCase().includes(search.toLowerCase()) ||
        r.department.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const exportCSV = () => {
    if (!results) return;
    const header = ['Staff ID', 'Full Name', 'Department', 'Designation', 'Staff Type', 'Mode', 'Rate (GHS)', 'Qty', 'Amount (GHS)'];
    const rows = results.map(r => [
      r.staffId, r.fullName, r.department, r.designation, r.staffType,
      r.mode, r.rate, r.quantity, r.amount.toFixed(2),
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invigilation_allowances.csv';
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Allowances</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload the attendance summary Excel file to calculate invigilation and biometric verification allowances.
        </p>
      </div>

      {/* Upload form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="font-semibold text-gray-800">1. Set Payment Rates (GHS)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(RATE_LABELS).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">GHS</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rates[key]}
                  onChange={e => setRates(r => ({ ...r, [key]: e.target.value }))}
                  className="flex-1 px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h2 className="font-semibold text-gray-800 mb-3">2. Upload Attendance File</h2>
          <p className="text-xs text-gray-500 mb-3">
            Required columns: <code className="bg-gray-100 px-1 rounded">STAFFID, FULL_NAME, DEPARTMENT, DESIGNATION, STAFF_TYPE, MINUTES_PER_DAY</code>
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-dark file:text-white hover:file:opacity-90"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-brand-dark text-white rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Calculating…' : 'Calculate Allowances'}
        </button>
      </form>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{results.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Invigilators</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{results.filter(r => r.mode === 'invigilation').length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Office / Biometric</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{results.filter(r => r.mode === 'biometric').length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-700">Grand Total</p>
              <p className="text-2xl font-bold text-green-800 mt-1">GHS {grandTotal.toLocaleString('en-GH', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Table controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <input
              type="text"
              placeholder="Search by name, ID or department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full sm:w-72 outline-none focus:ring-2 focus:ring-brand-dark/20"
            />
            <button
              onClick={exportCSV}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>

          {/* Results table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Staff ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Full Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Department</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Mode</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Rate</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Amount (GHS)</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r, i) => (
                    <>
                      <tr key={r.staffId + i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.staffId}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{r.fullName}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{r.department}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${MODE_BADGE[r.mode]}`}>
                            {r.mode === 'invigilation' ? 'Invigilation' : 'Biometric'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{Number(r.rate).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{r.quantity}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {r.amount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpanded(expanded === i ? null : i)}
                            className="text-xs text-brand-dark underline"
                          >
                            {expanded === i ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {expanded === i && (
                        <tr key={`exp-${i}`}>
                          <td colSpan={8} className="px-6 pb-4 bg-gray-50">
                            <p className="text-xs font-medium text-gray-500 mb-2">Day-by-day breakdown</p>
                            <div className="flex flex-wrap gap-2">
                              {r.breakdown.map((b, bi) => (
                                <span key={bi} className="inline-block bg-white border border-gray-200 rounded px-2 py-1 text-xs">
                                  <span className="text-gray-500">{b.day}:</span>{' '}
                                  {r.mode === 'invigilation'
                                    ? `${b.minutes} min → ${b.sessions} session${b.sessions !== 1 ? 's' : ''}`
                                    : `${b.verifications} verification${b.verifications !== 1 ? 's' : ''}`}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Designation: <strong>{r.designation}</strong> · Type: <strong>{r.staffType}</strong>
                            </p>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 font-semibold text-right text-gray-700">
                      Showing {filtered.length} of {results.length} · Grand Total
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-700 text-base">
                      {filtered.reduce((s, r) => s + r.amount, 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
