
import * as XLSX from 'xlsx';
import { EvaluationRecord } from '../types';

export const exportToExcel = (data: EvaluationRecord[], fileName: string = 'تقرير_الإنجاز') => {
  if (!data || data.length === 0) {
    alert('لا توجد بيانات للتصدير');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data.map(r => ({
    'تاريخ التسجيل': r.date,
    'المفتش': r.inspector_name,
    'البند الفرعي': r.sub_item,
    'البند الرئيسي': r.main_item,
    'الكود': r.code,
    'القسم': r.department,
    'العدد المنجز': r.count,
    'النوع/التصنيف': r.sub_type || '-',
    'ملاحظات': r.notes || '-',
    'إجابات إضافية': r.answers ? JSON.stringify(r.answers) : '-'
  })));

  // ضبط عرض الأعمدة تلقائياً
  const wscols = [
    {wch: 15}, {wch: 25}, {wch: 30}, {wch: 20}, {wch: 10}, 
    {wch: 15}, {wch: 10}, {wch: 20}, {wch: 30}, {wch: 40}
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الحركات المسجلة");
  
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
};

export const printReport = () => {
  window.print();
};
