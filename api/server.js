import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const PORT = process.env.PORT || 3000;
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwo2mj3uga-jjRprQjaDe87ahHo8dBk-jBZPoHv3vyEwfrilyBDeWuRZwiK1Iv5i3a-_Q/exec";

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === "/health" || req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
    return;
  }

  // Proxy API requests to Google Sheets backend
  if (req.method === "POST") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      try {
        const gasRes = await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body
        });
        const data = await gasRes.text();
        res.writeHead(gasRes.status, { "Content-Type": "application/json" });
        res.end(data);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Backend proxy error: " + err.message }));
      }
    });
    return;
  }

  // GET handler
  if (req.method === "GET") {
    try {
      const gasRes = await fetch(GOOGLE_SCRIPT_URL + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""));
      const data = await gasRes.text();
      res.writeHead(gasRes.status, { "Content-Type": "application/json" });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`iSchool Mentor Hub Backend API running on port ${PORT}`);
});
