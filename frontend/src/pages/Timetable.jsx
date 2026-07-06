import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const DAYS = [
  { date: '2026-07-06', label: 'Monday 6th' },
  { date: '2026-07-07', label: 'Tuesday 7th' },
  { date: '2026-07-08', label: 'Wednesday 8th' },
  { date: '2026-07-09', label: 'Thursday 9th' },
  { date: '2026-07-10', label: 'Friday 10th' },
];

const SESSIONS = [
  { num: 1, time: '8:15 - 9:15 AM' },
  { num: 2, time: '10:00 - 11:00 AM' },
  { num: 3, time: '11:45 - 12:45 PM' },
  { num: 4, time: '1:30 - 2:30 PM' },
  { num: 5, time: '3:15 - 4:15 PM' },
  { num: 6, time: '5:00 - 6:00 PM' },
];

export default function Timetable() {
  const [exams, setExams] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [date, setDate] = useState('2026-07-06');
  const [facultyId, setFacultyId] = useState('');
  const [search, setSearch] = useState('');
  const [editExam, setEditExam] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    const params = {};
    if (date) params.date = date;
    if (facultyId) params.faculty_id = facultyId;
    if (search) params.search = search;
    api.get('/timetable/exams', { params }).then(r => setExams(r.data));
  };

  useEffect(() => { load(); }, [date, facultyId, search]);
  useEffect(() => { api.get('/timetable/faculties').then(r => setFaculties(r.data)); }, []);

  const grouped = {};
  exams.forEach(e => {
    const key = e.session_number;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

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
        <button onClick={() => { setShowAdd(true); setEditExam({}); }} className="btn-brand text-sm">+ Add Exam</button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 overflow-x-auto">
          {DAYS.map(d => (
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
        <input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[150px]" />
      </div>

      {/* Timetable grid by session */}
      {SESSIONS.map(s => {
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
                      {e.exam_type === 'BYOD' && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-sky-500 text-white">BYOD</span>}
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
    exam_date: exam?.exam_date?.slice(0, 10) || '2026-07-06',
    day_name: exam?.day_name || 'monday',
    session_number: exam?.session_number || 1,
    start_time: exam?.start_time || '08:15',
    end_time: exam?.end_time || '09:15',
    venue: exam?.venue || '',
    student_count: exam?.student_count || 0,
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
          <div>
            <label className="text-xs font-medium text-gray-600">Venue</label>
            <input value={form.venue} onChange={e => set('venue', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
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
