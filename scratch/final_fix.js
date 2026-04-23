const https = require('https');

// Exact names as stored in Firebase
const fixes = [
  { exactName: "بيتزا زنجر (باربكيو)", nameEn: "Zinger BBQ Pizza", desc: "دجاج زنجر، فلفل وصوص باربيكيو.", descEn: "Zinger chicken and BBQ sauce." },
  // New items added earlier - find them (they were added via POST so name field is used)
  { exactName: "قلاية بندورة", nameEn: "Tomato Skillet", desc: "طماطم مع ثوم وفلفل حار وزيت زيتون.", descEn: "Tomatoes with garlic, chili and olive oil." },
  { exactName: "قلاية بندورة باللحمة", nameEn: "Tomato Skillet with Meat", desc: "طماطم ولحم مفروم مع بهارات.", descEn: "Tomatoes and minced meat with spices." },
  { exactName: "مفركة بطاطا", nameEn: "Potato Mafrakah", desc: "بطاطا مطبوخة مع بيض.", descEn: "Potatoes cooked with eggs." },
];

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
  
  // Print all items with their keys so we can see exactly what's stored
  console.log("All items in Firebase:");
  Object.keys(items).forEach(k => {
    const n = items[k].name || items[k].nameAr || '?';
    console.log(`  [${k}] => "${n}"`);
  });

  for (const fix of fixes) {
    const key = Object.keys(items).find(k =>
      (items[k].name || '').trim() === fix.exactName.trim() ||
      (items[k].nameAr || '').trim() === fix.exactName.trim()
    );

    if (key) {
      await patchFirebase(`/menu_items/${key}.json`, {
        nameEn: fix.nameEn, descAr: fix.desc, descEn: fix.descEn, desc: fix.desc
      });
      console.log(`✓ Updated: ${fix.exactName}`);
    } else {
      console.log(`✗ Not found: ${fix.exactName}`);
    }
  }
}

run();
