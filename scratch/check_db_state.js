const https = require('https');
const DB_URL = 'https://tallow-ahbabna-default-rtdb.firebaseio.com';

async function checkData() {
    const categories = await new Promise(r => https.get(`${DB_URL}/categories_meta.json`, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => r(JSON.parse(body)));
    }));

    const items = await new Promise(r => https.get(`${DB_URL}/menu_items.json`, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => r(JSON.parse(body)));
    }));

    console.log('Categories:');
    Object.entries(categories).forEach(([id, c]) => console.log(`- ${id}: ${c.nameAr} (${c.nameEn})`));

    console.log('\nSample Items:');
    Object.values(items).slice(0, 10).forEach(i => console.log(`- ${i.name}: ${i.price} JD (Cat: ${i.category})`));
}

checkData();
