
import React, { useState } from 'react';
import { supabaseService } from '../supabase';
import { AuthUser } from '../types';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // In a real app, this would be a Supabase auth call
    const user = await supabaseService.authenticate(username, password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl shadow-lg shadow-blue-500/50 mb-6 transform -rotate-6">
            <i className="fas fa-shield-halved"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">نظام الجنوب</h1>
          <p className="text-gray-400">إدارة تقييم الأداء الاحترافي</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-sm mb-6 flex items-center gap-3">
            <i className="fas fa-circle-exclamation text-lg"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2 mr-1">اسم المستخدم</label>
            <div className="relative">
              <i className="fas fa-user absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
              <input 
                type="text"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2 mr-1">كلمة المرور</label>
            <div className="relative">
              <i className="fas fa-lock absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
              <input 
                type="password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-in-alt"></i>}
            تسجيل الدخول
          </button>
        </form>

        <div className="mt-10 text-center text-gray-500 text-sm">
          جميع الحقوق محفوظة &copy; {new Date().getFullYear()} نظام الجنوب
        </div>
      </div>
    </div>
  );
};

export default Login;
