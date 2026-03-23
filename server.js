const http = require("http");
const https = require("https");

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || "ak_oCPZdThrl0GQ64iEtUZT";
const COMPOSIO_USER_ID = process.env.COMPOSIO_USER_ID || "pg-test-f05e8681-b134-4d43-8758-e034072ba59a";
const COMPOSIO_SERVER_ID = process.env.COMPOSIO_SERVER_ID || "d18a3cd4-6152-44c0-ab8c-112c07a7bb3f";
const PORT = process.env.PORT || 3000;

const COMPOSIO_BASE = `https://backend.composio.dev/v3/mcp/${COMPOSIO_SERVER_ID}`;

function proxyRequest(req, res, composioPath) {
  const targetUrl = `${COMPOSIO_BASE}${composioPath}?user_id=${COMPOSIO_USER_ID}`;

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} → ${targetUrl}`);

  const options = {
    method: req.method,
    headers: {
      ...req.headers,
      host: "backend.composio.dev",
      "x-api-key": COMPOSIO_API_KEY,
      // Remove headers that could cause issues
      "accept-encoding": "identity",
    },
  };
  // Remove problematic headers
  delete options.headers["content-length"];

  const proxyReq = https.request(targetUrl, options, (proxyRes) => {
    console.log(`[${new Date().toISOString()}] Response: ${proxyRes.statusCode}`);

    // Forward all response headers
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      try { res.setHeader(key, value); } catch (e) {}
    });

    res.writeHead(proxyRes.statusCode);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end(JSON.stringify({ error: "Proxy error: " + err.message }));
    }
  });

  // Pipe request body if present
  if (req.method === "POST" || req.method === "PUT") {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

const server = http.createServer((req, res) => {
  // CORS headers — required for Claude.ai web
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "Zoom MCP Proxy for TalentXM" }));
    return;
  }

  // Route SSE and message endpoints
  if (req.url.startsWith("/sse")) {
    proxyRequest(req, res, "/sse");
  } else if (req.url.startsWith("/message")) {
    // Extract sessionId from query string
    const sessionId = new URL(req.url, "http://localhost").searchParams.get("sessionId");
    const composioPath = sessionId ? `/message?sessionId=${sessionId}` : "/message";
    proxyRequest(req, res, composioPath.replace("?", "&").replace("/message&", "/message?"));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found. Use /sse or /message" }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ Zoom MCP Proxy running on port ${PORT}`);
  console.log(`   SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`   Forwarding to: ${COMPOSIO_BASE}`);
});
