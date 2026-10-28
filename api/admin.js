import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  let SB_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  if (SB_URL && !SB_URL.startsWith("http")) SB_URL = "https://" + SB_URL;
  const SB_KEY = (process.env.SUPABASE_ANON_KEY || "").trim();

  const headers = {
    "apikey": SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "Content-Type": "application/json"
  };

  try {
    if (req.method === "GET") {
      // خواندن داده‌ها برای پنل مدیر پروژه
      const r = await fetch(`${SB_URL}/rest/v1/evaluations?select=*&order=timestamp.desc`, { headers });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      // آپلود داده‌ها از پنل ادمین به ابر
      const records = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ status: "error", message: "داده‌ای برای آپلود وجود ندارد" });
      }

      // تبدیل داده‌های لوکال به فرمت دیتابیس
      const payload = records.map(rec => ({
        id: rec.id,
        evaluator_type: rec.evaluatorType,
        evaluator_code: rec.evaluatorCode,
        supervisor: rec.supervisor,
        evaluator_role: rec.evaluatorRole,
        contractor: rec.contractor,
        workshop_code: rec.workshopCode,
        workshop_name: rec.workshopName,
        timestamp: rec.timestamp,
        scores: rec.scores,
        groups: rec.groups,
        total: rec.total,
        hash: rec.hash,
        status: rec.status || "approved"
      }));

      // ارسال به Supabase (حالت جایگزینی یا افزودن)
      const r = await fetch(`${SB_URL}/rest/v1/evaluations`, {
        method: "POST",
        headers: { ...headers, "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify(payload)
      });

      if (!r.ok) throw new Error(await r.text());
      return res.status(200).json({ status: "ok", message: `${payload.length} رکورد با موفقیت آنلاین شد.` });
    }

    return res.status(405).json({ status: "error", message: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
}