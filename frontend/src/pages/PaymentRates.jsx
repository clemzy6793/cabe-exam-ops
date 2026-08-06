import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const QUICK_TYPES = [
  'IT Staff', 'Invigilator', 'Office Staff', 'System Analyst',
  'Accounts Staff', 'Registrar',
];

const QUICK_RANKS = [
  'Senior Member', 'Senior Staff', 'Lecturer', 'Junior Staff',
];

function displayLabel(r) {
  const name = r.staff_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  if (r.grade && r.grade !== 'default' && r.grade !== 'Default') {
    const rank = r.grade.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `${name} — ${rank}`;
  }
  return name;
}

function categoryKey(r) {
  return `${r.staff_type}::${r.grade}`;
}

export default function PaymentRates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ staff_type: '', grade: '', hourly_rate: '' });

  const load = () => api.get('/payment-rates').then(r => { setRates(r.data); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const seedDefaults = async () => {
    try {
      const { data } = await api.post('/payment-rates/seed-defaults');
      toast.success(data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const saveRate = async (catKey, newValue) => {
    const val = parseFloat(newValue);
    if (isNaN(val) || val < 0) return toast.error('Invalid amount');
    const catRates = rates.filter(r => categoryKey(r) === catKey);
    try {
      for (const r of catRates) {
        await api.put(`/payment-rates/${r.id}`, { hourly_rate: val });
      }
      toast.success('Rate updated');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const addRate = async (e) => {
    e.preventDefault();
    if (!form.staff_type.trim()) return toast.error('Enter a staff category name');
    const val = parseFloat(form.hourly_rate);
    if (isNaN(val) || val <= 0) return toast.error('Enter a valid rate');
    const staffType = form.staff_type.trim();
    const grade = form.grade.trim() || 'default';
    try {
      await api.post('/payment-rates', { staff_type: staffType, grade, exam_type: 'mid_semester', hourly_rate: val });
      await api.post('/payment-rates', { staff_type: staffType, grade, exam_type: 'end_of_semester', hourly_rate: val });
      toast.success('Rate added');
      setForm({ staff_type: '', grade: '', hourly_rate: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteCategory = async (catKey) => {
    if (!confirm('Delete this rate?')) return;
    const catRates = rates.filter(r => categoryKey(r) === catKey);
    try {
      for (const r of catRates) {
        await api.delete(`/payment-rates/${r.id}`);
      }
      toast.success('Rate deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
    </div>
  );

  const grouped = {};
  rates.forEach(r => {
    const key = categoryKey(r);
    if (!grouped[key]) grouped[key] = { label: displayLabel(r), rate: parseFloat(r.hourly_rate) };
    else grouped[key].rate = Math.max(grouped[key].rate, parseFloat(r.hourly_rate));
  });

  const hasRates = rates.length > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Payment Rate Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure allowance rates per staff category and rank</p>
        </div>
        <div className="flex gap-2">
          {!hasRates && (
            <button onClick={seedDefaults} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200">
              Load Defaults
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-brand text-xs px-3 py-1.5">
            + Add Rate
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={addRate} className="card space-y-4">
          <h3 className="font-bold text-sm text-gray-800">Add New Rate</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Staff Category / Name</label>
              <input value={form.staff_type} onChange={e => setForm(f => ({ ...f, staff_type: e.target.value }))}
                placeholder="e.g. System Analyst"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {QUICK_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, staff_type: t }))}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      form.staff_type === t ? 'bg-brand text-white border-brand' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-brand hover:text-brand'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Rank / Grade</label>
              <input value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                placeholder="e.g. Senior Member"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {QUICK_RANKS.map(r => (
                  <button key={r} type="button" onClick={() => setForm(f => ({ ...f, grade: r }))}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      form.grade === r ? 'bg-brand text-white border-brand' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-brand hover:text-brand'
                    }`}>{r}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Rate per Session (GHS)</label>
              <input type="number" step="0.01" min="0" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
                placeholder="e.g. 60.00" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
            </div>
          </div>
          {form.staff_type && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
              Preview: <strong className="text-gray-800">{form.staff_type}{form.grade ? ` — ${form.grade}` : ''}</strong> &middot; GHS {form.hourly_rate || '0.00'} per session
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn-brand text-sm px-4">Add Rate</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm px-3">Cancel</button>
          </div>
        </form>
      )}

      {!hasRates && !showForm ? (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400 text-sm">No payment rates configured yet.</p>
          <p className="text-gray-400 text-xs mt-1">Click "Load Defaults" for standard CABE rates, or "+ Add Rate" to create your own.</p>
        </div>
      ) : hasRates && (
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">Staff Category</th>
                <th className="text-right py-3 px-4 text-xs text-gray-500 font-semibold">Rate / Session (GHS)</th>
                <th className="text-right py-3 px-4 text-xs text-gray-500 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(grouped).map(([key, { label, rate }]) => (
                <tr key={key} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand" />
                      <span className="font-medium text-gray-900">{label}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {editing === key ? (
                      <form onSubmit={e => { e.preventDefault(); saveRate(key, editValue); }} className="inline-flex items-center gap-1 justify-end">
                        <span className="text-xs text-gray-400">GHS</span>
                        <input type="number" step="0.01" value={editValue} onChange={e => setEditValue(e.target.value)}
                          className="w-24 border rounded px-2 py-1 text-sm text-right font-mono" autoFocus
                          onBlur={() => setEditing(null)} onKeyDown={e => e.key === 'Escape' && setEditing(null)} />
                      </form>
                    ) : (
                      <button onClick={() => { setEditing(key); setEditValue(rate); }}
                        className="font-bold text-gray-900 hover:text-brand transition-colors font-mono tabular-nums"
                        title="Click to edit">
                        GHS {rate.toFixed(2)}
                      </button>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button onClick={() => deleteCategory(key)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasRates && (
        <p className="text-xs text-gray-400 text-center">Click any rate to edit. Rate applies to both Mid-Semester and End of Semester exams.</p>
      )}
    </div>
  );
}
