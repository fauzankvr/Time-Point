const couponModel = require("../models/couponModal");

exports.getCouponManagment = async (req, res) => {
  const couponData = await couponModel.find({});
  if (!couponData) {
    return res.render("admin/couponManagment", { couponData:{} });
  }
  res.render("admin/couponManagment", { couponData});
};

exports.postCouponManagment = async (req, res) => {
  console.log(req.body);
  const coupenData = new couponModel ({
    coupon_code: req.body.coupon_code,
    discount: req.body.discount,
    start_date: req.body.start_date,
    expiry_date: req.body.expiry_date,
  })

  await coupenData.save();
  res.redirect("/admin/couponManagment");
}