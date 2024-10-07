const productModel = require("../models/products");
const offerModel = require("../models/offerModel");
const categoryModel = require("../models/categoryModel");

exports.getOfferManagment = async (req, res) => {
  const offerData = await offerModel.find();
  const productData = await productModel.find().populate("offer");
  const categoryData = await categoryModel.find().populate("offer");
  offerData ? offerData : [];
  productData ? productData : [];
  categoryData ? categoryData : [];
  res.render("admin/offerManagement", { offerData, productData, categoryData });
};

exports.postAddOffer = async (req, res) => {
  const offer = new offerModel({
    offer_name: req.body.offer_name,
    offer_percentage: req.body.offer_percentage,
    offer_start_date: req.body.offer_start_date,
    offer_end_date: req.body.offer_end_date,
  });

  await offer.save();
  req.flash("success", "new offer added successfully");
  res.redirect("/admin/offerManagment");
};

exports.postChangeOffer = async (req, res) => {
  try {
    const { productId, offerId } = req.body;
    const productData = await productModel.findOne({ _id: productId });
    const offerData = await offerModel.findOne({ _id: offerId });
    const discountPrice =
      productData.price -
      (productData.price * offerData.offer_percentage) / 100;
    await productModel.findByIdAndUpdate(productId, {
      discount_price: discountPrice,
      offer: offerId,
    });
    res.json({ success: true, message: "Offer added successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Failed to update offer" });
  }
};

exports.postChangeCategoryOffer = async (req, res) => {
  try {
    const { categoryId, offerId } = req.body;
    console.log(categoryId, offerId);
    const categoryData = await categoryModel.findOne({ _id: categoryId });
    const offerData = await offerModel.findOne({ _id: offerId });
    const products = await productModel.find({ category_id: categoryId });

    for (const product of products) {
      const discountPrice =
        product.price - (product.price * offerData.offer_percentage) / 100;
      await productModel.findByIdAndUpdate(product._id, {
        discount_price: discountPrice,
        offer: offerId,
      });
    }

    await categoryModel.findByIdAndUpdate(categoryId, {
      offer: offerId,
    });
    res.json({ success: true, message: "Offer added successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Failed to update offer" });
  }
};

exports.postBlockOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const offerData = await offerModel.findOne({ _id: offerId });
    if (offerId) {
      await offerModel.findByIdAndUpdate(offerId, { is_delete: true });
      req.flash("success", "Offer blocked successfully");
      return res.redirect("/admin/offerManagment");
    }
  } catch (error) {
    console.error(error);
  }
};

exports.postunBlockOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const offerData = await offerModel.findOne({ _id: offerId });
    if (offerData) {
      await offerModel.findByIdAndUpdate(offerId, { is_delete: false });
      req.flash("success", "Offer unblocked successfully");
      return res.redirect("/admin/offerManagment");
    }
  } catch (error) {
    console.error(error);
  }
};
