const User = require("../models/users");
const Product = require("../models/products"); 
const Address = require("../models/addressModal");
const Cart = require("../models/cartModel");
const orderModal = require("../models/orderModal");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const couponModel = require("../models/couponModal");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getdeliveryAddress = async (req, res) => {
  const user = req.session.user;
  const userData = await User.findOne({ email: user });
  const address = await Address.find({ user_id: userData._id });
 
  const cartCollection = await Cart.findOne({ user_id: userData._id }).populate(
    "products.product_id"
  );
  if (!cartCollection) {
    return res.redirect("/home");
  }

if (cartCollection) {
  cartCollection.products = cartCollection.products.filter(
    (product) => product.product_id && product.product_id.is_delete === false
  );
}
  const cartData = cartCollection.products;
  const total = cartData.reduce((acc, item) => {
    return acc + item.total_price;
  }, 0);
  if (address.length == 0) {
    return res.render("user/deliveryAddress", { user, addressData: [], total, cartData });
   }
   const addressData = address[0].addresses;
  res.render("user/deliveryAddress", { user, addressData, total, cartData });
};

exports.getPayment = async (req, res) => {
  const user = req.session.user;
  const discount = req.session.discount;
  const couponCode = req.session.couponCode;
  console.log(discount);
    const grandtotal = req.session.grandtotal;
  const userData = await User.findOne({ email: user });
  const address = await Address.find({ user_id: userData._id });
  const addressData = address[0].addresses;
  const cartCollection = await Cart.findOne({
    user_id: userData._id,
  }).populate("products.product_id");
  if (!cartCollection) {
    return res.redirect("/home");
  }
  
if (cartCollection) {
  cartCollection.products = cartCollection.products.filter(
    (product) => product.product_id && product.product_id.is_delete === false
  );
}
  const cartData = cartCollection.products;
  const total = cartData.reduce((acc, item) => {
    return acc + item.total_price;
  }, 0);
  res.render("user/payment", { user, addressData, total, cartData ,discount,grandtotal , couponCode});
};

exports.postSubmitOrder = async (req, res) => {
  const user = req.session.user;
  const setectedAddress = req.body;
  req.session.address = setectedAddress;
  res.json({ success: true });
};

exports.postPayment = async (req, res) => {
  const user = req.session.user;
  const payment = req.body.payment;
  const userData = await User.findOne({ email: user });
  const addressData = req.session.address;
  const cartCollection = await Cart.findOne({ user_id: userData._id }).populate(
    "products.product_id"
  );
  
  
if (cartCollection) {
  cartCollection.products = cartCollection.products.filter(
    (product) => product.product_id && product.product_id.is_delete === false
  );
}
  const cartData = cartCollection.products;
  if (cartData[0].product_id.stock == 0) {
    return res.json({status:false, message:"Stock is empty"})
  }
  const selectedAddressDocument = await Address.findOne({
    user_id: userData._id,
    "addresses._id": addressData.selectedAddressId,
  });
  let matchingAddress={}
  if (selectedAddressDocument) {
    matchingAddress = selectedAddressDocument.addresses.id(
      addressData.selectedAddressId
    );
  }
  const grandtotal = req.session.grandtotal;
  const total = cartData.reduce((acc, item) => {
    return acc + item.total_price;
  }, 0);
  const orderData = new orderModal({
    user_id: userData._id,
    products: cartCollection.products,
    paymentOption: payment,
    grant_total_: total,
    address: matchingAddress,
    coupon: {
      coupon_code: req.session.couponCode,
      discountTotal: grandtotal,
    }
  });

  await orderData.save();
 req.session.discount = 0;
 req.session.grandtotal = 0;
 req.session.couponCode = null;
  for (const item of orderData.products) {
    await Product.updateOne(
      { _id: item.product_id._id },
      { $inc: { stock: -item.quantity } }
    );
  }
  await Cart.deleteOne({ user_id: userData._id });
  res.json({ status: true });
};


exports.createOrder = async (req, res) => {
  const amount = req.body.amount; 
  const options = {
    amount: amount*100,
    currency: "INR",
    receipt: "receipt#1",
    payment_capture: 1,
  };
  try {
    const order = await razorpayInstance.orders.create(options);
    res.json({
      status: true,
      order_id: order.id,
      amount: order.amount,
    });
  } catch (error) {
    res.json({ status: false, message: "Order creation failed" });
  }
};

