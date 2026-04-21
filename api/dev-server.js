// Local dev server — mirrors the /api/proxy Vercel function on port 3001
// Usage: node api/dev-server.js
// Then use Vite on port 5173 and proxy /api/proxy to localhost:3001

const http = require("http");
const fs   = require("fs");
const path = require("path");

// Load .env manually
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
    const [k, ...v] = line.split("=");
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join("=").trim();
    }
  });
}

const handler = require("./proxy.js");

function wrapRes(raw) {
  let statusCode = 200;
  const headers = {};
  const vercelRes = {
    status(code) { statusCode = code; return vercelRes; },
    setHeader(k, v) { headers[k] = v; return vercelRes; },
    json(data) {
      headers["Content-Type"] = "application/json";
      raw.writeHead(statusCode, headers);
      raw.end(JSON.stringify(data));
    },
    end(body) {
      raw.writeHead(statusCode, headers);
      raw.end(body || "");
    },
  };
  return vercelRes;
}

const server = http.createServer((req, res) => {
  const wrappedRes = wrapRes(res);
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    if (body) {
      try { req.body = JSON.parse(body); } catch { req.body = {}; }
    } else {
      req.body = {};
    }
    if (!req.headers.origin) req.headers.origin = "http://localhost:5173";
    handler(req, wrappedRes).catch(err => {
      console.error("Handler error:", err);
      res.writeHead(500); res.end("Internal error");
    });
  });
});

server.listen(3001, () => {
  console.log("Local proxy server running on http://localhost:3001/api/proxy");
  console.log("OPENROUTER_KEY set:", !!process.env.OPENROUTER_KEY);
});
