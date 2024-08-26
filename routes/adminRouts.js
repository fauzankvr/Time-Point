const express = require('express')
const router = express.Router()
const adminAuth = require("../middleware/adminAuth");

const adminControllers = require('../controllers/adminControllers');
const productControllers = require('../controllers/productControllers')
const multer = require('../middleware/multer')
const categoryControllers = require('../controllers/categoryControllers')
const brandControllers = require('../controllers/brandControllers')


//app router

router.get('/admin', adminAuth.isLoggedOut, adminControllers.getAdmin) 
router.post("/admin", adminControllers.postAdmin);  
router.get('/admin/dashboard' ,adminAuth.isLoggedIn, adminControllers.getDashbord)
router.get('/admin/userManagment',adminAuth.isLoggedIn, adminControllers.getuseManagment) 
router.get('/admin/userManagment/blockUser/:id',adminAuth.isLoggedIn, adminControllers.blockUser) 
router.get("/admin/userManagment/unBlockUser/:id",adminAuth.isLoggedIn, adminControllers.unBlockUser); 

// =========================== Product Managmet =====================  

router.get("/admin/productManagment", productControllers.getProductManagment); 
router.get(
  "/admin/poroductMangment/addProduct",
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
  productControllers.blockProduct
);

router.get(
  "/admin/productManagment/unBlockProduct/:id",
  productControllers.unBlockProduct
);

// =========================== Catogory Managmet =====================  
router.post("/admin/addCategory", categoryControllers.postAddCategory); 
router.get("/admin/catogoryManagment", categoryControllers.getCatogoryManagment); 

// =========================== Brand Managmet =====================  
router.get("/adimin/brandManagment", brandControllers.getBrandManagment)
router.post("/admin/addBrand", brandControllers.postBrandManagment)



module.exports = router