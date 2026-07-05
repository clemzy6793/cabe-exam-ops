import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [search, setSearch] = useState('');
  const [editStaff, setEditStaff] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = () => {
    const params = {};
    if (search) params.search = search;
    api.get('/staff', { params }).then(r => setStaff(r.data));
  };

  useEffect(() => { load(); }, [search]);
  useEffect(() => { api.get('/timetable/faculties').then(r => setFaculties(r.data)); }, []);

  const saveStaff = async (form) => {
    try {
      if (editStaff?.id) {
        await api.put(`/staff/${editStaff.id}`, form);
        toast.success('Updated');
      } else {
        await api.post('/staff', form);
        toast.success('Staff added');
      }
      setEditStaff(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteStaff = async (id) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      await api.delete(`/staff/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const viewDetail = async (id) => {
    try {
      const { data } = await api.get(`/staff/${id}`);
      setDetail(data);
    } catch (err) {
      toast.error('Failed to load details');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">{staff.length} staff members</p>
        </div>
        <button onClick={() => setEditStaff({})} className="btn-brand text-sm">+ Add Staff</button>
      </div>

      <div className="card p-3">
        <input placeholder="Search by name, code, or email..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-2.5 font-semibold text-gray-600">Code</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600">Name</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 hidden md:table-cell">Department</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 hidden lg:table-cell">Faculty</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-center">Assignments</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs text-brand font-bold">{s.staff_code}</td>
                <td className="px-4 py-2.5 font-medium">{s.name}</td>
                <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{s.department || '-'}</td>
                <td className="px-4 py-2.5 text-gray-500 hidden lg:table-cell">{s.faculty_name || '-'}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                    s.assignment_count > 0 ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-gray-400'
                  }`}>{s.assignment_count}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => viewDetail(s.id)} className="text-xs text-brand hover:underline mr-2">View</button>
                  <button onClick={() => setEditStaff(s)} className="text-xs text-gray-500 hover:underline mr-2">Edit</button>
                  <button onClick={() => deleteStaff(s.id)} className="text-xs text-red-500 hover:underline">Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staff.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No staff found</div>
        )}
      </div>

      {/* Edit/Add Modal */}
      {editStaff && (
        <StaffModal staff={editStaff} faculties={faculties} onSave={saveStaff} onClose={() => setEditStaff(null)} />
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black">{detail.name}</h2>
                <p className="text-sm text-brand font-mono">{detail.staff_code}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {detail.assignments?.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-600">{detail.assignments.length} Assignment(s)</h3>
                {detail.assignments.map((a, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="font-bold text-sm">{a.course_code} — {a.course_name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {a.day_name} {a.exam_date?.slice(0, 10)} | Session {a.session_number} ({a.start_time} - {a.end_time})
                    </div>
                    <div className="text-xs text-gray-400">Venue: {a.venue} | {a.faculty_name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No assignments yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StaffModal({ staff, faculties, onSave, onClose }) {
  const [form, setForm] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    department: staff?.department || '',
    faculty_id: staff?.faculty_id || '',
    role: staff?.role || 'invigilator',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-black mb-4">{staff?.id ? 'Edit Staff' : 'Add Staff'}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Department</label>
              <input value={form.department} onChange={e => set('department', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Faculty</label>
              <select value={form.faculty_id} onChange={e => set('faculty_id', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">None</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
              <option value="invigilator">Invigilator</option>
              <option value="examiner">Examiner</option>
              <option value="coordinator">Coordinator</option>
              <option value="it_staff">IT Staff</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => onSave(form)} className="btn-brand flex-1">Save</button>
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
