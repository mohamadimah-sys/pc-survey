export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    // دریافت لیست ارزیابی‌ها
    if (req.method === "GET") {
      const r = await fetch(`${SB_URL}/rest/v1/evaluations?select=*&order=timestamp.desc`, {
        headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    // تغییر وضعیت (تایید/رد/بازگشایی)
    if (req.method === "PATCH") {
      const { id, patch } = req.body;
      const r = await fetch(`${SB_URL}/rest/v1/evaluations?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "apikey": SB_KEY,
          "Authorization": `Bearer ${SB_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(patch)
      });
      if (!r.ok) throw new Error(await r.text());
      return res.status(200).json({ status: "ok" });
    }

    return res.status(405).json({ status: "error", message: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
}