
import { createClient } from '@supabase/supabase-js';
import { EvaluationRecord, Inspector, EvaluationItem, Target, Holiday, AuthUser } from './types';

// تهيئة عميل Supabase باستخدام الرابط والمفتاح الخاص بمشروعك
const supabaseUrl = 'https://ipwfkgahrlkfccobgejm.supabase.co';
// نستخدم SUPABASE_KEY كما ورد في طلبك، مع توفير بديل شائع لضمان العمل
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_KEYS = {
  RECORDS: 'southern_records_v2',
  INSPECTORS: 'southern_inspectors_v2',
  ITEMS: 'southern_items_v2',
  TARGETS: 'southern_targets_v2'
};

const getLocal = (key: string, defaultValue: any) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const supabaseService = {
  // جلب المفتشين مع التحديث من السحابة
  getInspectors: async (): Promise<Inspector[]> => {
    try {
      const { data, error } = await supabase.from('inspectors').select('*').eq('active', true);
      if (error) throw error;
      setLocal(STORAGE_KEYS.INSPECTORS, data);
      return data;
    } catch (e) {
      console.warn('Using local inspectors cache');
      return getLocal(STORAGE_KEYS.INSPECTORS, []);
    }
  },

  // جلب بنود التقييم
  getItems: async (): Promise<EvaluationItem[]> => {
    try {
      const { data, error } = await supabase.from('evaluation_items').select('*');
      if (error) throw error;
      setLocal(STORAGE_KEYS.ITEMS, data);
      return data;
    } catch (e) {
      console.warn('Using local items cache');
      return getLocal(STORAGE_KEYS.ITEMS, []);
    }
  },

  // تسجيل دخول متصل بجدول المفتشين
  authenticate: async (username: string, password: string): Promise<AuthUser | null> => {
    // حساب المدير الافتراضي
    if (username === 'admin' && password === 'admin') {
      return { id: 'admin-1', username: 'admin', fullName: 'مدير النظام', role: 'admin' };
    }
    
    try {
      // البحث في جدول المفتشين عن اسم المستخدم
      const { data, error } = await supabase
        .from('inspectors')
        .select('*')
        .ilike('name', `%${username}%`)
        .limit(1)
        .single();

      if (data && password === '123') { // كلمة مرور افتراضية للمفتشين
        return { 
          id: data.id, 
          username, 
          fullName: data.name, 
          role: 'inspector', 
          department: data.department 
        };
      }
    } catch (e) {
      console.error('Auth error:', e);
    }
    return null;
  },

  // جلب السجلات مع الفلترة الذكية
  getRecords: async (filters?: any): Promise<EvaluationRecord[]> => {
    try {
      let query = supabase.from('evaluation_records').select('*').order('date', { ascending: false });
      
      if (filters?.employee) query = query.ilike('inspector_name', `%${filters.employee}%`);
      if (filters?.dateFrom) query = query.gte('date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('date', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      setLocal(STORAGE_KEYS.RECORDS, data);
      return data;
    } catch (e) {
      return getLocal(STORAGE_KEYS.RECORDS, []);
    }
  },

  // حفظ سجلات جديدة مع دعم المزامنة المتأخرة
  saveBatchEvaluations: async (list: any[]) => {
    try {
      const { data, error } = await supabase.from('evaluation_records').insert(list).select();
      if (error) throw error;
      
      const currentLocal = getLocal(STORAGE_KEYS.RECORDS, []);
      setLocal(STORAGE_KEYS.RECORDS, [...data, ...currentLocal]);
      
      return { success: true, count: data.length };
    } catch (e) {
      // حفظ محلي في حالة انقطاع الاتصال
      const offlineRecords = list.map(r => ({ 
        ...r, 
        id: `offline-${Date.now()}-${Math.random()}`, 
        pending_sync: true 
      }));
      const currentLocal = getLocal(STORAGE_KEYS.RECORDS, []);
      setLocal(STORAGE_KEYS.RECORDS, [...offlineRecords, ...currentLocal]);
      
      return { success: true, count: offlineRecords.length, offline: true };
    }
  },

  // جلب وإدارة المستهدفات
  getTargets: async (): Promise<Target[]> => {
    try {
      const { data, error } = await supabase.from('targets').select('*');
      if (error) throw error;
      setLocal(STORAGE_KEYS.TARGETS, data);
      return data;
    } catch (e) {
      return getLocal(STORAGE_KEYS.TARGETS, []);
    }
  },

  saveTarget: async (targetData: any) => {
    try {
      const { data, error } = await supabase.from('targets').insert([targetData]).select();
      if (error) return { success: false, error };
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e };
    }
  },

  getHolidays: async (): Promise<Holiday[]> => {
    try {
      const { data, error } = await supabase.from('holidays').select('*');
      if (error) throw error;
      return data;
    } catch (e) {
      return [];
    }
  }
};
