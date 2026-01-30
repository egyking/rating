
import React, { useState, useEffect } from 'react';
import { supabaseService } from './supabase';
import Dashboard from './components/Dashboard';
import EvaluationForm from './components/EvaluationForm';
import RecordsList from './components/RecordsList';
import TargetsView from './components/TargetsView';
import SettingsView from './components/SettingsView';
import Login from './components/Login';
import { AuthUser } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'records' | 'targets' | 'settings'>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Check for session in local storage (mock)
  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem('app_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const NavItem = ({ tab, icon, label, roles }: { tab: typeof activeTab, icon: string, label: string, roles?: string[] }) => {
    if (roles && !roles.includes(user.role)) return null;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`w-full flex items-center gap-3 px-6 py-4 transition-all duration-200 ${
          activeTab === tab 
            ? 'bg-blue-600 text-white shadow-lg transform translate-x-2' 
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
      >
        <i className={`fas ${icon} w-6`}></i>
        <span className={`${!isSidebarOpen && 'hidden'} transition-all`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden no-print" dir="rtl">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-gray-900 transition-all duration-300 flex flex-col shadow-2xl z-20`}>
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'hidden'}`}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg">
               <i className="fas fa-shield-halved"></i>
            </div>
            <h1 className="text-white font-bold text-xl">نظام الجنوب</h1>
          </div>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white mx-auto">
            <i className={`fas ${isSidebarOpen ? 'fa-chevron-right' : 'fa-bars'}`}></i>
          </button>
        </div>
        
        <nav className="mt-6 flex-1 space-y-1">
          <NavItem tab="dashboard" icon="fa-chart-line" label="لوحة التحكم" />
          <NavItem tab="form" icon="fa-plus-circle" label="إدخال تقييم" />
          <NavItem tab="records" icon="fa-list-ul" label="سجلات التفتيش" />
          <NavItem tab="targets" icon="fa-bullseye" label="إدارة المستهدفات" roles={['admin', 'manager']} />
          <NavItem tab="settings" icon="fa-gears" label="إعدادات النظام" roles={['admin']} />
        </nav>

        <div className="p-6 border-t border-gray-800 bg-gray-950/50">
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
              <i className="fas fa-user-tie"></i>
            </div>
            <div className={`${!isSidebarOpen && 'hidden'} transition-all flex-1 min-w-0`}>
              <p className="text-white text-sm font-bold truncate">{user.fullName}</p>
              <p className="text-gray-500 text-xs truncate">
                {user.role === 'admin' ? 'مدير نظام' : user.role === 'manager' ? 'مسؤول' : 'مفتش'}
              </p>
            </div>
            <button onClick={handleLogout} className={`text-gray-500 hover:text-red-400 transition-colors ${!isSidebarOpen && 'hidden'}`}>
               <i className="fas fa-power-off"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        <header className="bg-white/80 backdrop-blur-md shadow-sm px-8 py-4 sticky top-0 z-10 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-800">
            {activeTab === 'dashboard' && '📊 نظرة عامة على الأداء'}
            {activeTab === 'form' && '➕ إضافة سجل جديد'}
            {activeTab === 'records' && '📋 استعراض التقارير'}
            {activeTab === 'targets' && '🎯 خطة المستهدفات'}
            {activeTab === 'settings' && '⚙️ التهيئة العامة'}
          </h2>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col text-left mr-4">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">التاريخ اليوم</span>
                <span className="text-sm font-bold text-blue-600">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
             </div>
             <button className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center">
                <i className="fas fa-bell"></i>
             </button>
          </div>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'form' && <EvaluationForm onSaved={() => setActiveTab('records')} />}
          {activeTab === 'records' && <RecordsList />}
          {activeTab === 'targets' && <TargetsView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  );
};

export default App;
