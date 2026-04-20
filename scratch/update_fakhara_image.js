/**
 * update_fakhara_image.js
 * Updates the image URL for 'فخارة لحمة' in Firebase.
 */
async function updateImage() {
    try {
        const url = "https://tallow-ahbabna-default-rtdb.firebaseio.com/menu_items.json";
        const res = await fetch(url);
        const items = await res.json();
        if (!items) return;

        Object.keys(items).forEach(key => {
            if (items[key].name === "فخارة لحمة") {
                items[key].image = "images/fakhara-lahma.jpg";
                console.log(`✅ Found 'فخارة لحمة', updating image...`);
            }
        });

        await fetch(url, {
            method: 'PUT',
            body: JSON.stringify(items)
        });
        console.log("✅ Database updated with new image path.");
    } catch(e) { console.error(e); }
}
updateImage();
