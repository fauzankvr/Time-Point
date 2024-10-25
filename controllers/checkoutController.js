const User = require("../models/users");
const Product = require("../models/products");
const Address = require("../models/addressModal");
const Cart = require("../models/cartModel");
const orderModal = require("../models/orderModal");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const couponModel = require("../models/couponModal");
const pdf = require("html-pdf-node");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getdeliveryAddress = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ email: user });
    const address = await Address.find({ user_id: userData._id });

    const cartCollection = await Cart.findOne({
      user_id: userData._id,
    }).populate({
      path: "products.product_id",
      populate: {
        path: "offer",
      },
    });

    if (!cartCollection) {
      return res.redirect("/home");
    }

    if (cartCollection) {
      cartCollection.products = cartCollection.products.filter(
        (product) =>
          product.product_id && product.product_id.is_delete === false
      );
    }
    const cartData = cartCollection.products;

    const grandTotal = await cartData.reduce((acc, item) => {
      if (item.product_id.stock > 0) {
        if (
          item.product_id.offer &&
          item.product_id.offer.is_delete == false &&
          item.product_id.offer.offer_end_date > new Date() &&
          item.product_id.offer.offer_start_date < new Date()
        ) {
          return acc + item.product_id.discount_price * item.quantity;
        } else {
          return acc + item.product_id.price * item.quantity;
        }
      }
      return acc;
    }, 0);
    const total = cartData.reduce((acc, item) => {
      acc += item.product_id.price * item.quantity;
      return acc;
    }, 0);
    const discount = total - grandTotal;

    if (address.length == 0) {
      return res.render("user/deliveryAddress", {
        user,
        addressData: [],
        total,
        grandTotal,
        discount,
        cartData,
      });
    }
    const addressData = address[0].addresses;
    res.render("user/deliveryAddress", {
      user,
      addressData,
      total,
      cartData,
      grandTotal,
      discount,
    });
  } catch (error) {
    console.log(error);
  }
};
exports.getPayment = async (req, res) => {
  try {
    const user = req.session.user;
    const couponDiscount = req.session.discount;
    const couponCode = req.session.couponCode;
    let grandtotal = req.session.grandtotal;

    const userData = await User.findOne({ email: user });
    const address = await Address.find({ user_id: userData._id });
    const addressData = address[0].addresses;

    const cartCollection = await Cart.findOne({
      user_id: userData._id,
    }).populate({
      path: "products.product_id",
      populate: {
        path: "offer",
      },
    });

    if (!cartCollection) {
      return res.redirect("/home");
    }

    cartCollection.products = cartCollection.products.filter(
      (product) => product.product_id && product.product_id.is_delete === false
    );

    const cartData = cartCollection.products;
    if (!grandtotal) {
      grandtotal = cartData.reduce((acc, item) => {
        if (item.product_id.stock > 0) {
          if (
            item.product_id.offer &&
            item.product_id.offer.is_delete === false &&
            item.product_id.offer.offer_end_date > new Date() &&
            item.product_id.offer.offer_start_date < new Date()
          ) {
            acc += item.product_id.discount_price * item.quantity;
          } else {
            acc += item.product_id.price * item.quantity;
          }
        }
        return acc;
      }, 0);
    }
    const grandTotal1 = cartData.reduce((acc, item) => {
      if (item.product_id.stock > 0) {
        if (
          item.product_id.offer &&
          item.product_id.offer.is_delete === false &&
          item.product_id.offer.offer_end_date > new Date() &&
          item.product_id.offer.offer_start_date < new Date()
        ) {
          acc += item.product_id.discount_price * item.quantity;
        } else {
          acc += item.product_id.price * item.quantity;
        }
      }
      return acc;
    }, 0);

    const total = cartData.reduce((acc, item) => {
      acc += item.product_id.price * item.quantity;
      return acc;
    }, 0);

    const discount = total - grandTotal1;

    res.render("user/payment", {
      user,
      addressData,
      total,
      cartData,
      discount,
      couponDiscount,
      grandtotal,
      couponCode,
      userData,
    });
  } catch (error) {
    console.error("Error in getPayment:", error);
    res.status(500).send("An error occurred during the payment process.");
  }
};

