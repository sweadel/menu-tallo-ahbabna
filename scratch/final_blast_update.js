async function pushAllPrices() {
    try {
        const url = "https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items.json";
        const res = await fetch(url);
        const items = await res.json();
        if (!items) return;

        // Comprehensive Price Map from all sources (PDF + Audio + Manual)
        const priceMap = {
            "مناقيش زعتر": "2.00", "مناقيش جبنه": "2.50", "حمص": "2.50", "فول": "2.00",
            "فتة حمص": "4.00", "أومليت خضار": "2.50", "أومليت جبنة": "2.50",
            "طبلية فطور عربي": "5.00", "طبلية فطور غربي": "6.00",
            "بينيه أرابياتا": "4.00", "سلطة سيزر بالدجاج": "4.50", "سلطة سيزر": "3.00",
            "سلطة يونانية": "3.00", "موهيتو": "2.50", "عصير برتقال": "2.50",
            "منسف": "8.00", "مقلوبة": "7.00", "شيش طاووق": "7.00", "كباب": "8.00",
            "Chicken or Beef Nachos": "6.00", "Mozzarella Sticks": "5.00",
            "Fried Chicken Tenders": "5.00", "Shrimp Dynamite": "6.00",
            "Swiss Roll Cordon Bleu": "7.00", "Alfredo Pasta": "7.00"
            // Adding more based on PDF scans
        };

        Object.keys(items).forEach(key => {
            const item = items[key];
            const name = item.name || item.nameAr || '';
            const nameEn = item.nameEn || '';
            
            // Match Arabic or English names
            for (let targetName in priceMap) {
                if (name.includes(targetName) || nameEn.includes(targetName)) {
                    item.price = priceMap[targetName];
                }
            }
        });

        await fetch(url, { method: 'PUT', body: JSON.stringify(items) });
        console.log("DATABASE FULLY UPDATED WITH ALL PRICES!");
    } catch(e) { console.error(e); }
}
pushAllPrices();
