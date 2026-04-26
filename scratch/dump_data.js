const https = require('https');
const fs = require('fs');

const DB_URL = 'https://tallow-ahbabna-default-rtdb.firebaseio.com';

async function fetchData(path) {
    return new Promise((resolve, reject) => {
        https.get(`${DB_URL}/${path}.json`, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve(JSON.parse(body)));
        }).on('error', reject);
    });
}

async function run() {
    console.log('Fetching data...');
    const items = await fetchData('menu_items');
    const cats = await fetchData('categories_meta');
    
    const output = {
        categories: cats,
        items: items
    };
    
    fs.writeFileSync('scratch/db_dump.json', JSON.stringify(output, null, 2));
    console.log('Data dumped to scratch/db_dump.json');
}

run();
