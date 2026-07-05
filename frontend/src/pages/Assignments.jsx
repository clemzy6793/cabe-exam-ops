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

export default function Assignments() {
  const [date, setDate] = useState('2026-07-06');
  const [exams, setExams] = useState([]);
  const [staff, setStaff] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [unassigned, setUnassigned] = useState([]);

  const load = () => {
    api.get('/timetable/exams', { params: { date } }).then(r => setExams(r.data));
    api.get('/assignments/unassigned', { params: { date } }).then(r => setUnassigned(r.data));
  };

  useEffect(() => { load(); }, [date]);
  useEffect(() => { api.get('/staff').then(r => setStaff(r.data)); }, []);

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

  const removeAssignment = async (assignmentId) => {
    try {
      await api.delete(`/assignments/${assignmentId}`);
      toast.success('Removed');
      load();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const grouped = {};
  exams.forEach(e => {
    const key = e.session_number;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Staff Assignments</h1>
        <p className="text-sm text-gray-500 mt-1">Assign invigilators to exam sessions</p>
      </div>

      {/* Unassigned alert */}
      {unassigned.length > 0 && (
        <div className="card border-l-4 border-l-red-400 bg-red-50">
          <p className="text-sm font-bold text-red-700">{unassigned.length} exam(s) have no staff assigned for {date}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {unassigned.slice(0, 10).map(e => (
              <span key={e.id} className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                {e.course_code} (S{e.session_number})
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

      {/* Session groups */}
      {[1,2,3,4,5,6].map(sn => {
        const sessionExams = grouped[sn];
        if (!sessionExams?.length) return null;
        const times = ['8:15-9:15','10:00-11:00','11:45-12:45','1:30-2:30','3:15-4:15','5:00-6:00'];
        return (
          <div key={sn} className="card p-0 overflow-hidden">
            <div className="bg-brand/5 px-4 py-2 border-b">
              <span className="font-bold text-brand text-sm">Session {sn}</span>
              <span className="text-gray-500 text-xs ml-2">{times[sn-1]}</span>
            </div>
            <div className="divide-y">
              {sessionExams.map(e => (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm">{e.course_code} <span className="font-normal text-gray-500">{e.course_name}</span></div>
                      <div className="text-xs text-gray-400 mt-0.5">{e.venue} {e.student_count > 0 ? `| ${e.student_count} students` : ''}</div>
                    </div>
                    <button onClick={() => setAssignModal(e)} className="btn-brand text-xs px-3 py-1">+ Assign</button>
                  </div>
                  {e.assigned_staff?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {e.assigned_staff.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">
                          {s.name}
                          <span className="text-emerald-400 font-mono text-[10px]">{s.staff_code}</span>
                          <button onClick={() => removeAssignment(s.id)} className="text-red-400 hover:text-red-600 ml-1">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Assign modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="font-bold">Assign Staff to {assignModal.course_code}</h3>
              <p className="text-xs text-gray-500">Session {assignModal.session_number} | {assignModal.venue}</p>
              <input placeholder="Search staff..." className="w-full border rounded-lg px-3 py-2 text-sm mt-2"
                id="staff-search" onChange={e => {
                  const val = e.target.value.toLowerCase();
                  document.querySelectorAll('[data-staff-row]').forEach(row => {
                    row.style.display = row.textContent.toLowerCase().includes(val) ? '' : 'none';
                  });
                }} />
            </div>
            <div className="overflow-y-auto flex-1 divide-y">
              {staff.map(s => {
                const alreadyAssigned = assignModal.assigned_staff?.some(a => a.staff_code === s.staff_code);
                return (
                  <button key={s.id} data-staff-row disabled={alreadyAssigned}
                    onClick={() => assign(assignModal.id, s.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 ${alreadyAssigned ? 'opacity-40' : ''}`}>
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.staff_code} {s.department ? `| ${s.department}` : ''}</div>
                    </div>
                    {alreadyAssigned ? (
                      <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded">Assigned</span>
                    ) : (
                      <span className="text-xs text-brand">+ Assign</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t">
              <button onClick={() => setAssignModal(null)} className="btn-ghost w-full text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
