const http = require('http');

const TOTAL_REQUESTS = 500;
// const API_URL = 'http://localhost:3005/api/v1/auth/me';
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNmU0OTNmMy00OWNjLTRhYjEtOTY2Mi04ODE5ZDdjOTczMDUiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJqdGkiOiJiNDFlOGQ5OS0xNmY4LTQ0MjgtOTA3Yi02YmJmNGQxMzJjZGQiLCJpYXQiOjE3NjQ4NzM5NzQsImV4cCI6MjM2OTY3Mzk3NH0.hStt03pHCcgDpTdTsBy8Q2WONXllCwj6kqB5bByjl80';

async function sendRequest(index) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      fio: `John Doe ${index}`,
      phoneNumber: '+998901234567',
      language: 'uz',
      avatar: 'https://example.com/avatars/user123.jpg',
    });

    const options = {
      hostname: 'localhost',
      port: 3005,
      path: '/api/v1/auth/me',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          index,
          statusCode: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        index,
        statusCode: 0,
        success: false,
        error: error.message,
      });
    });

    req.write(data);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStressTest() {
  console.log(
    `Starting stress test with ${TOTAL_REQUESTS} parallel requests...`
  );
  const startTime = Date.now();

  // Launch all requests in parallel
  const promises = [];
  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    promises.push(sendRequest(i));
    if (i % 100 === 0) {
      console.log(`Dispatched ${i} requests...`);
      await Promise.all(promises);
      promises.length = 0; // reset the array
      await sleep(500); // slight delay to avoid overwhelming the server instantly
    }
  }

  console.log(
    'Stress test completed.',
    `Time taken: ${Date.now() - startTime} ms`
  );
}

runStressTest().catch(console.error);
