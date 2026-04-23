const https = require('https');

https.get('https://tallow-ahbabna-default-rtdb.firebaseio.com/categories_meta.json', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(data);
    });
}).on('error', (err) => {
    console.error('Error: ' + err.message);
});
