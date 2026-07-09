import { useState, useEffect } from 'react';
import api from '../api';

const SESSION_TIMES = {
  1: '8:15 - 9:15 AM', 2: '10:00 - 11:00 AM', 3: '11:45 - 12:45 PM',
  4: '1:30 - 2:30 PM', 5: '3:15 - 4:15 PM', 6: '5:00 - 6:00 PM',
};

export default function ExaminerDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const name = localStorage.getItem('exam_ops_name') || 'Examiner';

  useEffect(() => {
    api.get('/timetable/my-exams')
      .then(r => setExams(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byDate = {};
  exams.forEach(e => {
    const d = e.exam_date?.slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(e);
  });

  const formatDate = (d) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Welcome, {name}</h1>
        <p className="text-sm text-gray-500 mt-1">Your exam schedule and venue details</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-black text-brand">{exams.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Exams</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-black text-emerald-600">{Object.keys(byDate).length}</p>
          <p className="text-xs text-gray-500 mt-1">Exam Days</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-black text-amber-600">{exams.reduce((s, e) => s + (e.student_count || 0), 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Total Students</p>
        </div>
      </div>

      {loading && <p className="text-center text-gray-400 py-8">Loading your exams...</p>}

      {!loading && exams.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-lg font-semibold">No exams found</p>
          <p className="text-sm text-gray-400 mt-2">Your name may not match any examiner in the timetable. Contact admin if this is incorrect.</p>
        </div>
      )}

      {Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayExams]) => (
        <div key={date} className="card p-0 overflow-hidden">
          <div className="bg-brand/5 px-4 py-3 border-b">
            <h2 className="font-bold text-brand">{formatDate(date)}</h2>
            <p className="text-xs text-gray-500">{dayExams.length} exam(s)</p>
          </div>
          <div className="divide-y">
            {dayExams.sort((a, b) => a.session_number - b.session_number).map(e => (
              <div key={e.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-bold text-base">
                      {e.course_code}
                      {e.exam_type && e.exam_type !== 'written' && (
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          e.exam_type === 'CBE' ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'
                        }`}>{e.exam_type}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{e.course_name}</p>
                    {e.year_group && <p className="text-xs text-gray-400 mt-0.5">{e.year_group}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block bg-brand/10 text-brand text-xs font-bold px-2.5 py-1 rounded-lg">
                      Session {e.session_number}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-1">{SESSION_TIMES[e.session_number]}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Venue</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{e.venue || 'TBA'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Students</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{e.student_count || '—'}</p>
                  </div>
                </div>

                {e.assigned_staff?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">IT Support Staff</p>
                    <div className="flex flex-wrap gap-1.5">
                      {e.assigned_staff.map((s, i) => (
                        <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">
                          {s.name} <span className="text-emerald-400 font-mono text-[10px]">{s.staff_code}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
