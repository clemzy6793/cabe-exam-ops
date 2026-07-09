import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('exam_ops_token', data.token);
      localStorage.setItem('exam_ops_role', data.admin.role);
      localStorage.setItem('exam_ops_name', data.admin.name);
      if (data.admin.faculty_id) localStorage.setItem('exam_ops_faculty_id', String(data.admin.faculty_id));
      else localStorage.removeItem('exam_ops_faculty_id');
      toast.success(`Welcome, ${data.admin.name}`);
      nav('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">CABE Exam Ops</h1>
          <p className="text-blue-200 text-sm mt-1">Exam Operations Management System</p>
          <p className="text-blue-300/60 text-xs mt-0.5">KNUST - College of Art and Built Environment</p>
        </div>
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none"
              placeholder="admin@cabe.knust.edu.gh" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand outline-none"
              placeholder="Enter password" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full btn-brand py-2.5 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <a href="/lookup" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-center">
            <svg className="w-5 h-5 text-cyan-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <div className="text-left">
              <div className="text-white text-sm font-semibold">Staff Lookup</div>
              <div className="text-blue-300 text-[10px]">Check your assignments</div>
            </div>
          </a>
          <a href="/public/timetable" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-center">
            <svg className="w-5 h-5 text-amber-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div className="text-left">
              <div className="text-white text-sm font-semibold">Timetable</div>
              <div className="text-blue-300 text-[10px]">View exam schedule</div>
            </div>
          </a>
        </div>
        <p className="text-blue-300/40 text-[10px] text-center mt-4">Admin & Reviewer login above</p>
      </div>
    </div>
  );
}
