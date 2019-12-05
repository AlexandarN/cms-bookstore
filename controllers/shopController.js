const fs = require('fs');
const path = require('path');
const pdfkit = require('pdfkit');


const Product = require('../models/Product');
const Order = require('../models/Order');
const isError = require('../middlewares/isError');
const env = require('../config/env');


const ITEMS_PER_PAGE = 3;

exports.getIndexPage = (req, res, next) => {
     const page = +req.query.page || 1;
     let totalProducts;
     Product.find()
          .countDocuments()
          .then(numProducts => {
               totalProducts = numProducts;
               return Product.find()
                    .skip((page - 1) * ITEMS_PER_PAGE)
                    .limit(ITEMS_PER_PAGE);
          })
          .then(products => {
               res.render('shop/index', {
                    prods: products, 
                    pageTitle: 'Shop', 
                    path: '/',
                    currentPage: page,
                    lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE)
               });
          })
          // .catch(err => console.log(err));
          .catch(isError.errorHandler(next)); 
}

exports.getProductsPage = (req, res, next) => {
     const page = +req.query.page || 1;
     let totalProducts;
     Product.find()
          .countDocuments()
          .then(numProducts => {
               totalProducts = numProducts;
               return Product.find()
                    .skip((page - 1) * ITEMS_PER_PAGE)
                    .limit(ITEMS_PER_PAGE);
          })
          .then(products => {
               res.render('shop/products', {
                    prods: products, 
                    pageTitle: 'All Products', 
                    path: '/products',
                    currentPage: page,
                    lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE)
               });
          })
          .catch(err => console.log(err));
     }

exports.getProduct = (req, res, next) => {
     const prodId = req.params.productId;
     Product.findById(prodId)
          .then(product => {
               res.render('shop/product-details', {
                    prod: product, 
                    pageTitle: product.title, 
                    path: '/product/productid'
               });
          })
          .catch(isError.errorHandler(next)); 
}

exports.getCartPage = (req, res, next) => {
     req.user.populate('cart.items.productId')
          .execPopulate()
          .then(user => {
               const totalPrice = user.cart.items.reduce((total, item) => 
                    total + (item.productId.price * item.quantity), 0);
               // ALTERNATIVE WAY FOR totalPrice
               // let totalPrice = 0;
               // products.forEach(product => {
               //      totalPrice += product.price * product.cartItem.quantity;
               // });
               res.render('shop/cart', {
                    prods: user.cart.items, 
                    totalPrc: totalPrice, 
                    pageTitle: 'Your Cart', 
                    path: '/cart'
               });
          })
          .catch(isError.errorHandler(next)); 
}

exports.postAddToCart = (req, res, next) => {
     const prodId = req.body.productId;
     Product.findById(prodId)
          .then(product => {
               req.user.addToCart(product);
          })
          .then(result => {
               console.log('Product added to cart!');
               res.redirect('/cart');
          })
          .catch(isError.errorHandler(next));
}

exports.postRemoveFromCart = (req, res, next) => {
          const prodId = req.body.productId;
          req.user.removeFromCart(prodId)
               .then(result => {
                    console.log('Product removed from the cart!');
                    res.redirect('/cart');
               })
               .catch(isError.errorHandler(next)); 
}

exports.getCheckoutPage = (req, res, next) => {
     req.user.populate('cart.items.productId')
          .execPopulate()
          .then(user => {
               const totalPrice = user.cart.items.reduce((total, item) => 
                    total + (item.productId.price * item.quantity), 0);
               res.render('shop/checkout', {
                    prods: user.cart.items, 
                    totalPrc: totalPrice, 
                    pageTitle: 'Checkout', 
                    path: '/checkout'
               });
          })
          .catch(isError.errorHandler(next)); 
}

