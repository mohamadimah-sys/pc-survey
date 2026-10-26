import dns from 'dns';

// 👇 مجبور کردن Node.js به استفاده از IPv4 (حل مشکل fetch failed در ورسل)
dns.setDefaultResultOrder('ipv4first');

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  let SB_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  if (SB_URL && !SB_URL.startsWith("http")) SB_URL = "https://" + SB_URL;
  const SB_KEY = (process.env.SUPABASE_ANON_KEY || "").trim();

  // 👇 هدرهای اضافه برای جلوگیری از بلاک شدن توسط Cloudflare
  const headers = {
    "apikey": SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept": "application/json"
  };

  try {
    if (req.method === "GET") {
      const r = await fetch(`${SB_URL}/rest/v1/evaluations?select=*&order=timestamp.desc`, {
        method: "GET",
        headers: headers
      });
      if (!r.ok) {
        const text = await r.text();
        return res.status(500).json({ status: "error", message: "Supabase Error: " + text, url: SB_URL });
      }
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (req.method === "PATCH") {
      const { id, patch } = req.body;
      const r = await fetch(`${SB_URL}/rest/v1/evaluations?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(patch)
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error("Supabase Error: " + text);
      }
      return res.status(200).json({ status: "ok" });
    }

    return res.status(405).json({ status: "error", message: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message, url: SB_URL });
  }
}