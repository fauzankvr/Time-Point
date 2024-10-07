const productCollection = require("../models/products");
const categoryCollections = require("../models/categoryModel");
const brandCollections = require("../models/brandModel");

exports.getProductManagment = async (req, res) => {
  try {
    let productData = await productCollection
      .find()
      .populate("category_id", "name")
      .populate("brand_id", "name")
      .sort({ createdAt: -1 });
    res.render("admin/productManagment", { productData });
  } catch (error) {
    console.log(error);
  }
};

exports.getAddProduct = async (req, res) => {
  try {
    const categoryData = await categoryCollections.find();
    const brandData = await brandCollections.find();

    res.render("admin/addProduct", { categoryData, brandData });
  } catch (error) {
    console.log(error);
  }
};

exports.postAddProduct = async (req, res) => {
  const {
    product_name,
    brand_id,
    category_id,
    gender,
    color,
    price,
    stock,
    discription,
  } = req.body;
  const files = await req.files;
  try {
    const porduct = new productCollection({
      product_name: product_name,
      brand_id: brand_id,
      category_id: category_id,
      gender: gender,
      color: color,
      price: price,
      stock: stock,
      discription: discription,
      "images.image1": files.image1[0].filename,
      "images.image2": files.image2[0].filename,
      "images.image3": files.image3[0].filename,
      "images.image4": files.image4[0].filename,
    });
    const productData = await porduct.save();
    req.flash("success", "New product added Successfully");
    res.redirect("/admin/productManagment");
  } catch (error) {
    console.log(`this is our side :${error}`);
  }
};

exports.getEditProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const productDataEdit = await productCollection
      .find({ _id: id })
      .populate("category_id", "name")
      .populate("brand_id", "name");
    const categoryData = await categoryCollections.find();
    const brandData = await brandCollections.find();
    res.render("admin/edtProduct", {
      productDataEdit,
      categoryData,
      brandData,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.postEditProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    const updatedProductData = {
      price: req.body.price,
    };

    const updatedProduct = await productCollection
      .findOneAndUpdate(
        { _id: productId },
        { $set: updatedProductData },
        { new: true }
      )
      .populate("offer");

    if (updatedProduct && updatedProduct.offer) {
      const discountPrice =
        updatedProduct.price -
        (updatedProduct.price * updatedProduct.offer.offer_percentage) / 100;

      await productCollection.findOneAndUpdate(
        { _id: updatedProduct._id },
        { $set: { discount_price: discountPrice } },
        { new: true }
      );
    }

    const {
      product_name,
      brand_id,
      category_id,
      gender,
      color,
      price,
      stock,
      discription,
    } = req.body;

    // Initialize an update object
    let updateData = {
      product_name,
      brand_id,
      category_id,
      gender,
      color,
      price,
      stock,
      discription,
    };

    if (req.files) {
      if (req.files.image1) {
        updateData["images.image1"] = req.files.image1[0].filename;
      }
      if (req.files.image2) {
        updateData["images.image2"] = req.files.image2[0].filename;
      }
      if (req.files.image3) {
        updateData["images.image3"] = req.files.image3[0].filename;
      }
      if (req.files.image4) {
        updateData["images.image4"] = req.files.image4[0].filename;
      }
    }

    const updatedProduct1 = await productCollection.findByIdAndUpdate(
      productId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProduct1) {
      return res.status(404).send("Product not found");
    }

    // Redirect to the product management page after successful update
    req.flash("success", "Product edited Successfully");
    res.redirect("/admin/productManagment");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send("An error occurred while updating the product.");
  }
};

exports.blockProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    await productCollection.updateOne(
      { _id: productId },
      { $set: { is_delete: false } }
    );
    req.flash("success", "product unblocked successfully");
    res.redirect("/admin/productManagment");
  } catch (error) {
    console.log(error);
    req.flash("error", "An error occurred while blocking the product");
    return res.redirect("/admin/productManagment");
  }
};

exports.unBlockProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productCollection.findById(productId);
    const catetory = await categoryCollections.findById(product.category_id);
    if (catetory.is_delete) {
      req.flash("error", "This category already deleted");
      return res.redirect("/admin/productManagment");
    }
    await productCollection.updateOne(
      { _id: productId },
      { $set: { is_delete: true } }
    );
    req.flash("success", "product blocked successfully");
    res.redirect("/admin/productManagment");
  } catch (error) {
    console.log(error);
    req.flash("error", "An error occurred while blocking the product");
    return res.redirect("/admin/productManagment");
  }
};
