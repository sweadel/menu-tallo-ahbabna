const https = require('https');
const DB_URL = 'https://tallow-ahbabna-default-rtdb.firebaseio.com';

async function checkGrills() {
    const items = await new Promise(r => https.get(`${DB_URL}/menu_items.json`, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => r(JSON.parse(body)));
    }));

    console.log('Grill Items (ar-grill):');
    Object.entries(items)
        .filter(([k, v]) => v.category === 'ar-grill')
        .forEach(([k, v]) => {
            console.log(`- ${v.name}: ${v.price} JD | Weights: ${JSON.stringify(v.prices || 'None')}`);
        });
}

checkGrills();
