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
        <div className="mt-4 text-center">
          <a href="/lookup" className="text-blue-200 text-sm hover:text-white">Staff? Check your assignments</a>
        </div>
      </div>
    </div>
  );
}
