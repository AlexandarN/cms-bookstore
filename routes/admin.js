const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const isAuth = require('../middlewares/isAuth');
const isValid = require('../middlewares/isValid');

router.get('/add-product', isAuth, adminController.getAddProductPage);
router.post('/add-product', isAuth, isValid.checkProductValues, adminController.postAddProduct);

router.get('/product-list', isAuth, adminController.getProductListPage);

router.get('/edit-product/:productId', isAuth, adminController.getEditProductPage);
router.post('/edit-product', isAuth, isValid.checkProductValues, adminController.postEditProduct);

     //SYNCHRONOUS REQUEST 
// router.post('/delete-product', isAuth, adminController.postDeleteProduct);
     // ASYNC REQUEST
router.delete('/product/:productId', isAuth, adminController.asyncDeleteProduct);

module.exports = router;