exports.postSubmitOrder = async (req, res) => {
  const user = req.session.user;
  const setectedAddress = req.body;
  if (!setectedAddress) {
    return res.json({ success: false });
  } else {
      req.session.address = setectedAddress;
      res.json({ success: true });
  }
};

function generateCustomUUID() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateUniqueOrderID() {
  let orderId;
  let orderExists = true;
  while (orderExists) {
    orderId = generateCustomUUID();
    const existingOrder = await orderModal.findOne({ order_id: orderId });
    if (!existingOrder) {
      orderExists = false;
    }
  }
  return orderId;
}

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
      (product) => product.product_id
    );
  }
  const cartData = cartCollection.products;
  if (cartData[0].product_id.stock <= 0) {
    return res.json({ status: false, message: "Stock is empty" });
  } else if (cartData[0].product_id.is_delete == true) {
    return res.json({ status: false, message: "Product is deleted" });
  }
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
  const grandtotal = req.session.grandtotal;

  const total = await cartCollection.products.reduce((acc, item) => {
    if (item.product_id.stock > 0) {
      if (
        item.product_id.offer &&
        item.product_id.offer.is_delete == false &&
        item.product_id.offer.offer_end_date > new Date() &&
        item.product_id.offer.offer_start_date < new Date()
      ) {
        return acc + item.product_id.discount_price * item.quantity;
      } else {
        return acc + item.product_price * item.quantity;
      }
    }
    return acc;
  }, 0);
  if (total > 1000) {
    return res.json({
      status: false,
      message: "You can not by more than 1000 with Cashon delivery",
    });
  }

  const orderId = await generateUniqueOrderID();

  const orderData = new orderModal({
    user_id: userData._id,
    order_id: orderId,
    products: cartCollection.products,
    paymentOption: payment,
    grant_total_: total,
    address: matchingAddress,
    coupon: {
      coupon_code: req.session.couponCode,
      discount: req.session.couponPercentage,
    },
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
  try {
    const user = req.session.user;
    const userData = await User.findOne({ email: user });
    const order_id = req.body.orderId;
    let total = 0;
    if (order_id) {
      const orderData = await orderModal
        .findOne({ _id: order_id })
        .populate("products.product_id");
      total = orderData.products.reduce((acc, crr) => {
        if (crr.product_price == crr.total_price) {
          return (acc += crr.product_price);
        } else {
          return (acc += crr.total_price);
        }
      }, 0);
    } else {
      const cartCollection = await Cart.findOne({
        user_id: userData._id,
      }).populate({
        path: "products.product_id",
        populate: {
          path: "offer",
        },
      });

      const cartData = cartCollection.products;
      if (cartData[0].product_id.stock <= 0) {
        return res.json({ status: false, message: "Stock is empty" });
      } else if (cartData[0].product_id.is_delete == true) {
        return res.json({ status: false, message: "Product is deleted" });
      }

      if (req.session.grandtotal) {
        total = req.session.grandtotal;
      } else {
        total = await cartCollection.products.reduce((acc, item) => {
          if (item.product_id.stock > 0) {
            if (
              item.product_id.offer &&
              item.product_id.offer.is_delete == false &&
              item.product_id.offer.offer_end_date > new Date() &&
              item.product_id.offer.offer_start_date < new Date()
            ) {
              return acc + item.product_id.discount_price * item.quantity;
            } else {
              return acc + item.product_id.price * item.quantity;
            }
          }
          return acc;
        }, 0);
      }
    }
    if (total <= 0) {
      return res.json({ status: false, message: "You cant pay this amount" });
    }

    const amount = total;
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt#1",
      payment_capture: 1,
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({
      status: true,
      order_id: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      status: false,
      message: "Order creation failed. Please try again later.",
      error: error.message || "Unknown error",
    });
  }
};

exports.verifyPaymentAgain = async (req, res) => {
  console.log("in veyfy agin");
  try {
    const user = req.session.user;
    const userData = await User.findOne({ email: user });
    const { order_id, payment_id, signature, orderId } = req.body;
    const body = order_id + "|" + payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    if (signature == expectedSignature) {
      const update = await orderModal.findOneAndUpdate(
        { _id: orderId },
        { paymentStatus: "paid" }
      );
      res.json({ status: true, message: "payment success order placed" });
    } else {
      res.json({ status: false, message: "payment failed plese try agin" });
    }
  } catch (error) {
    res.json({ status: false, message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ email: user });
    const addressData = req.session.address;

    const cartCollection = await Cart.findOne({
      user_id: userData._id,
    }).populate("products.product_id");

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
    const total = await cartCollection.products.reduce((acc, item) => {
      if (item.product_id.stock > 0) {
        if (
          item.product_id.offer &&
          !item.product_id.offer.is_delete &&
          item.product_id.offer.offer_end_date > new Date() &&
          item.product_id.offer.offer_start_date < new Date()
        ) {
          return acc + item.product_id.discount_price * item.quantity;
        } else {
          return acc + item.product_price * item.quantity;
        }
      }
      return acc;
    }, 0);

    const couponCode = req.session.couponCode;
    const couponPercentage = req.session.couponPercentage;

    const { payment_id, order_id, signature } = req.body;
    const body = order_id + "|" + payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === signature) {
      const orderId = await generateUniqueOrderID();

      const orderData = new orderModal({
        user_id: userData._id,
        order_id: orderId,
        products: cartCollection.products,
        paymentOption: "RazorPay",
        grant_total_: total,
        address: matchingAddress,
        coupon: {
          coupon_code: couponCode,
          discount: couponPercentage,
        },
        paymentStatus: "paid",
      });

      await orderData.save();

      for (const item of orderData.products) {
        await Product.updateOne(
          { _id: item.product_id._id },
          { $inc: { stock: -item.quantity } }
        );
      }
      await Cart.deleteOne({ user_id: userData._id });
      res.json({
        status: true,
        message: "Payment successful and order placed!",
      });
    } else {
      const orderId = await generateUniqueOrderID();

      const failedOrderData = new orderModal({
        user_id: userData._id,
        order_id: orderId,
        products: cartCollection.products,
        paymentOption: "RazorPay",
        grant_total_: total,
        address: matchingAddress,
        coupon: {
          coupon_code: couponCode,
          discount: couponPercentage,
        },
        paymentStatus: "failed",
      });

      await failedOrderData.save();
      await Cart.deleteOne({ user_id: userData._id });

      res.json({
        status: false,
        message:
          "Payment failed. Order created with payment status 'failed'. Cart cleared.",
      });
    }
  } catch (error) {
    console.log("Error during payment verification:", error);

    res.status(500).json({
      status: false,
      message:
        "An error occurred during payment verification. Please try again later.",
    });
  }
};

