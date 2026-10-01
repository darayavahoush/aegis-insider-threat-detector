/**
 * Aegis Behavioral Biometrics - Zero-Dependency HTTP & API Server
 * Built with native Node.js (http, fs, path) - Runs instantly with zero dependencies.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // Handle API mock endpoints for backend integration testing
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (pathname === '/api/health') {
      res.writeHead(200);
      return res.end(JSON.stringify({
        status: 'ONLINE',
        system: 'Aegis Biometric Threat Detection Engine',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }));
    }

    if (pathname === '/api/telemetry/log' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          // In a real production deployment, this writes to a SIEM like Splunk/Elastic
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, logged_at: new Date().toISOString(), record_id: 'REC-' + Math.random().toString(36).substring(2, 9) }));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
      return;
    }

    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  // Serve static files
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found - Aegis Security System');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛡️  AEGIS - Insider Threat & Keystroke Biometrics Demo`);
  console.log(`📡 Server running at: http://localhost:${PORT}`);
  console.log(`🕒 System Time: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);
});
