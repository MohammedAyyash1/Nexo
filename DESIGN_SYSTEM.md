# نظام تصميم Nexo (Nexo Design System)
> مصدر الحقيقة الرسمي لهوية Nexo البصرية. أي صفحة أو أداة جديدة/معاد تصميمها **لازم** تلتزم بهاد الملف بدل ما تخترع قيم جديدة.

**آخر تحديث:** مستخرج من `src/styles/nexo-premium-v4.css` بعد مرحلة إعادة تصميم Sidebar + لوحة الأدوات + Live Translate.
**ملف الأصناف الفعلي:** `src/styles/nexo-premium-v4.css` (يُستورد بعد `premium-theme.css` مباشرة بكل صفحة).
**دليل حي:** `style-guide.html` — افتحه بالمتصفح لتشوف كل عنصر هون فعليًا.

---

## 1. المبدأ العام

- **بنفسجي (Purple/Violet) هو لون Nexo الوحيد للتمييز** — ما في لون تمييز تاني (لا أزرق ولا أخضر كلون أساسي).
- **توهج ناعم، مو مبالغ فيه.** أي Glow لازم يستخدم `--glow-soft` أو `--glow-strong` الجاهزين، مش قيم عشوائية.
- **كل عنصر تفاعلي إله Hover state.** بدون استثناء.
- **RTL افتراضي.** كل عنصر جديد لازم يتفحص بالعربي أول.
- **لا تخترع لون/Radius/Shadow جديد.** إذا محتاج قيمة مو موجودة بالجدول تحت، هاد إشارة إنك خارج النظام — ارجع تأكد.

---

## 2. Design Tokens (المتغيرات)

### الألوان
| المتغير | القيمة | الاستخدام |
|---|---|---|
| `--accent-1` | `#7c3aed` | بنفسجي أساسي (غامق) |
| `--accent-2` | `#a855f7` | بنفسجي ثانوي (فاتح شوي) — يُستخدم مع `--accent-1` بالتدرجات دايمًا |
| `--accent-light` | `#cbb0fb` | نص/أيقونات بنفسجية فاتحة على خلفية داكنة |
| `--accent-1-rgb` / `--accent-rgb` | `124,58,237` / `168,85,247` | نفس الألوان بصيغة RGB لاستخدامها مع `rgba(..., alpha)` بالشفافيات |

### الخلفيات
| المتغير | الاستخدام |
|---|---|
| `--bg-page` | خلفية الصفحة الكاملة (أعمق شي) |
| `--bg-main` | خلفية منطقة المحتوى الرئيسية |
| `--bg-sidebar` | خلفية الـ Sidebar |
| `--bg-panel` / `--bg-panel-2` | خلفية البطاقات واللوحات (Panel-2 أفتح شوي، تُستخدم بالتدرجات) |
| `--bg-input` / `--bg-input-2` / `--bg-input-3` | خلفيات الحقول، بثلاث درجات شفافية متصاعدة |

### النصوص
| المتغير | الاستخدام |
|---|---|
| `--text-primary` | العناوين والنص الأساسي |
| `--text-secondary` | نص ثانوي (أوصاف) |
| `--text-muted` | نص خافت (تلميحات) |
| `--text-faint` | نص شبه غائب (Placeholders) |

### الحدود، الأشكال، التوهج
| المتغير | القيمة | الاستخدام |
|---|---|---|
| `--border-subtle` | `rgba(255,255,255,0.06)` | حدود البطاقات العادية |
| `--border-input` | `rgba(255,255,255,0.09)` | حدود الحقول |
| `--radius-lg` | `18px` | بطاقات كبيرة، Dialogs |
| `--radius-md` | `13px` | أزرار، حقول، Tabs |
| `--radius-sm` | `9px` | أيقونات صغيرة، عناصر داخلية |
| `--glow-soft` | `0 0 24px rgba(var(--accent-rgb), 0.18)` | توهج خفيف (Hover عادي) |
| `--glow-strong` | `0 0 40px rgba(var(--accent-rgb), 0.28)` | توهج أقوى (Focus، عنصر نشط) |

