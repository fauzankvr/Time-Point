const express = require('express')
const router = express.Router()
const adminAuth = require("../middleware/adminAuth");

const adminControllers = require('../controllers/adminControllers');
const productControllers = require('../controllers/productControllers')
const multer = require('../middleware/multer')
const categoryControllers = require('../controllers/categoryControllers')
const brandControllers = require('../controllers/brandControllers')
const orderControllers = require('../controllers/orderController')
const couponControllers = require('../controllers/couponControlles')
const offerControllers = require('../controllers/offerController')

//app router

router.get('/admin', adminAuth.isLoggedOut, adminControllers.getAdmin) 
router.post("/admin", adminControllers.postAdmin);  
router.get('/admin/dashboard' ,adminAuth.isLoggedIn, adminControllers.getDashbord)
router.get('/admin/userManagment',adminAuth.isLoggedIn, adminControllers.getuseManagment) 
router.get('/admin/userManagment/blockUser/:id',adminAuth.isLoggedIn, adminControllers.blockUser) 
router.get("/admin/userManagment/unBlockUser/:id",adminAuth.isLoggedIn, adminControllers.unBlockUser); 

// =========================== Product Managmet =====================  

router.get(
  "/admin/productManagment",
  adminAuth.isLoggedIn,
  productControllers.getProductManagment
); 
router.get(
  "/admin/poroductMangment/addProduct",
  adminAuth.isLoggedIn,
  productControllers.getAddProduct
);
router.post(
  "/admin/productManagment/addProduct",
  multer.upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  productControllers.postAddProduct
);
router.get(
  "/admin/productManagment/editProduct/:id",
  adminAuth.isLoggedIn,
  productControllers.getEditProduct
);

router.post(
  "/admin/productManagment/editProduct/:id",
  multer.upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  productControllers.postEditProduct
);
router.get(
  "/admin/productManagment/blockProduct/:id",
  adminAuth.isLoggedIn,
  productControllers.blockProduct
);

router.get(
  "/admin/productManagment/unBlockProduct/:id",
  adminAuth.isLoggedIn,
  productControllers.unBlockProduct
);

// =========================== Catogory Managmet =====================  
router.post("/admin/addCategory", categoryControllers.postAddCategory);
router.get(
  "/admin/catogoryManagment",
  adminAuth.isLoggedIn,
  categoryControllers.getCatogoryManagment
); 
router.get("/admin/categorytManagment/blockCatogory/:id",
  adminAuth.isLoggedIn,
  categoryControllers.blockCatogory
);
router.get(
  "/admin/categoryManagment/unBlockCatogory/:id",
  adminAuth.isLoggedIn,
  categoryControllers.unBlockCatogory
);
router.get(
  "/admin/catetoryManagment/editCatogory/:id",
  adminAuth.isLoggedIn,
  categoryControllers.getEditCatogory
);
router.post("/admin/catetoryManagment/editCatogory/:id", categoryControllers.postEditCatogory);




// =========================== Brand Managmet =====================  
router.get(
  "/adimin/brandManagment",
  adminAuth.isLoggedIn,
  brandControllers.getBrandManagment
);
router.post("/admin/addBrand", brandControllers.postBrandManagment)

router.get(
  "/admin/brandManagment/blockBrand/:id",
  brandControllers.postBlockBrand
);
router.get(
  "/admin/brandManagment/unBlockBrand/:id",
  brandControllers.postunBlockBrand
);


// ===================== Order Managment =====================

router.get("/admin/orderManagment", adminAuth.isLoggedIn, orderControllers.getOrderManagment)
router.get(
  "/admin/orderManagment/deliverd/:orderId/:productId",
  adminAuth.isLoggedIn,
  orderControllers.orderDeliverd
);
router.get(
  "/admin/orderManagment/cancel/:orderId/:productId",
  adminAuth.isLoggedIn,
  orderControllers.orderCancel
);
router.get(
  "/admin/orderManagment/approved/:orderId/:productId",
  adminAuth.isLoggedIn,
  orderControllers.retrunApproved
);
router.get(
  "/admin/orderManagment/rejected/:orderId/:productId",
  adminAuth.isLoggedIn,
  orderControllers.retrunRejected
);


// =========================couponManagment========================

router.get("/admin/couponManagment", adminAuth.isLoggedIn, couponControllers.getCouponManagment)
router.post("/admin/couponManagment", couponControllers.postCouponManagment)


// =========================== offer Management =================

router.get("/admin/offerManagment", adminAuth.isLoggedIn, offerControllers.getOfferManagment);
router.post("/admin/offerManagment/addOffer", offerControllers.postAddOffer);
router.post("/admin/offerManagement/ChangeOffer", offerControllers.postChangeOffer);
router.post("/admin/offerManagement/ChangeCategoryOffer", offerControllers.postChangeCategoryOffer);
module.exports = router