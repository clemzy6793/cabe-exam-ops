import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const DAYS = [
  { date: '2026-07-06', label: 'Mon 6th' },
  { date: '2026-07-07', label: 'Tue 7th' },
  { date: '2026-07-08', label: 'Wed 8th' },
  { date: '2026-07-09', label: 'Thu 9th' },
  { date: '2026-07-10', label: 'Fri 10th' },
];

const TIMES = ['8:15-9:15','10:00-11:00','11:45-12:45','1:30-2:30','3:15-4:15','5:00-6:00'];

function getDefaultDate() {
  const today = new Date().toISOString().slice(0, 10);
  const match = DAYS.find(d => d.date === today);
  if (match) return match.date;
  const future = DAYS.find(d => d.date > today);
  if (future) return future.date;
  return DAYS[DAYS.length - 1].date;
}

export default function Assignments() {
  const [date, setDate] = useState(getDefaultDate);
  const [faculties, setFaculties] = useState([]);
  const [facultyId, setFacultyId] = useState('all');
  const [exams, setExams] = useState([]);
  const [staff, setStaff] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [unassigned, setUnassigned] = useState([]);
  const [bulkModal, setBulkModal] = useState(false);
  const [replaceModal, setReplaceModal] = useState(false);
  const [autoAssignModal, setAutoAssignModal] = useState(false);
  const [mergeMode, setMergeMode] = useState(null);
  const [mergeSelected, setMergeSelected] = useState([]);

  const load = () => {
    const params = { date };
    if (facultyId !== 'all') params.faculty_id = facultyId;
    api.get('/timetable/exams', { params }).then(r => setExams(r.data));
    api.get('/assignments/unassigned', { params: { date } }).then(r => setUnassigned(r.data));
  };

  useEffect(() => {
    api.get('/timetable/faculties').then(r => setFaculties(r.data));
    api.get('/staff').then(r => setStaff(r.data));
  }, []);

  useEffect(() => { load(); }, [date, facultyId]);

  const assign = async (exam_id, staff_id) => {
    try {
      await api.post('/assignments', { exam_id, staff_id });
      toast.success('Assigned');
      setAssignModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const removeAssignment = async (assignmentId, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/assignments/${assignmentId}`);
      toast.success('Removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove');
    }
  };

  const removeAllAssignments = async (examId, courseCode) => {
    if (!confirm(`Remove all staff from ${courseCode}?`)) return;
    try {
      const { data } = await api.delete(`/assignments/exam/${examId}/all`);
      toast.success(data.message);
      load();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const removeAllFacultyAssignments = async () => {
    const fac = faculties.find(f => f.id === Number(facultyId));
    if (!fac) return;
    if (!confirm(`Remove ALL assignments for ${fac.name} on ${date}?`)) return;
    try {
      const { data } = await api.delete(`/assignments/faculty/${facultyId}/date/${date}`);
      toast.success(`Removed ${data.removed} assignment(s)`);
      load();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const toggleMergeExam = (id) => setMergeSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const doMerge = async () => {
    if (mergeSelected.length < 2) return toast.error('Select at least 2 exams to merge');
    const selectedExams = exams.filter(e => mergeSelected.includes(e.id));
    const labels = selectedExams.map(e => e.course_code).join(' + ');
    if (!confirm(`Merge ${labels}? This will combine their course codes, students, and IT staff into one entry.`)) return;
    const primary_id = mergeSelected[0];
    const merge_ids = mergeSelected.slice(1);
    try {
      const { data } = await api.post('/timetable/merge', { primary_id, merge_ids });
      toast.success(data.message);
      setMergeMode(null);
      setMergeSelected([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Merge failed');
    }
  };

  const grouped = {};
  exams.forEach(e => {
    const key = e.session_number;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  const selectedFaculty = faculties.find(f => f.id === Number(facultyId));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Staff Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">Assign invigilators to exam sessions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setAutoAssignModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Auto-Assign
          </button>
          <button onClick={() => setReplaceModal(true)} className="btn-ghost text-sm flex items-center gap-2 border">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            Search &amp; Replace
          </button>
          <button onClick={() => setBulkModal(true)} className="btn-brand text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Bulk Assign IT Staff
          </button>
        </div>
      </div>

      {/* Unassigned alert */}
      {unassigned.length > 0 && (
        <div className="card border-l-4 border-l-red-400 bg-red-50">
          <p className="text-sm font-bold text-red-700">{unassigned.length} exam(s) have no staff assigned for {date}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {unassigned.slice(0, 10).map(e => (
              <span key={e.id} className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                {e.course_code}{e.exam_type && e.exam_type !== 'written' ? ` [${e.exam_type}]` : ''} (S{e.session_number})
              </span>
            ))}
            {unassigned.length > 10 && <span className="text-xs text-red-400">+{unassigned.length - 10} more</span>}
          </div>
        </div>
      )}

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto">
        {DAYS.map(d => (
          <button key={d.date} onClick={() => setDate(d.date)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
              date === d.date ? 'bg-brand text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Faculty selector */}
      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setFacultyId('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
            facultyId === 'all' ? 'bg-amber-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}>
          All Faculties
        </button>
        {faculties.map(f => (
          <button key={f.id} onClick={() => setFacultyId(String(f.id))}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
              facultyId === String(f.id) ? 'bg-amber-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {f.code || f.name}
          </button>
        ))}
      </div>

      {/* Faculty header */}
      {facultyId !== 'all' && selectedFaculty && (
        <div className="card bg-amber-50 border-l-4 border-l-amber-500 flex items-center justify-between">
          <div>
            <p className="font-bold text-amber-800 text-sm">{selectedFaculty.name}</p>
            <p className="text-xs text-amber-600">{exams.length} exam(s) on this day</p>
          </div>
          {exams.some(e => e.assigned_staff?.length) && (
            <button onClick={removeAllFacultyAssignments}
              className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 border border-red-200">
              Remove All Assignments
            </button>
          )}
        </div>
      )}

      {/* Session groups */}
      {[1,2,3,4,5,6].map(sn => {
        const sessionExams = grouped[sn];
        if (!sessionExams?.length) return null;
        return (
          <div key={sn} className="card p-0 overflow-hidden">
            <div className="bg-brand/5 px-4 py-2 border-b flex items-center justify-between">
              <div>
                <span className="font-bold text-brand text-sm">Session {sn}</span>
                <span className="text-gray-500 text-xs ml-2">{TIMES[sn-1]}</span>
              </div>
              <div className="flex items-center gap-2">
                {mergeMode === sn ? (
                  <>
                    <button onClick={doMerge} disabled={mergeSelected.length < 2}
                      className="text-xs font-semibold px-3 py-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40">
                      Merge {mergeSelected.length} Selected
                    </button>
                    <button onClick={() => { setMergeMode(null); setMergeSelected([]); }}
                      className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => { setMergeMode(sn); setMergeSelected([]); }}
                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold">
                    Merge Exams
                  </button>
                )}
                <span className="text-xs text-gray-400">{sessionExams.length} exam(s)</span>
              </div>
            </div>
            <div className="divide-y">
              {sessionExams.map(e => (
                <div key={e.id} className={`px-4 py-3 ${mergeMode === sn && mergeSelected.includes(e.id) ? 'bg-purple-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {mergeMode === sn && (
                        <input type="checkbox" checked={mergeSelected.includes(e.id)}
                          onChange={() => toggleMergeExam(e.id)}
                          className="mt-1 rounded text-purple-600" />
                      )}
                      <div>
                        <div className="font-bold text-sm">
                          {e.course_code}
                          {e.exam_type && e.exam_type !== 'written' && (
                            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              e.exam_type === 'CBE' ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'
                            }`}>{e.exam_type}</span>
                          )}
                          <span className="font-normal text-gray-500 ml-1">{e.course_name}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {e.venue} {e.student_count > 0 ? `| ${e.student_count} students` : ''}
                          {facultyId === 'all' && e.faculty_code && <span className="ml-1 text-amber-600 font-semibold">({e.faculty_code})</span>}
                        </div>
                      </div>
                    </div>
                    {mergeMode !== sn && (
                      <button onClick={() => setAssignModal(e)} className="btn-brand text-xs px-3 py-1">+ Assign</button>
                    )}
                  </div>
                  {e.assigned_staff?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {e.assigned_staff.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">
                          {s.name}
                          <span className="text-emerald-400 font-mono text-[10px]">{s.staff_code}</span>
                          <button onClick={(e) => removeAssignment(s.id, e)} className="text-red-400 hover:text-red-600 ml-1">&times;</button>
                        </span>
                      ))}
                      {e.assigned_staff.length > 1 && (
                        <button onClick={() => removeAllAssignments(e.id, e.course_code)}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50">
                          Remove All
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {exams.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-sm">No exams found for this day{facultyId !== 'all' ? ' and faculty' : ''}</p>
        </div>
      )}

      {/* Faculty Roles (Printing / Biometric) */}
      <FacultyRoles faculties={faculties} staff={staff} />

      {/* Auto-Assign Modal */}
      {autoAssignModal && (
        <AutoAssignModal
          date={date}
          dates={DAYS}
          faculties={faculties}
          staff={staff.filter(s => s.staff_type === 'it_staff')}
          onClose={() => setAutoAssignModal(false)}
          onDone={() => { setAutoAssignModal(false); load(); }}
        />
      )}

      {/* Bulk Assign IT Staff Modal */}
      {bulkModal && (
        <BulkAssignModal
          date={date}
          faculties={faculties}
          staff={staff.filter(s => s.staff_type === 'it_staff')}
          onClose={() => setBulkModal(false)}
          onDone={() => { setBulkModal(false); load(); }}
        />
      )}

      {/* Search & Replace Modal */}
      {replaceModal && (
        <ReplaceModal
          staff={staff}
          onClose={() => setReplaceModal(false)}
          onDone={() => { setReplaceModal(false); load(); }}
        />
      )}

      {/* Assign modal */}
      {assignModal && (
        <AssignModal
          exam={assignModal}
          staff={staff}
          date={date}
          onAssign={(examId, staffId) => assign(examId, staffId)}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  );
}

function AutoAssignModal({ date, dates, faculties, staff, onClose, onDone }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedDates, setSelectedDates] = useState([date]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('config'); // config | running | done
  const [addTeam, setAddTeam] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', faculty_id: '', building: '', staff_ids: [] });
  const [teamResults, setTeamResults] = useState([]);

  const loadTeams = () => api.get('/assignments/teams').then(r => {
    setTeams(r.data);
    setSelectedTeams(r.data.map(t => t.id));
  });
  useEffect(() => { loadTeams(); }, []);

  const toggleDate = (d) => setSelectedDates(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  );
  const toggleTeam = (id) => setSelectedTeams(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const saveTeam = async () => {
    if (!newTeam.name || !newTeam.faculty_id || !newTeam.staff_ids.length) {
      toast.error('Fill in name, faculty, and select staff');
      return;
    }
    try {
      await api.post('/assignments/teams', newTeam);
      toast.success('Team saved');
      setAddTeam(false);
      setNewTeam({ name: '', faculty_id: '', building: '', staff_ids: [] });
      loadTeams();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteTeam = async (id) => {
    if (!confirm('Delete this team?')) return;
    try {
      await api.delete(`/assignments/teams/${id}`);
      toast.success('Deleted');
      loadTeams();
    } catch { toast.error('Failed'); }
  };

  const runAutoAssign = async () => {
    setLoading(true);
    setStep('running');
    const results = [];
    for (const d of selectedDates) {
      try {
        const { data } = await api.post('/assignments/auto-assign', {
          date: d,
          team_ids: selectedTeams,
        });
        results.push({ date: d, ...data });
      } catch (err) {
        results.push({ date: d, error: err.response?.data?.error || 'Failed' });
      }
    }
    setTeamResults(results);
    setResult({
      total_assigned: results.reduce((s, r) => s + (r.assigned || 0), 0),
      total_skipped: results.reduce((s, r) => s + (r.skipped || 0), 0),
      total_conflicts: results.reduce((s, r) => s + (r.conflicts?.length || 0), 0),
    });
    setStep('done');
    setLoading(false);
  };

  const toggleStaffInTeam = (id) => setNewTeam(prev => ({
    ...prev,
    staff_ids: prev.staff_ids.includes(id)
      ? prev.staff_ids.filter(x => x !== id)
      : [...prev.staff_ids, id]
  }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-emerald-50">
          <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Auto-Assign IT Staff
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Automatically assign IT teams to exam venues by faculty &amp; building</p>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {step === 'config' && (
            <div className="space-y-4">
              {/* Teams */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-gray-700">IT Teams</h4>
                  <button onClick={() => setAddTeam(!addTeam)}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold">
                    {addTeam ? 'Cancel' : '+ New Team'}
                  </button>
                </div>

                {teams.length === 0 && !addTeam && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-amber-700 font-semibold">No teams configured yet</p>
                    <p className="text-xs text-amber-500 mt-1">Create teams to define which IT staff cover which faculty/building</p>
                    <button onClick={() => setAddTeam(true)}
                      className="mt-3 bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-amber-600">
                      Create First Team
                    </button>
                  </div>
                )}

                {teams.map(t => (
                  <div key={t.id} className={`border rounded-lg p-3 mb-2 cursor-pointer transition-colors ${
                    selectedTeams.includes(t.id) ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input type="checkbox" checked={selectedTeams.includes(t.id)}
                          onChange={() => toggleTeam(t.id)} className="rounded text-emerald-600" />
                        <div>
                          <span className="font-bold text-sm">{t.name}</span>
                          <span className="text-xs text-gray-400 ml-2">
                            {t.faculty_code}{t.building ? ` / ${t.building}` : ''} — {t.staff_ids.length} staff
                          </span>
                        </div>
                      </label>
                      <button onClick={() => deleteTeam(t.id)} className="text-red-400 hover:text-red-600 text-xs px-2">&times;</button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.staff_ids.map(sid => {
                        const s = staff.find(x => x.id === sid);
                        return s ? (
                          <span key={sid} className="text-[10px] bg-white border px-1.5 py-0.5 rounded">
                            {s.name.split(' ')[0]}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}

                {/* Add team form */}
                {addTeam && (
                  <div className="border-2 border-dashed border-emerald-300 rounded-lg p-4 bg-emerald-50/50">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Team Name</label>
                        <input value={newTeam.name} onChange={e => setNewTeam(p => ({ ...p, name: e.target.value }))}
                          placeholder="e.g. Art Team" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Faculty</label>
                        <select value={newTeam.faculty_id} onChange={e => setNewTeam(p => ({ ...p, faculty_id: Number(e.target.value) }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                          <option value="">Select...</option>
                          {faculties.map(f => <option key={f.id} value={f.id}>{f.code || f.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase">Building</label>
                        <select value={newTeam.building} onChange={e => setNewTeam(p => ({ ...p, building: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                          <option value="">All venues</option>
                          <option value="NCB">NCB only</option>
                          <option value="FOBE">FOBE building only</option>
                        </select>
                      </div>
                    </div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">
                      Staff ({newTeam.staff_ids.length} selected)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1 max-h-48 overflow-y-auto">
                      {staff.map(s => (
                        <button key={s.id} onClick={() => toggleStaffInTeam(s.id)}
                          className={`text-left text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                            newTeam.staff_ids.includes(s.id)
                              ? 'border-emerald-400 bg-emerald-100 text-emerald-800'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          {s.name.length > 20 ? s.name.slice(0, 20) + '...' : s.name}
                        </button>
                      ))}
                    </div>
                    <button onClick={saveTeam}
                      className="mt-3 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 w-full">
                      Save Team
                    </button>
                  </div>
                )}
              </div>

              {/* Date selection */}
              <div>
                <h4 className="font-bold text-sm text-gray-700 mb-2">Days to assign</h4>
                <div className="flex gap-2 flex-wrap">
                  {dates.map(d => (
                    <button key={d.date} onClick={() => toggleDate(d.date)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                        selectedDates.includes(d.date)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {d.label}
                    </button>
                  ))}
                  <button onClick={() => setSelectedDates(selectedDates.length === dates.length ? [date] : dates.map(d => d.date))}
                    className="text-xs text-emerald-600 hover:underline px-2">
                    {selectedDates.length === dates.length ? 'Deselect all' : 'Select all days'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'running' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-4">Assigning staff across {selectedDates.length} day(s)...</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="font-black text-2xl text-gray-900">{result.total_assigned} Assigned</h3>
                {result.total_skipped > 0 && <p className="text-sm text-gray-500">{result.total_skipped} skipped (already assigned)</p>}
                {result.total_conflicts > 0 && <p className="text-sm text-amber-600">{result.total_conflicts} conflict(s)</p>}
              </div>

              {teamResults.map((r, i) => (
                <div key={i} className={`rounded-lg p-3 text-sm ${r.error ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{dates.find(d => d.date === r.date)?.label || r.date}</span>
                    {r.error ? (
                      <span className="text-red-600 text-xs">{r.error}</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">{r.assigned} assigned</span>
                    )}
                  </div>
                  {r.conflicts?.length > 0 && (
                    <div className="mt-1 text-xs text-amber-600">
                      {r.conflicts.slice(0, 3).map((c, j) => <div key={j}>{c.reason}</div>)}
                      {r.conflicts.length > 3 && <div>+{r.conflicts.length - 3} more</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          {step === 'config' && (
            <>
              <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
              <button onClick={runAutoAssign}
                disabled={!selectedTeams.length || !selectedDates.length}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-lg flex-1 disabled:opacity-40 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Auto-Assign {selectedDates.length} Day(s)
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onDone} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-lg w-full">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BulkAssignModal({ date, faculties, staff, onClose, onDone }) {
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [selectedExams, setSelectedExams] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [bulkFacultyId, setBulkFacultyId] = useState('all');
  const [exams, setExams] = useState([]);

  useEffect(() => {
    const params = { date };
    if (bulkFacultyId !== 'all') params.faculty_id = bulkFacultyId;
    api.get('/timetable/exams', { params }).then(r => setExams(r.data));
  }, [date, bulkFacultyId]);

  const toggleStaff = (id) => setSelectedStaff(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const toggleExam = (id) => setSelectedExams(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const selectAllStaff = () => setSelectedStaff(staff.map(s => s.id));
  const selectAllExams = () => setSelectedExams(exams.map(e => e.id));

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/assignments/bulk', {
        staff_ids: selectedStaff,
        exam_ids: selectedExams,
      });
      setResult(data);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-cyan-50">
          <h3 className="font-black text-lg text-gray-900">Bulk Assign IT Staff</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {step === 1 && 'Step 1: Select IT staff members'}
            {step === 2 && 'Step 2: Select faculty & exam sessions'}
            {step === 3 && 'Done!'}
          </p>
          <div className="flex gap-1 mt-2">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-cyan-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">{selectedStaff.length} selected</span>
                <button onClick={selectAllStaff} className="text-xs text-cyan-600 hover:underline">Select All</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {staff.map(s => (
                  <button key={s.id} onClick={() => toggleStaff(s.id)}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      selectedStaff.includes(s.id)
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.staff_code} | {s.phone}</div>
                  </button>
                ))}
              </div>
              {staff.length === 0 && <p className="text-center text-gray-400 py-8">No IT staff found</p>}
            </div>
          )}

          {step === 2 && (
            <div>
              {/* Faculty filter inside bulk modal */}
              <div className="flex gap-2 overflow-x-auto mb-4">
                <button onClick={() => { setBulkFacultyId('all'); setSelectedExams([]); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    bulkFacultyId === 'all' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  All Faculties
                </button>
                {faculties.map(f => (
                  <button key={f.id} onClick={() => { setBulkFacultyId(String(f.id)); setSelectedExams([]); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      bulkFacultyId === String(f.id) ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {f.code || f.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">{selectedExams.length} exams selected</span>
                <button onClick={selectAllExams} className="text-xs text-cyan-600 hover:underline">Select All</button>
              </div>

              {[1,2,3,4,5,6].map(sn => {
                const sessionExams = exams.filter(e => e.session_number === sn);
                if (!sessionExams.length) return null;
                const allSelected = sessionExams.every(e => selectedExams.includes(e.id));
                const toggleSession = () => {
                  if (allSelected) {
                    setSelectedExams(prev => prev.filter(id => !sessionExams.some(e => e.id === id)));
                  } else {
                    setSelectedExams(prev => [...new Set([...prev, ...sessionExams.map(e => e.id)])]);
                  }
                };
                return (
                  <div key={sn} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-brand">Session {sn} ({TIMES[sn-1]})</span>
                      <button onClick={toggleSession} className="text-[10px] text-cyan-600 hover:underline">
                        {allSelected ? 'Deselect session' : 'Select session'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      {sessionExams.map(e => (
                        <button key={e.id} onClick={() => toggleExam(e.id)}
                          className={`w-full text-left p-2.5 rounded-lg border-2 transition-colors ${
                            selectedExams.includes(e.id)
                              ? 'border-cyan-500 bg-cyan-50'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">
                              {e.course_code}
                              {e.exam_type && e.exam_type !== 'written' && (
                                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                  e.exam_type === 'CBE' ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'
                                }`}>{e.exam_type}</span>
                              )}
                              <span className="font-normal text-gray-500 ml-1">{e.course_name}</span>
                            </span>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-400">{e.venue}</span>
                              {bulkFacultyId === 'all' && e.faculty_code && (
                                <span className="text-[10px] text-amber-600 font-semibold ml-1">({e.faculty_code})</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {exams.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No exams found</p>}
            </div>
          )}

          {step === 3 && result && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="font-black text-xl text-gray-900">{result.assigned} Assignment(s) Created</h3>
              {result.skipped > 0 && <p className="text-sm text-gray-500 mt-1">{result.skipped} duplicate(s) skipped</p>}
              {result.conflicts?.length > 0 && (
                <div className="mt-3 text-left bg-amber-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-amber-700">{result.conflicts.length} conflict(s):</p>
                  {result.conflicts.slice(0, 5).map((c, i) => (
                    <p key={i} className="text-xs text-amber-600 mt-0.5">{c.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          {step === 1 && (
            <>
              <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
              <button onClick={() => setStep(2)} disabled={!selectedStaff.length}
                className="btn-brand flex-1 disabled:opacity-40">Next — Select Faculty & Exams</button>
            </>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
              <button onClick={submit} disabled={!selectedExams.length || loading}
                className="btn-brand flex-1 disabled:opacity-40">
                {loading ? 'Assigning...' : `Assign ${selectedStaff.length} staff → ${selectedExams.length} exams`}
              </button>
            </>
          )}
          {step === 3 && (
            <button onClick={onDone} className="btn-brand w-full">Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignModal({ exam, staff, date, onAssign, onClose }) {
  const [search, setSearch] = useState('');
  const [sessionAssignments, setSessionAssignments] = useState([]);

  useEffect(() => {
    api.get(`/assignments/by-date/${date}`).then(r => {
      setSessionAssignments(r.data.filter(a => a.session_number === exam.session_number));
    }).catch(() => {});
  }, [date, exam.session_number]);

  const busyMap = {};
  sessionAssignments.forEach(a => {
    if (a.exam_faculty_id === exam.faculty_id) return;
    if (!busyMap[a.staff_id]) busyMap[a.staff_id] = [];
    busyMap[a.staff_id].push({ course_code: a.course_code, venue: a.venue, faculty_name: a.faculty_name });
  });

  const filtered = staff.filter(s => s.staff_type !== 'lecturer').filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.staff_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h3 className="font-bold">Assign Staff to {exam.course_code}</h3>
          <p className="text-xs text-gray-500">Session {exam.session_number} | {exam.venue}</p>
          <input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm mt-2" autoFocus />
        </div>
        <div className="overflow-y-auto flex-1 divide-y">
          {filtered.map(s => {
            const alreadyAssigned = exam.assigned_staff?.some(a => a.staff_code === s.staff_code);
            const busy = busyMap[s.id];
            const isBusy = busy && !alreadyAssigned;
            return (
              <button key={s.id} disabled={alreadyAssigned || isBusy}
                onClick={() => onAssign(exam.id, s.id)}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 ${alreadyAssigned || isBusy ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-gray-400">{s.staff_code} {s.department ? `| ${s.department}` : ''}</div>
                  {isBusy && (
                    <div className="text-[10px] text-red-500 font-semibold mt-0.5">
                      Busy: {busy.map(b => `${b.course_code} at ${b.venue} (${b.faculty_name})`).join(', ')}
                    </div>
                  )}
                </div>
                <div className="ml-2 flex-shrink-0">
                  {alreadyAssigned ? (
                    <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded">Assigned</span>
                  ) : isBusy ? (
                    <span className="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded">In Session</span>
                  ) : (
                    <span className="text-xs text-brand">+ Assign</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t">
          <button onClick={onClose} className="btn-ghost w-full text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

const REPLACE_TIMES = ['8:15-9:15','10:00-11:00','11:45-12:45','1:30-2:30','3:15-4:15','5:00-6:00'];
const REPLACE_DAYS = { monday: 'Mon 6th', tuesday: 'Tue 7th', wednesday: 'Wed 8th', thursday: 'Thu 9th', friday: 'Fri 10th' };

function ReplaceModal({ staff, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [oldStaff, setOldStaff] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [newSearch, setNewSearch] = useState('');
  const [newStaff, setNewStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const loadAssignments = async (staffId) => {
    try {
      const allAssignments = [];
      const dates = ['2026-07-06','2026-07-07','2026-07-08','2026-07-09','2026-07-10'];
      for (const d of dates) {
        const { data } = await api.get(`/assignments/by-date/${d}`);
        allAssignments.push(...data.filter(a => a.staff_id === staffId));
      }
      setAssignments(allAssignments);
      setSelected(allAssignments.map(a => a.id));
    } catch { setAssignments([]); }
  };

  const pickOld = (s) => {
    setOldStaff(s);
    loadAssignments(s.id);
    setStep(2);
  };

  const pickNew = (s) => {
    setNewStaff(s);
    setStep(3);
  };

  const toggleSelect = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const doReplace = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/assignments/replace', {
        old_staff_id: oldStaff.id,
        new_staff_id: newStaff.id,
        assignment_ids: selected,
      });
      setResult(data);
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Replace failed');
    } finally {
      setLoading(false);
    }
  };

  const itStaff = staff.filter(s => s.staff_type !== 'lecturer');
  const filteredOld = itStaff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.staff_code?.toLowerCase().includes(search.toLowerCase()));
  const filteredNew = itStaff.filter(s => s.id !== oldStaff?.id && (s.name.toLowerCase().includes(newSearch.toLowerCase()) || s.staff_code?.toLowerCase().includes(newSearch.toLowerCase())));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-black text-lg text-gray-900">Search & Replace Staff</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {step === 1 && 'Step 1: Find staff to replace'}
            {step === 2 && 'Step 2: Pick replacement'}
            {step === 3 && 'Step 3: Confirm swap'}
            {step === 4 && 'Done!'}
          </p>
          <div className="flex gap-1 mt-2">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-brand' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Step 1: Search for old staff */}
          {step === 1 && (
            <div>
              <div className="p-4 border-b">
                <input placeholder="Search by name or staff code..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" autoFocus />
              </div>
              <div className="divide-y">
                {filteredOld.map(s => (
                  <button key={s.id} onClick={() => pickOld(s)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.staff_code} {s.department ? `| ${s.department}` : ''}</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
                {filteredOld.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No staff found</p>}
              </div>
            </div>
          )}

          {/* Step 2: Show assignments + pick replacement */}
          {step === 2 && oldStaff && (
            <div>
              <div className="p-4 bg-red-50 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 font-bold text-sm flex items-center justify-center">
                    {oldStaff.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-red-800">Replacing: {oldStaff.name}</p>
                    <p className="text-xs text-red-500">{oldStaff.staff_code} | {assignments.length} assignment(s)</p>
                  </div>
                </div>
                {assignments.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-red-700">Current assignments:</p>
                      <button onClick={() => setSelected(selected.length === assignments.length ? [] : assignments.map(a => a.id))}
                        className="text-[10px] text-red-600 hover:underline">
                        {selected.length === assignments.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    {assignments.map(a => (
                      <label key={a.id} className="flex items-center gap-2 text-xs bg-white/70 rounded-lg px-3 py-2 cursor-pointer">
                        <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)}
                          className="rounded text-brand" />
                        <span className="font-bold">{a.course_code}</span>
                        <span className="text-gray-500">{REPLACE_DAYS[a.day_name] || a.exam_date}</span>
                        <span className="text-gray-400">S{a.session_number} ({REPLACE_TIMES[a.session_number - 1]})</span>
                        <span className="text-gray-400">{a.venue}</span>
                      </label>
                    ))}
                  </div>
                )}
                {assignments.length === 0 && (
                  <p className="mt-2 text-xs text-red-400">This staff has no exam assignments to replace.</p>
                )}
              </div>
              {assignments.length > 0 && selected.length > 0 && (
                <div>
                  <div className="p-4 border-b">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Pick replacement ({selected.length} assignment{selected.length > 1 ? 's' : ''}):</p>
                    <input placeholder="Search replacement staff..." value={newSearch} onChange={e => setNewSearch(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2.5 text-sm" autoFocus />
                  </div>
                  <div className="divide-y">
                    {filteredNew.map(s => (
                      <button key={s.id} onClick={() => pickNew(s)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-xs text-gray-400">{s.staff_code} {s.department ? `| ${s.department}` : ''}</div>
                        </div>
                        <span className="text-xs text-emerald-600">Select</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && oldStaff && newStaff && (
            <div className="p-6">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-red-100 text-red-700 font-bold text-lg flex items-center justify-center mx-auto">
                    {oldStaff.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <p className="text-sm font-bold text-red-700 mt-2">{oldStaff.name}</p>
                  <p className="text-[10px] text-gray-400">{oldStaff.staff_code}</p>
                </div>
                <div className="flex flex-col items-center">
                  <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  <span className="text-[10px] text-gray-400 mt-1">{selected.length} exam(s)</span>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center mx-auto">
                    {newStaff.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <p className="text-sm font-bold text-emerald-700 mt-2">{newStaff.name}</p>
                  <p className="text-[10px] text-gray-400">{newStaff.staff_code}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                {assignments.filter(a => selected.includes(a.id)).map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <span className="font-bold">{a.course_code}</span>
                    <span className="text-gray-400">{REPLACE_DAYS[a.day_name] || a.exam_date} S{a.session_number}</span>
                    <span className="text-gray-400">{a.venue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && result && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="font-black text-xl text-gray-900">{result.replaced} Replaced</h3>
              {result.skipped > 0 && <p className="text-sm text-gray-500 mt-1">{result.skipped} skipped</p>}
              {result.conflicts?.length > 0 && (
                <div className="mt-3 text-left bg-amber-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-amber-700">Conflicts:</p>
                  {result.conflicts.map((c, i) => (
                    <p key={i} className="text-xs text-amber-600 mt-0.5">{c.exam}: {c.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          {step === 1 && <button onClick={onClose} className="btn-ghost w-full">Cancel</button>}
          {step === 2 && (
            <button onClick={() => { setStep(1); setOldStaff(null); setAssignments([]); setSelected([]); }}
              className="btn-ghost w-full">Back</button>
          )}
          {step === 3 && (
            <>
              <button onClick={() => { setStep(2); setNewStaff(null); }} className="btn-ghost flex-1">Back</button>
              <button onClick={doReplace} disabled={loading} className="btn-brand flex-1 disabled:opacity-40">
                {loading ? 'Replacing...' : `Replace ${selected.length} Assignment(s)`}
              </button>
            </>
          )}
          {step === 4 && <button onClick={onDone} className="btn-brand w-full">Done</button>}
        </div>
      </div>
    </div>
  );
}

function FacultyRoles({ faculties, staff }) {
  const [data, setData] = useState([]);
  const [addModal, setAddModal] = useState(null);

  const load = () => api.get('/assignments/faculty-staff').then(r => setData(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/assignments/faculty-staff/${id}`);
      toast.success('Removed');
      load();
    } catch { toast.error('Failed'); }
  };

  const assign = async (faculty_id, staff_id, role) => {
    try {
      await api.post('/assignments/faculty-staff', { faculty_id, staff_id, role });
      toast.success('Assigned');
      setAddModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const ROLES = [
    { key: 'printing', label: 'Printing', color: 'bg-violet-100 text-violet-700' },
    { key: 'biometric', label: 'Biometric', color: 'bg-cyan-100 text-cyan-700' },
  ];

  const itStaff = staff.filter(s => s.staff_type === 'it_staff');

  return (
    <div className="card p-0 overflow-hidden">
      <div className="bg-violet-50 px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm text-violet-900">Faculty Roles</h2>
          <p className="text-xs text-violet-500">Printing &amp; Biometric staff per faculty</p>
        </div>
      </div>
      <div className="divide-y">
        {faculties.map(fac => {
          const facStaff = data.filter(d => d.faculty_id === fac.id);
          return (
            <div key={fac.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-gray-800">{fac.code || fac.name}</span>
                <button onClick={() => setAddModal(fac)}
                  className="text-xs text-violet-600 hover:text-violet-800 font-semibold px-2 py-1 rounded hover:bg-violet-50">
                  + Add Staff
                </button>
              </div>
              {facStaff.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {facStaff.map(fs => {
                    const roleConf = ROLES.find(r => r.key === fs.role) || ROLES[0];
                    return (
                      <span key={fs.id} className="inline-flex items-center gap-1 text-xs bg-gray-50 border px-2 py-1 rounded-lg">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${roleConf.color}`}>{roleConf.label}</span>
                        {fs.staff_name}
                        <span className="text-gray-400 font-mono text-[10px]">{fs.staff_code}</span>
                        <button onClick={() => remove(fs.id)} className="text-red-400 hover:text-red-600 ml-1">&times;</button>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-300">No staff assigned</p>
              )}
            </div>
          );
        })}
      </div>

      {addModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAddModal(null)}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="font-bold">Add Staff to {addModal.code || addModal.name}</h3>
              <p className="text-xs text-gray-500">Select role and staff member</p>
            </div>
            <div className="p-4 border-b">
              <label className="text-xs font-semibold text-gray-600">Role</label>
              <div className="flex gap-2 mt-1">
                {ROLES.map(r => (
                  <button key={r.key} id={`role-${r.key}`}
                    onClick={() => {
                      document.querySelectorAll('[id^="role-"]').forEach(el => el.classList.remove('ring-2', 'ring-violet-500'));
                      document.getElementById(`role-${r.key}`).classList.add('ring-2', 'ring-violet-500');
                      document.getElementById('selected-role').value = r.key;
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${r.color}`}>
                    {r.label}
                  </button>
                ))}
                <input type="hidden" id="selected-role" defaultValue="printing" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y">
              {itStaff.map(s => {
                const alreadyHere = data.some(d => d.faculty_id === addModal.id && d.staff_id === s.id);
                return (
                  <button key={s.id} disabled={alreadyHere}
                    onClick={() => assign(addModal.id, s.id, document.getElementById('selected-role').value)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 ${alreadyHere ? 'opacity-40' : ''}`}>
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.staff_code}</div>
                    </div>
                    {alreadyHere ? (
                      <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded">Assigned</span>
                    ) : (
                      <span className="text-xs text-violet-600">+ Add</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t">
              <button onClick={() => setAddModal(null)} className="btn-ghost w-full text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
