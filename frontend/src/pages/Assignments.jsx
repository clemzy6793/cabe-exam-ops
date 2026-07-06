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

export default function Assignments() {
  const [date, setDate] = useState('2026-07-06');
  const [faculties, setFaculties] = useState([]);
  const [facultyId, setFacultyId] = useState('all');
  const [exams, setExams] = useState([]);
  const [staff, setStaff] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [unassigned, setUnassigned] = useState([]);
  const [bulkModal, setBulkModal] = useState(false);

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

  const removeAssignment = async (assignmentId) => {
    try {
      await api.delete(`/assignments/${assignmentId}`);
      toast.success('Removed');
      load();
    } catch (err) {
      toast.error('Failed');
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
        <button onClick={() => setBulkModal(true)} className="btn-brand text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Bulk Assign IT Staff
        </button>
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
              <span className="text-xs text-gray-400">{sessionExams.length} exam(s)</span>
            </div>
            <div className="divide-y">
              {sessionExams.map(e => (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm">{e.course_code} <span className="font-normal text-gray-500">{e.course_name}</span></div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {e.venue} {e.student_count > 0 ? `| ${e.student_count} students` : ''}
                        {facultyId === 'all' && e.faculty_code && <span className="ml-1 text-amber-600 font-semibold">({e.faculty_code})</span>}
                      </div>
                    </div>
                    <button onClick={() => setAssignModal(e)} className="btn-brand text-xs px-3 py-1">+ Assign</button>
                  </div>
                  {e.assigned_staff?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {e.assigned_staff.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">
                          {s.name}
                          <span className="text-emerald-400 font-mono text-[10px]">{s.staff_code}</span>
                          <button onClick={() => removeAssignment(s.id)} className="text-red-400 hover:text-red-600 ml-1">&times;</button>
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
              {staff.filter(s => s.staff_type !== 'lecturer').map(s => {
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
                            <span className="font-medium text-sm">{e.course_code} <span className="font-normal text-gray-500">{e.course_name}</span></span>
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