exports.verifyPayment = async (req, res) => {
  const user = req.session.user;
  const userData = await User.findOne({ email: user });
  const addressData = req.session.address;
  const cartCollection = await Cart.findOne({ user_id: userData._id }).populate(
    "products.product_id"
  );
  const selectedAddressDocument = await Address.findOne({
    user_id: userData._id,
    "addresses._id": addressData.selectedAddressId,
  });
  let matchingAddress = {};
  if (selectedAddressDocument) {
    matchingAddress = selectedAddressDocument.addresses.id(
      addressData.selectedAddressId
    );
  }
  const cartData = cartCollection.products;
  const total = cartData.reduce((acc, item) => {
    return acc + item.total_price;
  }, 0);
  const { payment_id, order_id, signature } = req.body;
  const body = order_id + "|" + payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === signature) {
      const orderData = new orderModal({
        user_id: userData._id,
        products: cartCollection.products,
        paymentOption: "RazorPay",
        grant_total_: total,
        address: matchingAddress,
      });
      await orderData.save();
      for (const item of orderData.products) {
        await Product.updateOne(
          { _id: item.product_id._id },
          { $inc: { stock: -item.quantity } }
        );
      }
      await Cart.deleteOne({ user_id: userData._id });
    res.json({ status: true });
  } else {
    res.json({ status: false });
  }
};

exports.cancelOrder = async (req, res) => {
  const user = req.session.user;
  const userData = await User.findOne({ email: user });
  const { productId , orderId } = req.body;
  const order = await orderModal.findOne({ _id: orderId });
  const orderData = await orderModal.updateOne(
    {
      _id: orderId,
      "products._id": productId,
    },
    {
      $set: {
        "products.$.status": "cancelled",
      },
    }
  );
  const update = await Product.updateOne(
    { _id: order.products[0].product_id },
    { $inc: { stock: order.products[0].quantity } }
  );
//  if (order.paymentOption == "RazorPay") {
  await userData.wallet_history.push({
    date: new Date(),
    amount: order.coupon.discountTotal,
    description: "refund for cancelled order",
    transactioType: "credited",
  });
  await userData.save();

  res.json({ success: true });
};

exports.returnOrder = async (req, res) => {
  const user = req.session.user;
  const { productId, orderId, returnReason } = req.body;
  const order = await orderModal.findOne({ _id: orderId });
  const orderData = await orderModal.updateOne(
    {
      _id: orderId,
      "products._id": productId,
    },
    {
      $set: {
        "products.$.status": "returned",
        "products.$.return_status": "requested",  
        "products.$.retrun_reason": returnReason,
      },
    }
  );
  res.json({ success: true });
};

exports.getOrderDetails = async (req, res) => { 
  const user = req.session.user;
  const orderId = req.params.id;
  const order = await orderModal
    .findOne({ _id: orderId })
    .populate("products.product_id");
res.render("user/orderDetails", {user, order});
}

// ================   coupon  ============

exports.applyCoupon = async (req, res) => {
  const user = req.session.user;
  const userData = await User.findOne({ email: user });
  const cartCollection = await Cart.findOne({ user_id: userData._id }).populate(
    "products.product_id"
  );
  const cartData = cartCollection.products;
  const total = cartData.reduce((acc, item) => {
    return acc + item.total_price;
  }, 0);
  const { couponCode } = req.body;
  const coupon = await couponModel.findOne({ coupon_code: couponCode });
 
  if (!coupon) {
    return res.status(404).json({ success: false, message: "Coupon not found" });
  }else if (coupon.expiry_date < Date.now()) {
    return res
      .status(400)
      .json({ success: false, message: "Coupon expired" });
  }else if (coupon.min_amount > total) {
    return res
      .status(400)
      .json({ success: false, message: "Minimum amount not reached" });
  }else if (coupon.max_amount < total) {
    return res
      .status(400)
      .json({ success: false, message: "Maximum amount exceeded" });
  }else {
    const discount = (total * coupon.discount) / 100;
    const grandtotal = total - discount;
    req.session.discount = discount;
    req.session.grandtotal = grandtotal;
    req.session.couponCode = couponCode;
    res.json({ success: true, discount, grandtotal, couponCode });
  }
};


exports.removeCoupon = async (req, res) => {
  req.session.discount = 0;
  req.session.grandtotal = 0;
  req.session.couponCode = null;
  res.json({ success: true });
};

// ==================wallet ===========================

exports.getWallet = async (req, res) => {
  const user = req.session.user;
  const userData = await User.findOne({ email: user });
  res.render("user/wallet", { user, userData });
};