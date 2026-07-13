import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const ALL_NAV = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', roles: ['admin', 'superadmin', 'reviewer', 'exam_officer'] },
  { to: '/', label: 'My Exams', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', roles: ['examiner'] },
  { to: '/timetable', label: 'Timetable', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', roles: ['admin', 'superadmin', 'reviewer', 'exam_officer', 'examiner'] },
  { to: '/staff', label: 'Staff', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', roles: ['admin', 'superadmin', 'reviewer'] },
  { to: '/assignments', label: 'Assignments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', roles: ['admin', 'superadmin', 'reviewer'] },
  { to: '/it-report', label: 'IT Report', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['admin', 'superadmin', 'reviewer', 'exam_officer'] },
  { to: '/reports', label: 'Reports', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', roles: ['admin', 'superadmin', 'reviewer', 'exam_officer'] },
  { to: '/upload-timetable', label: 'Upload Timetable', icon: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['admin', 'superadmin', 'exam_officer'] },
  { to: '/venues', label: 'Venues', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', roles: ['admin', 'superadmin'] },
  { to: '/allowances', label: 'Allowances', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['admin', 'superadmin'] },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const nav = useNavigate();
  const role = localStorage.getItem('exam_ops_role') || 'admin';
  const isAdmin = role === 'admin' || role === 'superadmin';
  const NAV = ALL_NAV.filter(n => n.roles.includes(role));

  const logout = () => {
    localStorage.removeItem('exam_ops_token');
    localStorage.removeItem('exam_ops_role');
    localStorage.removeItem('exam_ops_name');
    localStorage.removeItem('exam_ops_faculty_id');
    nav('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-brand-dark text-white transform transition-transform lg:translate-x-0 lg:static ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-black tracking-tight">CABE Exam Ops</h1>
          <p className="text-xs text-blue-200 mt-0.5">Mid-Semester 2025/2026</p>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
              </svg>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <a href="/lookup" target="_blank" className="block text-xs text-blue-300 hover:text-white mb-3">Staff Lookup Portal</a>
          <a href="/public/timetable" target="_blank" className="block text-xs text-blue-300 hover:text-white mb-3">Public Timetable</a>
          {isAdmin && <button onClick={() => setShowAccounts(true)} className="w-full text-left text-xs text-blue-300 hover:text-white mb-3">Manage Accounts</button>}
          <button onClick={() => setShowPwModal(true)} className="w-full text-left text-xs text-blue-300 hover:text-white mb-3">Account Settings</button>
          <button onClick={logout} className="w-full text-left text-sm text-red-300 hover:text-red-200">Logout</button>
        </div>
      </aside>

      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="text-sm text-gray-500">
            KNUST - College of Art and Built Environment
          </div>
        </header>
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}
      {showAccounts && <AccountsModal onClose={() => setShowAccounts(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(r => { setName(r.data.name); setEmail(r.data.email); }).catch(() => {});
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return toast.error('Name and email are required');
    setProfileLoading(true);
    try {
      const { data } = await api.put('/auth/profile', { name: name.trim(), email: email.trim() });
      localStorage.setItem('exam_ops_token', data.token);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirm) return toast.error('Passwords do not match');
    if (newPw.length < 6) return toast.error('Minimum 6 characters');
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { current_password: current, new_password: newPw });
      toast.success('Password changed!');
      setCurrent(''); setNewPw(''); setConfirm('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-black mb-4">Account Settings</h2>

        <form onSubmit={saveProfile} className="space-y-3 mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Profile</p>
          <div>
            <label className="text-xs font-medium text-gray-600">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Email (login username)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
          </div>
          <button type="submit" disabled={profileLoading} className="btn-brand w-full py-2 text-sm">
            {profileLoading ? 'Saving...' : 'Update Profile'}
          </button>
        </form>

        <div className="border-t pt-4">
          <form onSubmit={changePassword} className="space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Change Password</p>
            <div>
              <label className="text-xs font-medium text-gray-600">Current Password</label>
              <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">New Password</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Confirm New Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
            </div>
            <button type="submit" disabled={pwLoading} className="btn-brand w-full py-2 text-sm">
              {pwLoading ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </div>

        <button onClick={onClose} className="btn-ghost w-full mt-4 text-sm">Close</button>
      </div>
    </div>
  );
}

function AccountsModal({ onClose }) {
  const [accounts, setAccounts] = useState([]);
  const [tab, setTab] = useState('accounts');
  const [faculties, setFaculties] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'reviewer', faculty_id: '' });
  const [loading, setLoading] = useState(false);
  const [itStaff, setItStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [staffPw, setStaffPw] = useState('');

  const load = () => {
    api.get('/auth/accounts').then(r => setAccounts(r.data)).catch(() => {});
    api.get('/staff', { params: { staff_type: 'it_staff' } }).then(r => setItStaff(r.data)).catch(() => {});
    api.get('/timetable/faculties').then(r => setFaculties(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const existingEmails = accounts.map(a => a.email.toLowerCase());
  const availableStaff = itStaff.filter(s => {
    const loginEmail = (s.email || `${s.phone}@staff.cabe`).toLowerCase();
    return !existingEmails.includes(loginEmail);
  });

  const toggleStaff = (id) => setSelectedStaff(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const addFromStaff = async () => {
    if (!selectedStaff.length) return toast.error('Select at least one staff');
    if (!staffPw || staffPw.length < 6) return toast.error('Set a password (min 6 chars)');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/accounts/from-staff', { staff_ids: selectedStaff, password: staffPw });
      toast.success(`${data.created} reviewer account(s) created`);
      setSelectedStaff([]);
      setStaffPw('');
      setTab('accounts');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('All fields required');
    if (form.password.length < 6) return toast.error('Minimum 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/accounts', form);
      toast.success('Account created');
      setForm({ name: '', email: '', password: '', role: 'reviewer' });
      setTab('accounts');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleEdit = async (id) => {
    try {
      const { data } = await api.put(`/auth/accounts/${id}/toggle-edit`);
      toast.success(data.can_edit ? 'Editing enabled' : 'Editing disabled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteAccount = async (id) => {
    if (!confirm('Delete this account?')) return;
    try {
      await api.delete(`/auth/accounts/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h2 className="text-lg font-black">Manage Accounts</h2>
          <div className="flex gap-1 mt-3">
            {[
              { key: 'accounts', label: 'Accounts' },
              { key: 'from_staff', label: 'From IT Staff' },
              { key: 'new', label: 'New Account' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  tab === t.key ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{t.label}</button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === 'accounts' && (
            <div className="divide-y">
              {accounts.map(a => (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{a.name}</div>
                    <div className="text-xs text-gray-400">{a.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.role === 'reviewer' && (
                      <button onClick={() => toggleEdit(a.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold cursor-pointer transition-colors ${
                          a.can_edit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                        }`}
                        title={a.can_edit ? 'Editing enabled — click to disable' : 'Editing disabled — click to enable'}>
                        {a.can_edit ? 'Can Edit' : 'View Only'}
                      </button>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      a.role === 'admin' || a.role === 'superadmin' ? 'bg-brand/10 text-brand' :
                      a.role === 'exam_officer' ? 'bg-purple-100 text-purple-700' :
                      a.role === 'examiner' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{a.role === 'exam_officer' ? `officer${a.faculty_code ? ` (${a.faculty_code})` : ''}` : a.role}</span>
                    {(a.role === 'reviewer' || a.role === 'exam_officer' || a.role === 'examiner') && (
                      <button onClick={() => deleteAccount(a.id)} className="text-xs text-red-400 hover:text-red-600">Del</button>
                    )}
                  </div>
                </div>
              ))}
              {accounts.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No accounts</p>}
            </div>
          )}

          {tab === 'from_staff' && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">Select IT staff to give reviewer access. They'll log in with their email (or phone@staff.cabe) and the password you set below.</p>
              <div>
                <label className="text-xs font-medium text-gray-600">Shared password for selected staff</label>
                <input type="text" placeholder="e.g. Review2026" value={staffPw} onChange={e => setStaffPw(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                {staffPw && staffPw.length < 6 && <p className="text-[10px] text-red-400 mt-0.5">{staffPw.length}/6 characters</p>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">{selectedStaff.length} selected of {availableStaff.length} available</span>
                <button onClick={() => setSelectedStaff(availableStaff.map(s => s.id))} className="text-xs text-cyan-600 hover:underline">Select All</button>
              </div>
              <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                {availableStaff.map(s => (
                  <button key={s.id} onClick={() => toggleStaff(s.id)}
                    className={`w-full text-left p-2.5 rounded-lg border-2 transition-colors ${
                      selectedStaff.includes(s.id)
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.staff_code} | {s.email || s.phone}</div>
                  </button>
                ))}
                {availableStaff.length === 0 && (
                  <p className="text-center text-gray-400 py-4 text-sm">All IT staff already have accounts</p>
                )}
              </div>
              {availableStaff.length > 0 && (
                <div>
                  {selectedStaff.length > 0 && !staffPw && (
                    <p className="text-xs text-amber-600 font-semibold mb-1">↑ Set a password above first</p>
                  )}
                  {selectedStaff.length > 0 && staffPw && staffPw.length < 6 && (
                    <p className="text-xs text-amber-600 font-semibold mb-1">↑ Password must be at least 6 characters</p>
                  )}
                  <button onClick={addFromStaff} disabled={!selectedStaff.length || !staffPw || staffPw.length < 6 || loading}
                    className="btn-brand w-full py-2 text-sm disabled:opacity-40">
                    {loading ? 'Creating...' : `Create ${selectedStaff.length} Reviewer Account(s)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'new' && (
            <form onSubmit={addAccount} className="p-4 space-y-3">
              <p className="text-xs text-gray-500">Create an account for someone not in the staff list.</p>
              <div>
                <label className="text-xs font-medium text-gray-600">Name</label>
                <input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Email (login username)</label>
                <input placeholder="email@example.com" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Password</label>
                <input placeholder="Min 6 characters" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  <option value="reviewer">Reviewer (IT Staff)</option>
                  <option value="examiner">Examiner</option>
                  <option value="exam_officer">Exam Officer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.role === 'exam_officer' && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Faculty</label>
                  <select value={form.faculty_id} onChange={e => setForm(f => ({ ...f, faculty_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required>
                    <option value="">Select faculty...</option>
                    {faculties.map(f => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-brand text-sm w-full py-2">
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <div className="p-3 border-t">
          <button onClick={onClose} className="btn-ghost w-full text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