### ألوان دلالية (Semantic Colors)
| المتغير | القيمة | الاستخدام |
|---|---|---|
| `--color-success` / `--color-success-rgb` | `#4ade80` | نجاح، حالة "تم"، اتصال جيد |
| `--color-warning` / `--color-warning-rgb` | `#facc15` | تحذير، "قريبًا"، اتصال ضعيف/Offline |
| `--color-error` / `--color-error-rgb` | `#f87171` | خطأ، حذف، فشل |
| `--color-info` / `--color-info-rgb` | `#60a5fa` | معلومة عامة (مستخدم حاليًا لأيقونة ملفات Word) |

**لا تكتب قيمة hex/rgba يدويًا لأي من هاي — استخدم المتغير دايمًا.**

---

## 3. المكوّنات العامة (Primitives)
كل هاي جاهزة بالفعل بـ `nexo-premium-v4.css` تحت قسم "Nexo Design System — Primitives". استخدمها بأي صفحة جديدة بدل ما تعيد كتابة أزرار/بطاقات/حقول من الصفر.

### 3.1 أزرار
```html
<button class="nexo-btn nexo-btn-primary">إجراء أساسي</button>
<button class="nexo-btn nexo-btn-secondary">إجراء ثانوي</button>
<button class="nexo-btn nexo-btn-ghost">إجراء خفيف</button>
<button class="nexo-btn nexo-btn-danger">حذف</button>
<button class="nexo-btn nexo-btn-primary nexo-btn-sm">صغير</button>
<button class="nexo-btn nexo-btn-ghost nexo-btn-icon"><Icon/></button>
```
**قاعدة:** إجراء واحد أساسي بالشاشة كحد أقصى (`nexo-btn-primary`). الباقي ثانوي/خفيف.

### 3.2 بطاقات
```html
<div class="nexo-card nexo-card-hover">
  <div class="nexo-card-icon"><Icon/></div>
  <h3>عنوان</h3>
  <p>وصف مختصر</p>
</div>
```

**بطاقة فاخرة (حد علوي متدرج + كرة توهج خلفية)** — استخدمها بصفحات الهبوط/الصفحة الرئيسية حصرًا، مش بكل مكان (حتى تضل مميزة):
```html
<div class="nexo-card-luxe">
  <span class="nexo-glow-orb nexo-glow-orb-purple" style="width:200px;height:200px;top:-60px;inset-inline-end:-40px"></span>
  المحتوى...
</div>
```

### 3.3 حقول إدخال
```html
<div class="nexo-field">
  <label>الاسم</label>
  <input class="nexo-input" placeholder="اكتب هون..." />
</div>
<select class="nexo-select">...</select>
<textarea class="nexo-textarea"></textarea>
```
حالة خطأ: زيد `nexo-field-error` على الحقل، وحط `<span class="nexo-field-error-msg">` تحته.

### 3.4 Tabs
```html
<div class="nexo-tabs">
  <button class="nexo-tab active">الكل</button>
  <button class="nexo-tab">خاص</button>
</div>
```

### 3.5 Badges
```html
<span class="nexo-badge nexo-badge-accent">3</span>
<span class="nexo-badge nexo-badge-soon">قريبًا</span>
<span class="nexo-badge nexo-badge-success">تم</span>
<span class="nexo-badge nexo-badge-danger">خطأ</span>
```

### 3.6 Dialog / Modal
```html
<div class="nexo-dialog-overlay">
  <div class="nexo-dialog">
    <div class="nexo-dialog-header">
      <span class="nexo-dialog-title">عنوان</span>
      <button class="nexo-btn nexo-btn-ghost nexo-btn-icon">✕</button>
    </div>
    <p>المحتوى...</p>
    <div class="nexo-dialog-actions">
      <button class="nexo-btn nexo-btn-ghost">إلغاء</button>
      <button class="nexo-btn nexo-btn-primary">تأكيد</button>
    </div>
  </div>
</div>
```

### 3.7 Toast
```html
<div class="nexo-toast nexo-toast-success"><CheckIcon/> تم الحفظ</div>
```

