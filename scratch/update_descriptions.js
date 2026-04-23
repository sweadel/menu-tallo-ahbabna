const https = require('https');

const updates = [
  { name: "طبليه فطور عربي", nameEn: "Arabic Breakfast Tray", desc: "تشكيلة من الأجبان، الزيتون، اللبنة، الحمص، الفول، والبيض المقلي، تُقدم مع الخبز الطازج والخضروات.", descEn: "A selection of cheeses, olives, labneh, hummus, foul, and fried eggs, served with fresh bread and vegetables." },
  { name: "طبليه فطور غربي", nameEn: "Western Breakfast Tray", desc: "بيض (حسب الطلب)، نقانق، فاصوليا مطبوخة، هاش براون، زبدة ومربى، تُقدم مع توست محمص.", descEn: "Eggs (your way), sausages, baked beans, hash browns, butter, and jam, served with toasted bread." },
  { name: "مناقيش زعتر", nameEn: "Zaatar Manakish", desc: "زعتر بلدي فاخر مع زيت زيتون.", descEn: "Premium local thyme with olive oil." },
  { name: "مناقيش جبنه", nameEn: "Cheese Manakish", desc: "مزيج من الأجبان الذائبة (عكاوي وقشقوان).", descEn: "A blend of melted cheeses (Akkawi & Kashkaval)." },
  { name: "مناقيش جبنه وزعتر", nameEn: "Cheese & Zaatar Manakish", desc: "مزيج من الأجبان والزعتر.", descEn: "A mix of cheeses and thyme." },
  { name: "حمص", nameEn: "Hummus", desc: "حمص بطحينة مع زيت زيتون.", descEn: "Chickpeas with tahini and olive oil." },
  { name: "فول", nameEn: "Foul", desc: "فول مدمس بالثوم والليمون.", descEn: "Fava beans with garlic and lemon." },
  { name: "اوفو الفورنو", nameEn: "Uovo al Forno", desc: "بيض مخبوز بالفرن مع صلصة الطماطم.", descEn: "Oven-baked eggs with tomato sauce." },
  { name: "فلافل طلوا حبابنا", nameEn: "Signature Falafel", desc: "", descEn: "" },
  { name: "صحن فلافل", nameEn: "Falafel Plate", desc: "حبات فلافل مع طحينة وخضروات.", descEn: "Falafel pieces with tahini and vegetables." },
  { name: "فتة حمص", nameEn: "Hummus Fatteh", desc: "خبز محمص، حمص حب، لبن وطحينة ومكسرات.", descEn: "Toasted bread, chickpeas, yogurt, tahini and nuts." },
  { name: "فتة باذنجان مقدوس", nameEn: "Makdous Eggplant Fatteh", desc: "باذنجان مقدوس مع لبن وخبز محمص.", descEn: "Makdous eggplant with yogurt and toasted bread." },
  { name: "اومليت خضار", nameEn: "Veggie Omelette", desc: "بيض مع فلفل ألوان وبصل وطماطم.", descEn: "Eggs with bell peppers, onions and tomatoes." },
  { name: "اومليت جبنه", nameEn: "Cheese Omelette", desc: "بيض محشو بالأجبان.", descEn: "Eggs stuffed with cheeses." },
  { name: "هاش براون", nameEn: "Hash Browns", desc: "أصابع بطاطا مقلية مقرمشة.", descEn: "Crispy fried potato patties." },
  { name: "قلاية بندورة", nameEn: "Tomato Skillet", desc: "طماطم مع ثوم وفلفل حار وزيت زيتون.", descEn: "Tomatoes with garlic, chili and olive oil." },
  { name: "قلاية بندورة باللحمة", nameEn: "Tomato Skillet with Meat", desc: "طماطم ولحم مفروم مع بهارات.", descEn: "Tomatoes and minced meat with spices." },
  { name: "مفركة بطاطا", nameEn: "Potato Mafrakah", desc: "بطاطا مطبوخة مع بيض.", descEn: "Potatoes cooked with eggs." },
  { name: "حمص لحمة وصنوبر", nameEn: "Hummus with Meat & Pine", desc: "حمص مغطى باللحم والصنوبر.", descEn: "Hummus topped with meat and pine nuts." },
  { name: "كبه مقليه", nameEn: "Fried Kibbeh", desc: "برغل ولحم محشو باللحم المفروم والبصل.", descEn: "Bulgur and meat stuffed with minced meat and onions." },
  { name: "كبه مشويه", nameEn: "Grilled Kibbeh", desc: "كبه مشوية على الفحم.", descEn: "Charcoal grilled kibbeh." },
  { name: "سمبوسك", nameEn: "Sambousek", desc: "معجنات محشوة بالجبنة أو اللحمة.", descEn: "Pastries stuffed with cheese or meat." },
  { name: "فطر طلو احبابنا", nameEn: "Signature Mushroom", desc: "", descEn: "" },
  { name: "كبدة", nameEn: "Liver", desc: "كبدة مطبوخة مع البصل والبهارات.", descEn: "Liver cooked with onions and spices." },
  { name: "جوانح مشويه او مطفا بالثوم و الليمون", nameEn: "Grilled / Lemon Garlic Wings", desc: "أجنحة دجاج مشوية أو مطفأة بالثوم والليمون.", descEn: "Grilled chicken wings or tossed with garlic and lemon." },
  { name: "بطاطا حاره", nameEn: "Batata Harra", desc: "مكعبات بطاطا مقلية بالثوم والكزبرة.", descEn: "Fried potato cubes with garlic and coriander." },
  { name: "التبولة العربية", nameEn: "Arabic Tabbouleh", desc: "بقدونس، بندورة، برغل، نعنع، زيت وحامض.", descEn: "Parsley, tomatoes, bulgur, mint, oil and lemon." },
  { name: "تبولة رمان بدون برغل", nameEn: "Pomegranate Tabbouleh", desc: "رمان ودبس رمان بدون برغل.", descEn: "Pomegranate and molasses without bulgur." },
  { name: "فتوش طلوا حبابنا", nameEn: "Signature Fattoush", desc: "خضروات مشكلة، خبز محمص، سماق ودبس رمان.", descEn: "Mixed vegetables, toasted bread, sumac and molasses." },
  { name: "سلطة بالطحينيه", nameEn: "Tahini Salad", desc: "خضروات مع صوص الطحينة.", descEn: "Vegetables with tahini sauce." },
  { name: "سلطة باذنجان", nameEn: "Eggplant Salad", desc: "باذنجان مع خضروات ودبس رمان.", descEn: "Eggplant with vegetables and molasses." },
  { name: "حمص بيروتي", nameEn: "Beiruti Hummus", desc: "حمص مع ثوم وبقدونس.", descEn: "Hummus with garlic and parsley." },
  { name: "حمص صنوبر", nameEn: "Hummus Pine Nuts", desc: "حمص مزين بالصنوبر.", descEn: "Hummus garnished with pine nuts." },
  { name: "حمص حار", nameEn: "Spicy Hummus", desc: "حمص مع شطة حارة.", descEn: "Hummus with spicy chili." },
  { name: "متبل باذنجان", nameEn: "Eggplant Mutabbal", desc: "باذنجان مشوي مع طحينة وثوم.", descEn: "Roasted eggplant with tahini and garlic." },
  { name: "بابا غنوج", nameEn: "Baba Ghanoush", desc: "باذنجان مشوي مع فلفل وبصل وبندورة وجوز.", descEn: "Roasted eggplant with peppers, onions, tomatoes and walnuts." },
  { name: "لبنه مع ورق الزعتر", nameEn: "Labneh with Thyme", desc: "لبنه مغطاة بورق الزعتر والزيت.", descEn: "Labneh topped with thyme leaves and oil." },
  { name: "لبنة طلو حبابنا", nameEn: "Signature Labneh", desc: "", descEn: "" },
  { name: "محمره", nameEn: "Muhammara", desc: "فلفل أحمر وجوز ودبس رمان.", descEn: "Red pepper, walnuts and molasses." },
  { name: "شنكليش مخلوط", nameEn: "Mixed Shanklish", desc: "جبن مع بندورة وبصل وزيت.", descEn: "Cheese with tomatoes, onions and oil." },
  { name: "روكيلا حلوم مشوي", nameEn: "Grilled Halloumi Rocket", desc: "جرجير مع جبنة حلوم مشوية.", descEn: "Rocket with grilled halloumi cheese." },
  { name: "مخللات مطعمنا", nameEn: "House Pickles", desc: "", descEn: "" },
  { name: "صحن مزه / خضار مشكله", nameEn: "Mezze / Veggie Plate", desc: "", descEn: "" },
  { name: "مشاوي مشكل", nameEn: "Mixed Grill", desc: "كباب، شيش طاووق، وشقف.", descEn: "Kabab, Shish Taouk and meat cubes." },
  { name: "كباب حلبي", nameEn: "Halabi Kabab", desc: "لحم مفروم متبل بالبهارات الحلبية.", descEn: "Minced meat with Aleppo spices." },
  { name: "کباب خشخاش", nameEn: "Khashkhash Kabab", desc: "كباب مع صلصة البندورة الحارة والثوم.", descEn: "Grilled kabab with spicy tomato sauce and garlic." },
  { name: "شقف", nameEn: "Meat Cubes (Shkaf)", desc: "قطع لحم غنم مشوية.", descEn: "Grilled lamb cubes." },
  { name: "شيش طاووق", nameEn: "Shish Taouk", desc: "قطع صدر دجاج متبلة بالثوم والليمون.", descEn: "Marinated chicken breast cubes." },
  { name: "ریش مشويه", nameEn: "Grilled Lamb Chops", desc: "ريش غنم متبلة بخلطة جاردينيا.", descEn: "Marinated lamb chops with Gardenia blend." },
  { name: "دجاج  مشوي مع بطاطة ( نص دجاجة )", nameEn: "Half Grilled Chicken", desc: "نصف دجاجة مشوية مع بطاطا وثومية.", descEn: "Half grilled chicken with fries and garlic sauce." },
  { name: "دجاج بالزعتر مع بطاطا ( نص دجاجة )", nameEn: "Half Thyme Chicken", desc: "نصف دجاجة بالزعتر مع بطاطا.", descEn: "Half chicken with thyme and fries." },
  { name: "منسف بلدي", nameEn: "Traditional Mansaf", desc: "لحم غنم، جميد كركي، سمن، أرز ولوز.", descEn: "Lamb, Jameed sauce, ghee, rice and nuts." },
  { name: "مسخن الدجاج", nameEn: "Chicken Musakhan", desc: "دجاج مع بصل وسماق وزيت زيتون وخبز طازج.", descEn: "Chicken with onion, sumac, olive oil and fresh bread." },
  { name: "صنية دجاج بالاعشاب والبطاطا", nameEn: "Herbal Chicken Tray", desc: "دجاج وبطاطا مطبوخة بالأعشاب.", descEn: "Chicken and potatoes cooked with herbs." },
  { name: "كفته بالبندورة أو الطحينية أو الجميد", nameEn: "Kofta (Tomato / Tahini / Jameed)", desc: "كفتة مطبوخة بصلصة البندورة أو الطحينة أو الجميد الكركي.", descEn: "Kofta cooked in tomato, tahini or Jameed sauce." },
  { name: "فخارة الدجاج", nameEn: "Chicken Clay Pot", desc: "دجاج وخضروات مطبوخة في فخارة.", descEn: "Chicken and vegetables cooked in clay pot." },
  { name: "فخارة لحمة", nameEn: "Meat Clay Pot", desc: "لحم وخضروات مطبوخة في فخارة.", descEn: "Meat and vegetables cooked in clay pot." },
  { name: "سويس رول كوردون بلو", nameEn: "Cordon Bleu Roll", desc: "دجاج محشو بالجبن والتركي مقلي ومقرمش.", descEn: "Fried chicken stuffed with cheese and turkey." },
  { name: "دجاج بالليمون والاعشاب", nameEn: "Lemon Herb Chicken", desc: "صدور دجاج بصوص الليمون والأعشاب المنعش.", descEn: "Chicken breast with fresh lemon herb sauce." },
  { name: "بولو الفريدو", nameEn: "Pollo Alfredo", desc: "دجاج مشوي مع صوص الكريمة والفطر الطازج.", descEn: "Grilled chicken with creamy mushroom sauce." },
  { name: "بيبر ستيك", nameEn: "Pepper Steak", desc: "ستيك بصوص الفلفل الأسود والبطاطا.", descEn: "Steak with black pepper sauce and fries." },
  { name: "ماشروم ستيك", nameEn: "Mushroom Steak", desc: "ستيك بصوص الفطر الكريمي والبطاطا.", descEn: "Steak with creamy mushroom sauce and fries." },
  { name: "هامور ستيك المشوي", nameEn: "Grilled Hamour Steak", desc: "فيليه هامور مشوي مع خضار سوتيه.", descEn: "Grilled Hamour fillet with sautéed vegetables." },
  { name: "ستيك السمك المقلي", nameEn: "Fried Fish Steak", desc: "فيليه سمك مقلي مع بطاطا مقلية.", descEn: "Fried fish fillet with fries." },
  { name: "رويال سالمون", nameEn: "Royal Salmon", desc: "سالمون مشوي مع صوص خاص وخضار سوتيه.", descEn: "Grilled salmon with special sauce and veggies." },
  { name: "انجوس تشيز برغر", nameEn: "Angus Cheese Burger", desc: "لحم أنجوس، جبنة شيدر وبطاطا.", descEn: "Angus beef, cheddar and fries." },
  { name: "باربيكيو فرايد تشكن برغر", nameEn: "BBQ Chicken Burger", desc: "دجاج مقلي مقرمش مع صوص باربيكيو.", descEn: "Crispy fried chicken with BBQ sauce." },
  { name: "تشكن سيزر ساندويش", nameEn: "Chicken Caesar Sandwich", desc: "دجاج، صوص سيزر، بارميزان في خبز خاص.", descEn: "Chicken, Caesar sauce and parmesan." },
  { name: "جريل حلوم الابيستو ساندويش", nameEn: "Grilled Halloumi Pesto", desc: "حلوم مشوي مع صوص بيستو وجرجير.", descEn: "Grilled halloumi with pesto sauce and rocket." },
  { name: "ستيك سانويش", nameEn: "Steak Sandwich", desc: "شرائح ستيك، بصل، فطر وجبنة ذائبة.", descEn: "Steak strips, onion, mushroom and cheese." },
  { name: "ساندوش شاورما دجاج", nameEn: "Chicken Shawarma Sandwich", desc: "شاورما دجاج، ثوم، مخلل وخبز شراك.", descEn: "Chicken shawarma, garlic, pickles and bread." },
  { name: "ساندوش شاورما لحمه", nameEn: "Meat Shawarma Sandwich", desc: "شاورما لحم، بقدونس، بصل وطحينة.", descEn: "Meat shawarma, parsley, onion and tahini." },
  { name: "بيتزا مارجاريتار", nameEn: "Pizza Margherita", desc: "صوص طماطم، موزاريلا وريحان.", descEn: "Tomato sauce, mozzarella and basil." },
  { name: "بيتزا الخضار", nameEn: "Veggie Pizza", desc: "فطر، فلفل، زيتون وموزاريلا.", descEn: "Mushroom, pepper, olives and cheese." },
  { name: "بيتزا الفريدو", nameEn: "Alfredo Pizza", desc: "دجاج، فطر، صوص الفريدو وموزاريلا.", descEn: "Chicken, mushroom and Alfredo sauce." },
  { name: "بيتزا بيبروني", nameEn: "Pepperoni Pizza", desc: "صوص طماطم، موزاريلا وبيبروني بقري.", descEn: "Tomato sauce, mozzarella and pepperoni." },
  { name: "بيتزا زنجر (باربيكيو)", nameEn: "Zinger BBQ Pizza", desc: "دجاج زنجر، فلفل وصوص باربيكيو.", descEn: "Zinger chicken and BBQ sauce." },
  { name: "تشكن او بيف ناتشوز", nameEn: "Chicken / Beef Nachos", desc: "رقائق ناتشوز، جبنة، سالسا وهالابينو.", descEn: "Nachos chips, cheese, salsa and jalapeno." },
  { name: "موزريلا ستيكس", nameEn: "Mozzarella Sticks", desc: "أصابع جبنة موزاريلا مقلية مع صوص.", descEn: "Fried mozzarella sticks with sauce." },
  { name: "فرايد تشكن تندر", nameEn: "Fried Chicken Tenders", desc: "قطع دجاج مقلية مقرمشة مع صوص خاص.", descEn: "Crispy chicken strips with special sauce." },
  { name: "شرم دايناميت", nameEn: "Dynamite Shrimp", desc: "روبيان مقلي بصوص دايناميت الحار.", descEn: "Fried shrimp with spicy dynamite sauce." },
  { name: "بونلس تشكن", nameEn: "Boneless Chicken", desc: "قطع دجاج بدون عظم مقلية.", descEn: "Fried boneless chicken pieces." },
  { name: "بطاطا ودجز", nameEn: "Potato Wedges", desc: "بطاطا ودجز متبلة ومخبوزة.", descEn: "Seasoned potato wedges." },
  { name: "بطاطا فرايز", nameEn: "French Fries", desc: "بطاطا مقلية مقرمشة.", descEn: "Fried potato fries." },
  { name: "سلطة سيزر بالدجاج", nameEn: "Chicken Caesar Salad", desc: "خس، صوص سيزر، دجاج مشوي وخبز.", descEn: "Lettuce, Caesar sauce, chicken & croutons." },
  { name: "سلطة السيزر", nameEn: "Caesar Salad", desc: "خس، صوص سيزر، بارميزان وكرتونز.", descEn: "Lettuce, Caesar sauce and parmesan." },
  { name: "سلطة يونانيه", nameEn: "Greek Salad", desc: "خيار، طماطم، زيتون، فلفل وجبنة فيتا.", descEn: "Cucumber, tomato, olives & feta cheese." },
  { name: "سلطة الكبريزه اليونانيه", nameEn: "Caprese Salad", desc: "موزاريلا طازجة، طماطم وريحان.", descEn: "Fresh mozzarella, tomato and basil." },
  { name: "المانجو شرم سالاد", nameEn: "Mango Shrimp Salad", desc: "روبيان، مانجو، خضروات وصوص خاص.", descEn: "Shrimp, mango, vegetables and sauce." },
  { name: "السلطة الكراب", nameEn: "Crab Salad", desc: "أصابع سلطعون، خضروات ومايونيز.", descEn: "Crab sticks, veggies and mayonnaise." },
  { name: "سيتروس بيت روت سالاد", nameEn: "Citrus Beetroot Salad", desc: "شمندر وحمضيات وجرجير.", descEn: "Beetroot, citrus and rocket." },
  { name: "شوربة العدس", nameEn: "Lentil Soup", desc: "عدس مطبوخ مع كمون وليمون.", descEn: "Cooked lentils with cumin and lemon." },
  { name: "شوربة الخضار", nameEn: "Vegetable Soup", desc: "خضروات موسمية مشكلة.", descEn: "Mixed seasonal vegetables." },
  { name: "شوربة الفطر", nameEn: "Mushroom Soup", desc: "فطر مطبوخ بالكريمة والأعشاب.", descEn: "Mushroom cooked with cream and herbs." },
  { name: "كنافه", nameEn: "Kunafa", desc: "كنافة نابلسية بالجبنة والقطر.", descEn: "Nabulsi cheese Kunafa with syrup." },
  { name: "بقلاوه تركيه", nameEn: "Turkish Baklava", desc: "طبقات عجينة مقرمشة بالفستق.", descEn: "Crispy pastry layers with pistachio." },
  { name: "ام علي", nameEn: "Umm Ali", desc: "رقائق عجين بالحليب الساخن والمكسرات.", descEn: "Pastry flakes with hot milk and nuts." },
  { name: "حمص باللحمة والصنوبر", nameEn: "Hummus with Meat & Pine", desc: "حمص مغطى باللحم والصنوبر.", descEn: "Hummus topped with meat and pine nuts." },
];

async function fetchFirebase(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://tallow-ahbabna-default-rtdb.firebaseio.com${path}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function patchFirebase(path, body) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'tallow-ahbabna-default-rtdb.firebaseio.com',
      path,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log("Fetching all menu items from Firebase...");
  const items = await fetchFirebase('/menu_items.json');
  if (!items) { console.log("No items found!"); return; }

  let updated = 0, notFound = 0;

  for (const upd of updates) {
    // Find matching key by Arabic name (try both name and nameAr fields)
    const key = Object.keys(items).find(k =>
      (items[k].name && items[k].name.trim() === upd.name.trim()) ||
      (items[k].nameAr && items[k].nameAr.trim() === upd.name.trim())
    );

    if (key) {
      await patchFirebase(`/menu_items/${key}.json`, {
        nameEn: upd.nameEn,
        descAr: upd.desc,
        descEn: upd.descEn,
        desc: upd.desc
      });
      console.log(`✓ Updated: ${upd.name}`);
      updated++;
    } else {
      console.log(`✗ Not found: ${upd.name}`);
      notFound++;
    }
  }

  console.log(`\nDone! Updated: ${updated} | Not found: ${notFound}`);
}

run();
