const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
     email: {
          type: String,
          required: true
     },
     password: {
          type: String,
          required: true
     },
     cart: {
          items: [{
               productId: {type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true},
               quantity: {type: Number, required: true},
               qtyPrice: {type: Number, required: true}
          }]
     },
     resetToken: String,
     resetTokenExpiration: Date
});

userSchema.methods.addToCart = function(product) {
     const productIndex = this.cart.items.findIndex(item => {
          return item.productId.toString() === product._id.toString();
     });
     // const updatedCart = {...this.cart};
     if(productIndex >= 0) {
          this.cart.items[productIndex].quantity += 1;
          this.cart.items[productIndex].qtyPrice = product.price * this.cart.items[productIndex].quantity;
     } else {
          this.cart.items.push({productId: product._id, quantity: 1, qtyPrice: product.price});
     }
     // this.cart = updatedCart;
     return this.save();
}
userSchema.methods.removeFromCart = function(id) {
     const productIndex = this.cart.items.findIndex(item => {
          return item.productId.toString() === id.toString();
     });
     if(productIndex >= 0) {
          this.cart.items.splice([productIndex], 1);
     }
     return this.save();
}

userSchema.methods.clearCart = function() {
     this.cart.items = [];
     return this.save();
}

module.exports = mongoose.model('User', userSchema);


//           // CART
//      getCart() {
//           const productIds = this.cart.items.map(item => {
//                return item.productId;
//           });
//           return getDb().collection('products').find({_id: {$in: productIds}}).toArray()
//                .then(products => {
//                     // IF we delete a product from 'products' table, which we had previously added to the cart, that product will still remain in the cart -> so, we should automatically remove it from the cart
//                     if(this.cart.items.length !== products.length) {
//                          console.log("DELETED PRODUCTS DETECTED, WE'LL REMOVE THEM FROM CART!");
//                          // get only existing products (in the products table - not deleted)
//                          const this.cartItems = this.cart.items.filter(item => {
//                               return products.find(product => {
//                                    return product._id.toString() === item.productId.toString();
//                               });
//                          });
//                          // update the cart with filtered items
//                          getDb().collection('users').updateOne({_id: new mongodb.ObjectId(this._id)}, {$set: {cart: {items: this.cartItems}}});
//                     }
//                     return products.map(product => {
//                          return {...product, quantity: this.cart.items.find(item => {
//                               return item.productId.toString() === product._id.toString();
//                          }).quantity, qtyPrice: this.cart.items.find(item=> {
//                               return item.productId.toString() === product._id.toString();
//                          }).qtyPrice};
//                     });
//                }) 
//                .catch(err => console.log(err));
//                // ALTERNATIVE WAY TO GET CART (needs some fixing)
//           // const products = this.cart.items.map(item => {
//           //      return Product.findById(item.productId)
//           //           .then(product => {
//           //                return {...product, quantity: item.quantity}
//           //           })
//           //           .catch(err => console.log(err));
//           // })
//           // Promise.all(products)
//           //      .then(products => {
//           //           return products;
//           //      })
//           //      .catch(err => console.log(err));
//      }

