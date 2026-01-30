-- مخطط قاعدة بيانات نظام الجنوب (إدارة تقييم الأداء)
-- هذا الكود جاهز للتشغيل مباشرة في محرر SQL الخاص بـ Supabase

-- 0. تفعيل إضافات الـ UUID لإنشاء معرفات فريدة تلقائياً
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. جدول المفتشين (Inspectors)
-- يحمل بيانات الموظفين وحالتهم
CREATE TABLE IF NOT EXISTS inspectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول بنود التقييم (Evaluation Items)
-- تعريف المهام والأنشطة التي يقوم بها المفتشون
CREATE TABLE IF NOT EXISTS evaluation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_item TEXT NOT NULL, -- البند الرئيسي (ميداني، مكتبي، إلخ)
    sub_item TEXT NOT NULL,  -- البند الفرعي (فحص، مراجعة، إلخ)
    code TEXT UNIQUE NOT NULL, -- كود البند الفريد
    department TEXT,
    sub_types JSONB DEFAULT '[]'::jsonb, -- مصفوفة من الأنواع (مثلاً: دوري، مفاجئ)
    once_per_day BOOLEAN DEFAULT false, -- هل مسموح بمرة واحدة فقط؟
    notes TEXT,
    questions JSONB DEFAULT '[]'::jsonb, -- أسئلة مخصصة لهذا البند
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول سجلات التقييم (Evaluation Records)
-- الجدول الأساسي لتخزين الإنتاجية والتقارير اليومية
-- تم إضافة حقول مكررة (Denormalization) لضمان ثبات التقارير التاريخية
CREATE TABLE IF NOT EXISTS evaluation_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
    inspector_name TEXT, -- لضمان ثبات الاسم في التقارير التاريخية
    item_id UUID REFERENCES evaluation_items(id) ON DELETE SET NULL,
    sub_item TEXT, -- لضمان ثبات اسم البند
    main_item TEXT,
    sub_type TEXT,
    code TEXT,
    department TEXT,
    count INTEGER DEFAULT 1,
    notes TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    location JSONB DEFAULT NULL, -- يخزن الإحداثيات {"latitude": 0, "longitude": 0}
    image_url TEXT -- رابط صورة التوثيق الميداني
);

-- 4. جدول المستهدفات (Targets)
-- تحديد الأهداف الشهرية أو الدورية لكل مفتش
CREATE TABLE IF NOT EXISTS targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspector_id UUID REFERENCES inspectors(id) ON DELETE CASCADE,
    inspector_name TEXT,
    main_item TEXT NOT NULL,
    target_value INTEGER NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول العطلات (Holidays)
-- يستخدم لحساب الإنتاجية الحقيقية باستثناء أيام العطل الرسمية
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    name TEXT NOT NULL
);

-- 6. الفهارس (Indexes) لتحسين سرعة البحث والتقارير
CREATE INDEX IF NOT EXISTS idx_records_date ON evaluation_records(date);
CREATE INDEX IF NOT EXISTS idx_records_inspector ON evaluation_records(inspector_id);
CREATE INDEX IF NOT EXISTS idx_targets_range ON targets(start_date, end_date);

-- بيانات أولية تجريبية (Seed Data)
INSERT INTO inspectors (name, department) VALUES 
('أحمد محمد', 'تفتيش ميداني'),
('سارة خالد', 'تراخيص'),
('محمد علي', 'شهادات فنية');

INSERT INTO evaluation_items (main_item, sub_item, code, department, sub_types) VALUES 
('تفتيش ميداني', 'فحص جودة الموقع', 'INS-001', 'تفتيش', '["دوري", "مفاجئ"]'),
('إجراءات مكتبية', 'مراجعة أوراق الترخيص', 'LIC-002', 'تراخيص', '[]');

-- نصيحة: تأكد من تفعيل Row Level Security (RLS) في Supabase لإضافة حماية الوصول للبيانات.
