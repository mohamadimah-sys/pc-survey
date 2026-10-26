const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  let SB_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  if (SB_URL && !SB_URL.startsWith("http")) SB_URL = "https://" + SB_URL;
  const SB_KEY = (process.env.SUPABASE_ANON_KEY || "").trim();

  try {
    if (req.method === "GET") {
      const data = await makeRequest(`${SB_URL}/rest/v1/evaluations?select=*&order=timestamp.desc`, "GET", SB_KEY, null);
      return res.status(200).json(data);
    }
    if (req.method === "PATCH") {
      const { id, patch } = req.body;
      await makeRequest(`${SB_URL}/rest/v1/evaluations?id=eq.${encodeURIComponent(id)}`, "PATCH", SB_KEY, patch);
      return res.status(200).json({ status: "ok" });
    }
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message, url: SB_URL });
  }
}

function makeRequest(url, method, key, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: method,
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 10000
    };
    if (payload) {
      options.headers["Content-Type"] = "application/json";
      options.headers["Prefer"] = "return=minimal";
      options.headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (resp) => {
      let data = "";
      resp.on("data", (chunk) => data += chunk);
      resp.on("end", () => {
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          try { resolve(data ? JSON.parse(data) : []); } catch(e) { resolve([]); }
        } else {
          reject(new Error(`HTTP ${resp.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.on("timeout", () => { req.destroy(); reject(new Error("TIMEOUT")); });
    if (payload) req.write(payload);
    req.end();
  });
}