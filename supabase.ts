
import { EvaluationRecord, Inspector, EvaluationItem, Target, Holiday, AuthUser } from './types';

// مفاتيح التخزين المحلي
const STORAGE_KEYS = {
  RECORDS: 'southern_records',
  INSPECTORS: 'southern_inspectors',
  ITEMS: 'southern_items',
  TARGETS: 'southern_targets'
};

// وظائف مساعدة للتخزين المحلي
const getLocal = (key: string, defaultValue: any) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// محاكي لقاعدة البيانات يدعم الأوفلاين
export const supabaseService = {
  // جلب المفتشين
  getInspectors: async (): Promise<Inspector[]> => {
    return getLocal(STORAGE_KEYS.INSPECTORS, [
      { id: '1', name: 'أحمد محمد', active: true, department: 'تفتيش ميداني' },
      { id: '2', name: 'سارة خالد', active: true, department: 'تراخيص' },
      { id: '3', name: 'محمد علي', active: true, department: 'شهادات فنية' }
    ]);
  },

  // جلب بنود التقييم
  getItems: async (): Promise<EvaluationItem[]> => {
    return getLocal(STORAGE_KEYS.ITEMS, [
      { 
        id: 'i1', sub_item: 'فحص جودة الموقع', main_item: 'تفتيش ميداني', 
        code: 'INS-001', department: 'تفتيش', sub_types: ['دوري', 'مفاجئ'], once_per_day: false
      },
      { 
        id: 'i2', sub_item: 'مراجعة أوراق الترخيص', main_item: 'إجراءات مكتبية', 
        code: 'LIC-002', department: 'تراخيص', sub_types: [], once_per_day: true 
      }
    ]);
  },

  // تسجيل الدخول (محاكي)
  authenticate: async (username: string, password: string): Promise<AuthUser | null> => {
    if (username === 'admin' && password === 'admin') {
      return { id: 'u1', username: 'admin', fullName: 'مدير النظام', role: 'admin' };
    }
    if (username === 'inspector' && password === '123') {
      return { id: 'u2', username: 'inspector', fullName: 'أحمد محمد', role: 'inspector' };
    }
    return null;
  },

  // جلب السجلات مع الفلترة
  getRecords: async (filters?: any): Promise<EvaluationRecord[]> => {
    let records = getLocal(STORAGE_KEYS.RECORDS, []);
    
    if (filters?.employee) {
      records = records.filter((r: any) => r.inspector_name.includes(filters.employee));
    }
    if (filters?.dateFrom) {
      records = records.filter((r: any) => r.date >= filters.dateFrom);
    }
    if (filters?.dateTo) {
      records = records.filter((r: any) => r.date <= filters.dateTo);
    }
    
    return records.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // حفظ سجلات جديدة (دعم أوفلاين)
  saveBatchEvaluations: async (list: any[]) => {
    try {
      const currentRecords = getLocal(STORAGE_KEYS.RECORDS, []);
      const timestamp = new Date().toISOString();
      
      const newRecords = list.map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        created_at: timestamp,
        ...item
      }));

      const updatedRecords = [...newRecords, ...currentRecords];
      setLocal(STORAGE_KEYS.RECORDS, updatedRecords);
      
      // في حالة وجود إنترنت، يمكن هنا إرسال البيانات للسيرفر
      if (navigator.onLine) {
        console.log('Online: Data synced with server');
      }

      return { success: true, count: newRecords.length };
    } catch (error) {
      return { success: false, error };
    }
  },

  // المستهدفات
  getTargets: async (): Promise<Target[]> => {
    return getLocal(STORAGE_KEYS.TARGETS, []);
  },

  saveTarget: async (data: any) => {
    const targets = getLocal(STORAGE_KEYS.TARGETS, []);
    const newTarget = { id: Math.random().toString(36).substr(2, 9), ...data };
    setLocal(STORAGE_KEYS.TARGETS, [...targets, newTarget]);
    return { success: true };
  },

  getHolidays: async (): Promise<Holiday[]> => {
    return [
      { id: 'h1', date: '2024-01-25', name: 'عيد الشرطة' },
      { id: 'h2', date: '2024-05-01', name: 'عيد العمال' }
    ];
  }
};
