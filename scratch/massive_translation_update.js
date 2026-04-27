const https = require('https');

const DB_URL = 'https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items';

async function updateItem(key, data) {
    return new Promise((resolve, reject) => {
        const url = `${DB_URL}/${key}.json`;
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
    console.log('Starting massive translation update...');

    const translations = {
        // Breakfast
        "item_1776718856053_5": { "nameEn": "Tallo Ahbabna Falafel", "descEn": "Our signature crispy falafel served with tahini and fresh vegetables." },
        "item_1776718856053_8": { "nameEn": "Hummus Fatteh", "descEn": "Layers of chickpeas, toasted bread, and warm yogurt topped with ghee and nuts." },
        
        // Iced Drinks
        "item_1776718856053_100": { "nameEn": "Iced Americano", "descEn": "Chilled espresso diluted with water over ice." },
        "item_1776718856053_101": { "nameEn": "Iced Latte", "descEn": "Espresso combined with chilled milk and ice." },
        "item_1776718856053_102": { "nameEn": "Iced Spanish Latte", "descEn": "Espresso mixed with condensed milk and chilled milk over ice." },
        "item_1776718856053_103": { "nameEn": "Iced Mocha", "descEn": "Rich espresso with chocolate sauce and chilled milk over ice." },
        
        // Mojito & Iced Tea
        "item_1776718856053_104": { "nameEn": "Lemon Iced Tea", "descEn": "Refreshing chilled tea with fresh lemon flavor." },
        "item_1776718856053_105": { "nameEn": "Peach Iced Tea", "descEn": "Refreshing chilled tea with sweet peach flavor." },
        "item_1776718856053_106": { "nameEn": "Passion Fruit Iced Tea", "descEn": "Exotic chilled tea with tropical passion fruit flavor." },
        "item_1776718856053_107": { "nameEn": "Blue Curacao Mojito", "descEn": "Sparkling mojito with blue curacao and fresh mint." },
        "item_1776718856053_108": { "nameEn": "Pomegranate Mojito", "descEn": "Sparkling mojito with fresh pomegranate juice and mint." },
        "item_1776718856053_110": { "nameEn": "Mango & Passion Fruit Mojito", "descEn": "Tropical mojito blend of mango and passion fruit." },
        
        // Hot Drinks
        "item_1776718856053_111": { "nameEn": "Turkish Coffee", "descEn": "Traditional finely ground roasted coffee beans." },
        "item_1776718856053_112": { "nameEn": "Double Turkish Coffee", "descEn": "A strong double serving of traditional Turkish coffee." },
        "item_1776718856053_113": { "nameEn": "Double Espresso", "descEn": "Two shots of rich, concentrated coffee." },
        "item_1776718856053_114": { "nameEn": "Americano", "descEn": "Espresso shots topped with hot water for a smooth coffee." },
        "item_1776718856053_115": { "nameEn": "Nescafe with Milk", "descEn": "Instant coffee prepared with warm creamy milk." },
        "item_1776718856053_116": { "nameEn": "Cafe Latte", "descEn": "Espresso topped with steamed milk and a thin layer of foam." },
        "item_1776718856053_117": { "nameEn": "Cappuccino", "descEn": "Equal parts espresso, steamed milk, and rich milk foam." },
        "item_1776718856053_118": { "nameEn": "Caffe Mocha", "descEn": "Espresso blended with chocolate sauce and steamed milk." },
        "item_1776718856053_119": { "nameEn": "White Mocha", "descEn": "Espresso blended with white chocolate sauce and steamed milk." },
        "item_1776718856053_120": { "nameEn": "Hot Chocolate", "descEn": "Rich cocoa blended with hot creamy milk." },
        "item_1776718856053_121": { "nameEn": "Spanish Latte", "descEn": "Sweet and creamy espresso with condensed milk." },
        "item_1776718856053_122": { "nameEn": "Tea", "descEn": "Premium hot tea, served with mint or sage upon request." },
        
        // Cold Drinks & Smoothies
        "item_1776718856053_124": { "nameEn": "Mineral Water", "descEn": "Pure chilled mineral water." },
        "item_1776718856053_125": { "nameEn": "Sparkling Water", "descEn": "Refreshing carbonated mineral water." },
        "item_1776718856053_126": { "nameEn": "Soft Drinks", "descEn": "Selection of carbonated beverages (Pepsi, 7-Up, Mirinda)." },
        "item_1776718856053_127": { "nameEn": "Red Bull", "descEn": "Energy drink to give you wings." },
        "item_1776718856053_128": { "nameEn": "Lemon Bitters", "descEn": "A refreshing citrus blend with a hint of bitterness." },
        "item_1776718856053_129": { "nameEn": "Soda Water", "descEn": "Pure carbonated water." },
        "item_1776718856053_130": { "nameEn": "Strawberry Smoothie", "descEn": "Chilled blended fresh strawberries." },
        "item_1776718856053_131": { "nameEn": "Kiwi Smoothie", "descEn": "Chilled blended fresh kiwi." },
        "item_1776718856053_132": { "nameEn": "Passion Fruit Smoothie", "descEn": "Tropical blended passion fruit smoothie." },
        "item_1776718856053_133": { "nameEn": "Fresh Orange Juice", "descEn": "Pure squeezed fresh orange juice." },
        "item_1776718856053_134": { "nameEn": "Fresh Lemonade", "descEn": "Refreshing squeezed lemon with mint." },
        
        // Cold Mezze
        "item_1776718856053_50": { "nameEn": "Signature Labneh", "descEn": "Creamy traditional strained yogurt topped with olive oil and zaatar." },
        "item_1776718856053_52": { "nameEn": "House Pickles", "descEn": "Selection of home-made pickles and olives." },
        "item_1776718856053_53": { "nameEn": "Mezze / Veggie Plate", "descEn": "Assorted fresh seasonal vegetables and traditional mezze." },
        
        // Argileh
        "item_1776718856053_94": { "nameEn": "Lemon Mint Mazaya", "descEn": "Premium Mazaya shisha flavor: Refreshing lemon and mint." },
        "item_1776718856053_95": { "nameEn": "Two Apples Mazaya", "descEn": "Classic Two Apples Mazaya shisha flavor." },
        "item_1776718856053_96": { "nameEn": "Gum & Cinnamon Mazaya", "descEn": "Unique blend of gum and cinnamon flavor." },
        "item_1776718856053_97": { "nameEn": "Candy Flavor", "descEn": "Sweet and fruity candy shisha flavor." },
        "item_1776718856053_98": { "nameEn": "Watermelon Mint Mazaya", "descEn": "Refreshing watermelon and mint Mazaya flavor." },
        "item_1776718856053_99": { "nameEn": "Two Apples Nakhla", "descEn": "The original premium Two Apples Nakhla shisha." },
        
        // Pizza (Fixing names)
        "item_1776718856053_86": { "nameEn": "Margherita Pizza", "descEn": "Handmade dough topped with tomato sauce, mozzarella, and fresh basil." },
        "item_1776718856053_87": { "nameEn": "Veggie Pizza", "descEn": "Handmade dough with mushroom, peppers, olives, and mozzarella." },
        "item_1776718856053_88": { "nameEn": "Alfredo Pizza", "descEn": "Handmade dough with grilled chicken, mushroom, and creamy Alfredo sauce." },
        "item_1776718856053_89": { "nameEn": "Pepperoni Pizza", "descEn": "Handmade dough with tomato sauce, mozzarella, and beef pepperoni." },
        "item_1776718856053_90": { "nameEn": "BBQ Chicken Pizza", "descEn": "Handmade dough with zinger chicken, bell peppers, and BBQ sauce." }
    };

    for (const [key, data] of Object.entries(translations)) {
        await updateItem(key, data);
        console.log(`Updated translation for: ${key}`);
    }

    console.log('Massive translation update completed.');
}

run();