exports.cancelOrder = async (req, res) => {
  const user = req.session.user;
  const userData = await User.findOne({ email: user });
  const { productId, orderId } = req.body;
  const order = await orderModal
    .findOne({ _id: orderId })
    .populate("products.product_id");
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
  userData.wallet += order.products[0].total_price;
  await userData.wallet_history.push({
    date: new Date(),
    amount: order.products[0].total_price,
    description: "refund for cancelled order",
    transactionType: "credited",
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
  try {
    const user = req.session.user;
    const orderId = req.params.id;

    const order = await orderModal.findOne({ _id: orderId }).populate({
      path: "products.product_id",
      populate: {
        path: "offer",
      },
    });
    let total = 0;
    let discount = 0;
    if (order.paymentStatus == "failed") {
      total = order.products.reduce((acc, item) => {
        if (item.product_id.stock > 0) {
          if (
            item.product_id.offer &&
            !item.product_id.offer.is_delete &&
            item.product_id.offer.offer_end_date > new Date() &&
            item.product_id.offer.offer_start_date < new Date()
          ) {
            return acc + item.product_id.discount_price * item.quantity;
          } else {
            return acc + item.product_id.price * item.quantity;
          }
        }
        return acc;
      }, 0);
      discount = order.products.reduce((acc, item) => {
        if (
          item.product_id.offer &&
          !item.product_id.offer.is_delete &&
          item.product_id.offer.offer_end_date > new Date() &&
          item.product_id.offer.offer_start_date < new Date()
        ) {
          return (
            acc +
            (item.product_id.price - item.product_id.discount_price) *
              item.quantity
          );
        } else {
          return acc;
        }
      }, 0);
    } else {
      total = order.products.reduce((acc, item) => {
        return acc + item.product_price * item.quantity;
      }, 0);
      discount = order.products.reduce((acc, item) => {
        return acc + item.total_price;
      }, 0);
      discount = discount - total;
    }

    res.render("user/orderDetails", { user, order, total, discount });
  } catch (error) {
    console.log(error);
  }
};

exports.getOrderHistory = async (req, res) => {
  const user = req.session.user;
  const userData = await User.findOne({ email: user });
  const orderData = await orderModal
    .find({ user_id: userData._id })
    .sort({ createdAt: -1 })
    .populate("products.product_id");
  res.render("user/orderList", { user, orderData });
};
const PDFDocument = require("pdfkit");

exports.downloadInvoice = async (req, res) => {
  try {
    const { productId, orderId } = req.params;
    const order = await orderModal
      .findOne({ _id: orderId })
      .select("products coupon address createdAt order_id")
      .populate({
        path: "products.product_id",
        select: "product_name price discount_price offer",
        populate: {
          path: "offer",
          select: "offer_value",
        },
      });

    const product = order.products.find(
      (p) => p.product_id._id.toString() === productId
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    let total = product.product_id.price * product.quantity;
    let grandtotal = total;
    if (product.product_id.offer) {
      grandtotal = product.product_id.discount_price * product.quantity;
    }

    let discount = 0;
    if (product.product_id.offer) {
      discount =
        (product.product_id.price - product.product_id.discount_price) *
        product.quantity;
    }

    let couponDiscount = 0;
    if (order.coupon && order.coupon.discount > 0) {
      const applicablePrice = product.product_id.offer
        ? product.product_id.discount_price
        : product.product_id.price;
      couponDiscount =
        (applicablePrice * product.quantity * order.coupon.discount) / 100;
    }

    grandtotal -= couponDiscount;
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    let filename = `invoice_${order.order_id}.pdf`;
    res.setHeader("Content-disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-type", "application/pdf");

    doc.pipe(res);

    doc.fontSize(16).text("TIME POINT", { align: "center" });
    doc
      .fontSize(8)
      .text("Your trusted partner in quality.", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(14).text("Invoice", { align: "center" });
    doc.moveDown(2);

    doc.fontSize(10).text(`Order ID: ${order.order_id}`);
    doc.text(`Order Date: ${order.createdAt.toLocaleDateString()}`);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown(1);

    doc.fontSize(12).text("Shipping Address", { underline: true });
    doc.fontSize(10).text(`${order.address.name}`);
    doc.text(`${order.address.locality}`);
    doc.text(`${order.address.address}`);
    doc.text(
      `${order.address.city} - ${order.address.pincode}, IN-${order.address.state}`
    );
    doc.moveDown(1);

    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    doc.fontSize(12).text("Product Details", { underline: true });
    doc.moveDown(0.5);
    const drawTableHeaders = (headers, y) => {
      doc.font("Helvetica-Bold").fontSize(10);
      let x = doc.page.margins.left;

      headers.forEach((header) => {
        doc.text(header.text, x + 5, y + 5, {
          width: header.width,
          align: header.align || "left",
        });
        doc.rect(x, y, header.width, 20).stroke();
        x += header.width;
      });
    };

    const drawTableRow = (row, y) => {
      doc.font("Helvetica").fontSize(9);
      let x = doc.page.margins.left;

      row.forEach((cell) => {
        doc.text(cell.text, x + 5, y + 5, {
          width: cell.width,
          align: cell.align || "left",
        });
        doc.rect(x, y, cell.width, 20).stroke();
        x += cell.width;
      });
    };

    const headers = [
      { text: "Product Name", width: 140 },
      { text: "Price", width: 80 },
      { text: "Qty", width: 60 },
      { text: "Discount", width: 80 },
      { text: "Coupon Amount", width: 80 },
    ];

    drawTableHeaders(headers, doc.y);
    let y = doc.y + 20;

    const itemRow = [
      { text: product.product_id.product_name, width: 140 },
      { text: product.product_id.price.toFixed(2), width: 80 },
      { text: product.quantity.toString(), width: 60 },
      { text: discount.toFixed(2), width: 80 },
      { text: couponDiscount.toFixed(2), width: 80 },
    ];
    drawTableRow(itemRow, y);
    y += 20;

    doc.moveDown(1);
    doc
      .fontSize(10)
      .text(`Total Price: ${grandtotal.toFixed(2)}`, { align: "right" });
    doc.moveDown(1);

    doc
      .fontSize(8)
      .text(
        "Seller Registered Address: TIME POINT, CALICUT, THAMARASHERY, KERALA - 65372."
      );
    doc.text(
      "The goods sold are intended for end user consumption and not for resale."
    );

    doc.end();
  } catch (error) {
    console.error("Error in downloadInvoice:", error);
    res.status(500).json({ error: error.message });
  }
};

// ================   coupon  ============
exports.applyCoupon = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ email: user });
    const cartCollection = await Cart.findOne({
      user_id: userData._id,
    }).populate({
      path: "products.product_id",
      populate: {
        path: "offer",
      },
    });

    const cartData = cartCollection.products;
    const total = await cartData.reduce((acc, item) => {
      if (item.product_id.stock > 0) {
        const offer = item.product_id.offer;
        let itemPrice;
        if (
          offer &&
          offer.is_delete === false &&
          offer.offer_end_date > new Date() &&
          offer.offer_start_date <= new Date()
        ) {
          itemPrice = item.product_id.discount_price;
        } else {
          itemPrice = item.product_price;
        }
        return acc + itemPrice * item.quantity;
      }
      return acc;
    }, 0);
    const { couponCode } = req.body;
    const coupon = await couponModel.findOne({ coupon_code: couponCode });
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }
    if (coupon.is_delete) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }
    if (new Date() > coupon.expiry_date) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon expired" });
    }
    if (new Date() < coupon.start_date) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon not started" });
    }
    if (coupon.minimum_amount > total) {
      return res
        .status(400)
        .json({ success: false, message: "Minimum amount not reached" });
    }
    const discount = (total * coupon.discount) / 100;
    const grandtotal = total - discount;

    req.session.discount = discount;
    req.session.grandtotal = grandtotal;
    req.session.couponCode = couponCode;
    req.session.couponPercentage = coupon.discount;

    cartData.forEach((item) => {
      const offer = item.product_id.offer;

      let originalPrice;
      if (
        offer &&
        offer.is_delete === false &&
        offer.offer_start_date <= new Date() &&
        offer.offer_end_date >= new Date()
      ) {
        originalPrice = item.product_id.discount_price;
        item.total_price =
          originalPrice * item.quantity -
          ((originalPrice * coupon.discount) / 100) * item.quantity;
      } else {
        originalPrice = item.product_id.price;
        item.product_price =
          originalPrice * item.quantity -
          ((originalPrice * coupon.discount) / 100) * item.quantity;
      }
    });
    await cartCollection.save();

    res.json({ success: true, total, discount, grandtotal, couponCode });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

