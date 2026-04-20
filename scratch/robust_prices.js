async function robustUpdate() {
    try {
        const url = "https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items.json";
        const res = await fetch(url);
        const items = await res.json();
        if (!items) return;

        Object.keys(items).forEach(key => {
            const name = items[key].name || "";
            if (name.includes("مناقيش زعتر") || name === "زعتر") items[key].price = "2.00";
            if (name.includes("مناقيش جبنه") || name === "جبنه") items[key].price = "2.50";
            if (name.includes("حمص")) items[key].price = "2.50";
        });

        const putRes = await fetch(url, {
            method: 'PUT',
            body: JSON.stringify(items)
        });
        
        if (putRes.ok) {
            console.log("Successfully updated prices with robust matching.");
            // Verification step immediately
            const check = await (await fetch(url)).json();
            Object.values(check).forEach(it => {
                if(it.price) console.log(`Verified: ${it.name} -> ${it.price}`);
            });
        }
    } catch(e) { console.error(e); }
}
robustUpdate();
