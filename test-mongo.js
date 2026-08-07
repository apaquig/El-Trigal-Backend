const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://apaquig:APPGappg1900@eltrigal.ksvpusz.mongodb.net/')
  .then(() => console.log('CONNECTED!'))
  .catch(err => console.error('FAILED:', err.message));
