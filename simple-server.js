const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Remove query string/hash
  const cleanUrl = req.url.split('?')[0].split('#')[0];
  let filePath = path.join(PUBLIC_DIR, cleanUrl);
  
  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    let serveFile = filePath;
    
    // If error (not found) or directory, fallback to index.html (SPA routing)
    if (err || stats.isDirectory()) {
      // Only fallback for non-asset requests (simple heuristic)
      if (!path.extname(cleanUrl) || cleanUrl.includes('expo-auth-session')) {
         serveFile = path.join(PUBLIC_DIR, 'index.html');
      }
    }

    const ext = path.extname(serveFile);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(serveFile, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
            // Final fallback if even index.html is missing (shouldn't happen)
            res.statusCode = 404;
            res.end('404 Not Found');
        } else {
            res.statusCode = 500;
            res.end('Server Error');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
}).listen(PORT, () => {
  console.log(`SPA Server running at http://localhost:${PORT}/`);
});
