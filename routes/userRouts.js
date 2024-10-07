const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const cartController = require("../controllers/cartControllers");
const userAuth = require("../middleware/userAuth");
const passport = require("../config/passport");
const addressController = require("../controllers/addressController");
const orderController = require("../controllers/checkoutController");
const wishlistController = require("../controllers/wishlistController");

//app router

router.get("/", userAuth.isLoggedOut, userController.getRoot);
router.get("/login", userAuth.isLoggedOut, userController.getLogin);
router.post("/login", userController.postLogin);
router.get("/signup", userAuth.isLoggedOut, userController.getSignup);
router.post("/signup", userController.postSignup);
router.get("/google", userController.getLogin);

router.get("/forgot_password", userController.getForgottenPassword);

//otp vrification
router.get("/verify-otp", userAuth.isLoggedOut, userController.getVerifyOtp);
router.post("/verify-otp", userController.postverifyOtp);
router.post("/resend-otp", userController.resendOtp);

//passport routs
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    req.session.user = req.user.email;
    res.redirect("/home");
  }
);

// =================shop page ===============

router.get("/home/shop", userController.getShowProducts);

// =====================product details =====================

router.get("/home/productDetails/:id", userController.getProductDetails);
router.get("/home", userAuth.isLoggedIn, userController.home);

// ===================== profile ====================

router.get("/home/profile", userAuth.isLoggedIn, userController.getProfile);
router.post("/home/profile/update", userController.updateProfile);
router.get("/home/profile/forgotPassword", userController.getForgotPassword);
router.post("/forgotPassword", userController.postForgotPassword);
router.post("/verifyOTP", userController.verifyOTP);
router.post("/verifyOTP2", userController.verifyOTP2);
router.post("/changePassword", userController.changePassword);
router.post("/resetPassword", userController.resetPassword);

router.post("/home/profile/resetPassword", userController.profileResetPassword);
router.get(
  "/home/profile/changePassword",
  userAuth.isLoggedIn,
  userController.profileChangePassword
);

// ================== address routs ===================

router.get("/addAddress", userAuth.isLoggedIn, addressController.getAddAddress);
router.post(
  "/addAddress",
  userAuth.isLoggedIn,
  addressController.postAddAddress
);
router.get("/editAddress/:id", addressController.getEditAddress);
router.post("/editAddress/:id", addressController.postEditAddress);
router.post("/deleteAddress/:id", addressController.deleteAddress);

// ==============cart routs==============================

router.get("/home/cart", userAuth.isLoggedIn, cartController.getAddToCart);
router.post("/home/cart/:id", cartController.postAddToCart);
router.post("/cart/update-quantity", cartController.updateQuantity);
router.post("/cart/delete-item", cartController.deleteItem);

// ============================= order

router.get(
  "/home/orderHistory",
  userAuth.isLoggedIn,
  orderController.getOrderHistory
);

router.get(
  "/home/deliveryAddress",
  userAuth.isLoggedIn,
  orderController.getdeliveryAddress
);
router.post("/submitOrder", orderController.postSubmitOrder);
router.get("/home/payment", userAuth.isLoggedIn, orderController.getPayment);

router.post("/payment", orderController.postPayment);
router.post("/cancelOrder", orderController.cancelOrder);
router.post("/returnOrder", orderController.returnOrder);
router.get(
  "/home/orderDetails/:id",
  userAuth.isLoggedIn,
  orderController.getOrderDetails
);
router.get(
  "/downloadInvoice/:productId/:orderId",
  orderController.downloadInvoice
);

router.post("/create-order", orderController.createOrder);
router.post("/verify-payment", orderController.verifyPayment);
router.post("/verify-paymet-again", orderController.verifyPaymentAgain);

// =======================coupen====================

router.post("/applyCoupon", orderController.applyCoupon);
router.post("/removeCoupon", orderController.removeCoupon);

// ===================== wallet =============
router.get("/home/wallet", userAuth.isLoggedIn, orderController.getWallet);
router.post("/user/addMoney", orderController.addMoney);
router.post("/verifyaddMoney", orderController.verifyaddMoney);
router.post("/walletPayment", orderController.walletPayment);

// ================================wishlist ==========================

router.get(
  "/home/wishlist",
  userAuth.isLoggedIn,
  wishlistController.getWishlist
);
router.post("/home/wishlist", wishlistController.postWishlist);
router.post("/wishlist/delete-item", wishlistController.deleteWishlist);

// ================================== logout===============
router.post("/logout", userController.getLogout);

module.exports = router;
