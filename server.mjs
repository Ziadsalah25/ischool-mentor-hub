import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = 3000;
const PUBLIC_DIR = path.resolve("C:/Users/ziad.zaki/.gemini/antigravity/scratch/ischool-mentor-hub/public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  const cleanUrl = (req.url || "/").split("?")[0].replace(/^\/+/, "");
  const relPath = cleanUrl === "" ? "index.html" : cleanUrl;
  const filePath = path.resolve(PUBLIC_DIR, relPath);

  if (!filePath.toLowerCase().startsWith(PUBLIC_DIR.toLowerCase()) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