exports.getOrdersPage = (req, res, next) => {
     Order.find({'user.userIdOrder': req.user._id})
          .then(orders => {
               let orderPrices = [];
               orders.forEach(order => {
                    order.orderPrice = order.items.reduce((total, item) => total + item.qtyPrice, 0);
                    orderPrices.push(order.orderPrice);
               });
               const totalPrice = orderPrices.reduce((total, orderPrice) => total + orderPrice, 0);
               res.render('shop/orders', {
                    ordrs: orders, 
                    ordPrcs: orderPrices, 
                    totalPrc: totalPrice, 
                    pageTitle: 'Your Orders', 
                    path: '/orders'
               });
          })
          // .catch(err => console.log(err));
          .catch(isError.errorHandler(next)); 
}

exports.postCreateOrder = (req, res, next) => {
     // Set your secret key: remember to change this to your live secret key in production
     // See your keys here: https://dashboard.stripe.com/account/apikeys
     var stripe = require("stripe")(env.stripeSecKey);
     // Token is created using Checkout or Elements!
     // Get the payment token ID submitted by the form:
     const token = req.body.stripeToken; // Using Express
     let totalPrice = 0;
     req.user.populate('cart.items.productId')
          .execPopulate()
          .then(user => {
               totalPrice = user.cart.items.reduce((total, item) => 
                    total + (item.productId.price * item.quantity), 0);          
               const orderProducts = user.cart.items.map(item => {
                    return {product: {...item.productId._doc}, quantity: item.quantity, qtyPrice: item.qtyPrice}
               });
               const order = new Order({
                    items: orderProducts,
                    user: {userIdOrder: user._id, email: user.email} 
               });
               return order.save();
          })
          .then(result => {
               (async () => {
                    const charge = await stripe.charges.create({
                         amount: Math.round(totalPrice.toFixed(2) * 100),
                         currency: 'usd',
                         description: 'Example charge',
                         source: token,
                         metadata: {orderId: result._id.toString()}
                    });
               })();
               return req.user.clearCart();
          })
          .then(result => {
               console.log('Order created!');
               res.redirect('/orders');
          })
          .catch(isError.errorHandler(next)); 
}

