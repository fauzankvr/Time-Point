const User = require("../models/users");
const Product = require("../models/products");
const Address = require ("../models/addressModal");
const Cart = require("../models/cartModel");
const orderModal = require("../models/orderModal");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const couponModel = require("../models/couponModal");
const path = require('path')
const PDFDocument = require('pdfkit')
const fs=require('fs')

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

    const total = await cartData.reduce((acc, item) => {
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

    if (address.length == 0) {
      return res.render("user/deliveryAddress", {
        user,
        addressData: [],
        total,
        cartData,
      });
    }
    const addressData = address[0].addresses;
    res.render("user/deliveryAddress", { user, addressData, total, cartData });
  } catch (error) {
    console.log(error);
  }
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
      (product) => product.product_id && product.product_id.is_delete === false
    );
  }
  const cartData = cartCollection.products;

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
  res.render("user/payment", {
    user,
    addressData,
    total,
    cartData,
    discount,
    grandtotal,
    couponCode,
  });
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
    return res.json({ status: false, message: "You can not by more than 1000 with Cashon delivery" });
  }
 function generateOrderId() {
   const characters =
     "abcdefghijklmnopqrstuvwxyz0123456789";
   let orderId = "";
   for (let i = 0; i < 10; i++) {
     const randomIndex = Math.floor(Math.random() * characters.length);
     orderId += characters[randomIndex];
   }
   return orderId;
  }
  let createdOrderId=generateOrderId()
  
  const orderData = new orderModal({
    user_id: userData._id,
    order_id: createdOrderId,
    products: cartCollection.products,
    paymentOption: payment,
    grant_total_: total,
    address: matchingAddress,
    coupon: {
      coupon_code: req.session.couponCode,
      discountTotal: grandtotal,
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
    const cartCollection = await Cart.findOne({
      user_id: userData._id,
    }).populate({
      path: "products.product_id",
      populate: {
        path: "offer",
      },
    });

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

    const total = await cartCollection.products.reduce((acc, item) => {
      if (item.product_id.stock > 0) {
        if (
          item.product_id.offer &&
          item.product_id.offer.is_delete == false &&
          item.product_id.offer.offer_end_date > new Date() &&
          item.product_id.offer.offer_start_date < new Date()
        ) {
          return acc + item.total_price * item.quantity;
        } else {
          return acc + item.product_price * item.quantity;
        }
      }
      return acc;
    }, 0);
    // Validate amount
    const amount = total;
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        status: false,
        message: "Invalid amount",
      });
    }
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
    const { payment_id, order_id, signature } = req.body;
    const body = order_id + "|" + payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === signature) {
      console.log("order successful");
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
      console.log("order failed");
      res.json({ status: false });
    }
  } catch (error) {
    console.log(error);
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
    const order = await orderModal
      .findOne({ _id: orderId })
      .populate("products.product_id");

    const total = order.products.reduce((acc, item) => {
      return acc + item.product_price;
    }, 0);
    const discount = order.products.reduce((acc, item) => {
      return acc + item.total_price;
    }, 0);

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




exports.downloadInvoice = async (req, res) => {
  const { productId, orderId } = req.params;
  const order = await orderModal
    .findOne({ _id: orderId })
    .populate("products.product_id");

  // Path to save the invoice PDF
  const invoiceDir = path.join(__dirname, "invoices");
  const invoicePath = path.join(invoiceDir, `invoice_${orderId}.pdf`);

  // Check if the 'invoices' directory exists, create it if not
  if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir, { recursive: true });
  }

  const doc = new PDFDocument({ margin: 50 });
  const writeStream = fs.createWriteStream(invoicePath);
  doc.pipe(writeStream);

  // Header Section
  doc.fontSize(20).text("Tax Invoice", { align: "center" });
  doc.moveDown(1);
  doc.fontSize(14).text(`Order ID: ${orderId}`, 50, 100);
  doc.text(`Invoice No: INV-${Math.floor(Math.random() * 100000)}`, 50, 120);
  doc.text(`Order Date: ${new Date().toLocaleDateString()}`, 50, 140);

  // Seller Information
  doc.moveDown(1);
  doc
    .fontSize(12)
    .text("Sold By:", { continued: true })
    .text(" TREND IN STYLO", { align: "left" });
  doc.text("N 474, CSA colony, NEW DELHI - 110006", 50, 180);
  doc.text("GST: 07CICPA7655P1ZU", 50, 200);

  // Shipping and Billing Address
  doc.moveDown(1);
  doc
    .text("Shipping Address:", { continued: true })
    .text(order.shippingAddress || "N/A", 50, 240);
  doc
    .text("Billing Address:", { continued: true })
    .text(order.billingAddress || "N/A", 50, 280);

  // Table Headers
  doc.moveDown(1.5);
  const headers = [
    { title: "Product", width: 200 },
    { title: "Description", width: 150 },
    { title: "Qty", width: 50, align: "center" },
    { title: "Gross Amount", width: 100, align: "right" },
    { title: "Discount", width: 100, align: "right" },
    { title: "Taxable Value", width: 100, align: "right" },
    { title: "IGST", width: 100, align: "right" },
    { title: "Total", width: 100, align: "right" },
  ];

  let xPosition = 50;
  let rowPosition = 340;

  // Draw headers
  headers.forEach((header) => {
    doc.text(header.title, xPosition, rowPosition, {
      width: header.width,
      align: header.align,
    });
    xPosition += header.width;
  });

  // Reset xPosition for rows
  xPosition = 50;
  rowPosition += 20;

  // Table Rows (Product Information)
  let totalQty = 0;
  let totalAmount = 0;

  order.products.forEach((product) => {
    const qty = product.quantity;
    const price = product.product_id.price;
    const taxableValue = (price * 0.95).toFixed(2);
    const total = price.toFixed(2);

    const rowData = [
      product.product_id.product_name,
      "Some description", // Adjust this based on actual data
      qty.toString(),
      price.toFixed(2),
      "0.00",
      taxableValue,
      "5%",
      total,
    ];

    rowData.forEach((data, index) => {
      const align = headers[index].align || "left"; // Default to left if no align
      doc.text(data, xPosition, rowPosition, {
        width: headers[index].width,
        align: align,
      });
      xPosition += headers[index].width;
    });

    xPosition = 50; // Reset xPosition for the next row
    rowPosition += 20; // Increase row height

    totalQty += qty;
    totalAmount += parseFloat(total);
  });

  // Footer Section with Total and Disclaimer
  doc.moveDown(2);
  doc.text(`TOTAL QTY: ${totalQty}`, 50, rowPosition + 40);
  doc.text(`TOTAL PRICE: ${totalAmount.toFixed(2)}`, 700, rowPosition + 40, {
    align: "right",
  });

  doc.moveDown(2);
  doc.text("** Conditions Apply", 50, rowPosition + 60);
  doc.text(
    "Please refer to the product page for more details.",
    50,
    rowPosition + 80
  );
  doc.text("Ordered Through", 50, rowPosition + 100);
  doc.text("Authorized Signature", 700, rowPosition + 100, { align: "right" });

  doc.end();

  // Send the PDF file to the client once it's done writing
  writeStream.on("finish", () => {
    res.download(invoicePath);
  });

  // Error handling for the writeStream
  writeStream.on("error", (err) => {
    console.error("Error writing the PDF:", err);
    res.status(500).send("An error occurred while generating the invoice.");
  });
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

    const { couponCode } = req.body;
    const coupon = await couponModel.findOne({ coupon_code: couponCode });

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    } else if (coupon.is_delete) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    } else if (Date.now() > coupon.expiry_date) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon expired" });
    } else if (coupon.start_date > Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon not started" });
    } else if (coupon.minimum_amount > total) {
      return res
        .status(400)
        .json({ success: false, message: "Minimum amount not reached" });
    } else {
      const discount = (total * coupon.discount) / 100;
      const grandtotal = total - discount;
      req.session.discount = discount;
      req.session.grandtotal = grandtotal;
      req.session.couponCode = couponCode;

 cartCollection.products.forEach((item) => {
   let originalPrice = item.product_id.offer
     ? item.product_id.discount_price
     : item.product_price;

   // Apply the coupon discount based on original price
   item.total_price = originalPrice - (originalPrice * coupon.discount) / 100;
 });

      await cartCollection.save();
      res.json({ success: true, discount, grandtotal, couponCode });
    }
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
