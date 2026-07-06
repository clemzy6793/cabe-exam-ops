import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const FAC_COLORS = {
  FOBE: 'bg-blue-100 text-blue-700',
  Art: 'bg-purple-100 text-purple-700',
  Education: 'bg-emerald-100 text-emerald-700',
};

export default function Venues() {
  const [venues, setVenues] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', capacity: '', faculty_id: '' });

  const load = () => api.get('/venues').then(r => setVenues(r.data));

  useEffect(() => {
    load();
    api.get('/timetable/faculties').then(r => setFaculties(r.data));
  }, []);

  const filtered = venues.filter(v => {
    if (filter === 'all') return true;
    if (filter === 'shared') return !v.faculty_id;
    return v.faculty_id === Number(filter);
  });

  const grouped = {};
  filtered.forEach(v => {
    const key = v.faculty_code || 'Shared (NCB / Provost)';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(v);
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', capacity: '', faculty_id: '' });
    setShowForm(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({ name: v.name, capacity: String(v.capacity || 0), faculty_id: v.faculty_id ? String(v.faculty_id) : '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Venue name required');
    const body = { name: form.name, capacity: parseInt(form.capacity) || 0, faculty_id: form.faculty_id ? parseInt(form.faculty_id) : null };
    try {
      if (editing) {
        await api.put(`/venues/${editing.id}`, body);
        toast.success('Updated');
      } else {
        await api.post('/venues', body);
        toast.success('Added');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this venue?')) return;
    try {
      await api.delete(`/venues/${id}`);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  const groupOrder = ['FOBE', 'Art', 'Education', 'Shared (NCB / Provost)'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Venue Management</h1>
          <p className="text-sm text-gray-500 mt-1">{venues.length} venues across {faculties.length} faculties + shared</p>
        </div>
        <button onClick={openAdd} className="btn-brand text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Venue
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${filter === 'all' ? 'bg-brand text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>All ({venues.length})</button>
        {faculties.map(f => (
          <button key={f.id} onClick={() => setFilter(String(f.id))}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${filter === String(f.id) ? 'bg-brand text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {f.code} ({venues.filter(v => v.faculty_id === f.id).length})
          </button>
        ))}
        <button onClick={() => setFilter('shared')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${filter === 'shared' ? 'bg-brand text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
          Shared ({venues.filter(v => !v.faculty_id).length})
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-black text-brand">{venues.length}</p>
          <p className="text-xs text-gray-500">Total Venues</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-blue-600">{venues.reduce((s, v) => s + (v.capacity || 0), 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total Capacity</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-purple-600">{faculties.length}</p>
          <p className="text-xs text-gray-500">Faculties</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-amber-600">{venues.filter(v => !v.faculty_id).length}</p>
          <p className="text-xs text-gray-500">Shared Venues</p>
        </div>
      </div>

      {groupOrder.filter(g => grouped[g]).map(g => (
        <div key={g} className="card p-0 overflow-hidden">
          <div className={`px-4 py-2.5 border-b font-bold text-sm ${
            g === 'FOBE' ? 'bg-blue-50 text-blue-800' :
            g === 'Art' ? 'bg-purple-50 text-purple-800' :
            g === 'Education' ? 'bg-emerald-50 text-emerald-800' :
            'bg-gray-50 text-gray-700'
          }`}>
            {g === 'FOBE' ? 'Faculty of Built Environment' : g === 'Art' ? 'Faculty of Art' : g === 'Education' ? 'Faculty of Educational Studies' : g}
            <span className="ml-2 font-normal text-xs opacity-70">({grouped[g].length} venues, {grouped[g].reduce((s, v) => s + (v.capacity || 0), 0)} seats)</span>
          </div>
          <div className="divide-y">
            {grouped[g].map(v => (
              <div key={v.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm text-gray-900">{v.name}</span>
                  {v.faculty_code ? (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${FAC_COLORS[v.faculty_code]}`}>{v.faculty_code}</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-gray-100 text-gray-500">Shared</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{v.capacity} seats</span>
                  <button onClick={() => openEdit(v)} className="text-xs text-brand hover:text-brand-dark">Edit</button>
                  <button onClick={() => remove(v.id)} className="text-xs text-red-400 hover:text-red-600">&times;</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-lg">{editing ? 'Edit Venue' : 'Add Venue'}</h3>
            <div>
              <label className="text-sm font-semibold text-gray-700">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" autoFocus />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Faculty</label>
              <select value={form.faculty_id} onChange={e => setForm({ ...form, faculty_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">Shared (no faculty)</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={save} className="btn-brand flex-1">{editing ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
