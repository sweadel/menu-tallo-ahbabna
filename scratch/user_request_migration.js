const https = require('https');

const DB_URL = 'https://tallow-ahbabna-default-rtdb.firebaseio.com';

async function updateDB(path, data) {
    return new Promise((resolve, reject) => {
        const url = `${DB_URL}/${path}.json`;
        const body = JSON.stringify(data);
        const options = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(url, options, (res) => {
            let resBody = '';
            res.on('data', d => resBody += d);
            res.on('end', () => resolve(resBody));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function run() {
    console.log('Starting user request updates...');

    // 1. Rename Categories
    const catUpdates = {
        "ar-mains": {
            "nameAr": "أطباق رئيسية",
            "nameEn": "Main Dishes"
        },
        "ar-grill": {
            "nameAr": "المشاوي",
            "nameEn": "The Grills"
        }
    };
    await updateDB('categories_meta', catUpdates);
    console.log('Categories renamed.');

    // 2. Update Grills Items with multiple prices
    // Based on the dump, these are the grill items:
    const grillItems = [
        "item_1776718856053_68", // كباب حلبي
        "item_1776718856053_69", // شقف
        "item_1776718856053_70", // شيش طاووق
        "item_1776718856053_71", // ريش مشويه
        "item_1776718856053_72", // مشاوي مشكل
        "item_1776718856053_75"  // کباب خشخاش
    ];

    const grillUpdates = {};
    grillItems.forEach(id => {
        grillUpdates[id] = {
            "price": "6.00", // Default for 1/4
            "prices": {
                "quarter": "6.00",
                "half": "12.00",
                "kilo": "22.00"
            }
        };
    });
    await updateDB('menu_items', grillUpdates);
    console.log('Grill prices updated with weight options.');

    // 3. Rename specific item if found (Breakfast -> Falafel)
    // The user said "Breakfast Tallo Ahbabna" -> "Falafel Tallo Ahbabna"
    // In our dump it's already "Falafel Tallo Ahbabna" at item_1776718856053_5
    // We will ensure it's correct.
    await updateDB('menu_items/item_1776718856053_5', {
        "name": "فلافل طلوا حبابنا",
        "nameEn": "Tallo Ahbabna Falafel"
    });

    console.log('All user request updates completed.');
}

run();