exports.removeCoupon = async (req, res) => {
  try {
    req.session.discount = 0;
    req.session.grandtotal = 0;
    req.session.couponCode = null;
    req.session.couponPercentage = 0;

    const user = req.session.user;
    const userData = await User.findOne({ email: user });

    const cartCollection = await Cart.findOne({
      user_id: userData._id,
    }).populate({
      path: "products.product_id",
      populate: {
        path: "offer",
      },
    });

    const cartData = cartCollection.products;

    cartData.forEach((item) => {
      if (item.product_id.offer) {
        const offerDiscountPrice =
          item.product_id.price -
          (item.product_id.price * item.product_id.offer.offer_percentage) /
            100;

        item.product_id.discount_price = offerDiscountPrice;
        item.total_price = offerDiscountPrice * item.quantity;
      } else {
        item.total_price = item.product_price * item.quantity;
      }
    });

    await cartCollection.save();
    res.json({ success: true });
  } catch (error) {
    console.log("Error removing coupon: ", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to remove coupon" });
  }
};

// ==================wallet ===========================

exports.getWallet = async (req, res) => {
  const user = req.session.user;
  const userData = await User.findOne({ email: user });
  res.render("user/wallet", { user, userData });
};

exports.addMoney = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ email: user });
    const amount = req.body.amount;
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt#1",
      payment_capture: 1,
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({
      status: true,
      order_id: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY,
    });
  } catch (error) {
    console.error("Error in addMoney:", error);
    res.status(500).json({ status: false, message: "Failed to create order" });
  }
};

