import { useState } from 'react';
import api from '../api';
import toast, { Toaster } from 'react-hot-toast';

const TIMES = { 1: '8:15 - 9:15 AM', 2: '10:00 - 11:00 AM', 3: '11:45 - 12:45 PM' };
const INVIGILATION_ROLES = ['Invigilator SM', 'Invigilator SS'];
const OFFICE_ROLES = ['Office Staff SM', 'Office Staff SS'];
const ALL_ROLES = [...INVIGILATION_ROLES, ...OFFICE_ROLES];

const ROLE_TYPE_MAP = {
  'Invigilator SM':  'invigilator_sm',
  'Invigilator SS':  'invigilator_ss',
  'Office Staff SM': 'office_staff_sm',
  'Office Staff SS': 'office_staff_ss',
};

export default function StaffCheckin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logging, setLogging] = useState(false);
  const [staff, setStaff] = useState(null);   // set after login
  const [token, setToken] = useState('');

  const [selectedRole, setSelectedRole] = useState('Invigilator SM');
  const [selectedSession, setSelectedSession] = useState(1);
  const [checkingIn, setCheckingIn] = useState(false);
  const [done, setDone] = useState(null); // { role, session }

  const isOffice = OFFICE_ROLES.includes(selectedRole);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLogging(true);
    try {
      const { data } = await api.post('/staff-auth/login', { email: email.trim(), password });
      setToken(data.token);
      setStaff(data.staff);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLogging(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await api.post('/staff-auth/checkin', {
        staff_type: ROLE_TYPE_MAP[selectedRole],
        session_number: isOffice ? 0 : selectedSession,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDone({ role: selectedRole, session: isOffice ? 0 : selectedSession });
      toast.success('Checked in successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white">Staff Check-In</h1>
          <p className="text-blue-200 text-sm mt-1">CABE Exam Operations</p>
        </div>

        {!staff ? (
          /* ── Login form ── */
          <div className="card">
            <h2 className="font-black text-gray-900 mb-4">Sign In</h2>
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  autoComplete="email"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={logging}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm hover:shadow-lg hover:shadow-emerald-200 disabled:opacity-50 transition-all active:scale-95 mt-1">
                {logging ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
            <div className="text-center mt-4">
              <a href="/lookup" className="text-xs text-gray-400 hover:text-gray-600">← View my assignments</a>
            </div>
          </div>
        ) : done ? (
          /* ── Confirmed state ── */
          <div className="card text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-black text-emerald-700 text-lg">{staff.name}</p>
            <p className="text-sm text-gray-600 mt-1">
              Checked in as <strong>{done.role}</strong>
              {done.session > 0 && <span> — Session {done.session} <span className="text-gray-400">({TIMES[done.session]})</span></span>}
            </p>
            <button
              onClick={() => setDone(null)}
              className="mt-5 w-full py-2.5 rounded-xl border-2 border-emerald-200 text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-all">
              Check in for another session
            </button>
            <a href="/lookup" className="block mt-3 text-xs text-gray-400 hover:text-gray-600">View my assignments</a>
          </div>
        ) : (
          /* ── Check-in form ── */
          <div className="card space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-black">
                {staff.name[0]}
              </div>
              <div>
                <p className="font-black text-gray-900">{staff.name}</p>
                <p className="text-xs text-gray-400">{staff.faculty_name || staff.email}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Role</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map(r => (
                  <button key={r} onClick={() => setSelectedRole(r)}
                    className={`py-2 px-3 rounded-xl border-2 font-bold text-xs transition-all active:scale-95 ${
                      selectedRole === r
                        ? INVIGILATION_ROLES.includes(r)
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'bg-violet-500 text-white border-violet-500 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {!isOffice && (
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Session</p>
                <div className="flex gap-2">
                  {[1, 2, 3].map(sn => (
                    <button key={sn} onClick={() => setSelectedSession(sn)}
                      className={`flex-1 py-2.5 rounded-xl border-2 font-bold transition-all active:scale-95 ${
                        selectedSession === sn
                          ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-200'
                          : 'border-blue-200 text-blue-700 hover:border-blue-400 bg-white'
                      }`}>
                      <div className="text-xs">Session {sn}</div>
                      <div className="text-[9px] opacity-75">{TIMES[sn]}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleCheckIn} disabled={checkingIn}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm hover:shadow-lg hover:shadow-emerald-200 disabled:opacity-50 transition-all active:scale-95">
              {checkingIn
                ? 'Checking in…'
                : `Check In${!isOffice ? ` — Session ${selectedSession}` : ''}`}
            </button>

            <button onClick={() => { setStaff(null); setToken(''); setEmail(''); setPassword(''); }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 font-medium py-1">
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
