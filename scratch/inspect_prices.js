/**
 * inspect_prices.js
 * يجلب كل الأصناف ويطبع الأسماء والأسعار لمعرفة الوضع الحالي
 */
async function inspectPrices() {
    try {
        const res = await fetch("https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items.json");
        const items = await res.json();
        
        if (!items) {
            console.log("No items found in DB!");
            return;
        }

        const allItems = Object.entries(items);
        console.log(`Total items: ${allItems.length}`);
        
        const withPrice = allItems.filter(([k, v]) => v.price && v.price !== '');
        const withoutPrice = allItems.filter(([k, v]) => !v.price || v.price === '');
        
        console.log(`\n✅ Items WITH price: ${withPrice.length}`);
        withPrice.forEach(([k, v]) => {
            console.log(`  ${v.name || v.nameAr} -> ${v.price}`);
        });
        
        console.log(`\n❌ Items WITHOUT price: ${withoutPrice.length}`);
        withoutPrice.forEach(([k, v]) => {
            console.log(`  [${k}] ${v.name || v.nameAr}`);
        });
        
    } catch(e) { 
        console.error("Error:", e.message); 
    }
}
inspectPrices();
