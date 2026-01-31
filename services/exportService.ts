
import * as XLSX from 'xlsx';
import { EvaluationRecord, InspectorPerformance } from '../types';

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
    'الحالة': r.status === 'approved' ? 'معتمد' : 'معلق',
    'إجابات إضافية': r.answers ? JSON.stringify(r.answers) : '-'
  })));

  // Auto-width for columns
  const wscols = [
    {wch: 15}, {wch: 25}, {wch: 30}, {wch: 20}, {wch: 10}, 
    {wch: 15}, {wch: 10}, {wch: 20}, {wch: 30}, {wch: 15}, {wch: 40}
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الحركات التفصيلية");
  
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
};

export const exportAnalyticsReport = (
  performanceData: InspectorPerformance[], 
  categoryData: any[], 
  fileName: string = 'تقرير_التحليل_الشامل'
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Performance
  const perfWS = XLSX.utils.json_to_sheet(performanceData.map(p => ({
    'المفتش': p.inspectorName,
    'النقاط': p.score,
    'إجمالي الحركات': p.totalInspections,
    'إجمالي الوحدات': p.totalItems,
    'المعتمد': p.approvedItems,
    'المعلق': p.pendingItems,
    'نسبة الاعتماد %': p.approvalRate,
    'مؤشر الخطر': p.riskFactor === 'high' ? 'عالي' : (p.riskFactor === 'medium' ? 'متوسط' : 'منخفض')
  })));
  XLSX.utils.book_append_sheet(wb, perfWS, "أداء المفتشين");

  // Sheet 2: Categories
  const catWS = XLSX.utils.json_to_sheet(categoryData.map(c => ({
    'البند الرئيسي': c.name,
    'العدد': c.value,
    'النسبة %': c.percentage
  })));
  XLSX.utils.book_append_sheet(wb, catWS, "تحليل البنود");

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${fileName}_${dateStr}.xlsx`);
};

export const printReport = () => {
  window.print();
};
