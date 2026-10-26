import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0"); // 👈 جلوگیری از کش شدن خطا

  if (req.method === "OPTIONS") return res.status(200).end();

  let SB_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  if (SB_URL && !SB_URL.startsWith("http")) SB_URL = "https://" + SB_URL;
  const SB_KEY = (process.env.SUPABASE_ANON_KEY || "").trim();

  try {
    if (req.method === "GET") {
      const r = await fetch(`${SB_URL}/rest/v1/evaluations?select=*&order=timestamp.desc`, {
        headers: {
          "apikey": SB_KEY,
          "Authorization": `Bearer ${SB_KEY}`,
          "User-Agent": "Vercel-Serverless" // 👈 جلوگیری از بلاک شدن توسط Cloudflare
        }
      });
      const text = await r.text();
      if (!r.ok) throw new Error(text);
      return res.status(200).json(JSON.parse(text || "[]"));
    }

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
      const text = await r.text();
      if (!r.ok) throw new Error(text);
      return res.status(200).json({ status: "ok" });
    }

    return res.status(405).json({ status: "error", message: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message, url: SB_URL, time: new Date().toISOString() });
  }
}