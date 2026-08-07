const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const products = await mongoose.connection.collection('products').find({ featured: true }).toArray();
    console.log(`Found ${products.length} featured products.`);
    products.forEach(p => console.log(p.name?.es || 'Unknown', p.featured));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
