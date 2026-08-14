import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useSession } from '../contexts/SessionContext';
import NotificationsBanner from './NotificationsBanner';

const NAV_GROUPS = [
  {
    items: [
      { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', roles: ['admin', 'superadmin', 'reviewer', 'exam_officer'] },
      { to: '/', label: 'My Exams', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', roles: ['examiner'] },
    ],
  },
  {
    label: 'Exams',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    roles: ['admin', 'superadmin', 'reviewer', 'exam_officer', 'examiner', 'checkin'],
    items: [
      { to: '/timetable', label: 'Timetable', roles: ['admin', 'superadmin', 'reviewer', 'exam_officer', 'examiner', 'checkin'] },
      { to: '/upload-timetable', label: 'Upload Timetable', roles: ['admin', 'superadmin', 'exam_officer'] },
      { to: '/staff', label: 'Staff', roles: ['admin', 'superadmin', 'reviewer'] },
      { to: '/assignments', label: 'Assignments', roles: ['admin', 'superadmin', 'reviewer'] },
      { to: '/venues', label: 'Venues', roles: ['admin', 'superadmin'] },
      { to: '/attendance-tracking', label: 'Staff Check-In', roles: ['admin', 'superadmin', 'reviewer', 'checkin'] },
    ],
  },
  {
    label: 'Reports',
    icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    roles: ['admin', 'superadmin', 'reviewer', 'exam_officer'],
    items: [
      { to: '/it-report', label: 'IT Report', roles: ['admin', 'superadmin', 'reviewer', 'exam_officer'] },
      { to: '/reports', label: 'Downloads', roles: ['admin', 'superadmin', 'reviewer', 'exam_officer'] },
    ],
  },
  {
    label: 'Finance',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    roles: ['admin', 'superadmin'],
    items: [
      { to: '/payment-rates', label: 'Pay Rates', roles: ['admin', 'superadmin'] },
      { to: '/payment-calc', label: 'Payments', roles: ['admin', 'superadmin'] },
      { to: '/allowances', label: 'Allowances', roles: ['admin', 'superadmin'] },
    ],
  },
  {
    label: 'Admin',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    roles: ['admin', 'superadmin'],
    items: [
      { to: '/sessions', label: 'Sessions', roles: ['admin', 'superadmin'] },
      { to: '/audit', label: 'Audit Log', roles: ['admin', 'superadmin'] },
    ],
  },
];

function NavGroup({ group, role, closeMobile }) {
  const location = useLocation();
  const items = group.items.filter(n => n.roles.includes(role));
  if (!items.length) return null;

  if (!group.label) {
    return items.map(n => (
      <NavLink
        key={n.label}
        to={n.to}
        end={n.to === '/'}
        onClick={closeMobile}
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
    ));
  }

  const childPaths = items.map(i => i.to);
  const isChildActive = childPaths.some(p => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p));
  const [open, setOpen] = useState(isChildActive);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isChildActive ? 'text-white' : 'text-blue-200 hover:bg-white/5 hover:text-white'
        }`}
      >
        <span className="flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={group.icon} />
          </svg>
          {group.label}
        </span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="ml-5 pl-3 border-l border-white/10 mt-1 space-y-0.5">
          {items.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              onClick={closeMobile}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-blue-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const nav = useNavigate();
  const role = localStorage.getItem('exam_ops_role') || 'admin';
  const isAdmin = role === 'admin' || role === 'superadmin';
  const canManageAccounts = isAdmin || (role === 'reviewer' && localStorage.getItem('exam_ops_can_edit') === '1');
  const { sessions, currentSession, selectSession } = useSession();

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
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-brand-dark text-white transform transition-transform lg:translate-x-0 lg:static flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-black tracking-tight">CABE Exam Ops</h1>
          <p className="text-xs text-blue-200 mt-0.5">
            {currentSession ? currentSession.name : 'No session selected'}
          </p>
        </div>
        <nav className="mt-4 space-y-1 px-3 flex-1 overflow-y-auto">
          {NAV_GROUPS.filter(g => !g.roles || g.roles.includes(role)).map((g, i) => (
            <NavGroup key={g.label || i} group={g} role={role} closeMobile={() => setOpen(false)} />
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <a href="/lookup" target="_blank" className="block text-xs text-blue-300 hover:text-white">Staff Lookup Portal</a>
          <a href="/public/timetable" target="_blank" className="block text-xs text-blue-300 hover:text-white">Public Timetable</a>
          {canManageAccounts && <button onClick={() => setShowAccounts(true)} className="w-full text-left text-xs text-blue-300 hover:text-white">Manage Accounts</button>}
          <button onClick={() => setShowPwModal(true)} className="w-full text-left text-xs text-blue-300 hover:text-white">Account Settings</button>
          <button onClick={logout} className="w-full text-left text-sm text-red-300 hover:text-red-200 mt-1">Logout</button>
        </div>
      </aside>

      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2" onClick={() => setOpen(true)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="text-sm text-gray-500 hidden sm:inline">KNUST - College of Art and Built Environment</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <select
              value={currentSession?.id || ''}
              onChange={e => e.target.value && selectSession(parseInt(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 font-medium text-gray-700 max-w-[220px]"
            >
              {sessions.length === 0 && <option value="">No sessions</option>}
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.academic_year} — {s.name}
                  {s.status === 'active' ? ' (Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main className="p-4 lg:p-6">
          <NotificationsBanner />
          <Outlet />
        </main>
      </div>

      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}
      {showAccounts && <AccountsModal isAdmin={isAdmin} onClose={() => setShowAccounts(false)} />}
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

function AccountsModal({ onClose, isAdmin }) {
  const [accounts, setAccounts] = useState([]);
  const [tab, setTab] = useState('accounts');
  const [faculties, setFaculties] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'reviewer', faculty_id: '' });
  const [loading, setLoading] = useState(false);
  const [itStaff, setItStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [staffPw, setStaffPw] = useState('');
  const [staffRole, setStaffRole] = useState('checkin');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', password: '' });
  const [editLoading, setEditLoading] = useState(false);

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
      const { data } = await api.post('/auth/accounts/from-staff', { staff_ids: selectedStaff, password: staffPw, role: staffRole });
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

  const selectAccount = (a) => {
    if (selectedAccount?.id === a.id) { setSelectedAccount(null); return; }
    setSelectedAccount(a);
    setEditForm({ name: a.name, email: a.email, role: a.role, password: '' });
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return toast.error('Name is required');
    if (editForm.password && editForm.password.length < 6) return toast.error('Minimum 6 characters');
    setEditLoading(true);
    try {
      const payload = { name: editForm.name, role: editForm.role, email: editForm.email };
      if (editForm.password) payload.password = editForm.password;
      await api.put(`/auth/accounts/${selectedAccount.id}`, payload);
      toast.success('Account updated');
      setSelectedAccount(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setEditLoading(false);
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
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h2 className="text-lg font-black">Manage Accounts</h2>
          <div className="flex gap-1 mt-3">
            {[
              { key: 'accounts', label: 'Accounts' },
              { key: 'from_staff', label: 'From IT Staff', adminOnly: true },
              { key: 'new', label: 'New Account', adminOnly: true },
            ].filter(t => !t.adminOnly || isAdmin).map(t => (
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
                <div key={a.id}>
                  <button
                    type="button"
                    onClick={() => selectAccount(a)}
                    className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
                      selectedAccount?.id === a.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm">{a.name}</div>
                      <div className="text-xs text-gray-400">{a.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && a.role === 'reviewer' && (
                        <span onClick={e => { e.stopPropagation(); toggleEdit(a.id); }}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold cursor-pointer transition-colors ${
                            a.can_edit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                          }`}
                          title={a.can_edit ? 'Editing enabled — click to disable' : 'Editing disabled — click to enable'}>
                          {a.can_edit ? 'Can Edit' : 'View Only'}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        a.role === 'admin' || a.role === 'superadmin' ? 'bg-brand/10 text-brand' :
                        a.role === 'exam_officer' ? 'bg-purple-100 text-purple-700' :
                        a.role === 'examiner' ? 'bg-emerald-100 text-emerald-700' :
                        a.role === 'checkin' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{
                        a.role === 'exam_officer' ? `officer${a.faculty_code ? ` (${a.faculty_code})` : ''}` :
                        a.role === 'checkin' ? 'check-in only' : a.role
                      }</span>
                      <svg className={`w-4 h-4 text-gray-300 transition-transform ${selectedAccount?.id === a.id ? 'rotate-180 text-blue-400' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>

                  {selectedAccount?.id === a.id && (
                    <form onSubmit={saveAccount} className="px-4 pb-4 pt-2 bg-blue-50 border-t border-blue-100 space-y-3">
                      <p className="text-xs font-semibold text-blue-700">Edit: {a.email}</p>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Name</label>
                        <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm mt-1 bg-white" required />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Login Email</label>
                        <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm mt-1 bg-white" required />
                      </div>
                      {isAdmin && a.role !== 'admin' && a.role !== 'superadmin' && (
                        <div>
                          <label className="text-xs font-medium text-gray-600">Role</label>
                          <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full border rounded-lg px-3 py-2 text-sm mt-1 bg-white">
                            <option value="checkin">Check-In Only</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="examiner">Examiner</option>
                            <option value="exam_officer">Exam Officer</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-gray-600">New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span></label>
                        <input type="text" placeholder="Min 6 characters" value={editForm.password}
                          onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm mt-1 bg-white" />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={editLoading} className="btn-brand flex-1 py-2 text-sm">
                          {editLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        {isAdmin && (a.role === 'reviewer' || a.role === 'checkin' || a.role === 'exam_officer' || a.role === 'examiner') && (
                          <button type="button" onClick={() => { if (confirm('Delete this account?')) deleteAccount(a.id); setSelectedAccount(null); }}
                            className="px-3 py-2 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50">
                            Delete
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              ))}
              {accounts.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No accounts</p>}
            </div>
          )}

          {tab === 'from_staff' && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">Select IT staff and assign them a role. They log in with their email (or phone@staff.cabe) and the password below.</p>

              {/* Role selection */}
              <div>
                <label className="text-xs font-medium text-gray-600">Access Level *</label>
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => setStaffRole('checkin')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-colors ${
                      staffRole === 'checkin'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    ✓ Check-In Only
                    <span className="block text-[10px] font-normal mt-0.5 opacity-75">Staff check-in page only</span>
                  </button>
                  <button type="button" onClick={() => setStaffRole('reviewer')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-colors ${
                      staffRole === 'reviewer'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    Reviewer
                    <span className="block text-[10px] font-normal mt-0.5 opacity-75">Timetable, staff, reports</span>
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-medium text-gray-600">Password for selected staff *</label>
                <input type="text" placeholder="e.g. CheckIn2026" value={staffPw} onChange={e => setStaffPw(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                {staffPw && staffPw.length < 6 && <p className="text-[10px] text-red-400 mt-0.5">{staffPw.length}/6 minimum</p>}
              </div>

              {/* Staff list */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">{selectedStaff.length} selected of {availableStaff.length} available</span>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedStaff(availableStaff.map(s => s.id))} className="text-xs text-cyan-600 hover:underline">All</button>
                  <button onClick={() => setSelectedStaff([])} className="text-xs text-gray-400 hover:underline">None</button>
                </div>
              </div>
              <div className="space-y-1 overflow-y-auto" style={{maxHeight: '220px'}}>
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
                <button onClick={addFromStaff} disabled={!selectedStaff.length || !staffPw || staffPw.length < 6 || loading}
                  className="btn-brand w-full py-2 text-sm disabled:opacity-40">
                  {loading ? 'Creating...' : `Create ${selectedStaff.length || 0} Account(s) — ${staffRole === 'checkin' ? 'Check-In Only' : 'Reviewer'}`}
                </button>
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
                  <option value="checkin">Check-In Only (IT Staff)</option>
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
