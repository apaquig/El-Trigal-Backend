const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://apaquig:APPGappg1900@eltrigal.ksvpusz.mongodb.net/')
  .then(async () => {
    const Product = mongoose.model('Product', new mongoose.Schema({ featured: Boolean, name: Object }, { strict: false }), 'products');
    
    // get the one featured product
    let prod = await Product.findOne({ featured: true });
    console.log('Original featured:', prod.name.es, prod.featured);
    
    // unfeature it
    prod.featured = false;
    await prod.save();
    console.log('Unfeatured it.');
    
    prod = await Product.findById(prod._id);
    console.log('Reloaded featured:', prod.featured);
    
    // feature it again
    prod.featured = true;
    await prod.save();
    console.log('Featured it again.');

    prod = await Product.findById(prod._id);
    console.log('Reloaded featured:', prod.featured);

    process.exit(0);
  })
  .catch(err => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
