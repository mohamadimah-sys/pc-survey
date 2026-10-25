export default async function handler(req, res) {
  // تنظیمات CORS برای جلوگیری از خطای مرورگر
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ status: "error", message: "Method not allowed" });

  try {
    const { record, fileName } = req.body || {};
    if (!record || !record.contractor) {
      return res.status(400).json({ status: "error", message: "اطلاعات رکورد ناقص است" });
    }

    // خواندن متغیرها از تنظیمات ورسل
    const token  = process.env.EITAA_TOKEN;
    const chatId = process.env.EITAA_CHAT_ID;
    if (!token || !chatId) {
      return res.status(500).json({ status: "error", message: "توکن یا آیدی کانال در ورسل تنظیم نشده است" });
    }

    // ساخت فایل JSON
    const content = JSON.stringify([record], null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const safeName = fileName || `نظرسنجی_${record.supervisor}_${record.contractor}.json`;

    // آماده‌سازی فرم برای ارسال به ایتا
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", `📊 ارزیابی جدید\n👤 ارزیاب: ${record.supervisor}\n🏗️ پیمانکار: ${record.contractor}\n⭐ امتیاز: ${record.total} از ۱۰۰`);
    form.append("file", blob, safeName);

    // آدرس رسمی API ایتایار
    const eitaaUrl = `https://eitaayar.ir/api/${token}/sendFile`;
    const eitaaRes = await fetch(eitaaUrl, { method: "POST", body: form });
    
    // خواندن پاسخ ایتا
    const responseText = await eitaaRes.text();
    let eitaaJson = {};
    try { 
      eitaaJson = JSON.parse(responseText); 
    } catch(e) {
      eitaaJson = { description: responseText };
    }

    // بررسی موفقیت یا خطا
    if (eitaaJson.ok === true) {
      return res.status(200).json({ status: "ok", message: "ارسال شد" });
    } else {
      // اگر ایتا خطا داد، دقیقاً متن خطای ایتا را برمی‌گردانیم
      return res.status(200).json({ 
        status: "error", 
        message: eitaaJson.description || responseText || "خطای ناشناخته از سمت ایتا" 
      });
    }
  } catch (err) {
    return res.status(500).json({ status: "error", message: "خطای شبکه: " + err.message });
  }
}