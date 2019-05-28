const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
     items: [{
          product: {type: Object, required: true},
          quantity: {type: Number, required: true},
          qtyPrice: {type: Number, required: true}
     }],
     user: {
          userIdOrder: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
          email: {type: String, required: true}
     }
});

module.exports = mongoose.model('Order', orderSchema);