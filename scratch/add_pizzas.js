const https = require('https');

const DB_URL = 'https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items';

async function addItem(key, data) {
    return new Promise((resolve, reject) => {
        const url = `${DB_URL}/${key}.json`;
        const body = JSON.stringify(data);
        const options = {
            method: 'PUT',
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
    console.log('Adding Pizzas...');
    
    const pizzas = {
        "item_pizza_margarita": {
            "name": "بيتزا مارغريتا",
            "nameEn": "Pizza Margherita",
            "category": "in-pizza",
            "price": "4.00",
            "status": "active",
            "image": "images/tallo-logo.png",
            "desc": "صلصة طماطم، جبنة موزاريلا وريحان.",
            "descEn": "Tomato sauce, mozzarella cheese and basil."
        },
        "item_pizza_pepperoni": {
            "name": "بيتزا ببروني",
            "nameEn": "Pizza Pepperoni",
            "category": "in-pizza",
            "price": "5.00",
            "status": "active",
            "image": "images/tallo-logo.png",
            "desc": "صلصة طماطم، جبنة موزاريلا وشرائح ببروني.",
            "descEn": "Tomato sauce, mozzarella and pepperoni slices."
        },
        "item_pizza_veggie": {
            "name": "بيتزا خضار",
            "nameEn": "Veggie Pizza",
            "category": "in-pizza",
            "price": "4.50",
            "status": "active",
            "image": "images/tallo-logo.png",
            "desc": "فلفل، فطر، زيتون، بصل وجبنة.",
            "descEn": "Peppers, mushrooms, olives, onions and cheese."
        },
        "item_pizza_bbq": {
            "name": "بيتزا دجاج باربيكيو",
            "nameEn": "BBQ Chicken Pizza",
            "category": "in-pizza",
            "price": "5.50",
            "status": "active",
            "image": "images/tallo-logo.png",
            "desc": "قطع دجاج، صوص باربيكيو وبصل.",
            "descEn": "Grilled chicken, BBQ sauce and onions."
        },
        "item_pizza_tallo": {
            "name": "بيتزا طلو حبابنا المميزة",
            "nameEn": "Tallo Signature Pizza",
            "category": "in-pizza",
            "price": "6.00",
            "status": "active",
            "image": "images/tallo-logo.png",
            "desc": "خلطتنا السرية من الأجبان والمكونات الطازجة.",
            "descEn": "Our secret blend of premium cheeses and fresh toppings."
        }
    };

    const updates = Object.entries(pizzas).map(([k, v]) => addItem(k, v));
    await Promise.all(updates);
    
    console.log('Pizzas added successfully.');
}

run();
