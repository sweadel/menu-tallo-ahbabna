const https = require('https');

// Fix the 7 items not found - patch with correct Arabic names matching Firebase
const fixes = [
  { name: "فتة حمص", nameEn: "Hummus Fatteh", desc: "خبز محمص، حمص حب، لبن وطحينة ومكسرات.", descEn: "Toasted bread, chickpeas, yogurt, tahini and nuts." },
  { name: "فتوش طلوحبابنا", nameEn: "Signature Fattoush", desc: "خضروات مشكلة، خبز محمص، سماق ودبس رمان.", descEn: "Mixed vegetables, toasted bread, sumac and molasses." },
  { name: "بيتزا زنجر (باربيكيو)", nameEn: "Zinger BBQ Pizza", desc: "دجاج زنجر، فلفل وصوص باربيكيو.", descEn: "Zinger chicken and BBQ sauce." },
  // The 4 new items added earlier - update them
  { name: "قلاية بندورة", nameEn: "Tomato Skillet", desc: "طماطم مع ثوم وفلفل حار وزيت زيتون.", descEn: "Tomatoes with garlic, chili and olive oil." },
  { name: "قلاية بندورة باللحمة", nameEn: "Tomato Skillet with Meat", desc: "طماطم ولحم مفروم مع بهارات.", descEn: "Tomatoes and minced meat with spices." },
  { name: "مفركة بطاطا", nameEn: "Potato Mafrakah", desc: "بطاطا مطبوخة مع بيض.", descEn: "Potatoes cooked with eggs." },
  { name: "حمص لحمة وصنوبر", nameEn: "Hummus with Meat & Pine", desc: "حمص مغطى باللحم والصنوبر.", descEn: "Hummus topped with meat and pine nuts." },
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
      path,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const items = await fetchFirebase('/menu_items.json');
  let updated = 0;

  for (const fix of fixes) {
    const key = Object.keys(items).find(k => {
      const n = (items[k].name || items[k].nameAr || '').trim();
      return n === fix.name.trim() || n.includes(fix.name.trim()) || fix.name.trim().includes(n);
    });

    if (key) {
      await patchFirebase(`/menu_items/${key}.json`, {
        nameEn: fix.nameEn, descAr: fix.desc, descEn: fix.descEn, desc: fix.desc
      });
      console.log(`✓ Fixed: ${fix.name} (key: ${key})`);
      updated++;
    } else {
      // Try a broader search - print what we have similar
      const similar = Object.keys(items).filter(k => {
        const n = (items[k].name || '').trim();
        return n.includes('فتة') || n.includes('فتوش') || n.includes('زنجر') || n.includes('قلاية') || n.includes('مفركة');
      });
      console.log(`✗ Still not found: ${fix.name}`);
      if (similar.length) console.log(`  Similar in DB: ${similar.map(k => items[k].name).join(', ')}`);
    }
  }
  console.log(`\nFixed ${updated} items.`);
}

run();
