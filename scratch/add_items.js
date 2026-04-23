const https = require('https');

const itemsToAdd = [
    {
        name: "قلاية بندورة",
        nameEn: "Galayet Bandora",
        category: "ar-hot-mezze",
        price: "",
        status: "active",
        desc: "قلاية بندورة طازجة مع البصل والفلفل",
        descEn: "Fresh tomato fry with onions and peppers",
        image: ""
    },
    {
        name: "قلاية بندورة باللحمة",
        nameEn: "Galayet Bandora with Meat",
        category: "ar-hot-mezze",
        price: "",
        status: "active",
        desc: "قلاية بندورة طازجة مع قطع اللحم والبهارات",
        descEn: "Fresh tomato fry with meat chunks and spices",
        image: ""
    },
    {
        name: "مفركة بطاطا",
        nameEn: "Potato Mafraka",
        category: "ar-hot-mezze",
        price: "",
        status: "active",
        desc: "مكعبات بطاطا مقلية مع البيض والبهارات",
        descEn: "Sautéed potato cubes with eggs and spices",
        image: ""
    },
    {
        name: "حمص لحمة وصنوبر",
        nameEn: "Hummus with Meat & Pine",
        category: "ar-hot-mezze",
        price: "",
        status: "active",
        desc: "حمص بالطحينة يعلوه اللحم المقلي والصنوبر المحمص",
        descEn: "Creamy hummus topped with sautéed meat and roasted pine nuts",
        image: ""
    }
];

async function addItems() {
    for (const item of itemsToAdd) {
        const data = JSON.stringify(item);
        const options = {
            hostname: 'tallow-ahbabna-default-rtdb.firebaseio.com',
            path: '/menu_items.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                res.on('data', () => {});
                res.on('end', () => {
                    console.log(`Added: ${item.name}`);
                    resolve();
                });
            });
            req.on('error', (e) => reject(e));
            req.write(data);
            req.end();
        });
    }
    console.log("All items added successfully!");
}

addItems();
