const { validationResult } = require('express-validator/check');

const Product = require('../models/Product');
const isError = require('../middlewares/isError');
const fileManipulator = require('../middlewares/fileManipulator');

exports.getAddProductPage = (req, res, next) => {
     res.render('admin/edit-product', {
          pageTitle: 'Add Product', 
          path: '/admin/add-product', 
          editing: false,
          oldInput: {},
          validationErrors: []
     });
}

exports.postAddProduct = (req, res, next) => {
     const image = req.file;
     if(!image) {
          req.flash('message', 'Attached file is not an image!');
          return res.status(422).render('admin/edit-product', {
               pageTitle: 'Add Product',
               path: '/admin/add-product',
               editing: false,
               oldInput: {title: req.body.title, price: req.body.price, description: req.body.description},
               validationErrors: []
          });  
     }
     const errors = validationResult(req);
     if(!errors.isEmpty()) {
          // req.flash('message', errors.array()[0].msg);
          fileManipulator.deleteFile(image.path);
          console.log(errors.array());
          return res.status(422).render('admin/edit-product', {
               pageTitle: 'Add Product',
               path: '/admin/add-product',
               editing: false,
               oldInput: {title: req.body.title,  price: req.body.price, description: req.body.description},
               validationErrors: errors.array()
          });  
     }
     const imageUrl = image.path;
     console.log(image);
     const product = new Product({
          // _id: new mongoose.Types.ObjectId('5c6541ca226a6735e8529573'),
          title: req.body.title, 
          imageUrl: imageUrl, 
          price: req.body.price, 
          description: req.body.description,
          userId: req.user._id
     });
     product.save()          
          .then(result => {
               console.log('Product is created.');
               res.redirect('/admin/product-list');
          })
          .catch(isError.errorHandler(next));
}

exports.getProductListPage = (req, res, next) => {
     Product.find({})
          // select('title price -_id')
          // populate('userId', 'name')
          .then(products => {
               res.render('admin/product-list', {
                    prods: products, 
                    pageTitle: 'Products List', 
                    path: '/admin/product-list',
               });
          })
          .catch(isError.errorHandler(next));
}

exports.getEditProductPage = (req, res, next) => {
     const editMode = req.query.edit;
     if(!editMode) {
          return res.redirect('/');
     }
     const prodId = req.params.productId;
     Product.findById(prodId)
          .then(product => {
               if(!product) {
                    return res.redirect('/');
               }
               res.render('admin/edit-product', {
                    prod: product, 
                    pageTitle: 'Edit Product', 
                    path: '/admin/edit-product', 
                    editing: editMode,
                    oldInput: {},
                    validationErrors: []
               });
          })
          .catch(isError.errorHandler(next));
}

exports.postEditProduct = (req, res, next) => {
     const image = req.file;
     const errors = validationResult(req);
     if(!errors.isEmpty()) {
          // req.flash('message', errors.array()[0].msg);
          console.log(errors.array());
          return res.status(422).render('admin/edit-product', {
               pageTitle: 'Edit Product',
               path: '/admin/edit-product',
               editing: true,
               prod:{title: req.body.title, price: req.body.price, description: req.body.description, _id: req.body.productId},
               validationErrors: errors.array()
          });  
     }
     const prodId = req.body.productId;
     Product.findById(prodId)
          .then(product => {
               if(product.userId.toString() !== req.user._id.toString()) {
                    req.flash('message', "You cannot edit other users' products!");      
                    return res.redirect('/admin/product-list');
               }
               product.title = req.body.title;
               product.price = req.body.price;
               product.description = req.body.description;
               if(image) {
                    fileManipulator.deleteFile(product.imageUrl);
                    product.imageUrl = image.path;
               }
               return product.save()
                    .then(result => {
                         console.log('Product is updated!');
                         res.redirect('/admin/product-list');
                    })
                    .catch(err => console.log(err));
          })
          .catch(isError.errorHandler(next));
}

     // SYNCHRONOUS REQUEST
// exports.postDeleteProduct = (req, res, next) => {
//      const prodId = req.body.productId;
//      Product.findById(prodId)
//           .then(product => {
//                if(product.userId.toString() !== req.user._id.toString()) {
//                     req.flash('message', "You cannot delete other users' products!");      
//                     return res.redirect('/admin/product-list');
//                }
//                fileManipulator.deleteFile(product.imageUrl);
//                return Product.deleteOne({_id: prodId, userId: req.user._id})
//                // Product.findByIdAndDelete(prodId)
//                     .then(result => {
//                          console.log('Product is deleted!');
//                          res.redirect('/admin/product-list');
//                     })
//                     .catch(isError.errorHandler(next));
//           })
//           .catch(isError.errorHandler(next));
// }
     // ASYNC REQUEST
exports.asyncDeleteProduct = (req, res, next) => {
     const prodId = req.params.productId;
     Product.findById(prodId)
          .then(product => {
               if(product.userId.toString() !== req.user._id.toString()) {
                    req.flash('message', "You cannot delete other users' products!");      
                    return res.redirect('/admin/product-list');
               }
               fileManipulator.deleteFile(product.imageUrl);
               return Product.deleteOne({_id: prodId, userId: req.user._id});
               // Product.findByIdAndDelete(prodId)
          })
          .then(result => {
               console.log('Product is deleted!');
               res.status(200).json({message: 'Successfully deleted product!'});
          })
          .catch(err => res.status(500).json({message: 'Deletion failed!'}));
}
