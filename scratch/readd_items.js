const https = require('https');

// The new items (قلاية بندورة etc.) were added via POST to /menu_items.json
// Firebase generates push IDs starting with -O. Let's look for ALL items
// and check if they exist with different key format

const newItems = [
  { name: "قلاية بندورة", nameEn: "Tomato Skillet", desc: "طماطم مع ثوم وفلفل حار وزيت زيتون.", descEn: "Tomatoes with garlic, chili and olive oil.", category: "ar-hot-mezze" },
  { name: "قلاية بندورة باللحمة", nameEn: "Tomato Skillet with Meat", desc: "طماطم ولحم مفروم مع بهارات.", descEn: "Tomatoes and minced meat with spices.", category: "ar-hot-mezze" },
  { name: "مفركة بطاطا", nameEn: "Potato Mafrakah", desc: "بطاطا مطبوخة مع بيض.", descEn: "Potatoes cooked with eggs.", category: "ar-hot-mezze" },
];

async function postFirebase(body) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'tallow-ahbabna-default-rtdb.firebaseio.com',
      path: '/menu_items.json',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let resp = '';
      res.on('data', c => resp += c);
      res.on('end', () => resolve(JSON.parse(resp)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  // These items weren't found - re-add them with all required fields
  for (const item of newItems) {
    const result = await postFirebase({
      name: item.name,
      nameEn: item.nameEn,
      desc: item.desc,
      descAr: item.desc,
      descEn: item.descEn,
      category: item.category,
      status: "active",
      price: "",
      image: "",
      featured: false,
    });
    console.log(`✓ Added: ${item.name} => key: ${result.name}`);
  }
  console.log("\nDone! All 3 items re-added with full descriptions.");
}

run();