exports.getInvoice = (req, res, next) => {
     const ordId = req.params.orderId;
     Order.findById(ordId)
          .then(order => {
               if(!order) {
                    req.flash('message', 'There is no such order in the DB!')
                    return res.redirect('/orders');
               }
               if(order.user.userIdOrder.toString() !== req.user._id.toString()) {
                    req.flash('message', "You are not authorized to open this document!");
                    return res.redirect('/orders');
               }
               const invoiceName = 'Invoice-' + ordId + '.pdf';
               const invoicePath = path.join('data', 'invoices', invoiceName);

               res.setHeader('Content-Type', 'application/pdf');
               res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"' );

               const pdfDoc = new pdfkit();
               pdfDoc.registerFont('ClearSans', 'public/fonts/ClearSans/ClearSans-Regular.ttf');
               pdfDoc.registerFont('ClearSans-Bold', 'public/fonts/ClearSans/ClearSans-Bold.ttf');
               pdfDoc.registerFont('ClearSans-Medium', 'public/fonts/ClearSans/ClearSans-Medium.ttf');
               pdfDoc.registerFont('DejaVu Sans', 'public/fonts/DejaVuSans/DejaVuSans.ttf')
               pdfDoc.pipe(fs.createWriteStream(invoicePath));
               pdfDoc.pipe(res);
               pdfDoc.fontSize(23).font('Helvetica').text('Invoice - id: ' + order._id, {underline: true});

               x1 = pdfDoc.x;
               // x1 = 65;
               x2 = 210;
               x3 = 320;
               x4 = 430;
               pdfDoc
                    .moveDown(1)
                    .fontSize(15).font('Helvetica-Bold').text('Product title', x1, pdfDoc.y, {indent: 5, align: 'left', width: 100})
                    .moveUp().text('Quantity', x2, pdfDoc.y)
                    .moveUp().text('Unit price', x3, pdfDoc.y)
                    .moveUp().text('Subtotal', x4, pdfDoc.y);

               order.items.forEach(item => {
                    pdfDoc
                         .moveDown(0.2)
                         .fontSize(13).font('ClearSans-Medium')
                         .text(item.product.title, x1, pdfDoc.y, {indent: 5, align: 'left', width: 190})
                         .moveUp().text(item.quantity, x2, pdfDoc.y, {align: 'center', width: 60})
                         .moveUp().text('$' + item.product.price, x3, pdfDoc.y, {align: 'center', width: 60})
                         .moveUp().text('$' + item.qtyPrice, x4, pdfDoc.y, {align: 'center', width: 60});
               });
               pdfDoc.fontSize(10).font('Helvetica').text('-------------------------------------------------------------------------------------------------------------------------------', x1);
               orderPrice = order.items.reduce((total, item) => total + item.qtyPrice, 0);
               pdfDoc
                    .moveDown(-0.2)
                    .fontSize(13).font('Helvetica-Bold').text('Total price:', {indent: 5})
                    .moveUp()
                    .text(' ', x2, pdfDoc.y, {align: 'center', width: 60})
                    .moveUp()
                    .text(' ', x3, pdfDoc.y, {align: 'center', width: 60})
                    .moveUp()
                    .text('$' + orderPrice, x4, pdfDoc.y, {align: 'center', width: 60});

               pdfDoc.moveDown(-0.4).fontSize(10).font('Helvetica').text('-------------------------------------------------------------------------------------------------------------------------------', x1);
               pdfDoc.addPage();
               const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam in suscipit purus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Vivamus nec hendrerit felis. Morbi aliquam facilisis risus eu lacinia. Sed eu leo in turpis fringilla hendrerit. Ut nec accumsan nisl. Suspendisse rhoncus nisl posuere tortor tempus et dapibus elit porta. Cras leo neque, elementum a rhoncus ut, vestibulum non nibh. Phasellus pretium justo turpis. Etiam vulputate, odio vitae tincidunt ultricies, eros odio dapibus nisi, ut tincidunt lacus arcu eu elit. Aenean velit erat, vehicula eget lacinia ut, dignissim non tellus. Aliquam nec lacus mi, sed vestibulum nunc. Suspendisse potenti. Curabitur vitae sem turpis. Vestibulum sed neque eget dolor dapibus porttitor at sit amet sem. Fusce a turpis lorem. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae;';  
               pdfDoc.fontSize(12).text(lorem, {columns: 3, columnGap: 15, height: 190, width: 465, align: 'justify'});
               pdfDoc.moveDown(1.5).font('ClearSans-Medium').list(['jedan', 'dva', 'tri', 'četiri'], {bulletRadius: 1.5, indent: 20, textIndent: 15});
               pdfDoc.moveDown(2).fontSize(13).font('Helvetica').text('The amount you need to pay for this order is')
                    .moveUp().font('Helvetica-Bold').fillColor('red').text('$' + orderPrice, 329)
                    .moveUp().font('Helvetica').fillColor('black').text('.', 359);
               pdfDoc.moveDown(0.5).text('Visit our web presentation at ', x1)
                    .moveUp().fillColor('blue').text('www.shop.com', 240, pdfDoc.y, {link: 'www.shop.com', underline: true})
                    .moveUp().fillColor('black').text('.', 330);
               pdfDoc.moveDown(2).text('Sincerely yours,', x1);
               pdfDoc.image('images/imgs/Richard_M_Nixon_Signature.png', {width: 150});
               pdfDoc.end();
                    // STREAMING OF FILE DATA - GOOD APPROACH FOR BIG FILES DOWNLOAD
               // const file = fs.createReadStream(invoicePath);
               // res.setHeader('Content-Type', 'application/pdf');
               // res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"' );
               // file.pipe(res);
                    // READING OF FILE DATA IN THE MEMORY - NOT GOOD APPROACH FOR BIG FILES
               // fs.readFile(invoicePath, (err, data) => {
               //      if(err) {
               //           return next(err);
               //      }
               //      res.setHeader('Content-Type', 'application/pdf');
               //      res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"' );
               //      res.send(data);
               //      console.log("You've opened a document!");
               // });
          })
          .catch(isError.errorHandler(next));

}
