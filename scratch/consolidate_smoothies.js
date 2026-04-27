const https = require('https');

const DB_URL = 'https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items';

async function updateItem(key, data) {
    return new Promise((resolve, reject) => {
        const url = `${DB_URL}/${key}.json`;
        const body = JSON.stringify(data);
        const options = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(url, options, (res) => {
            res.on('end', () => resolve());
            res.on('data', () => {});
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function getItems() {
    return new Promise((resolve, reject) => {
        https.get(DB_URL + '.json', (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
    });
}

async function run() {
    console.log('Moving all smoothies to dr-juice category...');
    const items = await getItems();
    let count = 0;
    
    for (const [key, item] of Object.entries(items)) {
        const isSmoothie = item.name.includes('سموذي') || (item.nameEn && item.nameEn.toLowerCase().includes('smoothie'));
        if (isSmoothie && item.category !== 'dr-juice') {
            await updateItem(key, { category: 'dr-juice' });
            console.log(`Moved: ${item.name} from ${item.category} to dr-juice`);
            count++;
        }
    }
    
    console.log(`Successfully consolidated ${count} smoothie items.`);
}

run();
