
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
    setActiveTab('dashboard');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'ليلة سعيدة';
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const NavItem = ({ tab, icon, label, roles }: { tab: typeof activeTab, icon: string, label: string, roles?: string[] }) => {
    if (roles && !roles.includes(user.role)) return null;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`w-full flex items-center gap-3 px-6 py-4 transition-all duration-300 relative group ${
          activeTab === tab 
            ? 'bg-blue-600 text-white shadow-lg z-10' 
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
      >
        <i className={`fas ${icon} w-6 text-center text-lg`}></i>
        <span className={`${!isSidebarOpen && 'hidden'} transition-all font-bold whitespace-nowrap`}>{label}</span>
        {activeTab === tab && isSidebarOpen && (
           <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full"></div>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden no-print font-['Tajawal']" dir="rtl">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-[#0f172a] transition-all duration-500 flex flex-col shadow-2xl z-30 relative`}>
        <div className="p-6 flex items-center justify-between border-b border-gray-800/50">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'hidden'} overflow-hidden`}>
            <div className="min-w-[40px] h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">
               <i className="fas fa-shield-halved"></i>
            </div>
            <h1 className="text-white font-black text-xl tracking-tight">نظام الجنوب</h1>
          </div>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-white transition-colors p-2">
            <i className={`fas ${isSidebarOpen ? 'fa-indent' : 'fa-bars'}`}></i>
          </button>
        </div>
        
        <nav className="mt-8 flex-1 space-y-2 px-2">
          <NavItem tab="dashboard" icon="fa-chart-pie" label="لوحة التحكم" />
          <NavItem tab="form" icon="fa-circle-plus" label="إدخال تقييم" />
          <NavItem tab="records" icon="fa-rectangle-list" label="سجلات التفتيش" />
          <NavItem tab="targets" icon="fa-bullseye-arrow" label="إدارة المستهدفات" roles={['admin', 'manager']} />
          <NavItem tab="settings" icon="fa-sliders" label="إعدادات النظام" roles={['admin']} />
        </nav>

        <div className="p-4 border-t border-gray-800/50 bg-gray-950/20">
          <div className="flex items-center gap-3 bg-gray-800/30 p-3 rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg shrink-0 border border-blue-500/20">
              <i className="fas fa-user-circle"></i>
            </div>
            <div className={`${!isSidebarOpen && 'hidden'} transition-all flex-1 min-w-0`}>
              <p className="text-white text-xs font-black truncate">{user.fullName}</p>
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter">
                {user.role === 'admin' ? 'مدير نظام' : user.role === 'manager' ? 'مسؤول' : 'مفتش ميداني'}
              </p>
            </div>
            <button onClick={handleLogout} className={`text-gray-500 hover:text-red-400 transition-colors ${!isSidebarOpen && 'hidden'}`}>
               <i className="fas fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        <header className="bg-white/70 backdrop-blur-xl shadow-sm px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-100">
          <div className="flex flex-col">
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-1">{getGreeting()}، {user.fullName.split(' ')[0]}</p>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              {activeTab === 'dashboard' && <><i className="fas fa-chart-line text-blue-600"></i> لوحة الأداء الذكية</>}
              {activeTab === 'form' && <><i className="fas fa-file-pen text-indigo-600"></i> تسجيل حركة جديدة</>}
              {activeTab === 'records' && <><i className="fas fa-database text-emerald-600"></i> أرشيف التقارير</>}
              {activeTab === 'targets' && <><i className="fas fa-crosshairs text-rose-600"></i> الخطط المستهدفة</>}
              {activeTab === 'settings' && <><i className="fas fa-cog text-slate-600"></i> إعدادات المنصة</>}
            </h2>
          </div>
          <div className="flex items-center gap-6">
             <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">الحالة الآن</span>
                <span className="flex items-center gap-2 text-sm font-black text-emerald-600">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  متصل (سحابي)
                </span>
             </div>
             <div className="h-10 w-[1px] bg-gray-200 hidden md:block"></div>
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date().toLocaleDateString('ar-EG', { weekday: 'long' })}</span>
                <span className="text-sm font-black text-gray-800">{new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}</span>
             </div>
          </div>
        </header>

        <div className="p-8 max-w-[1400px] mx-auto">
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'form' && <EvaluationForm onSaved={() => setActiveTab('records')} />}
            {activeTab === 'records' && <RecordsList />}
            {activeTab === 'targets' && <TargetsView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
