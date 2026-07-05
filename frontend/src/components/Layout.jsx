import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const ALL_NAV = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', roles: ['admin', 'superadmin', 'reviewer'] },
  { to: '/timetable', label: 'Timetable', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', roles: ['admin', 'superadmin', 'reviewer'] },
  { to: '/staff', label: 'Staff', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', roles: ['admin', 'superadmin'] },
  { to: '/assignments', label: 'Assignments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', roles: ['admin', 'superadmin'] },
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
          <button onClick={() => setShowPwModal(true)} className="w-full text-left text-xs text-blue-300 hover:text-white mb-3">Change Password</button>
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
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (newPw !== confirm) return toast.error('Passwords do not match');
    if (newPw.length < 6) return toast.error('Minimum 6 characters');
    setLoading(true);
    try {
      await api.put('/auth/change-password', { current_password: current, new_password: newPw });
      toast.success('Password changed!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-black mb-4">Change Password</h2>
        <form onSubmit={submit} className="space-y-3">
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
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-brand flex-1">
              {loading ? 'Saving...' : 'Change Password'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AccountsModal({ onClose }) {
  const [accounts, setAccounts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'reviewer' });
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/auth/accounts').then(r => setAccounts(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const addAccount = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('All fields required');
    if (form.password.length < 6) return toast.error('Minimum 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/accounts', form);
      toast.success('Account created');
      setShowAdd(false);
      setForm({ name: '', email: '', password: '', role: 'reviewer' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
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
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-black">Manage Accounts</h2>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-brand text-xs px-3 py-1.5">
            {showAdd ? 'Cancel' : '+ Add Reviewer'}
          </button>
        </div>

        {showAdd && (
          <form onSubmit={addAccount} className="p-4 border-b bg-gray-50 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" required />
              <input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" required />
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="reviewer">Reviewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn-brand text-sm w-full py-2">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="overflow-y-auto flex-1 divide-y">
          {accounts.map(a => (
            <div key={a.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{a.name}</div>
                <div className="text-xs text-gray-400">{a.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  a.role === 'admin' ? 'bg-brand/10 text-brand' : 'bg-amber-100 text-amber-700'
                }`}>{a.role}</span>
                {a.role === 'reviewer' && (
                  <button onClick={() => deleteAccount(a.id)} className="text-xs text-red-400 hover:text-red-600">Del</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t">
          <button onClick={onClose} className="btn-ghost w-full text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
