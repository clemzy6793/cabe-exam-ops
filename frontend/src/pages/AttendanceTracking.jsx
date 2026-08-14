import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { useSession } from '../contexts/SessionContext';

const TIMES = { 1: '8:15-9:15', 2: '10:00-11:00', 3: '11:45-12:45', 4: '1:30-2:30', 5: '3:15-4:15', 6: '5:00-6:00' };

const ROLE_CONFIG = {
  'Invigilator SM':  { bg: 'bg-orange-500',  light: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', icon: '🎓', rate: 60 },
  'Invigilator SS':  { bg: 'bg-amber-500',   light: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',   icon: '🎓', rate: 30 },
  'Office Staff SM': { bg: 'bg-violet-500',  light: 'bg-violet-50',  border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', icon: '🏢' },
  'Office Staff SS': { bg: 'bg-indigo-500',  light: 'bg-indigo-50',  border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700', icon: '🏢' },
  'System Analyst':  { bg: 'bg-rose-500',    light: 'bg-rose-50',    border: 'border-rose-200',   text: 'text-rose-700',   badge: 'bg-rose-100 text-rose-700',     icon: '💻', rate: 60 },
  'It Support':      { bg: 'bg-cyan-500',    light: 'bg-cyan-50',    border: 'border-cyan-200',   text: 'text-cyan-700',   badge: 'bg-cyan-100 text-cyan-700',     icon: '🔧', rate: 30 },
};
const ROLES = Object.keys(ROLE_CONFIG);

function getRoleStyle(staffType) {
  if (!staffType) return ROLE_CONFIG['Invigilator SM'];
  const key = staffType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return ROLE_CONFIG[key] || ROLE_CONFIG['Invigilator SM'];
}

const TAB_COLORS = {
  checkin: { active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200', icon: '🔍' },
  exams:   { active: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-200',    icon: '📝' },
  summary: { active: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200',  icon: '📊' },
};

export default function AttendanceTracking() {
  const { sessions, activeSession } = useSession();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [tab, setTab] = useState('checkin');

  const userRole = localStorage.getItem('exam_ops_role');
  const userFacultyId = localStorage.getItem('exam_ops_faculty_id');
  const isReviewer = userRole === 'reviewer';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const canVerify = true;

  useEffect(() => {
    if (activeSession) setSelectedSessionId(String(activeSession.id));
    else if (sessions.length) setSelectedSessionId(String(sessions[0].id));
  }, [activeSession, sessions]);

  const selectedSession = sessions.find(s => s.id === parseInt(selectedSessionId));
  const sessionLabel = selectedSession
    ? `${selectedSession.academic_year} | ${selectedSession.semester === 'second' ? '2nd' : '1st'} Semester | ${selectedSession.exam_type === 'mid_semester' ? 'Mid-Semester' : 'End of Semester'}`
    : '';

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-5 text-white">
        <h1 className="text-2xl font-black">Staff Check-In</h1>
        <p className="text-sm text-slate-300 mt-1">Search, add, and check in exam staff</p>
        <div className="mt-3">
          <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}
            className="bg-white/10 backdrop-blur border border-white/20 rounded-lg px-3 py-2 text-sm font-medium text-white w-full max-w-md [&>option]:text-gray-900">
            {sessions.length === 0 && <option value="">No sessions</option>}
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.academic_year} — {s.semester === 'second' ? '2nd' : '1st'} Sem — {s.exam_type === 'mid_semester' ? 'Mid-Semester' : 'End of Semester'}
                {s.status === 'active' ? ' (Current)' : s.status === 'closed' ? ' (Ended)' : ''}
              </option>
            ))}
          </select>
          {sessionLabel && <p className="text-xs text-emerald-300 font-semibold mt-2">{sessionLabel}</p>}
        </div>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-2xl p-1.5">
        {[
          { key: 'checkin', label: 'Check-In', desc: 'Search & check in staff' },
          { key: 'exams', label: 'Exam Sessions', desc: 'Assigned invigilators & IT' },
          { key: 'summary', label: 'Summary', desc: 'Overview' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
              tab === t.key ? TAB_COLORS[t.key].active : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
            }`}>
            <span className="block text-base mb-0.5">{TAB_COLORS[t.key].icon}</span>
            <span className="block">{t.label}</span>
            <span className={`block text-[10px] font-normal mt-0.5 ${tab === t.key ? 'text-white/80' : 'opacity-60'}`}>{t.desc}</span>
          </button>
        ))}
      </div>

      {!selectedSessionId ? (
        <div className="text-center py-16">
          <p className="text-gray-500">Select an examination session above</p>
        </div>
      ) : (
        <>
          {tab === 'checkin' && (
            <StaffCheckIn sessionId={selectedSessionId} isReviewer={isReviewer} isAdmin={isAdmin}
              canVerify={canVerify} userFacultyId={userFacultyId} />
          )}
          {tab === 'exams' && (
            <ExamCheckIn sessionId={selectedSessionId} isReviewer={isReviewer} isAdmin={isAdmin}
              canVerify={canVerify} userFacultyId={userFacultyId} />
          )}
          {tab === 'summary' && (
            <CheckInSummary sessionId={selectedSessionId} isAdmin={isAdmin}
              userFacultyId={userFacultyId} isReviewer={isReviewer} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab 1: Search-first check-in ───────────────────────────────
function StaffCheckIn({ sessionId, isReviewer, isAdmin, canVerify, userFacultyId }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [todayRecords, setTodayRecords] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    api.get('/timetable/faculties').then(r => setFaculties(r.data)).catch(() => {});
  }, []);

  const loadTodayRecords = useCallback(() => {
    api.get('/attendance-tracking', { params: { session_id: sessionId, date: selectedDate } })
      .then(r => setTodayRecords(r.data)).catch(() => {});
  }, [sessionId, selectedDate]);

  useEffect(() => { loadTodayRecords(); }, [loadTodayRecords]);

  const doSearch = useCallback(() => {
    if (!search.trim() || search.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setShowAddForm(false);
      return;
    }
    setSearching(true);
    api.get('/staff', { params: { search: search.trim() } }).then(r => {
      setSearchResults(r.data);
      setHasSearched(true);
      setSearching(false);
    }).catch(() => setSearching(false));
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(doSearch, 400);
    return () => clearTimeout(timer);
  }, [doSearch]);

  const checkedInMap = {};
  todayRecords.filter(r => r.present).forEach(r => {
    if (!checkedInMap[r.staff_id]) checkedInMap[r.staff_id] = [];
    checkedInMap[r.staff_id].push(r);
  });

  const checkIn = async (staff, role, facultyId, sessionNumber = 0) => {
    try {
      await api.post('/attendance-tracking', {
        session_id: sessionId,
        staff_id: staff.id,
        staff_type: role.toLowerCase().replace(/ /g, '_'),
        faculty_id: facultyId || staff.faculty_id,
        attendance_date: selectedDate,
        session_number: sessionNumber,
        present: true,
      });
      const label = sessionNumber > 0 ? `${staff.name} checked in — Session ${sessionNumber}` : `${staff.name} checked in as ${role}`;
      toast.success(label);
      loadTodayRecords();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const removeCheckIn = async (record) => {
    try {
      await api.delete(`/attendance-tracking/${record.id}`);
      toast.success('Check-in removed');
      loadTodayRecords();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const verifyAll = async () => {
    const unverified = todayRecords.filter(r => r.present && !r.verified);
    if (!unverified.length) return toast('Nothing to verify');
    try {
      await api.put('/attendance-tracking/verify', { ids: unverified.map(r => r.id) });
      toast.success(`${unverified.length} records verified`);
      loadTodayRecords();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const presentCount = todayRecords.filter(r => r.present).length;
  const verifiedCount = todayRecords.filter(r => r.verified).length;

  return (
    <>
      {/* Search + Date */}
      <div className="card border-l-4 border-l-emerald-500">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Search Staff</label>
            <div className="relative mt-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Type name or staff code..."
                className="w-full border-2 border-emerald-200 rounded-xl pl-10 pr-3 py-3 text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all" />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="block border-2 border-emerald-200 rounded-xl px-3 py-3 text-sm mt-1 focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" />
          </div>
        </div>
        <div className="flex gap-6 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm">{presentCount}</span>
            <span className="text-xs text-gray-500">Checked in</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm">{verifiedCount}</span>
            <span className="text-xs text-gray-500">Verified</span>
          </div>
        </div>
      </div>

      {/* Search results */}
      {hasSearched && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-gray-800">
              {searchResults.length > 0
                ? <><span className="text-emerald-600">{searchResults.length}</span> staff found</>
                : 'No staff found'}
            </h3>
            {searchResults.length === 0 && !showAddForm && (
              <button onClick={() => setShowAddForm(true)}
                className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-200 transition-all">
                + Add New Staff
              </button>
            )}
          </div>

          {searchResults.length === 0 && !showAddForm && (
            <div className="text-center py-8 bg-gradient-to-b from-gray-50 to-white rounded-xl">
              <div className="text-4xl mb-2">🤷</div>
              <p className="text-sm text-gray-600 font-medium">No staff matching "<strong className="text-emerald-600">{search}</strong>"</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add New Staff" to register and check in</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {searchResults.map(s => (
                <StaffRow key={s.id} staff={s} records={checkedInMap[s.id] || []}
                  onCheckIn={checkIn} onRemove={removeCheckIn} faculties={faculties}
                  checkerFacultyId={userFacultyId} />
              ))}
            </div>
          )}

          {searchResults.length > 0 && !showAddForm && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-center">
              <button onClick={() => setShowAddForm(true)}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-bold transition-colors">
                Staff not listed? <span className="underline">Add new staff member</span>
              </button>
            </div>
          )}

          {showAddForm && (
            <AddStaffForm
              defaultName={search}
              faculties={faculties}
              sessionId={sessionId}
              selectedDate={selectedDate}
              onDone={() => {
                setShowAddForm(false);
                setSearch('');
                setSearchResults([]);
                setHasSearched(false);
                loadTodayRecords();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          )}
        </div>
      )}

      {/* Today's check-in records */}
      {todayRecords.filter(r => r.present).length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-gray-800">
              📅 {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            {canVerify && presentCount > verifiedCount && (
              <button onClick={verifyAll}
                className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:shadow-lg hover:shadow-green-200 transition-all">
                Verify All ({presentCount - verifiedCount})
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 rounded-lg">
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-center py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Session</th>
                  <th className="text-center py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayRecords.filter(r => r.present).map((r, i) => {
                  const style = getRoleStyle(r.staff_type);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 text-gray-400 text-xs font-mono">{i + 1}</td>
                      <td className="py-3 px-3 font-semibold text-gray-900">{r.staff_name}</td>
                      <td className="py-3 px-3 font-mono text-xs text-gray-500">{r.staff_code}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${style.badge}`}>
                          {r.staff_type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.session_number > 0
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">S{r.session_number}</span>
                          : <span className="text-[10px] text-gray-300">—</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {r.verified ? (
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold">Verified</span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button onClick={() => removeCheckIn(r)}
                          className="text-[10px] text-red-400 hover:text-white hover:bg-red-500 px-2 py-1 rounded-lg font-bold transition-all">Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && todayRecords.filter(r => r.present).length === 0 && (
        <div className="card text-center py-16 bg-gradient-to-b from-emerald-50/50 to-white border-2 border-dashed border-emerald-200">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-gray-600 font-semibold">Search for a staff member to check them in</p>
          <p className="text-gray-400 text-xs mt-1">Type at least 2 characters to search by name or staff code</p>
        </div>
      )}
    </>
  );
}

// ─── Staff search result row with role + faculty + session selector ──────────
const OFFICE_ROLES = ['Office Staff SM', 'Office Staff SS'];
const INVIGILATION_SESSIONS = [1, 2, 3];
const IT_ROLES = ['System Analyst', 'It Support'];

function StaffRow({ staff, records, onCheckIn, onRemove, faculties, checkerFacultyId }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState(staff.faculty_id ? String(staff.faculty_id) : '');
  const [selectedRole, setSelectedRole] = useState('Invigilator SM');
  const [selectedSession, setSelectedSession] = useState(1);
  const panelRef = useRef(null);

  const hasAnyRecord = records.length > 0;
  const checkedSessions = records.map(r => r.session_number);
  const availableSessions = INVIGILATION_SESSIONS.filter(n => !checkedSessions.includes(n));
  const isNonOffice = records.length > 0 && !records.some(r => r.staff_type?.includes('office_staff'));
  const isOfficeRole = OFFICE_ROLES.includes(selectedRole);
  // IT roles auto-use the checker's faculty; everyone else uses the picker
  const showFacultyPicker = !(IT_ROLES.includes(selectedRole) && checkerFacultyId);
  const effectiveFacultyId = IT_ROLES.includes(selectedRole) && checkerFacultyId
    ? parseInt(checkerFacultyId)
    : (selectedFacultyId ? parseInt(selectedFacultyId) : null);

  useEffect(() => {
    if (expanded && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expanded]);

  const openPanel = (defaultSession) => {
    if (defaultSession) setSelectedSession(defaultSession);
    setExpanded(true);
  };

  const doCheckIn = () => {
    if (showFacultyPicker && !selectedFacultyId) return toast.error('Select a faculty');
    const sn = isOfficeRole ? 0 : selectedSession;
    onCheckIn(staff, selectedRole, effectiveFacultyId, sn);
    setExpanded(false);
  };

  const sessionOptions = hasAnyRecord ? availableSessions : INVIGILATION_SESSIONS;

  return (
    <div className={`p-3 rounded-xl border-2 transition-all ${
      hasAnyRecord ? 'border-green-300 bg-green-50 shadow-sm shadow-green-100' : 'border-gray-100 hover:border-emerald-200 hover:shadow-sm'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 transition-all ${
            hasAnyRecord ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md shadow-green-200' : 'bg-gray-100 text-gray-500'
          }`}>
            {hasAnyRecord ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : staff.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{staff.name}</p>
            <p className="text-xs text-gray-400">
              <span className="font-mono">{staff.staff_code || 'No code'}</span>
              {staff.faculty_code && <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium">{staff.faculty_code}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2 flex-wrap justify-end">
          {hasAnyRecord ? (
            <>
              {records.map(r => (
                <div key={r.id} className="flex items-center gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getRoleStyle(r.staff_type).badge}`}>
                    {r.session_number > 0 ? `S${r.session_number} · ` : ''}{r.staff_type?.replace(/_/g, ' ')}
                  </span>
                  <button onClick={() => onRemove(r)}
                    className="text-[10px] text-red-400 hover:text-white hover:bg-red-500 px-1.5 py-0.5 rounded-lg font-bold transition-all">✕</button>
                </div>
              ))}
              {isNonOffice && availableSessions.length > 0 && !expanded && (
                <button onClick={() => openPanel(availableSessions[0])}
                  className="text-[10px] px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all active:scale-95">
                  +S{availableSessions[0]}
                </button>
              )}
            </>
          ) : !expanded ? (
            <button onClick={() => openPanel(null)}
              className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-200 transition-all active:scale-95">
              Check In →
            </button>
          ) : null}
        </div>
      </div>

      {expanded && (
        <div ref={panelRef} className="mt-3 pt-3 border-t border-gray-100 space-y-3">

          {showFacultyPicker && (
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Faculty</span>
              <select value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)}
                className="w-full text-xs border-2 border-gray-200 rounded-lg px-2 py-1.5 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200">
                <option value="">-- Select Faculty --</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Role</span>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map(role => {
                const rc = ROLE_CONFIG[role];
                const active = selectedRole === role;
                return (
                  <button key={role} onClick={() => setSelectedRole(role)}
                    className={`text-[10px] px-3 py-1.5 rounded-lg font-bold border transition-all active:scale-95 ${
                      active ? `${rc.bg} text-white border-transparent shadow-sm` : `${rc.badge} ${rc.border}`
                    }`}>
                    {rc.icon} {role}
                  </button>
                );
              })}
            </div>
          </div>

          {!isOfficeRole && (
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Session</span>
              <div className="flex gap-2">
                {sessionOptions.map(sn => (
                  <button key={sn} onClick={() => setSelectedSession(sn)}
                    className={`flex-1 py-2 rounded-xl border-2 font-bold transition-all active:scale-95 ${
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

          <div className="flex gap-2 pt-1">
            <button onClick={doCheckIn}
              className="flex-1 text-sm font-bold py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-200 transition-all active:scale-95">
              Check In{!isOfficeRole ? ` — Session ${selectedSession}` : ''}
            </button>
            <button onClick={() => setExpanded(false)}
              className="text-xs px-4 py-2 text-gray-400 hover:text-gray-600 font-bold rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add new staff form ─────────────────────────────────────────
function AddStaffForm({ defaultName, faculties, sessionId, selectedDate, onDone, onCancel }) {
  const [name, setName] = useState(defaultName || '');
  const [phone, setPhone] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [role, setRole] = useState('Invigilator SM');
  const [sessionNumber, setSessionNumber] = useState(1);
  const [saving, setSaving] = useState(false);

  const isOfficeRole = OFFICE_ROLES.includes(role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const staffRes = await api.post('/staff', {
        name: name.trim(),
        phone: phone.trim() || null,
        faculty_id: facultyId || null,
        staff_type: role.startsWith('Invigilator') ? 'lecturer' : 'it_staff',
        role: role.toLowerCase().replace(/ /g, '_'),
      });
      const newStaff = staffRes.data;
      await api.post('/attendance-tracking', {
        session_id: sessionId,
        staff_id: newStaff.id,
        staff_type: role.toLowerCase().replace(/ /g, '_'),
        faculty_id: newStaff.faculty_id,
        attendance_date: selectedDate,
        session_number: isOfficeRole ? 0 : sessionNumber,
        present: true,
      });
      toast.success(`${newStaff.name} (${newStaff.staff_code}) added & checked in as ${role}`);
      onDone(newStaff, role);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add staff');
      setSaving(false);
    }
  };

  const rc = ROLE_CONFIG[role];

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200">
      <h4 className="font-black text-sm text-emerald-900 mb-4 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs">+</span>
        Add New Staff & Check In
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Full Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200" autoFocus />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0XX XXX XXXX"
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Faculty</label>
          <select value={facultyId} onChange={e => setFacultyId(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200">
            <option value="">— Select —</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Check-In Role *</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {ROLES.map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                  role === r ? `${ROLE_CONFIG[r].bg} text-white shadow-md` : `${ROLE_CONFIG[r].badge} border ${ROLE_CONFIG[r].border}`
                }`}>
                {ROLE_CONFIG[r].icon} {r}
              </button>
            ))}
          </div>
        </div>
        {!isOfficeRole && (
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Session *</label>
            <select value={sessionNumber} onChange={e => setSessionNumber(parseInt(e.target.value))}
              className="w-full border-2 border-blue-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-200">
              {INVIGILATION_SESSIONS.map(sn => (
                <option key={sn} value={sn}>Session {sn} — {TIMES[sn]}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button type="button" onClick={onCancel}
          className="text-xs px-4 py-2.5 rounded-xl border-2 text-gray-500 hover:bg-white font-bold">Cancel</button>
        <button type="submit" disabled={saving}
          className="text-xs px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-200 disabled:opacity-50 transition-all active:scale-95">
          {saving ? 'Adding...' : `${ROLE_CONFIG[role].icon} Add & Check In`}
        </button>
      </div>
    </form>
  );
}

// ─── Tab 2: Exam-based check-in (Assigned Invigilators & IT) ────
function ExamCheckIn({ sessionId, isReviewer, isAdmin, canVerify, userFacultyId }) {
  const [examDates, setExamDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [faculties, setFaculties] = useState([]);
  const [facultyFilter, setFacultyFilter] = useState('');
  const [exams, setExams] = useState([]);
  const [expandedExam, setExpandedExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setExamDates([]);
    setSelectedDate('');
    setExams([]);
    Promise.all([
      api.get('/exam-checkins/dates', { params: { session_id: sessionId } }),
      api.get('/timetable/faculties'),
    ]).then(([dRes, fRes]) => {
      setExamDates(dRes.data);
      setFaculties(fRes.data);
      if (dRes.data.length) setSelectedDate(dRes.data[0].date);
      if (isReviewer && userFacultyId) setFacultyFilter(userFacultyId);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [sessionId]);

  const loadExams = () => {
    if (!selectedDate) return;
    const params = { session_id: sessionId, date: selectedDate };
    if (facultyFilter) params.faculty_id = facultyFilter;
    api.get('/exam-checkins/by-date', { params }).then(r => setExams(r.data));
  };

  useEffect(() => { loadExams(); }, [selectedDate, facultyFilter]);

  const toggleCheckin = async (exam, staffId, currentState) => {
    try {
      await api.post('/exam-checkins', { session_id: sessionId, exam_id: exam.id, staff_id: staffId, checked_in: !currentState });
      loadExams();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const checkInAll = async (exam) => {
    const unchecked = exam.staff.filter(s => !s.checked_in).map(s => s.staff_id);
    if (!unchecked.length) return toast('All staff already checked in');
    try {
      await api.post('/exam-checkins/bulk', { session_id: sessionId, exam_id: exam.id, staff_ids: unchecked });
      toast.success(`${unchecked.length} staff checked in`);
      loadExams();
    } catch (err) { toast.error('Failed'); }
  };

  const verifyExam = async (exam) => {
    const unverified = exam.staff.filter(s => s.checked_in && !s.verified && s.checkin_id);
    if (!unverified.length) return toast('Nothing to verify');
    try {
      await api.put('/exam-checkins/verify', { ids: unverified.map(s => s.checkin_id) });
      toast.success(`${unverified.length} check-ins verified`);
      loadExams();
    } catch (err) { toast.error('Failed'); }
  };

  if (loading) return <Spinner />;

  const FACULTY_COLORS = {
    'FOBE': { bg: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 border border-blue-200' },
    'Art':  { bg: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 border border-purple-200' },
    'FOA':  { bg: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border border-amber-200' },
  };
  const getFacultyColor = (code) => FACULTY_COLORS[code] || { bg: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };

  const SESSION_COLORS = ['', 'from-blue-500 to-indigo-500', 'from-orange-500 to-amber-500', 'from-emerald-500 to-teal-500',
    'from-rose-500 to-pink-500', 'from-violet-500 to-purple-500', 'from-cyan-500 to-sky-500'];

  const bySession = {};
  exams.forEach(e => {
    if (!bySession[e.session_number]) bySession[e.session_number] = [];
    bySession[e.session_number].push(e);
  });

  const totalStaff = exams.reduce((sum, e) => sum + e.staff.length, 0);
  const totalChecked = exams.reduce((sum, e) => sum + e.staff.filter(s => s.checked_in).length, 0);

  return (
    <>
      <div className="card border-l-4 border-l-blue-500">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">Exam Date</label>
            <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="block border-2 border-blue-200 rounded-xl px-3 py-2.5 text-sm mt-1 font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-200">
              {examDates.map(d => (
                <option key={d.date} value={d.date}>
                  {d.day_name} — {new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {` (${d.exam_count} exams, ${d.staff_count} staff)`}
                </option>
              ))}
              {examDates.length === 0 && <option value="">No exam dates in this session</option>}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">Faculty</label>
            <select value={facultyFilter} onChange={e => setFacultyFilter(e.target.value)}
              className="block border-2 border-blue-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              disabled={isReviewer && !!userFacultyId}>
              {!isReviewer && <option value="">All Faculties</option>}
              {faculties.map(f => <option key={f.id} value={f.id}>{f.code}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm">{exams.length}</span>
            <span className="text-xs text-gray-500">Exams</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">{totalStaff}</span>
            <span className="text-xs text-gray-500">Staff</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-black text-sm">{totalChecked}</span>
            <span className="text-xs text-gray-500">Checked in</span>
          </div>
        </div>
      </div>

      {Object.keys(bySession).sort((a, b) => a - b).map(sn => (
        <div key={sn}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-black text-white px-3 py-1 rounded-full bg-gradient-to-r ${SESSION_COLORS[sn] || SESSION_COLORS[1]}`}>
              Session {sn}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">{TIMES[sn]}</span>
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-[10px] text-gray-400">{bySession[sn].length} exams</span>
          </div>
          <div className="space-y-2">
            {bySession[sn].map(exam => {
              const checked = exam.staff.filter(s => s.checked_in).length;
              const total = exam.staff.length;
              const isExpanded = expandedExam === exam.id;
              const fc = getFacultyColor(exam.faculty_code);
              const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
              return (
                <div key={exam.id} className="card p-0 overflow-hidden border-2 border-gray-100 hover:border-gray-200 transition-all">
                  <button onClick={() => setExpandedExam(isExpanded ? null : exam.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-black ${fc.badge}`}>{exam.faculty_code}</span>
                      <div className="min-w-0">
                        <span className="font-black text-sm text-gray-900">{exam.course_code}</span>
                        <span className="text-xs text-gray-500 ml-2 hidden sm:inline">{exam.course_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400 font-medium">{exam.venue}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-black ${
                          pct === 100 ? 'text-green-600' : pct > 0 ? 'text-amber-600' : 'text-gray-400'
                        }`}>{checked}/{total}</span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t-2 border-gray-100">
                      <div className="px-4 py-2 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-medium">{exam.student_count} students</span>
                        <div className="flex gap-2">
                          <button onClick={() => checkInAll(exam)}
                            className="text-[10px] px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold hover:shadow-md transition-all active:scale-95">
                            Check In All
                          </button>
                          {canVerify && (
                            <button onClick={() => verifyExam(exam)}
                              className="text-[10px] px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:shadow-md transition-all active:scale-95">
                              Verify All
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {exam.staff.map(s => (
                          <div key={s.staff_id} className={`flex items-center justify-between px-4 py-2.5 transition-colors ${
                            s.checked_in ? 'bg-green-50/50' : 'hover:bg-gray-50'
                          }`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <button onClick={() => toggleCheckin(exam, s.staff_id, s.checked_in)}
                                className={`w-7 h-7 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                  s.checked_in ? 'bg-gradient-to-br from-green-400 to-emerald-500 border-green-400 text-white shadow-sm shadow-green-200' : 'border-gray-300 hover:border-green-400'
                                }`}>
                                {s.checked_in && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </button>
                              <div className="min-w-0">
                                <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                                <span className="text-xs text-gray-400 ml-2 font-mono">{s.staff_code}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                                s.role === 'invigilator' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                s.role === 'it_support' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' :
                                s.role === 'system_analyst' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                'bg-gray-100 text-gray-600'
                              }`}>{s.role.replace(/_/g, ' ')}</span>
                              {s.verified && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">Verified</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {exam.staff.length === 0 && (
                          <div className="px-4 py-6 text-center text-xs text-gray-400">No staff assigned to this exam</div>
                        )}
                      </div>
                      <AddStaffToExam examId={exam.id} sessionId={sessionId}
                        existingStaffIds={new Set(exam.staff.map(s => s.staff_id))}
                        onAdded={loadExams} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {exams.length === 0 && !loading && (
        <div className="card text-center py-14 bg-gradient-to-b from-blue-50/50 to-white border-2 border-dashed border-blue-200">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-gray-600 font-semibold">No exams on this date</p>
          <p className="text-gray-400 text-xs mt-1">Select a date with exams or use the Check-In tab for manual staff check-in</p>
        </div>
      )}
    </>
  );
}

// ─── Add staff to exam (for System Analysts etc.) ─────────────────
function AddStaffToExam({ examId, sessionId, existingStaffIds, onAdded }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open || search.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      api.get('/staff', { params: { search: search.trim() } }).then(r => {
        setResults(r.data.filter(s => !existingStaffIds.has(s.id)));
        setSearching(false);
      }).catch(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [search, open, existingStaffIds]);

  const addStaff = async (staff) => {
    try {
      await api.post('/exam-checkins', { session_id: sessionId, exam_id: examId, staff_id: staff.id, checked_in: true });
      toast.success(`${staff.name} checked in`);
      setSearch('');
      setResults([]);
      onAdded();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  if (!open) return (
    <div className="px-4 py-2 border-t border-gray-100">
      <button onClick={() => setOpen(true)}
        className="text-[10px] text-rose-600 hover:text-rose-800 font-bold transition-colors">
        + Add IT Staff
      </button>
    </div>
  );

  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-rose-50/30">
      <div className="flex items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
          placeholder="Search staff name or code..."
          className="flex-1 border-2 border-rose-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-rose-300 focus:border-rose-400" />
        <button onClick={() => { setOpen(false); setSearch(''); setResults([]); }}
          className="text-[10px] text-gray-400 hover:text-gray-600 font-bold px-2">Cancel</button>
        {searching && <div className="w-4 h-4 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
          {results.map(s => (
            <button key={s.id} onClick={() => addStaff(s)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors text-left">
              <div>
                <span className="text-xs font-semibold text-gray-900">{s.name}</span>
                <span className="text-[10px] text-gray-400 ml-2 font-mono">{s.staff_code}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500 text-white font-bold">Check In</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Summary ──────────────────────────────────────────────
function CheckInSummary({ sessionId, isAdmin, userFacultyId, isReviewer }) {
  const [examSummary, setExamSummary] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [facultyFilter, setFacultyFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fid = isReviewer && userFacultyId ? userFacultyId : '';
    if (fid) setFacultyFilter(fid);
    const params = { session_id: sessionId };
    if (fid) params.faculty_id = fid;

    Promise.all([
      api.get('/exam-checkins/summary', { params }),
      api.get('/attendance-tracking/summary', { params }),
      api.get('/timetable/faculties'),
    ]).then(([eRes, aRes, fRes]) => {
      setExamSummary(eRes.data);
      setDailySummary(aRes.data);
      setFaculties(fRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [sessionId]);

  const reload = () => {
    const params = { session_id: sessionId };
    if (facultyFilter) params.faculty_id = facultyFilter;
    api.get('/exam-checkins/summary', { params }).then(r => setExamSummary(r.data));
    api.get('/attendance-tracking/summary', { params }).then(r => setDailySummary(r.data));
  };

  useEffect(() => { if (!loading) reload(); }, [facultyFilter]);

  if (loading) return <Spinner />;

  const examStaffIds = new Set(examSummary.map(e => e.staff_id));
  const supportStaff = dailySummary.filter(r => !examStaffIds.has(r.staff_id));

  const examGrandTotal = examSummary.reduce((sum, r) => sum + (r.sessions_checked_in * (getRoleStyle(r.staff_type).rate || 0)), 0);

  return (
    <>
      <div className="card border-l-4 border-l-purple-500">
        <div className="flex items-end gap-3">
          <div>
            <label className="text-xs font-bold text-purple-700 uppercase tracking-wide">Faculty</label>
            <select value={facultyFilter} onChange={e => setFacultyFilter(e.target.value)}
              className="block border-2 border-purple-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
              disabled={isReviewer && !!userFacultyId}>
              {!isReviewer && <option value="">All Faculties</option>}
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-black text-sm">{examSummary.length}</span>
            <span className="text-xs text-gray-500">Exam staff</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-700 font-black text-sm">{supportStaff.length}</span>
            <span className="text-xs text-gray-500">Office staff</span>
          </div>
        </div>
      </div>

      {examSummary.length > 0 && (
        <div className="card">
          <h3 className="font-black text-sm text-gray-800 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center text-[10px]">📝</span>
            Exam Staff Check-In Summary
          </h3>
          <p className="text-[10px] text-gray-400 mb-3">Invigilators, IT & System Analysts — sessions attended</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-blue-700 uppercase tracking-wider">#</th>
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-blue-700 uppercase tracking-wider">Staff</th>
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-blue-700 uppercase tracking-wider">Code</th>
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-blue-700 uppercase tracking-wider">Type</th>
                  <th className="text-center py-2.5 px-3 text-xs font-bold text-blue-700 uppercase tracking-wider">Sessions</th>
                  <th className="text-center py-2.5 px-3 text-xs font-bold text-blue-700 uppercase tracking-wider">Verified</th>
                  <th className="text-right py-2.5 px-3 text-xs font-bold text-blue-700 uppercase tracking-wider">Rate</th>
                  <th className="text-right py-2.5 px-3 text-xs font-bold text-blue-700 uppercase tracking-wider">Amount (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {examSummary.map((r, i) => {
                  const rate = getRoleStyle(r.staff_type).rate || 0;
                  const amount = r.sessions_checked_in * rate;
                  return (
                  <tr key={r.staff_id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2.5 px-3 text-gray-400 text-xs font-mono">{i + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{r.staff_name}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{r.staff_code}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${getRoleStyle(r.staff_type).badge}`}>
                        {r.staff_type?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center"><span className="font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">{r.sessions_checked_in}</span></td>
                    <td className="py-2.5 px-3 text-center"><span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{r.sessions_verified}</span></td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-600">{rate.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-gray-900">{amount.toFixed(2)}</td>
                  </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-200">
                  <td colSpan={7} className="py-2.5 px-3 text-right font-black text-sm text-blue-800">Total</td>
                  <td className="py-2.5 px-3 text-right font-black text-sm text-blue-800">GHS {examGrandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {supportStaff.length > 0 && (
        <div className="card">
          <h3 className="font-black text-sm text-gray-800 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white flex items-center justify-center text-[10px]">🏢</span>
            Office Staff Check-In Summary
          </h3>
          <p className="text-[10px] text-gray-400 mb-3">Office staff — days present during exam period</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-violet-50 to-purple-50">
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-purple-700 uppercase tracking-wider">#</th>
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-purple-700 uppercase tracking-wider">Staff</th>
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-purple-700 uppercase tracking-wider">Code</th>
                  <th className="text-left py-2.5 px-3 text-xs font-bold text-purple-700 uppercase tracking-wider">Role</th>
                  <th className="text-center py-2.5 px-3 text-xs font-bold text-purple-700 uppercase tracking-wider">Days Present</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {supportStaff.map((r, i) => (
                  <tr key={r.staff_id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-2.5 px-3 text-gray-400 text-xs font-mono">{i + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{r.staff_name}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{r.staff_code}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${getRoleStyle(r.staff_type).badge}`}>
                        {r.staff_type?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center"><span className="font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">{r.days_present}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-purple-50 border-t-2 border-purple-200">
                  <td colSpan={4} className="py-2.5 px-3 text-right font-black text-sm text-purple-800">Total Days</td>
                  <td className="py-2.5 px-3 text-center font-black text-sm text-purple-800">{supportStaff.reduce((sum, r) => sum + parseInt(r.days_present), 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {examSummary.length === 0 && supportStaff.length === 0 && (
        <div className="card text-center py-14 bg-gradient-to-b from-purple-50/50 to-white border-2 border-dashed border-purple-200">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-gray-600 font-semibold">No check-in records yet</p>
          <p className="text-gray-400 text-xs mt-1">Check in staff using the Check-In or Exam Sessions tabs</p>
        </div>
      )}
    </>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}
