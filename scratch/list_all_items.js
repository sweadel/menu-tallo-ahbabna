const https = require('https');

https.get('https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items.json', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const items = JSON.parse(data);
        if (!items) {
            console.log("No items found.");
            return;
        }

        console.log("--- قائمة الأصناف (Menu Items) ---");
        Object.values(items).forEach((item, index) => {
            const nameAr = item.nameAr || item.name || "N/A";
            const nameEn = item.nameEn || "N/A";
            const category = item.category || "Unknown";
            console.log(`${index + 1}. ${nameAr} (${nameEn}) - [${category}]`);
        });
    });
}).on('error', (err) => {
    console.error('Error: ' + err.message);
});