### 3.8 الحالات (Empty / Error / Offline)
```html
<div class="nexo-state">
  <div class="nexo-state-icon"><Icon/></div>
  <div class="nexo-state-title">لا يوجد بيانات بعد</div>
  <div class="nexo-state-desc">وصف مختصر يشرح شو المستخدم يقدر يعمل هلق.</div>
  <button class="nexo-btn nexo-btn-primary nexo-btn-sm">إجراء</button>
</div>

<div class="nexo-state nexo-state-error">...</div>
```

### 3.9 Loading (Skeleton)
```html
<div class="nexo-skeleton nexo-skeleton-line w-60"></div>
<div class="nexo-skeleton nexo-skeleton-line w-80"></div>
<div class="nexo-skeleton nexo-skeleton-avatar"></div>
<div class="nexo-skeleton nexo-skeleton-card"></div>
```

### 3.10 Offline Banner
```html
<div class="nexo-offline-banner">
  <span class="nexo-offline-dot"></span> الاتصال ضعيف — عم نحاول نعيد الاتصال...
</div>
```

---

## 3.11 طقم الإعدادات (Settings Kit)
مستخدم بكل أقسام صفحة الإعدادات (`GeneralSection`, `SecuritySection`, `ChatSection`, `PersonalizationSection`...). أي قسم إعدادات جديد يتبع نفس البنية — قسم = `nexo-settings-block` واحد، آخر قسم بالصفحة `border-bottom: none`:

```html
<div class="nexo-settings-block">
  <h4 class="nexo-settings-title">عنوان الإعداد</h4>
  <p class="nexo-settings-desc">وصف مختصر لشو بيعمل.</p>

  <!-- صف بسيط: تسمية + عنصر تحكم -->
  <div class="nexo-settings-row">
    <span class="nexo-settings-row-label">اللغة</span>
    <SettingsSelect .../> <!-- أو أي عنصر تحكم -->
  </div>

  <!-- أو صف بمفتاح تبديل -->
  <div class="nexo-settings-row">
    <div>...</div>
    <button class="nexo-switch on" onClick="..."><span class="nexo-switch-knob"/></button>
  </div>

  <!-- شبكة اختيار (أسلوب، تصنيف) -->
  <div class="nexo-choice-grid">
    <button class="nexo-choice-chip active">خيار 1</button>
    <button class="nexo-choice-chip">خيار 2</button>
  </div>
</div>
```

**قاعدة:** `nexo-settings-block` للفواصل الأفقية بين أقسام صفحة إعدادات واحدة — لا تستخدمه جوه بطاقة (`nexo-card`) مستقلة، هو بديل للـ`nexo-card` بالسياقات المدمجة (Tabs/Modal) لا إضافة له.

---

## 3.12 نماذج (Forms)، Chips، واختبارات
مستخدمة بـ `CVBuilderPage.jsx` و `StudyModePage.jsx` — أي أداة فيها فورم متعدد الحقول أو اختبار تفاعلي تتبع نفس الأصناف:

```html
<!-- صف حقول أفقي متجاوب -->
<div class="nexo-form-row">
  <input class="nexo-input" placeholder="..." />
  <input class="nexo-input" placeholder="..." />
</div>

<!-- بطاقة فرعية متكررة (خبرة عمل، عنصر قابل للتكرار) -->
<div class="nexo-subcard">...</div>

<!-- Chip قابل للحذف (مهارة، لغة، مفهوم) -->
<span class="nexo-chip">React <XIcon/></span>

<!-- رفع صورة دائرية -->
<label class="nexo-avatar-upload">
  <img src="..." /> <!-- أو أيقونة كاميرا لو ما في صورة -->
  <input type="file" hidden />
</label>

<!-- خيار سؤال اختبار -->
<div class="nexo-quiz-option">...</div>              <!-- محايد -->
<div class="nexo-quiz-option selected">...</div>       <!-- مُختار قبل عرض النتيجة -->
<div class="nexo-quiz-option correct">...</div>        <!-- إجابة صحيحة -->
<div class="nexo-quiz-option incorrect">...</div>      <!-- إجابة خاطئة مُختارة -->
```

