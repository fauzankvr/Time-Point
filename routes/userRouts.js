const express = require('express')
const router = express.Router() 
const userController = require ('../controllers/userController')
const userAuth = require('../middleware/userAuth')
const passport = require('../config/passport')

//app router

router.get("/", userController.getRoot);
router.get("/login",userAuth.isLoggedOut, userController.getLogin);
router.post("/login", userController.postLogin); 
router.get('/signup',userAuth.isLoggedOut, userController.getSignup);
router.post("/signup", userController.postSignup);
router.get("/google", userController.getLogin);


//otp vrification
router.get("/verify-otp", userController.getVerifyOtp);
router.post("/verify-otp", userController.verifyOtp);
router.post('/resend-otp',userController.resendOtp);

//passport routs 
router.get(
  "/auth/google",
  passport.authenticate("google", {scope: ["profile", "email"],
    prompt: "select_account" 
  })
);
router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    req.session.user=req.user
    res.redirect("/home");
  }
);


// =================shop page ===============

router.get("/home/shop", userController.getShowProducts);

// =====================product details =====================

router.get("/home/productDetails/:id", userController.getProductDetails);
router.get("/home", userAuth.isLoggedIn, userController.home);

router.post("/logout", userController.getLogout);

module.exports = router   