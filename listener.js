const url = require('url');

const statusCode = 200;

function handler(req, res) {
  let data = '';

  console.log(req.url);
  console.log(url.parse(req.url, true));

  const queryObject = url.parse(req.url, true).query;

  if (req.method === 'POST') {
    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => {
      console.log('Received body data:');
      console.log(data.toString());
    });
  }

  console.log(`Query strings: ${JSON.stringify(queryObject)}`);

  res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
  res.end();
}

const app = require('http').createServer(handler);

app.listen(3000);

console.log('Listening to port 3000');
console.log(`Returning status code ${statusCode.toString()}`);
