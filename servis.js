// servis.js - minimal HTTP server for testing ngrok
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  const html = `
  <html>
    <head><meta charset="utf-8"><title>Test Page</title></head>
    <body>
      <h1>Hello from Node.js HTTP Server!</h1>
      <p>Request URL: ${'${req.url}'}</p>
    </body>
  </html>
  `;
  res.end(html);
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Serving custom HTML at http://localhost:${port}`);
});
