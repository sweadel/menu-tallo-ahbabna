async function verifyDB() {
    try {
        const res = await fetch("https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items.json");
        const items = await res.json();
        console.log("Total items found:", items ? Object.keys(items).length : 0);
        
        // Find specifically the items we tried to update
        const targets = ["مناقيش زعتر", "مناقيش جبنه", "حمص"];
        Object.values(items || {}).forEach(item => {
            if (targets.includes(item.name)) {
                console.log(`Found: ${item.name} | Price: [${item.price}] | Category: ${item.category}`);
            }
        });
    } catch(e) { console.error(e); }
}
verifyDB();
