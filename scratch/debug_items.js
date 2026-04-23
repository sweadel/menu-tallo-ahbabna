const https = require('https');

// The 3 items (قلاية بندورة, قلاية بندورة باللحمة, مفركة بطاطا) were added via
// node scratch/add_items.js - let's check what name field they used

async function fetchFirebase(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://tallow-ahbabna-default-rtdb.firebaseio.com${path}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function patchFirebase(path, body) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'tallow-ahbabna-default-rtdb.firebaseio.com',
      path, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const items = await fetchFirebase('/menu_items.json');

  // Print every item and ALL its fields for debugging
  for (const [key, item] of Object.entries(items)) {
    const fields = JSON.stringify(item);
    if (fields.includes('قلاية') || fields.includes('مفركة')) {
      console.log(`[${key}]:`, JSON.stringify(item, null, 2));
    }
  }
}

run();
