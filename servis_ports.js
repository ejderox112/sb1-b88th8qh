const http = require('http');

const ports = process.env.PORTS ? process.env.PORTS.split(',').map(Number) : [8080, 8081, 8082];

ports.forEach((port) => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<html><body><h1>Servis on port ${port}</h1><p>URL: http://localhost:${port}</p></body></html>`);
  });

  server.listen(port, () => {
    console.log(`Servis listening on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    console.error(`Error on port ${port}:`, err.message);
  });
});
