// ⚠️ این دو خط را با اطلاعات خودتان پر کنید
const EITAA_TOKEN   = "bot524944:d2f21315-a137-40c1-96ad-4ee0ad65a203";   // توکن ربات
const EITAA_CHAT_ID = "11255133";          // chat_id کانال

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ status: "error" });

  try {
    const { record, fileName } = req.body || {};
    if (!record || !record.contractor) {
      return res.status(400).json({ status: "error", message: "record نامعتبر" });
    }

    const content = JSON.stringify([record], null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const safeName = fileName || `نظرسنجی_${record.supervisor}_${record.contractor}.json`;

    const form = new FormData();
    form.append("chat_id", EITAA_CHAT_ID);
    form.append("caption", `📊 ${record.supervisor} → ${record.contractor}\n⭐ ${record.total} از ۱۰۰`);
    form.append("file", blob, safeName);

    // طبق مستندات رسمی، ساختار آدرس به این شکل است: https://eitaayar.ir/api/TOKEN/METHOD
    const eitaaUrl = `https://eitaayar.ir/api/${EITAA_TOKEN}/sendDocument`;
    const eitaaRes = await fetch(eitaaUrl, { method: "POST", body: form });
    const eitaaJson = await eitaaRes.json().catch(() => ({}));

    return res.status(200).json({
      status: (eitaaJson.ok === true) ? "ok" : "error",
      message: eitaaJson.description || (eitaaJson.ok ? "ارسال شد" : "خطا در ارسال")
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
}