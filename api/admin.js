const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method === "OPTIONS") return res.status(200).end();

  let SB_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  if (SB_URL && !SB_URL.startsWith("http")) SB_URL = "https://" + SB_URL;
  const SB_KEY = (process.env.SUPABASE_ANON_KEY || "").trim();

  try {
    if (req.method === "GET") {
      const data = await makeRequest(`${SB_URL}/rest/v1/evaluations?select=*&order=timestamp.desc`, "GET", SB_KEY, null);
      return res.status(200).json(data);
    }
    if (req.method === "POST") {
      const records = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ status: "error", message: "داده‌ای برای آپلود وجود ندارد" });
      }
      const payload = records.map(rec => ({
        id: rec.id, evaluator_type: rec.evaluatorType, evaluator_code: rec.evaluatorCode,
        supervisor: rec.supervisor, evaluator_role: rec.evaluatorRole, contractor: rec.contractor,
        workshop_code: rec.workshopCode, workshop_name: rec.workshopName, timestamp: rec.timestamp,
        scores: rec.scores, groups: rec.groups, total: rec.total, hash: rec.hash, status: "approved"
      }));
      await makeRequest(`${SB_URL}/rest/v1/evaluations`, "POST", SB_KEY, payload);
      return res.status(200).json({ status: "ok", message: `${payload.length} رکورد آنلاین شد.` });
    }
    return res.status(405).json({ status: "error" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message, url: SB_URL });
  }
};

function makeRequest(url, method, key, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: u.hostname, path: u.pathname + u.search, method: method,
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      timeout: 15000
    };
    if (payload) {
      options.headers["Content-Type"] = "application/json";
      options.headers["Prefer"] = "resolution=merge-duplicates";
      options.headers["Content-Length"] = Buffer.byteLength(payload);
    }
    const req = https.request(options, (resp) => {
      let data = "";
      resp.on("data", (chunk) => data += chunk);
      resp.on("end", () => {
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          try { resolve(data ? JSON.parse(data) : []); } catch(e) { resolve([]); }
        } else { reject(new Error(`HTTP ${resp.statusCode}: ${data}`)); }
      });
    });
    req.on("error", (e) => reject(e));
    req.on("timeout", () => { req.destroy(); reject(new Error("TIMEOUT")); });
    if (payload) req.write(payload);
    req.end();
  });
}