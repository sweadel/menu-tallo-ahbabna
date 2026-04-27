const https = require('https');
const DB_URL = 'https://tallow-ahbabna-default-rtdb.firebaseio.com';

async function checkHummus() {
    const items = await new Promise(r => https.get(`${DB_URL}/menu_items.json`, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => r(JSON.parse(body)));
    }));

    console.log('Hummus Items:');
    Object.entries(items)
        .filter(([k, v]) => (v.name || '').includes('حمص'))
        .forEach(([k, v]) => {
            console.log(`- ${v.name}: ${v.price} JD (Cat: ${v.category})`);
        });
}

checkHummus();