**قاعدة مهمة (Bidi):** أي حقل إدخال أو نص بيقدر يحتوي عربي وإنجليزي مختلطين (خصوصًا محتوى AI أو أسماء ملفات) — لازم `dir="auto"`. راجع قسم 7.

---

## 3.13 قالب صفحة الأداة (Tool Page Shell)
**الصفحة المرجعية الرسمية: `AIDocumentsPage.jsx`.** أي أداة جديدة أو معاد تصميمها (Data Analyzer, OCR, CV Builder...) تتبع **نفس البنية بالضبط**:

```html
<div class="nexo-tool-page">
  <button class="nexo-btn nexo-btn-ghost nexo-btn-sm">→ رجوع</button>

  <div class="nexo-tool-page-header">
    <div class="nexo-card-icon" style="margin-bottom:0"><Icon/></div>
    <div>
      <h1 class="nexo-tool-page-title">اسم الأداة</h1>
      <p class="nexo-tool-page-desc">وصف مختصر لوظيفتها.</p>
    </div>
  </div>

  <div class="nexo-card"> <!-- منطقة الإدخال/الرفع --> </div>
  <div class="nexo-card"> <!-- النتيجة الحالية (لو موجودة) --> </div>

  <h3 class="nexo-section-title">السجل</h3>
  <ul class="nexo-list">
    <li class="nexo-list-item">
      <div class="nexo-list-item-main">
        <div class="nexo-list-item-title">...</div>
        <span class="nexo-list-item-sub">...</span>
      </div>
      <div><!-- أزرار إجراء --></div>
    </li>
  </ul>
</div>
```

**عناصر مساعدة بنفس القالب:**
- رفع ملف → `.nexo-dropzone` (بدل أي `<label>` مخصص).
- خطأ Inline بسيط (مش State كاملة) → `.nexo-inline-error`.
- Spinner صغير جوه زر → `.nexo-spin`.
- السجل فاضي/فيه خطأ تحميل → استخدم `.nexo-state` / `.nexo-state-error` **جوه** `.nexo-card`، مو نص عادي.
- السجل قيد التحميل → Skeleton rows (زي `AIDocumentsPage.jsx`)، مو "جارِ التحميل..." نصي.

**ممنوع:** إعادة كتابة نفس البنية بـ inline styles من الصفر بكل صفحة أداة جديدة. لو الأداة محتاجة تخطيط مختلف جوهريًا (زي Live Translate)، هاي استثناء موثّق بصفحتها لحالها، مش القاعدة.

---

## 4. مكوّنات خاصة موجودة (لا تُعاد كتابتها)
هاي موجودة أصلًا وصارلها استخدام فعلي — إذا احتجت شي شبيه، افحصها قبل ما تخترع صنف جديد:

| العنصر | الصنف | أين يُستخدم حاليًا |
|---|---|---|
| Sidebar الرئيسي | `.sidebar`, `.side-nav-v3-item`, `.sidebar-newchat-btn` | `Sidebar.jsx` |
| صفحة الدخول/التسجيل | `.nexo-auth-page`, `.nexo-auth-card` | `Auth.jsx` (مرجع لأي صفحة مصادقة إضافية: نسيت كلمة المرور، التحقق) |
| نافذة الإعدادات | `.nexo-settings-modal`, `.nexo-settings-nav` | `SettingsModal.jsx` + `SettingsNav.jsx` |
| لوحة الأدوات اليمنى | `.nexo-tools-panel`, `.nexo-tool-item` | `RightToolsPanel.jsx` |
| بطاقات الإجراءات السريعة | `.nexo-quick-action-card` | `QuickActions.jsx` |
| فقاعات الشات | `.lt-chat-bubble`, `.lt-chat-bubble-row` | `LiveTranslatePage.jsx` (نمط عام صالح لأي شات) |
| TopBar بحث + Premium badge | `.topbar-v3-search`, `.premium-badge` | `TopBar.jsx` |
| بطاقات الميزات (صفحات تسويقية) | `.feature-card`, `.v2-feature-card` | Landing/About |

**قاعدة:** إذا العنصر خاص بصفحة وحدة وما رح يتكرر (زي لوحة تحكم مكالمة)، خليه بصنف مخصص (بادئة `lt-` مثلًا). إذا ممكن يتكرر بصفحتين أو أكتر، لازم يصير `nexo-*` عام بقسم الـ Primitives.

