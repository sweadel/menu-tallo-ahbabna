const fs = require('fs');
const https = require('https');

// 1. Read dump
const dump = JSON.parse(fs.readFileSync('scratch/db_dump.json', 'utf8'));
const origItems = dump.items;

// 2. Fetch current items to preserve images
function fetchCurrent() {
    return new Promise((resolve, reject) => {
        https.get('https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items.json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function run() {
    const currentItems = await fetchCurrent();
    const updates = {};

    for (const key in origItems) {
        const orig = origItems[key];
        const curr = currentItems[key];

        const merged = { ...orig };
        
        // Preserve my professional images if they exist
        if (curr && curr.image && curr.image.match(/juice-|mojito-|coffee-|cold-|water-|tea-|matrix-/)) {
            merged.image = curr.image;
        }
        
        updates[key] = merged;
    }

    const payload = JSON.stringify(updates);
    const options = {
        hostname: 'tallow-ahbabna-default-rtdb.firebaseio.com',
        path: '/menu_items.json',
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = https.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        res.on('data', (d) => process.stdout.write(d));
    });

    req.on('error', (e) => console.error(e));
    req.write(payload);
    req.end();
}

run();
