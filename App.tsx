
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import EvaluationForm from './components/EvaluationForm';
import RecordsList from './components/RecordsList';
import TargetsView from './components/TargetsView';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import Login from './components/Login';
import NotificationSystem from './components/NotificationSystem';
import { AuthUser, AppNotification } from './types';
import { supabaseService } from './supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.role === 'inspector') setActiveTab('form');
    }

    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
    };
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    if (isOnline && user) {
      syncOfflineData();
    }
  }, [isOnline, user]);

  const syncOfflineData = async () => {
    const offlineRecords = JSON.parse(localStorage.getItem('offline_records') || '[]');
    if (offlineRecords.length === 0) return;

    setIsSyncing(true);
    try {
      const res = await supabaseService.saveBatchEvaluations(offlineRecords);
      if (res.success) {
        localStorage.removeItem('offline_records');
        await supabaseService.createNotification({
          user_id: user?.id,
          title: 'تمت المزامنة بنجاح',
          message: `تم رفع ${offlineRecords.length} سجلات كانت مخزنة محلياً.`,
          type: 'sync'
        });
      }
    } catch (e) {
      console.error('Sync failed', e);
    }
    setIsSyncing(false);
  };

  const handleLogin = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem('app_user', JSON.stringify(u));
    if (u.role === 'inspector') setActiveTab('form');
    else setActiveTab('dashboard');
  };

  const handleLogout = () => {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    setUser(null);
    localStorage.removeItem('app_user');
    setActiveTab('dashboard');
  };

  const handleChangeOwnPassword = async () => {
    if (!user || !newPass) return;
    setIsUpdatingPass(true);
    const res = await supabaseService.updateInspectorPassword(user.id, newPass);
    setIsUpdatingPass(false);
    if (res.success) {
      alert('✅ تم تغيير كلمة السر بنجاح');
      setShowProfileModal(false);
      setNewPass('');
    } else {
      alert('❌ فشل التحديث');
    }
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
          <div className="flex items-center gap-3 bg-gray-800/30 p-3 rounded-2xl overflow-hidden">
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-3 flex-1 text-right">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black">{user.fullName.charAt(0)}</div>
              <div className={`${!isSidebarOpen && 'hidden'} flex-1`}>
                <p className="text-white text-xs font-black truncate">{user.fullName}</p>
                <p className="text-[9px] text-gray-500 font-bold">الملف الشخصي</p>
              </div>
            </button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors p-2">
               <i className="fas fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 p-3 flex justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden text-gray-400 p-2 hover:bg-gray-50 rounded-lg">
              <i className="fas fa-bars"></i>
            </button>
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-blue-600 rounded-lg lg:hidden flex items-center justify-center text-white text-xs shadow-md">
                 <i className="fas fa-shield-halved"></i>
               </div>
               {isOnline ? (
                 <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1">
                   <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span> متصل
                 </span>
               ) : (
                 <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1">
                   <span className="w-1 h-1 bg-red-500 rounded-full"></span> غير متصل
                 </span>
               )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationSystem user={user} onNavigate={(tab) => setActiveTab(tab)} />
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 p-1 pr-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all border border-gray-100">
               <span className="font-black text-gray-700 text-[11px] hidden sm:inline">{user.fullName}</span>
               <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-sm">
                  {user.fullName.charAt(0)}
               </div>
            </button>
            {/* Logout Button Visible on Mobile Header */}
            <button onClick={handleLogout} className="lg:hidden w-9 h-9 flex items-center justify-center text-red-400 bg-red-50 rounded-xl border border-red-100">
               <i className="fas fa-right-from-bracket text-xs"></i>
            </button>
          </div>
        </header>

        <div className="p-3 lg:p-6 max-w-[1400px] mx-auto w-full flex-1">
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 pb-20 lg:pb-0">
            {activeTab === 'dashboard' && <Dashboard userRole={user.role} userId={user.id} />}
            {activeTab === 'form' && <EvaluationForm onSaved={() => setActiveTab('records')} currentUser={user} />}
            {activeTab === 'records' && <RecordsList userRole={user.role} userId={user.id} />}
            {activeTab === 'reports' && <ReportsView userRole={user.role} userId={user.id} />}
            {activeTab === 'targets' && <TargetsView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </div>

        {/* Profile Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
             <div className="bg-white w-full max-w-xs rounded-3xl p-6 space-y-6 shadow-2xl animate-in zoom-in duration-200">
                <div className="text-center">
                   <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-lg mb-4"><i className="fas fa-user-shield"></i></div>
                   <h4 className="text-sm font-black text-gray-800">{user.fullName}</h4>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">تحديث الملف الشخصي</p>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 mr-1 uppercase">كلمة السر الجديدة</label>
                      <input 
                         type="text" 
                         value={newPass} 
                         onChange={e => setNewPass(e.target.value)} 
                         className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-bold text-center text-sm text-blue-600" 
                         placeholder="••••••••" 
                       />
                   </div>
                </div>
                <div className="space-y-2">
                   <button disabled={isUpdatingPass} onClick={handleChangeOwnPassword} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-blue-500/10">حفظ التغييرات</button>
                   <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-black text-xs border border-red-100">تسجيل الخروج</button>
                   <button onClick={() => setShowProfileModal(false)} className="w-full text-gray-400 py-2 rounded-xl font-black text-[10px]">إغلاق</button>
                </div>
             </div>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center p-2 pb-safe z-50">
          {navItems.slice(0, 4).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-2 min-w-[60px] transition-all ${
                activeTab === item.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <i className={`fas ${item.icon} text-base`}></i>
              <span className="text-[9px] font-black">{item.label}</span>
            </button>
          ))}
          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-1 p-2 min-w-[60px] transition-all ${
                activeTab === 'settings' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <i className="fas fa-cog text-base"></i>
              <span className="text-[9px] font-black">الإدارة</span>
            </button>
          )}
        </nav>
      </main>
    </div>
  );
};

export default App;
