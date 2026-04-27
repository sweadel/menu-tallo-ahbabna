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

async function addItem(data) {
    return new Promise((resolve, reject) => {
        const url = `${DB_URL}.json`;
        const body = JSON.stringify(data);
        const options = {
            method: 'POST',
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

async function run() {
    console.log('Synchronizing Juice items...');

    // 1. Update existing juices
    await updateItem('item_1776718856053_133', { category: 'dr-juice', price: '3.00', nameEn: 'Orange Juice' });
    await updateItem('item_1776718856053_134', { category: 'dr-juice', price: '3.00', nameEn: 'Lemon Juice' });

    // 2. Add missing juices
    const missing = [
        { name: 'عصير مانجا', nameEn: 'Mango Juice', price: '3.00', category: 'dr-juice', status: 'active', image: 'images/tallo-logo.png' },
        { name: 'عصير فراولة', nameEn: 'Strawberry Juice', price: '3.00', category: 'dr-juice', status: 'active', image: 'images/tallo-logo.png' },
        { name: 'عصير ليمون ونعناع', nameEn: 'Lemon Mint Juice', price: '3.00', category: 'dr-juice', status: 'active', image: 'images/tallo-logo.png' }
    ];

    for (const juice of missing) {
        await addItem(juice);
        console.log(`Added: ${juice.name}`);
    }

    console.log('Juice synchronization completed.');
}

run();
