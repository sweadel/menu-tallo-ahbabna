const https = require('https');
const DB_URL = 'https://tallow-ahbabna-default-rtdb.firebaseio.com';

async function searchItem() {
    const items = await new Promise(r => https.get(`${DB_URL}/menu_items.json`, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => r(JSON.parse(body)));
    }));

    console.log('Search Results:');
    Object.entries(items).forEach(([k, v]) => {
        if ((v.name || '').includes('فطور') || (v.name || '').includes('فلافل')) {
            console.log(`- ${v.name}: (Key: ${k})`);
        }
    });
}

searchItem();
