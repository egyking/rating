
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import EvaluationForm from './components/EvaluationForm';
import RecordsList from './components/RecordsList';
import TargetsView from './components/TargetsView';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import Login from './components/Login';
import { AuthUser } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
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

  const navItems = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'الرئيسية', roles: ['admin', 'inspector'] },
    { id: 'form', icon: 'fa-circle-plus', label: 'إدخال', roles: ['admin', 'inspector'] },
    { id: 'records', icon: 'fa-rectangle-list', label: 'السجلات', roles: ['admin', 'inspector'] },
    { id: 'reports', icon: 'fa-chart-column', label: 'التقارير', roles: ['admin', 'inspector'] },
    { id: 'targets', icon: 'fa-bullseye-arrow', label: 'المستهدف', roles: ['admin'] },
    { id: 'settings', icon: 'fa-sliders', label: 'الإعدادات', roles: ['admin'] },
  ].filter(item => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden no-print font-['Tajawal']" dir="rtl">
      {/* Sidebar for Desktop */}
      <aside className={`hidden lg:flex ${isSidebarOpen ? 'w-72' : 'w-20'} bg-[#0f172a] transition-all duration-500 flex-col shadow-2xl z-30 relative`}>
        <div className="p-6 flex items-center justify-between border-b border-gray-800/50">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'hidden'}`}>
            <div className="min-w-[40px] h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
               <i className="fas fa-shield-halved"></i>
            </div>
            <h1 className="text-white font-black text-xl tracking-tight">نظام الجنوب</h1>
          </div>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-white transition-colors p-2">
            <i className={`fas ${isSidebarOpen ? 'fa-indent' : 'fa-bars'}`}></i>
          </button>
        </div>
        
        <nav className="mt-8 flex-1 space-y-2 px-2 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-4 transition-all duration-300 rounded-2xl ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <i className={`fas ${item.icon} w-6 text-center text-lg`}></i>
              <span className={`${!isSidebarOpen && 'hidden'} font-bold`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800/50">
          <div className="flex items-center gap-3 bg-gray-800/30 p-3 rounded-2xl">
            <div className={`${!isSidebarOpen && 'hidden'} flex-1`}>
              <p className="text-white text-xs font-black truncate">{user.fullName}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors">
               <i className="fas fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">
                <i className="fas fa-shield-halved"></i>
             </div>
             <span className="font-black text-gray-800">نظام الجنوب</span>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 p-2">
             <i className="fas fa-sign-out-alt"></i>
          </button>
        </header>

        <div className="p-4 lg:p-8 max-w-[1400px] mx-auto w-full flex-1">
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 pb-20 lg:pb-0">
            {activeTab === 'dashboard' && <Dashboard userRole={user.role} userId={user.id} />}
            {activeTab === 'form' && <EvaluationForm onSaved={() => setActiveTab('records')} currentUser={user} />}
            {activeTab === 'records' && <RecordsList userRole={user.role} userId={user.id} />}
            {activeTab === 'reports' && <ReportsView userRole={user.role} userId={user.id} />}
            {activeTab === 'targets' && <TargetsView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-around items-center p-2 pb-safe z-50">
          {navItems.slice(0, 4).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-2 min-w-[60px] transition-all ${
                activeTab === item.id ? 'text-blue-600 scale-110' : 'text-gray-400'
              }`}
            >
              <i className={`fas ${item.icon} text-lg`}></i>
              <span className="text-[9px] font-black">{item.label}</span>
              {activeTab === item.id && <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5"></div>}
            </button>
          ))}
          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-1 p-2 min-w-[60px] transition-all ${
                activeTab === 'settings' ? 'text-blue-600 scale-110' : 'text-gray-400'
              }`}
            >
              <i className="fas fa-cog text-lg"></i>
              <span className="text-[9px] font-black">المزيد</span>
            </button>
          )}
        </nav>
      </main>
    </div>
  );
};

export default App;
