const https = require('https');

const data = JSON.stringify({
    "item_matrix_cola": {
        "name": "ماتريكس كولا",
        "nameEn": "Matrix Cola",
        "category": "dr-cold",
        "price": "1.50",
        "image": "images/soft-drinks-split.png",
        "desc": "بديل محلي منعش",
        "status": "active",
        "updatedAt": Date.now()
    },
    "item_mojito_refresh": {
        "name": "موهيتو منعش",
        "nameEn": "Refreshing Mojito",
        "category": "dr-mojito",
        "price": "2.50",
        "image": "images/beverage-collection.png",
        "desc": "موهيتو بارد مع النعناع والليمون",
        "status": "active",
        "updatedAt": Date.now()
    },
    "item_lemon_mint": {
        "name": "ليمون ونعناع",
        "nameEn": "Lemon & Mint",
        "category": "dr-juice",
        "price": "3.00",
        "image": "images/beverage-collection.png",
        "desc": "عصير طبيعي طازج",
        "status": "active",
        "updatedAt": Date.now()
    },
    "item_fruit_smoothie": {
        "name": "سموذي فواكه",
        "nameEn": "Fruit Smoothie",
        "category": "dr-juice",
        "price": "3.50",
        "image": "images/beverage-collection.png",
        "desc": "مزيج فواكه صيفية",
        "status": "active",
        "updatedAt": Date.now()
    }
});

const options = {
    hostname: 'tallow-ahbabna-default-rtdb.firebaseio.com',
    path: '/menu_items.json',
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
