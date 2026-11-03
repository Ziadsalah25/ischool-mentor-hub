# iSchool Mentor Hub — Setup & Deployment Guide (100% Free, No Card)

ده الدليل الكامل خطوة بخطوة عشان تربط **Google Sheets (Database)** + **Cloudflare Worker (Backend)** + **GitHub (`Ziadsalah25`)** + **Vercel (Frontend Auto-Deploy)** ببلاش تماماً ومن غير كارت بنكي.

---

## الخطوة 1: تجهيز الداتا بيز على Google Sheets (في دقيقتين)

1. افتح شيت جوجل جديد من هنا: https://sheets.new وسميه **`iSchool Mentor Hub DB`**.
2. من القائمة اللي فوق في الشيت، اضغط على **Extensions (الإضافات)** ثم **Apps Script**.
3. امسح أي كود مكتوب جوه ملف `Code.gs`، وانسخ الكود اللي موجود في ملف [`google-sheets/Code.gs`](../google-sheets/Code.gs) وحطه بالكامل، واضغط **Save (Ctrl+S)**.
4. من القائمة اللي فوق جنب زرار **`Run`**، اختار الدالة **`setupDatabase`** واضغط **Run**:
   * هيطلب منك صلاحية (Review Permissions) -> اختار إيميلك -> Advanced -> Go to project (unsafe) -> Allow.
   * أول ما يخلص، ارجع للشيت هتلاقيه عمل كل الجداول (`members`, `tutors`, `schools`, `template_sessions`, إلخ) وضيف إيميلك أوتوماتيك كأول **Admin**!
5. اضغط فوق يمين على زرار **Deploy** > **New deployment**:
   * اضغط على علامة الترس جنب Select type واختار **Web app**.
   * في **Execute as** اختار: **`Me`**.
   * في **Who has access** اختار: **`Anyone`**.
   * اضغط **Deploy** وانسخ اللينك اللي هيطلعلك (**Web app URL** اللي بينتهي بـ `/exec`).

---

## الخطوة 2: ربط الباك إند على Cloudflare Workers (اختياري أو مباشر)

تقدر تحط لينك الـ **Web app URL** بتاع جوجل شيتس مباشرة في [`public/js/config.js`](../public/js/config.js)، أو تحطه ورا **Cloudflare Worker** من ملف [`cloudflare-worker/worker.js`](../cloudflare-worker/worker.js):

1. افتح لوحة تحكم Cloudflare > **Workers & Pages** > **Create Worker**.
2. ارفع كود [`cloudflare-worker/worker.js`](../cloudflare-worker/worker.js).
3. في إعدادات الـ Worker (**Settings > Variables and Secrets**)، ضيف متغير اسمه `GOOGLE_SCRIPT_URL` وحط جواه لينك الـ Web app URL بتاع جوجل شيتس.
4. انسخ لينك الـ Worker (مثلاً `https://ischool-mentor-hub-api.<your-subdomain>.workers.dev`).

---

## الخطوة 3: تفعيل تسجيل الدخول بـ Google (Google Cloud Console)

1. افتح [Google Cloud Console](https://console.cloud.google.com/) واعمل Project جديد باسم **`iSchool Mentor Hub`**.
2. من القائمة الجانبية افتح **APIs & Services > OAuth consent screen**:
   * اختار **External** واكتب اسم التطبيق `iSchool Mentor Hub` وإيميلك.
   * اضغط **Publish App** عشان أي مينتور تضيفه يقدر يسجل دخول.
3. افتح **Credentials > Create Credentials > OAuth client ID**:
   * النوع: **Web application**.
   * في **Authorized JavaScript origins** ضيف لينك موقعك على Vercel (مثلاً `https://ischool-mentor-hub.vercel.app`) ولينك التجربة `http://localhost:3000`.
   * انسخ الـ **Client ID** اللي هيطلعلك.

---

## الخطوة 4: وضع اللينكات في `public/js/config.js`

افتح ملف [`public/js/config.js`](../public/js/config.js) وحط اللينكين بتوعك:

```js
export const BACKEND_URL = "https://script.google.com/macros/s/....../exec"; // أو لينك Cloudflare Worker
export const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
```

*(ملحوظة: طول ما `BACKEND_URL` فاضي، الموقع هيشتغل في وضع الـ Demo المحلي عشان تقدر تجرب وتعدل براحتك، وأول ما تحط اللينك هيتحول أوتوماتيك لـ Google Sign-In و Google Sheets!)*

---

## الخطوة 5: الرفع على GitHub (`Ziadsalah25`) والربط التلقائي بـ Vercel

1. اعمل Repository جديد على حسابك https://github.com/Ziadsalah25 باسم **`ischool-mentor-hub`**.
2. ارفع الكود للأكاونت بتاعك:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: iSchool Mentor Hub with Google Sheets + Cloudflare + Vercel"
   git branch -M main
   git remote add origin https://github.com/Ziadsalah25/ischool-mentor-hub.git
   git push -u origin main
   ```
3. افتح حسابك على [Vercel](https://vercel.com) (سجل دخول بحساب GitHub بتاعك `Ziadsalah25`).
4. اضغط **Add New > Project** واختار الـ Repo **`ischool-mentor-hub`** واضغط **Deploy** (ملف [`vercel.json`](../vercel.json) متظبط جاهز إنه يعرض فولدر `public` أوتوماتيك من غير أي إعدادات!).
5. **الأوتوميشن (CI/CD):** من اللحظة دي، أي تعديل نعمله سوا هنا وتعمله `git push` على GitHub، موقع Vercel هيلقط التعديل وينزله على الـ Production أوتوماتيك في أقل من 15 ثانية!

