
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import EvaluationForm from './components/EvaluationForm';
import RecordsList from './components/RecordsList';
import TargetsView from './components/TargetsView';
import SettingsView from './components/SettingsView';
import Login from './components/Login';
import { AuthUser } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      // المفتش يبدأ دائماً من نموذج الإدخال
      if (parsedUser.role === 'inspector') setActiveTab('form');
    }
  }, []);

  const handleLogin = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem('app_user', JSON.stringify(u));
    if (u.role === 'inspector') setActiveTab('form');
    else setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
    setActiveTab('dashboard');
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const NavItem = ({ tab, icon, label, roles }: { tab: string, icon: string, label: string, roles?: string[] }) => {
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
          <NavItem tab="dashboard" icon="fa-chart-pie" label="لوحة الأداء" />
          <NavItem tab="form" icon="fa-circle-plus" label="إدخال تقييم" />
          <NavItem tab="records" icon="fa-rectangle-list" label={user.role === 'admin' ? "أرشيف السجلات" : "سجلاتي الشخصية"} />
          <NavItem tab="targets" icon="fa-bullseye-arrow" label="إدارة المستهدفات" roles={['admin']} />
          <NavItem tab="settings" icon="fa-sliders" label="إعدادات المنصة" roles={['admin']} />
        </nav>

        <div className="p-4 border-t border-gray-800/50">
          <div className="flex items-center gap-3 bg-gray-800/30 p-3 rounded-2xl border border-white/5">
            <div className={`${!isSidebarOpen && 'hidden'} transition-all flex-1 min-w-0`}>
              <p className="text-white text-xs font-black truncate">{user.fullName}</p>
              <p className="text-blue-400 text-[10px] uppercase font-bold tracking-tighter">
                {user.role === 'admin' ? 'مدير نظام' : 'مفتش ميداني'}
              </p>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors">
               <i className="fas fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="p-8 max-w-[1400px] mx-auto">
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            {activeTab === 'dashboard' && <Dashboard userRole={user.role} userId={user.id} />}
            {activeTab === 'form' && <EvaluationForm onSaved={() => setActiveTab('records')} currentUser={user} />}
            {activeTab === 'records' && <RecordsList userRole={user.role} userId={user.id} />}
            {activeTab === 'targets' && <TargetsView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
