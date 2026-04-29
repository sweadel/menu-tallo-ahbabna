const https = require('https');
const fs = require('fs');

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return download(res.headers.location, dest).then(resolve).catch(reject);
            }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => { file.close(resolve); });
        }).on('error', reject);
    });
}

function updateFirebase(key, imageVal) {
    return new Promise((resolve) => {
        const data = JSON.stringify({ image: imageVal });
        const req = https.request('https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items/' + key + '.json', { method: 'PATCH' }, (res) => {
            res.on('data', () => {});
            res.on('end', () => {
                console.log('Updated', key, 'with', imageVal);
                resolve();
            });
        });
        req.write(data);
        req.end();
    });
}

async function main() {
    // 1. Extra flavor -> empty image
    await updateFirebase('item_extra_flavor', '');

    // 2. Download Bitter Lemon and Soda Water
    await download('https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Schweppes_Bitter_Lemon_%2801%29.jpg/800px-Schweppes_Bitter_Lemon_%2801%29.jpg', 'images/drinks/g_bitter_lemon.jpg');
    await updateFirebase('item_1776718856053_128', 'images/drinks/g_bitter_lemon.jpg');

    await download('https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Glass_of_Carbonated_Water.jpg/800px-Glass_of_Carbonated_Water.jpg', 'images/drinks/g_soda_water.jpg');
    await updateFirebase('item_1776718856053_129', 'images/drinks/g_soda_water.jpg');

    // 3. Pepsi & Matrix Soft Drinks
    await download('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Pepsi_Can.jpg/800px-Pepsi_Can.jpg', 'images/drinks/pepsi_can.jpg');
    
    // Create SVG for Soft Drinks
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <rect width="800" height="800" fill="#000"/>
  <image href="pepsi_can.jpg" x="0" y="0" width="400" height="800" preserveAspectRatio="xMidYMid slice" />
  <image href="matrix_cola_bottle_1777405640074.png" x="400" y="0" width="400" height="800" preserveAspectRatio="xMidYMid slice" />
  <line x1="400" y1="0" x2="400" y2="800" stroke="#C5A022" stroke-width="6" />
  <text x="200" y="750" font-family="Arial" font-size="40" fill="white" font-weight="bold" text-anchor="middle" filter="drop-shadow(2px 2px 2px black)">Pepsi</text>
  <text x="600" y="750" font-family="Arial" font-size="40" fill="white" font-weight="bold" text-anchor="middle" filter="drop-shadow(2px 2px 2px black)">Matrix Cola</text>
</svg>
`;
    fs.writeFileSync('images/drinks/soft_drinks_split.svg', svgContent.trim());
    await updateFirebase('item_1776718856053_126', 'images/drinks/soft_drinks_split.svg');

    console.log('Done!');
}

main();
