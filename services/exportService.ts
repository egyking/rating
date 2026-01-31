
import * as XLSX from 'xlsx';
import { EvaluationRecord, ComparativeMatrixRow, ItemPerformance } from '../types';

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

export const exportDeepReport = (
  matrix: ComparativeMatrixRow[], 
  itemAnalysis: ItemPerformance[], 
  fileName: string = 'التقرير_الشامل'
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Matrix
  const matrixWS = XLSX.utils.json_to_sheet(matrix.map(m => ({
    'المفتش': m.inspectorName,
    'الدرجة الموزونة': m.weightedScore,
    'تحقيق المستهدف %': m.targetAchieved,
    'نسبة الالتزام %': m.commitment,
    'درجة الجودة %': m.quality,
    'المعدل اليومي': m.dailyAvg,
    'مستوى الخطورة': m.riskLevel === 'low' ? 'منخفض' : (m.riskLevel === 'medium' ? 'متوسط' : 'عالي')
  })));
  XLSX.utils.book_append_sheet(wb, matrixWS, "مصفوفة الأداء");

  // Sheet 2: Item Analysis
  const itemsWS = XLSX.utils.json_to_sheet(itemAnalysis.map(i => ({
    'البند الرئيسي': i.mainItem,
    'البند الفرعي': i.subItem,
    'العدد': i.count,
    'النسبة من الإجمالي %': i.percentage
  })));
  XLSX.utils.book_append_sheet(wb, itemsWS, "تحليل البنود");

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${fileName}_${dateStr}.xlsx`);
};

export const printReport = () => {
  window.print();
};
