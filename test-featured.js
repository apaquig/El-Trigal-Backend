const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://apaquig:APPGappg1900@eltrigal.ksvpusz.mongodb.net/')
  .then(async () => {
    const Product = mongoose.model('Product', new mongoose.Schema({ featured: Boolean }), 'products');
    const count = await Product.countDocuments({ featured: true });
    console.log('FEATURED COUNT:', count);
    const featured = await Product.find({ featured: true }).select('name.es').lean();
    console.log(featured);
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
