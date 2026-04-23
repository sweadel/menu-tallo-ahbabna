const https = require('https');

// The new items were added with POST and stored with key format like "-OQxxx..."
// Let's fetch and print all keys to find them
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

const toUpdate = {
  "قلاية بندورة": { nameEn: "Tomato Skillet", desc: "طماطم مع ثوم وفلفل حار وزيت زيتون.", descEn: "Tomatoes with garlic, chili and olive oil." },
  "قلاية بندورة باللحمة": { nameEn: "Tomato Skillet with Meat", desc: "طماطم ولحم مفروم مع بهارات.", descEn: "Tomatoes and minced meat with spices." },
  "مفركة بطاطا": { nameEn: "Potato Mafrakah", desc: "بطاطا مطبوخة مع بيض.", descEn: "Potatoes cooked with eggs." },
};

async function run() {
  const items = await fetchFirebase('/menu_items.json');

  for (const [key, item] of Object.entries(items)) {
    const n = (item.name || item.nameAr || '').trim();
    if (toUpdate[n]) {
      const upd = toUpdate[n];
      await patchFirebase(`/menu_items/${key}.json`, {
        nameEn: upd.nameEn, descAr: upd.desc, desc: upd.desc, descEn: upd.descEn
      });
      console.log(`✓ Updated: ${n} [key: ${key}]`);
      delete toUpdate[n];
    }
  }

  const remaining = Object.keys(toUpdate);
  if (remaining.length) {
    console.log(`\nStill not found in DB:`);
    remaining.forEach(r => console.log(`  - ${r}`));
    console.log("\nThese items may be stored under different key structure. Raw keys with recent timestamps:");
    Object.entries(items)
      .filter(([k]) => !k.startsWith('item_'))
      .forEach(([k, v]) => console.log(`  [${k}] name="${v.name || v.nameAr}"`));
  } else {
    console.log("\nAll items updated successfully!");
  }
}

run();