exports.verifyaddMoney = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ email: user });

    const { payment_id, order_id, signature } = req.body;
    const crypto = require("crypto");
    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    shasum.update(order_id + "|" + payment_id);
    const digest = shasum.digest("hex");

    if (digest !== signature) {
      return res.json({ status: false });
    } else {
      const amount = req.body.amount;
      const total = amount;
      userData.wallet += total;
      userData.wallet_history.push({
        amount: total,
        transactionType: "credited",
        date: new Date(),
        description: "Add Money use wallet",
      });

      await userData.save();
      return res.json({ status: true });
    }
  } catch (error) {
    console.error("Error in verifyaddMoney:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

exports.walletPayment = async (req, res) => {
  try {
    const couponCode = req.session.couponCode;
    const couponPercentage = req.session.couponPercentage;
    const user = req.session.user;
    const addressData = req.session.address;
    const userData = await User.findOne({ email: user });
    const cartCollection = await Cart.findOne({
      user_id: userData._id,
    }).populate({
      path: "products.product_id",
      populate: {
        path: "offer",
      },
    });

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
    if (cartData[0].product_id.stock <= 0) {
      return res.json({ status: false, message: "Stock is empty" });
    } else if (cartData[0].product_id.is_delete == true) {
      return res.json({ status: false, message: "Product is deleted" });
    }

    if (req.session.grandtotal) {
      total = req.session.grandtotal;
    } else {
      total = await cartCollection.products.reduce((acc, item) => {
        if (item.product_id.stock > 0) {
          if (
            item.product_id.offer &&
            item.product_id.offer.is_delete == false &&
            item.product_id.offer.offer_end_date > new Date() &&
            item.product_id.offer.offer_start_date < new Date()
          ) {
            return acc + item.product_id.discount_price * item.quantity;
          } else {
            return acc + item.product_id.price * item.quantity;
          }
        }
        return acc;
      }, 0);
    }

    if (total > userData.wallet) {
      return res.json({
        status: false,
        message: "Your wallet balance is low please try another way",
      });
    } else {
      userData.wallet -= total;
      userData.wallet_history.push({
        amount: total,
        transactionType: "debited",
        date: new Date(),
        description: "Order product use wallet money",
      });
      const orderId = await generateUniqueOrderID();

      const orderData = new orderModal({
        user_id: userData._id,
        order_id: orderId,
        products: cartCollection.products,
        paymentOption: "Wallet",
        grant_total_: total,
        address: matchingAddress,
        coupon: {
          coupon_code: couponCode,
          discount: couponPercentage,
        },
        paymentStatus: "paid",
      });

      await orderData.save();
      await userData.save();
      await Cart.deleteOne({ user_id: userData._id });
      return res.json({ status: true });
    }
  } catch (error) {
    console.error("Error in walletPayment:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};
