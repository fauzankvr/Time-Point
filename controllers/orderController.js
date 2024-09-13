const orderColletion = require("../models/orderModal");
const productCollection = require("../models/products");
exports.getOrderManagment = async (req, res) => {
    try {
        const orderData = await orderColletion.find().populate("user_id").populate("products.product_id")
        const items = orderData[0].products.length
        res.render("admin/orderManagment", { orderData ,items});
    } catch (error) {
        console.log(error);
    }
}

exports.orderDeliverd = async (req, res) => {
    try {
        const orderData = await orderColletion.updateOne(
            {
                _id: req.params.orderId,
                "products._id": req.params.productId
            },
            {
                $set: {
                    "products.$.status": "delivered"
                }
            }
        )
        res.redirect("/admin/orderManagment")
    } catch (error) {
        console.log(error);
    }
}

exports.orderCancel = async (req, res) => {
    const order = await orderColletion.findOne({ _id: req.params.orderId }).populate("products.product_id");
  try {
    const orderData = await orderColletion.updateOne(
      {
        _id: req.params.orderId,
        "products._id": req.params.productId,
      },
      {
        $set: {
          "products.$.status": "cancelled",
        },
      }
    );
     const update = await productCollection.updateOne(
       { _id: order.products[0].product_id },
       { $inc: { stock: order.products[0].quantity } }
     );
    res.redirect("/admin/orderManagment");
  } catch (error) {
    console.log(error);
  }
};


exports.retrunApproved = async (req, res) => {
  const order = await orderColletion
    .findOne({ _id: req.params.orderId })
    .populate("products.product_id");
  try {
    const orderData = await orderColletion.updateOne(
      {
        _id: req.params.orderId,
        "products._id": req.params.productId,
      },
      {
        $set: {
         
          "products.$.return_status": "approved",
        },
      }
    );
    const update = await productCollection.updateOne(
      { _id: order.products[0].product_id },
      { $inc: { stock: order.products[0].quantity } }
    );
    res.redirect("/admin/orderManagment");
  } catch (error) {
    console.log(error);
  }
};


exports.retrunRejected = async (req, res) => {
  const order = await orderColletion
    .findOne({ _id: req.params.orderId })
    .populate("products.product_id");
  try {
    const orderData = await orderColletion.updateOne(
      {
        _id: req.params.orderId,
        "products._id": req.params.productId,
      },
      {
        $set: {
          "products.$.return_status": "rejected",
        },
      }
    );

    res.redirect("/admin/orderManagment");
  } catch (error) {
    console.log(error);
  }
};



