const express = require('express');
const router = express.Router();

const shopController = require('../controllers/shopController');
const isAuth = require('../middlewares/isAuth');

router.get('/', shopController.getIndexPage);
router.get('/products', shopController.getProductsPage);
router.get('/product/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCartPage);
router.post('/cart', isAuth, shopController.postAddToCart);
router.post('/remove-product', isAuth, shopController.postRemoveFromCart);

router.get('/orders', isAuth, shopController.getOrdersPage);
router.post('/orders', isAuth, shopController.postCreateOrder);
router.get('/orders/:orderId', isAuth, shopController.getInvoice);

router.get('/checkout', isAuth, shopController.getCheckoutPage);

module.exports = router;