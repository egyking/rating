
import React, { useState, useEffect, useRef } from 'react';
import { supabaseService } from '../supabase';
import { AppNotification, AuthUser } from '../types';

interface NotificationSystemProps {
  user: AuthUser;
  onNavigate: (tab: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ user, onNavigate }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const fetchNotifications = async () => {
    const data = await supabaseService.getNotifications(user.id, user.role);
    setNotifications(data);
  };

  const handleRead = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await supabaseService.markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    if (notif.link) {
      onNavigate(notif.link);
      setIsOpen(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${unreadCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
      >
        <i className={`fas fa-bell ${unreadCount > 0 ? 'animate-bounce' : ''}`}></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
           <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <span className="text-xs font-black text-gray-800">التنبيهات</span>
              {unreadCount > 0 && <span className="text-[10px] font-bold text-red-500">{unreadCount} جديد</span>}
           </div>
           <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? notifications.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => handleRead(notif)}
                  className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors flex gap-3 ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    notif.type === 'approval' ? 'bg-orange-100 text-orange-600' : 
                    notif.type === 'sync' ? 'bg-emerald-100 text-emerald-600' : 
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <i className={`fas ${
                      notif.type === 'approval' ? 'fa-check-double' : 
                      notif.type === 'sync' ? 'fa-sync' : 
                      'fa-info-circle'
                    } text-xs`}></i>
                  </div>
                  <div className="text-right overflow-hidden">
                    <p className={`text-xs font-black truncate ${!notif.is_read ? 'text-gray-900' : 'text-gray-500'}`}>{notif.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold line-clamp-2 mt-0.5">{notif.message}</p>
                    <p className="text-[8px] text-gray-300 font-bold mt-1">{new Date(notif.created_at).toLocaleTimeString('ar-EG')}</p>
                  </div>
                </div>
              )) : (
                <div className="p-10 text-center">
                   <i className="fas fa-bell-slash text-gray-200 text-3xl mb-3"></i>
                   <p className="text-xs font-bold text-gray-400">لا توجد تنبيهات حالياً</p>
                </div>
              )}
           </div>
           <div className="p-3 text-center bg-gray-50 border-t border-gray-100">
              <button onClick={() => setIsOpen(false)} className="text-[10px] font-black text-blue-600">إغلاق</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;
