async function deepSearchLogs() {
    try {
        console.log("Starting deep search in audit logs...");
        const res = await fetch("https://tallow-ahbabna-default-rtdb.firebaseio.com/audit_logs.json");
        const logs = await res.json();
        if (!logs) return;

        const masterPriceList = {};
        
        // Search through all historically logged updates to find the highest number of prices
        Object.values(logs).forEach(log => {
            if (log.snapshot && log.snapshot.price) {
                // If the log was an item snapshot, we take the price
                const name = log.snapshot.name || (log.details ? log.details.match(/اسم الصنف:\s*(.*)/)?.[1] : "");
                if (name && !masterPriceList[name]) {
                    masterPriceList[name] = log.snapshot.price;
                }
            } else if (log.action === 'تعديل صنف' && log.details) {
                // Try parsing details string if snapshot is missing
                // Example: "تعديل سعر: 2.50"
                const priceMatch = log.details.match(/سعر:\s*([\d.]+)/);
                const nameMatch = log.details.match(/اسم الصنف:\s*(.*)/);
                if (priceMatch && nameMatch) {
                    masterPriceList[nameMatch[1].trim()] = priceMatch[1];
                }
            }
        });

        const count = Object.keys(masterPriceList).length;
        console.log(`Deep search complete. Found ${count} historical prices.`);
        if (count > 0) {
            console.log("SAMPLE RECOVERED DATA:");
            console.log(JSON.stringify(masterPriceList, null, 2));
            
            // Now apply them back to the database!
            const itemsRes = await fetch("https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items.json");
            const currentItems = await itemsRes.json();
            
            Object.keys(currentItems).forEach(key => {
                const name = currentItems[key].name;
                if (masterPriceList[name]) {
                    currentItems[key].price = masterPriceList[name];
                }
            });
            
            await fetch("https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items.json", {
                method: 'PUT',
                body: JSON.stringify(currentItems)
            });
            console.log("RECOVERY APPLIED TO LIVE DATABASE!");
        }
    } catch(e) { console.error(e); }
}
deepSearchLogs();
