import { useState, useEffect, useRef } from 'react';
import api from '../api';

const SESSION_TIMES = {
  1: '8:15 - 9:15 AM',
  2: '10:00 - 11:00 AM',
  3: '11:45 - 12:45 PM',
  4: '1:30 - 2:30 PM',
  5: '3:15 - 4:15 PM',
  6: '5:00 - 6:00 PM',
};

export default function StaffLookup() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounce = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/lookup/staff', { params: { name: query } });
        setSuggestions(data.results || []);
      } catch { setSuggestions([]); }
    }, 250);
  }, [query]);

  const selectStaff = async (id) => {
    setLoading(true);
    setError('');
    setSuggestions([]);
    try {
      const { data } = await api.get(`/lookup/staff/${id}`);
      setSelected(data);
      setQuery(data.staff.name);
    } catch (err) {
      setError(err.response?.data?.error || 'Not found');
    } finally {
      setLoading(false);
    }
  };

  const grouped = {};
  selected?.assignments?.forEach(a => {
    const key = a.exam_date?.slice(0, 10) || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark to-brand">
      <div className="max-w-lg mx-auto p-4 pt-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white">Staff Assignment Lookup</h1>
          <p className="text-blue-200 text-sm mt-1">CABE Mid-Semester Exams 2025/2026</p>
          <p className="text-blue-300/50 text-xs mt-0.5">6th - 10th July, 2026</p>
        </div>

        {/* Search */}
        <div className="card mb-6 relative">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Enter your name</label>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); setError(''); }}
            placeholder="e.g. Adjei-Twum"
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-base font-medium focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            autoComplete="off"
          />
          {error && <p className="text-red-500 text-sm mt-2 font-medium">{error}</p>}

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && !selected && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border z-10 max-h-64 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  onClick={() => selectStaff(s.id)}
                  className="w-full text-left px-4 py-3 hover:bg-brand/5 flex items-center justify-between border-b last:border-0"
                >
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{s.name}</div>
                    {s.department && <div className="text-xs text-gray-400">{s.department}</div>}
                  </div>
                  <span className="text-xs text-brand font-medium">View</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <div className="text-center text-blue-200">Loading...</div>}

        {/* Results */}
        {selected && (
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center text-white font-black text-lg">
                  {selected.staff.name[0]}
                </div>
                <div>
                  <h2 className="font-black text-lg text-gray-900">{selected.staff.name}</h2>
                  {selected.staff.department && <p className="text-xs text-gray-400">{selected.staff.department}</p>}
                  <p className="text-xs text-gray-300">{selected.staff.role}</p>
                </div>
              </div>
            </div>

            {selected.assignments.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-400">No exam assignments found.</p>
              </div>
            ) : (
              <>
                <div className="card bg-accent/10 border-accent/20">
                  <p className="text-sm font-bold text-accent">
                    You have {selected.assignments.length} assignment{selected.assignments.length !== 1 ? 's' : ''} this week
                  </p>
                </div>

                {Object.entries(grouped).sort().map(([date, assignments]) => (
                  <div key={date} className="card p-0 overflow-hidden">
                    <div className="bg-brand/5 px-4 py-2 border-b">
                      <span className="font-bold text-brand text-sm">
                        {assignments[0]?.day_name?.charAt(0).toUpperCase() + assignments[0]?.day_name?.slice(1)} — {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                    <div className="divide-y">
                      {assignments.map((a, i) => (
                        <div key={i} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900">{a.course_code}</span>
                              {a.exam_type === 'CBE' && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-orange-100 text-orange-700">CBE</span>}
                              {a.exam_type === 'BYOD' && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-cyan-100 text-cyan-700">BYOD</span>}
                            </div>
                            <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded font-semibold">
                              Session {a.session_number}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{a.course_name}</p>
                          <div className="flex flex-wrap gap-x-4 mt-1.5 text-xs text-gray-400">
                            <span>Time: {SESSION_TIMES[a.session_number]}</span>
                            {a.venue && <span>Venue: {a.venue}</span>}
                            {a.student_count > 0 && <span>{a.student_count} students</span>}
                          </div>
                          <div className="mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              a.faculty_code === 'FOBE' ? 'bg-blue-100 text-blue-700' :
                              a.faculty_code === 'Art' ? 'bg-purple-100 text-purple-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>{a.faculty_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <div className="text-center mt-8">
          <a href="/public/timetable" className="text-blue-200 text-sm hover:text-white">View Full Timetable</a>
          <span className="text-blue-300/30 mx-3">|</span>
          <a href="/login" className="text-blue-200 text-sm hover:text-white">Admin Login</a>
        </div>
      </div>
    </div>
  );
}
