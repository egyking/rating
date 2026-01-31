
import { GoogleGenAI } from "@google/genai";
import { EvaluationRecord } from "../types";

export const analyzePerformance = async (records: EvaluationRecord[]) => {
  if (records.length === 0) return "لا توجد سجلات كافية لبناء نموذج تنبؤي.";

  // Initialize Gemini API with API key from environment variable
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();

  const summary = records.map(r => 
    `- التاريخ: ${r.date}, المفتش: ${r.inspector_name}, العدد: ${r.count}`
  ).join('\n');

  try {
    // Upgraded to gemini-3-pro-preview for complex reasoning and business analysis
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `بصفتك خبير ذكاء أعمال (BI Specialist)، قم بتحليل سجلات المفتشين التالية:
      
      المعطيات: اليوم هو ${currentDay} من شهر إجمالي أيامه ${daysInMonth}.
      
      المطلوب (باللغة العربية):
      1. تحليل السرعة الحالية (Velocity): هل المعدل اليومي كافٍ لتحقيق المستهدفات (بناءً على التكرارات)؟
      2. تنبؤ نهاية الشهر: توقع الرقم الإجمالي لكل مفتش إذا استمر على نفس المنوال.
      3. تحذير مبكر: من هم المفتشون المعرضون لخطر عدم تحقيق المستهدف؟
      4. اقتراحات لتحسين المسارات أو تقليل الوقت الضائع بناءً على تواريخ السجلات.
      
      البيانات:
      ${summary}`,
    });

    // Access the .text property directly to get the generated response
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "نظام التنبؤ الذكي غير متاح حالياً. حاول مرة أخرى عند استقرار الاتصال.";
  }
};
