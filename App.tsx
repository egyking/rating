
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
    if (!confirm('هل تريد تسجيل الخروج من النظام؟')) return;
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
      <aside className={`hidden lg:flex ${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#0f172a] transition-all duration-300 flex-col shadow-2xl z-30 relative`}>
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'hidden'}`}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs">
               <i className="fas fa-shield-halved"></i>
            </div>
            <h1 className="text-white font-black text-lg">نظام الجنوب</h1>
          </div>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-white transition-colors p-1">
            <i className={`fas ${isSidebarOpen ? 'fa-indent' : 'fa-bars'}`}></i>
          </button>
        </div>
        
        <nav className="mt-6 flex-1 space-y-1 px-3 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-200 rounded-xl ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center text-base`}></i>
              <span className={`${!isSidebarOpen && 'hidden'} font-bold text-xs`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl">
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 flex-1 text-right overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-black">{user.fullName.charAt(0)}</div>
              <div className={`${!isSidebarOpen && 'hidden'} truncate`}>
                <p className="text-white text-[10px] font-black truncate">{user.fullName}</p>
                <p className="text-[8px] text-gray-500">الحساب الشخصي</p>
              </div>
            </button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-2">
               <i className="fas fa-right-from-bracket text-sm"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
        {/* Header - Fixed on top */}
        <header className="bg-white border-b border-gray-100 p-2.5 flex justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden text-gray-400 p-2">
              <i className="fas fa-bars"></i>
            </button>
            <div className="hidden sm:flex items-center gap-2">
               {isOnline ? (
                 <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] font-black flex items-center gap-1">
                   <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span> متصل
                 </span>
               ) : (
                 <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[8px] font-black flex items-center gap-1">
                   <span className="w-1 h-1 bg-red-500 rounded-full"></span> غير متصل
                 </span>
               )}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <NotificationSystem user={user} onNavigate={(tab) => setActiveTab(tab)} />
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 p-1 pl-2 bg-gray-50 rounded-lg border border-gray-100">
               <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white text-[9px] font-black">
                  {user.fullName.charAt(0)}
               </div>
               <span className="font-black text-gray-700 text-[10px] hidden sm:inline">{user.fullName}</span>
            </button>
            {/* Logout Button Visible on Mobile Header explicitly */}
            <button onClick={handleLogout} className="lg:hidden w-8 h-8 flex items-center justify-center text-red-500 bg-red-50 rounded-lg border border-red-100 ml-1">
               <i className="fas fa-power-off text-xs"></i>
            </button>
          </div>
        </header>

        <div className="p-3 lg:p-6 max-w-[1400px] mx-auto w-full flex-1">
          <div className="animate-in fade-in slide-in-from-top-1 duration-300 pb-20 lg:pb-0">
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
             <div className="bg-white w-full max-w-xs rounded-2xl p-6 space-y-6 shadow-2xl animate-in zoom-in duration-200 text-right">
                <div className="text-center">
                   <div className="w-14 h-14 bg-blue-600 text-white rounded-xl mx-auto flex items-center justify-center text-xl shadow-lg mb-3"><i className="fas fa-user-shield"></i></div>
                   <h4 className="text-xs font-black text-gray-800">{user.fullName}</h4>
                   <p className="text-[9px] font-bold text-gray-400 mt-1">{user.role === 'admin' ? 'مدير النظام' : 'مفتش ميداني'}</p>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 mr-1 uppercase">تحديث كلمة المرور</label>
                      <input 
                         type="text" 
                         value={newPass} 
                         onChange={e => setNewPass(e.target.value)} 
                         className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 font-bold text-center text-xs" 
                         placeholder="••••••••" 
                       />
                   </div>
                </div>
                <div className="space-y-2">
                   <button disabled={isUpdatingPass} onClick={handleChangeOwnPassword} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-black text-[10px]">حفظ التغييرات</button>
                   <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-2.5 rounded-lg font-black text-[10px] border border-red-100">تسجيل الخروج</button>
                   <button onClick={() => setShowProfileModal(false)} className="w-full text-gray-400 py-1 rounded-lg font-black text-[9px]">إغلاق</button>
                </div>
             </div>
          </div>
        )}

        {/* Mobile Bottom Navigation - Compact */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center p-1.5 pb-safe z-50">
          {navItems.slice(0, 4).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-1 min-w-[50px] transition-all ${
                activeTab === item.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <i className={`fas ${item.icon} text-base`}></i>
              <span className="text-[8px] font-black">{item.label}</span>
            </button>
          ))}
          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-1 p-1 min-w-[50px] transition-all ${
                activeTab === 'settings' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <i className="fas fa-cog text-base"></i>
              <span className="text-[8px] font-black">الإدارة</span>
            </button>
          )}
        </nav>
      </main>
    </div>
  );
};

export default App;
