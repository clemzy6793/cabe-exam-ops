import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { useSession } from '../contexts/SessionContext';

const FALLBACK_SESSIONS = [
  { num: 1, time: '8:15 - 9:15 AM' },
  { num: 2, time: '10:00 - 11:00 AM' },
  { num: 3, time: '11:45 - 12:45 PM' },
  { num: 4, time: '1:30 - 2:30 PM' },
  { num: 5, time: '3:15 - 4:15 PM' },
  { num: 6, time: '5:00 - 6:00 PM' },
];

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ampm}` : `${h12} ${ampm}`;
}

function formatDateTab(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.toLocaleDateString('en-US', { weekday: 'short' });
  const num = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${day}, ${num} ${month}`;
}

export default function Timetable() {
  const { currentSession } = useSession();
  const [allExams, setAllExams] = useState([]);
  const [exams, setExams] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [date, setDate] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [search, setSearch] = useState('');
  const [editExam, setEditExam] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [cbeByod, setCbeByod] = useState(false);

  const uniqueDates = useMemo(() => {
    const dates = [...new Set(allExams.map(e => e.exam_date?.slice(0, 10)).filter(Boolean))].sort();
    return dates.map(d => ({ date: d, label: formatDateTab(d) }));
  }, [allExams]);

  useEffect(() => {
    if (!currentSession?.id) return;
    api.get('/timetable/exams', { params: { session_id: currentSession.id } })
      .then(r => {
        setAllExams(r.data);
        const dates = [...new Set(r.data.map(e => e.exam_date?.slice(0, 10)).filter(Boolean))].sort();
        if (dates.length && !date) setDate(dates[0]);
      });
  }, [currentSession?.id]);

  const load = () => {
    if (!currentSession?.id) return;
    const params = { session_id: currentSession.id };
    if (search) {
      params.search = search;
    } else {
      if (date) params.date = date;
      if (facultyId) params.faculty_id = facultyId;
    }
    api.get('/timetable/exams', { params }).then(r => setExams(r.data));
  };

  useEffect(() => { load(); }, [date, facultyId, search, currentSession?.id]);
  useEffect(() => { api.get('/timetable/faculties').then(r => setFaculties(r.data)); }, []);

  const grouped = {};
  exams.forEach(e => {
    const key = e.session_number;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  const sessionNums = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const sessions = sessionNums.map(num => {
    const sample = grouped[num]?.[0];
    const time = sample?.start_time && sample?.end_time
      ? `${formatTime(sample.start_time)} - ${formatTime(sample.end_time)}`
      : FALLBACK_SESSIONS.find(s => s.num === num)?.time || '';
    return { num, time };
  });

  // CBE-BYOD view: all matching exams grouped by date, then session
  const cbeByodByDate = useMemo(() => {
    if (!cbeByod) return [];
    const filtered = allExams.filter(e => e.exam_type === 'CBE-BYOD');
    const byDate = {};
    filtered.forEach(e => {
      const d = e.exam_date?.slice(0, 10);
      if (!byDate[d]) byDate[d] = { date: d, label: formatDateTab(d), dayName: e.day_name, sessions: {} };
      const s = e.session_number;
      if (!byDate[d].sessions[s]) byDate[d].sessions[s] = [];
      byDate[d].sessions[s].push(e);
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [cbeByod, allExams]);

  const saveExam = async (formData) => {
    try {
      if (editExam?.id) {
        await api.put(`/timetable/exams/${editExam.id}`, formData);
        toast.success('Exam updated');
      } else {
        await api.post('/timetable/exams', formData);
        toast.success('Exam added');
      }
      setEditExam(null);
      setShowAdd(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteExam = async (id) => {
    if (!confirm('Delete this exam?')) return;
    try {
      await api.delete(`/timetable/exams/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error('Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black text-gray-900">Exam Timetable</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCbeByod(v => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors border ${
              cbeByod ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-violet-600 border-violet-300 hover:bg-violet-50'
            }`}>
            CBE-BYOD Schedule
          </button>
          {!cbeByod && <button onClick={() => { setShowAdd(true); setEditExam({}); }} className="btn-brand text-sm">+ Add Exam</button>}
        </div>
      </div>

      {/* CBE-BYOD full-period view */}
      {cbeByod && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-violet-600 inline-block"></span>
              CBE-BYOD Exams — Full Period
            </span>
            <span className="text-sm text-gray-500">{allExams.filter(e=>e.exam_type==='CBE-BYOD').length} exams across {cbeByodByDate.length} days</span>
          </div>
          {cbeByodByDate.length === 0 && (
            <div className="card text-center py-10 text-gray-400">No CBE-BYOD exams in this session.</div>
          )}
          {cbeByodByDate.map(dayGroup => (
            <div key={dayGroup.date} className="card p-0 overflow-hidden">
              <div className="bg-violet-600 text-white px-4 py-2.5 flex items-center justify-between">
                <div className="font-bold text-sm">{dayGroup.label}</div>
                <span className="text-xs text-violet-200">
                  {Object.values(dayGroup.sessions).flat().length} exam{Object.values(dayGroup.sessions).flat().length !== 1 ? 's' : ''}
                </span>
              </div>
              {Object.keys(dayGroup.sessions).map(Number).sort((a,b)=>a-b).map(sNum => {
                const sExams = dayGroup.sessions[sNum];
                const time = FALLBACK_SESSIONS.find(s => s.num === sNum)?.time || '';
                return (
                  <div key={sNum} className="border-t first:border-t-0">
                    <div className="bg-violet-50 px-4 py-1.5 flex items-center gap-3 border-b border-violet-100">
                      <span className="text-xs font-bold text-violet-700">Session {sNum}</span>
                      <span className="text-xs text-violet-400">{time}</span>
                      <span className="text-xs text-gray-400 ml-auto">{sExams.length} exam{sExams.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="divide-y">
                      {sExams.map(e => (
                        <div key={e.id} className="px-4 py-3 flex items-start gap-4 hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-gray-900">{e.course_code}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                e.faculty_code === 'FOBE' ? 'bg-blue-100 text-blue-700' :
                                e.faculty_code === 'Art' ? 'bg-purple-100 text-purple-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>{e.faculty_code}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-violet-600 text-white">CBE-BYOD</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{e.course_name}</p>
                            <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-gray-400">
                              {e.venue && <span>Venue: {e.venue}</span>}
                              {e.student_count > 0 && <span>{e.student_count} students</span>}
                              {e.examiner && <span>Examiner: {e.examiner}</span>}
                            </div>
                          </div>
                          <button onClick={() => setEditExam(e)} className="text-xs text-brand hover:underline flex-shrink-0">Edit</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Normal timetable filters + grid */}
      {!cbeByod && <>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 overflow-x-auto">
          {uniqueDates.map(d => (
            <button key={d.date} onClick={() => setDate(d.date)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${date === d.date ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {d.label}
            </button>
          ))}
          <button onClick={() => setDate('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${!date ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            All Days
          </button>
        </div>
        <select value={facultyId} onChange={e => setFacultyId(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Faculties</option>
          {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-[150px]">
          <input placeholder="Search across all faculties..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm pr-8" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          )}
        </div>
      </div>

      {search && <p className="text-xs text-gray-500">Showing results for "<strong>{search}</strong>" across all days and faculties — {exams.length} found</p>}

      {/* Timetable grid by session */}
      {sessions.map(s => {
        const sessionExams = grouped[s.num];
        if (!sessionExams?.length) return null;
        return (
          <div key={s.num} className="card p-0 overflow-hidden">
            <div className="bg-brand/5 px-4 py-2 border-b flex items-center justify-between">
              <div>
                <span className="font-bold text-brand text-sm">Session {s.num}</span>
                <span className="text-gray-500 text-xs ml-2">{s.time}</span>
              </div>
              <span className="text-xs text-gray-400">{sessionExams.length} exam{sessionExams.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y">
              {sessionExams.map(e => (
                <div key={e.id} className="px-4 py-3 hover:bg-gray-50 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900">{e.course_code}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        e.faculty_code === 'FOBE' ? 'bg-blue-100 text-blue-700' :
                        e.faculty_code === 'Art' ? 'bg-purple-100 text-purple-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>{e.faculty_code}</span>
                      {e.exam_type === 'CBE' && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500 text-white">CBE</span>}
                      {e.exam_type === 'ONLINE' && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-green-500 text-white">ONLINE</span>}
                      {e.exam_type === 'BYOD' && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-sky-500 text-white">BYOD</span>}
                      {e.exam_type === 'CBE-BYOD' && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-violet-600 text-white">CBE-BYOD</span>}
                      {search && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                        {e.day_name?.charAt(0).toUpperCase() + e.day_name?.slice(1)} — {new Date(e.exam_date?.slice(0,10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{e.course_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-400">
                      {e.venue && <span>Venue: {e.venue}</span>}
                      {e.examiner && <span>Examiner: {e.examiner}</span>}
                      {e.year_group && <span>{e.year_group}</span>}
                      {e.student_count > 0 && <span>{e.student_count} students</span>}
                    </div>
                    {e.assigned_staff?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {e.assigned_staff.map((s, i) => (
                          <span key={i} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                            {s.name} ({s.staff_code})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditExam(e)} className="text-xs text-brand hover:underline">Edit</button>
                    <button onClick={() => deleteExam(e.id)} className="text-xs text-red-500 hover:underline">Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {exams.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-400">No exams found for the selected filters.</p>
        </div>
      )}

      </>}

      {/* Edit/Add Modal */}
      {(editExam || showAdd) && (
        <ExamModal
          exam={editExam}
          faculties={faculties}
          onSave={saveExam}
          onClose={() => { setEditExam(null); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function ExamModal({ exam, faculties, onSave, onClose }) {
  const [form, setForm] = useState({
    course_code: exam?.course_code || '',
    course_name: exam?.course_name || '',
    examiner: exam?.examiner || '',
    year_group: exam?.year_group || '',
    exam_date: exam?.exam_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    day_name: exam?.day_name || 'monday',
    session_number: exam?.session_number || 1,
    start_time: exam?.start_time || '08:15',
    end_time: exam?.end_time || '09:15',
    venue: exam?.venue || '',
    student_count: exam?.student_count || 0,
    exam_type: exam?.exam_type || 'written',
    faculty_id: exam?.faculty_id || faculties[0]?.id || '',
    notes: exam?.notes || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-black mb-4">{exam?.id ? 'Edit Exam' : 'Add Exam'}</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Course Code *</label>
              <input value={form.course_code} onChange={e => set('course_code', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Faculty</label>
              <select value={form.faculty_id} onChange={e => set('faculty_id', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Course Name</label>
            <input value={form.course_name} onChange={e => set('course_name', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Date *</label>
              <input type="date" value={form.exam_date} onChange={e => set('exam_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Session *</label>
              <select value={form.session_number} onChange={e => set('session_number', parseInt(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value={1}>1 (8:15 - 9:15)</option>
                <option value={2}>2 (10:00 - 11:00)</option>
                <option value={3}>3 (11:45 - 12:45)</option>
                <option value={4}>4 (1:30 - 2:30)</option>
                <option value={5}>5 (3:15 - 4:15)</option>
                <option value={6}>6 (5:00 - 6:00)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Examiner</label>
              <input value={form.examiner} onChange={e => set('examiner', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Year Group</label>
              <input value={form.year_group} onChange={e => set('year_group', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Venue</label>
              <input value={form.venue} onChange={e => set('venue', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Exam Type</label>
              <select value={form.exam_type} onChange={e => set('exam_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="written">Written</option>
                <option value="CBE">CBE</option>
                <option value="ONLINE">Online</option>
                <option value="BYOD">BYOD</option>
                <option value="CBE-BYOD">CBE-BYOD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Student Count</label>
            <input type="number" value={form.student_count} onChange={e => set('student_count', parseInt(e.target.value) || 0)}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
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
