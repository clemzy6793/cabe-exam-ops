import { useState, useEffect } from 'react';
import api from '../api';

const DAYS = [
  { date: '2026-07-06', label: 'Monday 6th' },
  { date: '2026-07-07', label: 'Tuesday 7th' },
  { date: '2026-07-08', label: 'Wednesday 8th' },
  { date: '2026-07-09', label: 'Thursday 9th' },
  { date: '2026-07-10', label: 'Friday 10th' },
];

const SESSION_TIMES = {
  1: '8:15 - 9:15 AM',
  2: '10:00 - 11:00 AM',
  3: '11:45 - 12:45 PM',
  4: '1:30 - 2:30 PM',
  5: '3:15 - 4:15 PM',
  6: '5:00 - 6:00 PM',
};

export default function PublicTimetable() {
  const [date, setDate] = useState('2026-07-06');
  const [faculty, setFaculty] = useState('');
  const [exams, setExams] = useState([]);

  useEffect(() => {
    const params = {};
    if (date) params.date = date;
    if (faculty) params.faculty = faculty;
    api.get('/lookup/timetable', { params }).then(r => setExams(r.data));
  }, [date, faculty]);

  const grouped = {};
  exams.forEach(e => {
    const key = e.session_number;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-dark text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-black">CABE Exam Timetable</h1>
          <p className="text-blue-200 text-sm">Mid-Semester Examinations — 6th to 10th July 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {DAYS.map(d => (
            <button key={d.date} onClick={() => setDate(d.date)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                date === d.date ? 'bg-brand text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}>
              {d.label}
            </button>
          ))}
          <select value={faculty} onChange={e => setFaculty(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-xs ml-auto">
            <option value="">All Faculties</option>
            <option value="FOBE">Built Environment</option>
            <option value="Art">Art</option>
            <option value="Education">Education</option>
          </select>
        </div>

        {/* Sessions */}
        {[1,2,3,4,5,6].map(sn => {
          const sessionExams = grouped[sn];
          if (!sessionExams?.length) return null;
          return (
            <div key={sn} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="bg-brand/5 px-4 py-2 border-b flex items-center justify-between">
                <div>
                  <span className="font-bold text-brand text-sm">Session {sn}</span>
                  <span className="text-gray-500 text-xs ml-2">{SESSION_TIMES[sn]}</span>
                </div>
                <span className="text-xs text-gray-400">{sessionExams.length} exam{sessionExams.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y">
                {sessionExams.map((e, i) => (
                  <div key={i} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{e.course_code}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        e.faculty_code === 'FOBE' ? 'bg-blue-100 text-blue-700' :
                        e.faculty_code === 'Art' ? 'bg-purple-100 text-purple-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>{e.faculty_code}</span>
                      {e.exam_type === 'CBE' && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-orange-100 text-orange-700">CBE</span>}
                      {e.exam_type === 'BYOD' && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-cyan-100 text-cyan-700">BYOD</span>}
                    </div>
                    <p className="text-xs text-gray-500">{e.course_name}</p>
                    <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-gray-400">
                      {e.venue && <span>Venue: {e.venue}</span>}
                      {e.examiner && <span>Examiner: {e.examiner}</span>}
                      {e.student_count > 0 && <span>{e.student_count} students</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {exams.length === 0 && (
          <div className="text-center py-12 text-gray-400">No exams for the selected day/faculty.</div>
        )}

        <div className="text-center py-6">
          <a href="/lookup" className="text-brand text-sm hover:underline">Check your staff assignment</a>
        </div>
      </div>
    </div>
  );
}
