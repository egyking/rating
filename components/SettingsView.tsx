
import React from 'react';

const SettingsView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 text-gray-800">📋 إدارة المفتشين</h3>
        <p className="text-gray-500 mb-6">يمكنك إضافة أو تعديل بيانات المفتشين والأقسام المسؤولة.</p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">أ</div>
              <div>
                <p className="font-bold text-gray-800">أحمد محمد</p>
                <p className="text-xs text-gray-500">قسم التفتيش الميداني</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-red-500 transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>
          {/* Add more placeholder items or logic here */}
        </div>

        <button className="mt-6 w-full py-4 border-2 border-dashed border-gray-200 text-gray-400 rounded-2xl font-bold hover:border-blue-400 hover:text-blue-500 transition-all">
          + إضافة مفتش جديد
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 text-gray-800">🛠️ إعدادات النظام</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800">استثناء أيام العطل</p>
              <p className="text-sm text-gray-500">تلقائياً استثناء الجمعة والسبت من حسابات الإنتاجية</p>
            </div>
            <div className="w-12 h-6 bg-blue-600 rounded-full relative">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800">تنبيهات البريد الإلكتروني</p>
              <p className="text-sm text-gray-500">إرسال ملخص أسبوعي بالأداء للمدير</p>
            </div>
            <div className="w-12 h-6 bg-gray-200 rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
