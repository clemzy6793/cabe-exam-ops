import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { useSession } from '../contexts/SessionContext';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-amber-100 text-amber-700',
  archived: 'bg-red-100 text-red-600',
};

const NEXT_STATUS = {
  draft: 'active',
  active: 'closed',
  closed: 'archived',
};

export default function SessionManagement() {
  const { refresh } = useSession();
  const [years, setYears] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showYearForm, setShowYearForm] = useState(false);
  const [yearName, setYearName] = useState('');

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ name: '', exam_type: 'mid_semester', semester: 'first', start_date: '', end_date: '' });
  const [editingSession, setEditingSession] = useState(null);

  const load = async () => {
    try {
      const [yRes, sRes] = await Promise.all([
        api.get('/sessions/years'),
        api.get('/sessions', { params: selectedYear ? { year_id: selectedYear } : {} }),
      ]);
      setYears(yRes.data);
      setSessions(sRes.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedYear]);

  const addYear = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sessions/years', { name: yearName });
      toast.success('Academic year created');
      setYearName('');
      setShowYearForm(false);
      load();
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const setCurrent = async (id) => {
    try {
      await api.put(`/sessions/years/${id}/current`);
      toast.success('Current year updated');
      load();
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteYear = async (id) => {
    if (!confirm('Delete this academic year?')) return;
    try {
      await api.delete(`/sessions/years/${id}`);
      toast.success('Deleted');
      load();
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const saveSession = async (e) => {
    e.preventDefault();
    const yearId = selectedYear || years.find(y => y.is_current)?.id || years[0]?.id;
    if (!yearId) return toast.error('Create an academic year first');
    try {
      if (editingSession) {
        await api.put(`/sessions/${editingSession.id}`, sessionForm);
        toast.success('Session updated');
      } else {
        await api.post('/sessions', { ...sessionForm, academic_year_id: yearId });
        toast.success('Session created');
      }
      setSessionForm({ name: '', exam_type: 'mid_semester', semester: 'first', start_date: '', end_date: '' });
      setShowSessionForm(false);
      setEditingSession(null);
      load();
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const changeStatus = async (session, status) => {
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    if (!confirm(`${label} this session? ${status === 'active' ? 'Any other active session will be closed.' : ''}`)) return;
    try {
      await api.put(`/sessions/${session.id}/status`, { status });
      toast.success(`Session ${status}`);
      load();
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const toggleLock = async (session) => {
    try {
      const { data } = await api.put(`/sessions/${session.id}/lock`);
      toast.success(data.assignments_locked ? 'Assignments locked' : 'Assignments unlocked');
      load();
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const togglePublish = async (session) => {
    try {
      const { data } = await api.put(`/sessions/${session.id}/publish`);
      toast.success(data.published ? 'Session published — visible to all users' : 'Session unpublished — hidden from non-admin users');
      load();
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteSession = async (id) => {
    if (!confirm('Delete this draft session?')) return;
    try {
      await api.delete(`/sessions/${id}`);
      toast.success('Deleted');
      load();
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Examination Sessions</h1>
        <p className="text-sm text-gray-500 mt-1">Manage academic years and examination sessions</p>
      </div>

      {/* Academic Years */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Academic Years
          </h2>
          <button onClick={() => setShowYearForm(!showYearForm)}
            className="btn-brand text-xs px-3 py-1.5">
            + Add Year
          </button>
        </div>

        {showYearForm && (
          <form onSubmit={addYear} className="flex gap-2 mb-4">
            <input value={yearName} onChange={e => setYearName(e.target.value)}
              placeholder="2025/2026" pattern="\d{4}/\d{4}"
              className="border rounded-lg px-3 py-2 text-sm flex-1" required />
            <button type="submit" className="btn-brand text-sm px-4">Create</button>
            <button type="button" onClick={() => setShowYearForm(false)} className="btn-ghost text-sm px-3">Cancel</button>
          </form>
        )}

        <div className="space-y-2">
          {years.map(y => (
            <div key={y.id}
              onClick={() => setSelectedYear(selectedYear === y.id ? null : y.id)}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                selectedYear === y.id ? 'bg-brand/10 ring-1 ring-brand/20' : 'bg-gray-50 hover:bg-gray-100'
              }`}>
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900">{y.name}</span>
                {y.is_current && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">Current</span>}
                <span className="text-xs text-gray-400">{y.session_count} session(s)</span>
              </div>
              <div className="flex items-center gap-2">
                {!y.is_current && (
                  <button onClick={(e) => { e.stopPropagation(); setCurrent(y.id); }}
                    className="text-xs text-brand hover:underline">Set Current</button>
                )}
                {y.session_count === 0 && (
                  <button onClick={(e) => { e.stopPropagation(); deleteYear(y.id); }}
                    className="text-xs text-red-400 hover:text-red-600">Delete</button>
                )}
              </div>
            </div>
          ))}
          {years.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No academic years. Create one to get started.</p>}
        </div>
      </div>

      {/* Examination Sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Examination Sessions
            {selectedYear && <span className="text-xs font-normal text-gray-400 ml-1">
              ({years.find(y => y.id === selectedYear)?.name})
            </span>}
          </h2>
          <button onClick={() => { setEditingSession(null); setSessionForm({ name: '', exam_type: 'mid_semester', semester: 'first', start_date: '', end_date: '' }); setShowSessionForm(!showSessionForm); }}
            className="btn-brand text-xs px-3 py-1.5">
            + New Session
          </button>
        </div>

        {showSessionForm && (
          <form onSubmit={saveSession} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Semester</label>
                <select value={sessionForm.semester} onChange={e => setSessionForm(f => ({ ...f, semester: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  <option value="first">1st Semester</option>
                  <option value="second">2nd Semester</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Exam Type</label>
                <select value={sessionForm.exam_type} onChange={e => setSessionForm(f => ({ ...f, exam_type: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  <option value="mid_semester">Mid-Semester Exams</option>
                  <option value="end_of_semester">End of Semester Exams</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Session Name</label>
                <input value={sessionForm.name} onChange={e => setSessionForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. 2nd Semester Mid-Sem Exams" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Start Date</label>
                <input type="date" value={sessionForm.start_date} onChange={e => setSessionForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">End Date</label>
                <input type="date" value={sessionForm.end_date} onChange={e => setSessionForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-brand text-sm px-4">{editingSession ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowSessionForm(false); setEditingSession(null); }} className="btn-ghost text-sm px-3">Cancel</button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className={`rounded-xl border p-4 ${s.status === 'active' ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{s.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[s.status]}`}>
                      {s.status}
                    </span>
                    {s.published ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Published</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold">Hidden</span>
                    )}
                    {s.assignments_locked && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {s.academic_year} &middot; {s.semester === 'second' ? '2nd' : '1st'} Semester &middot; {s.exam_type === 'mid_semester' ? 'Mid-Semester' : 'End of Semester'}
                    {s.start_date && ` &middot; ${new Date(s.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                    {s.end_date && ` — ${new Date(s.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{s.exam_count} exam(s)</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.status !== 'archived' && (
                    <button onClick={() => togglePublish(s)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        s.published
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}>
                      {s.published ? 'Unpublish' : 'Publish'}
                    </button>
                  )}
                  {s.status !== 'archived' && (
                    <button onClick={() => toggleLock(s)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        s.assignments_locked
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {s.assignments_locked ? 'Unlock' : 'Lock'}
                    </button>
                  )}
                  {NEXT_STATUS[s.status] && (
                    <button onClick={() => changeStatus(s, NEXT_STATUS[s.status])}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium bg-brand/10 text-brand hover:bg-brand/20 transition-colors">
                      {NEXT_STATUS[s.status] === 'active' ? 'Activate' :
                       NEXT_STATUS[s.status] === 'closed' ? 'Close' : 'Archive'}
                    </button>
                  )}
                  {s.status === 'closed' && (
                    <button onClick={() => changeStatus(s, 'active')}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                      Reactivate
                    </button>
                  )}
                  {s.status !== 'archived' && (
                    <button onClick={() => {
                      setEditingSession(s);
                      setSessionForm({ name: s.name, exam_type: s.exam_type, semester: s.semester || 'first', start_date: s.start_date?.slice(0, 10) || '', end_date: s.end_date?.slice(0, 10) || '' });
                      setShowSessionForm(true);
                    }} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                  )}
                  {s.status === 'draft' && (
                    <button onClick={() => deleteSession(s.id)}
                      className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No examination sessions. Create one to get started.</p>}
        </div>
      </div>
    </div>
  );
}