---

## 5. حالات (States) — قاعدة إلزامية لكل صفحة/أداة جديدة
أي صفحة تجيب بيانات من API لازم تغطي الأربع حالات:

1. **Loading** → `.nexo-skeleton-*` (مو Spinner دوّار وحيد بنص الشاشة إلا لعمليات قصيرة جدًا زي تبديل مايك/كاميرا).
2. **Empty** → `.nexo-state` بعنوان + وصف + إجراء واضح ("شو أعمل هلق؟").
3. **Error** → `.nexo-state.nexo-state-error` + سبب مختصر + زر "إعادة المحاولة" لو ممكن.
4. **Offline/Connection lost** → `.nexo-offline-banner` أعلى الصفحة، مع إعادة اتصال تلقائية إذا كانت الصفحة تعتمد WebSocket (نموذج جاهز بـ `LiveTranslatePage.jsx`: `reconnecting` state + Backoff تصاعدي).

---

## 6. الاستجابة (Responsive)
نقاط الكسر المعتمدة بكل الملف (لا تخترع نقطة كسر جديدة):
- `1180px` — تضييق أعمدة جانبية.
- `1024px` — لوحات جانبية تتحول لـ Drawer عائم.
- `900px` — أعمدة تتكدّس عموديًا.
- `640px` — موبايل: Bottom Sheet للوحات الجانبية، إخفاء نصوص الأزرار (أيقونة بس)، شبكات تتحول لعمود/عمودين.

---

## 7. قواعد لازم تُتبع (Do's & Don'ts)

✅ **افعل:**
- استخدم `var(--accent-1)`/`var(--accent-2)` بالتدرجات دايمًا سوا (135deg)، مش لون بنفسجي وحيد صلد لعنصر كبير.
- كل Empty/Error/Loading يستخدم أصناف `nexo-state`/`nexo-skeleton` الجاهزة.
- كل عنصر جديد قابل لإعادة الاستخدام → بادئة `nexo-`.
- تأكد إنه أي `<select>` عنده `color-scheme: dark` و`<option>` بلون خلفية صريح (تجربة سابقة أثبتت إنه بدونها القائمة بتطلع بيضاء بالغلط).

🚫 **لا تفعل:**
- لا تضيف زر/عنصر واجهة بيوهم بميزة مو موصولة بمنطق حقيقي (حتى لو معطّل — إما اربطه فعليًا أو احذفه، زي ما صار مع شريط "Nexo 4.0").
- لا تستخدم `box-shadow`/`border-color` بقيم عشوائية — استخدم `--glow-soft`/`--glow-strong`.
- لا تكرر تعريف نفس المكوّن بصفحتين بأسماء أصناف مختلفة.
- لا تغيّر direction/RTL افتراضي بدون سبب واضح.

---

## 8. خطوات إضافة صفحة/أداة جديدة للنظام
1. افحص هاد الملف + `style-guide.html` أول.
2. استخدم `nexo-*` primitives لأي شي عام (أزرار، بطاقات، حقول، حالات).
3. لو احتجت مكوّن خاص جدًا بالصفحة، سمّيه ببادئة قصيرة تخص الصفحة (زي `lt-` لـ Live Translate) وضيفه لقسم مخصص بآخر `nexo-premium-v4.css`.
4. لا تنشئ ملف CSS جديد منفصل — كل شي بملف واحد (`nexo-premium-v4.css`) حتى يضل مصدر الحقيقة موحّد.
5. حدّث هاد الملف (`DESIGN_SYSTEM.md`) لو ضفت Primitive جديد فعلي يستاهل يتوثّق.

## 3.14 عداد +/- (Stepper)
مستخدم بـ `IslamicCalculatorPage.jsx` — لأي أداة فيها عدّ أشخاص/عناصر:
```html
<div class="nexo-stepper">
  <button class="nexo-stepper-btn"><MinusIcon/></button>
  <span class="nexo-stepper-value">2</span>
  <button class="nexo-stepper-btn"><PlusIcon/></button>
</div>
```