const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/script.js': ['script.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
};

http.createServer((request, response) => {
  const file = files[new URL(request.url, 'http://127.0.0.1').pathname];
  if (!file) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  fs.readFile(path.join(__dirname, '..', 'docs', file[0]), (error, content) => {
    if (error) {
      console.error(error);
      response.writeHead(500);
      response.end('Could not read site asset');
      return;
    }
    response.writeHead(200, { 'Content-Type': file[1] });
    response.end(content);
  });
}).listen(4173, '127.0.0.1', () => console.log('Hotel test server: http://127.0.0.1:4173/'));
