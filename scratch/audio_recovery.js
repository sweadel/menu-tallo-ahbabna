async function audioPriceUpdate() {
    try {
        const url = "https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items.json";
        const res = await fetch(url);
        const items = await res.json();
        if (!items) return;

        const prices = {
            "مناقيش زعتر": "2.00",
            "مناقيش جبنه": "2.50",
            "مناقيش جبنه وزعتر": "2.50",
            "حمص": "2.50",
            "فول": "2.00",
            "فلافل طلوا حبايبنا": "2.00",
            "فلافل": "2.00",
            "أومليت خضار": "2.50",
            "أومليت جبنة": "2.50",
            "فتة حمص": "4.00",
            "فتة باذنجان ومكدوس": "4.00",
            "أوفو فورنو": "4.00",
            "هاش براون": "1.50",
            "طبلية فطور عربي": "5.00",
            "طبلية فطور غربي": "6.00"
        };

        Object.keys(items).forEach(key => {
            const name = items[key].name;
            if (prices[name]) {
                items[key].price = prices[name];
                console.log(`Updated: ${name} -> ${prices[name]}`);
            } else {
                // Try fuzzy match for names that might have slight differences
                for (let pName in prices) {
                    if (name.includes(pName) || pName.includes(name)) {
                        items[key].price = prices[pName];
                        console.log(`Fuzzy Updated: ${name} -> ${prices[pName]}`);
                        break;
                    }
                }
            }
        });

        await fetch(url, {
            method: 'PUT',
            body: JSON.stringify(items)
        });
        console.log("Audio update complete!");
    } catch(e) { console.error(e); }
}
audioPriceUpdate();
