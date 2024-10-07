const couponModel = require("../models/couponModal");

exports.getCouponManagment = async (req, res) => {
  const couponData = await couponModel.find({}).sort({ createdAt: -1 });
  if (!couponData) {
    return res.render("admin/couponManagment", { couponData: {} });
  }
  res.render("admin/couponManagment", { couponData });
};

exports.postCouponManagment = async (req, res) => {
  const coupenData = new couponModel({
    coupon_code: req.body.coupon_code,
    discount: req.body.discount,
    start_date: req.body.start_date,
    expiry_date: req.body.expiry_date,
    minimum_amount: req.body.minimum_amount,
  });

  await coupenData.save();
  res.redirect("/admin/couponManagment");
};

exports.postBlockCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const coupon = await couponModel.findOne({ _id: couponId });
    if (!coupon) {
      req.flash("error", "Coupon not found");
      return res.redirect("/admin/couponManagment");
    }
    coupon.is_delete = true;
    await coupon.save();
    req.flash("success", "Coupon blocked successfully");
    return res.redirect("/admin/couponManagment");
  } catch (error) {
    console.log(error);
  }
};

exports.postunBlockCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const coupon = await couponModel.findOne({ _id: couponId });
    if (!coupon) {
      req.flash("error", "Coupon not found");
      return res.redirect("/admin/couponManagment");
    }
    coupon.is_delete = false;
    await coupon.save();
    req.flash("success", "Coupon unblocked successfully");
    return res.redirect("/admin/couponManagment");
  } catch (error) {
    console.log(error);
  }
};
