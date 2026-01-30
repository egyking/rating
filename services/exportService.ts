
import * as XLSX from 'xlsx';
import { EvaluationRecord } from '../types';

export const exportToExcel = (data: EvaluationRecord[], fileName: string = 'التقارير') => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(r => ({
    'التاريخ': r.date,
    'المفتش': r.inspector_name,
    'البند': r.sub_item,
    'الكود': r.code,
    'القسم': r.department,
    'العدد': r.count,
    'النوع': r.sub_type,
    'ملاحظات': r.notes
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");
  
  // Create XLSX file
  XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
};

export const printReport = () => {
  window.print();
};
