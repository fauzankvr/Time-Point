const cartModel = require ("../models/cartModel")   
const userModal = require("../models/users")
const productModal = require("../models/products");
const { json } = require("express");

exports.getAddToCart = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await userModal.findOne({ email: user });
    if (!userData) {
      return res.status(404).send("User not found");
    }
    const cartCollection = await cartModel
      .findOne({ user_id: userData._id })
      .populate({
        path: "products.product_id",
        populate: {
          path: "offer", 
        },
      });


    if (!cartCollection) { 
      const cartData = []
      const total = 0
      return res.render("user/cart", { user, cartData, total });
    }

    if (cartCollection) {
      cartCollection.products = cartCollection.products.filter(
        (product) => product.product_id.is_delete === false
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
    

    res.render("user/cart", { user, cartData ,total });
  } catch (error) {
    console.error("Error in getAddToCart:", error);
    res.status(500).send("An error occurred while retrieving the cart");
  }
};

exports.postAddToCart = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.json({
        success: false,
        data: "You can't add to cart without logging in",
      });
    }

    const userDoc = await userModal.findOne({ email: user });
    if (!userDoc) {
      return res.status(404).send("User not found");
    }

    const userId = userDoc._id;
    let cart = await cartModel.findOne({ user_id: userId });
    if (!cart) {
      cart = new cartModel({
        user_id: userId,
        products: [],
      });
    }

    const productId = req.params.id;
    const productData = await productModal.findById(productId);
    if (!productData) {
      return res.status(404).send("Product not found");
    }

    const existingProductIndex = cart.products.findIndex(
      (p) => p.product_id.toString() === productId
    );

    if (existingProductIndex > -1) {
      const productInCart = cart.products[existingProductIndex];

      if (
        productInCart.quantity >= productData.stock ||
        productData.stock <= 0 ||
        productData.is_delete == true ||
        productInCart.quantity >= 10
      ) {
        return res.json({
          success: false,
          data: "You added the maximum quantity",
        });
      }

      productInCart.quantity += 1;
      productInCart.total_price =
        productInCart.product_price * productInCart.quantity;
    } else {
      cart.products.push({
        product_id: productId,
        product_price: productData.price,
        quantity: 1,
        total_price: productData.offer
          ? productData.discount_price
          : productData.price,
      });
    }
    await cart.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error in postAddToCart:", error);
    res.status(500).send("An error occurred");
  }
};



exports.updateQuantity = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect("/login");
    }

    const { productId, quantity } = req.body;
    const productData = await productModal.findById(productId);

    // Stock check
    if (productData.stock < quantity) {
      return res.json({
        success: false,
        message: "This product exceeds the available stock",
      });
    }

    const cartItem = await cartModel
      .findOne({
        "products.product_id": productId,
      })
      .populate("products.product_id");

    const productInCart = cartItem.products.find(
      (product) => product.product_id._id.toString() === productId
    );

   
    let updateQuery = {
      $set: {
        "products.$.quantity": quantity,
        "products.$.total_price": quantity * productData.price, 
      },
    };

    if (productInCart.product_id.offer) {
      updateQuery.$set["products.$.discount_price"] =
        quantity * productData.discount_price;
      updateQuery.$set["products.$.total_price"] =
        quantity * productData.discount_price; 
    }

 
    await cartModel.updateOne(
      { "products.product_id": productId },
      updateQuery
    );

    const userdata = await userModal.findOne({ email: user });
    const cartCollection = await cartModel
      .findOne({ user_id: userdata._id })
      .populate({
        path: "products.product_id",
        populate: {
          path: "offer",
        },
      });

    
    if (cartCollection) {
      cartCollection.products = cartCollection.products.filter(
        (product) =>
          product.product_id && product.product_id.is_delete === false 
      );
    }

    const total = cartCollection.products.reduce((acc, item) => {
      if (item.product_id.stock > 0) {
        if (
          item.product_id.offer &&
          item.product_id.offer.is_delete == false 
        ) {
          return acc + item.product_id.discount_price * item.quantity;
        } else {
          return acc + item.product_price * item.quantity;
        }
      }
      return acc;
    }, 0);
  
    res.json({
      success: true,
      message: {
        name: productData.product_name,
        quantity: quantity,
        total: total,
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "An error occurred" });
  }
};


exports.deleteItem = async (req, res) => { 
  try {
    productId = req.body.product_id;
    const user = req.session.user;
    if (!user) {
      return res.redirect("/login");
    }
    const updatedProduct = await cartModel.updateOne(
      {
        "products.product_id": productId,
      },
      {
        $pull: {
          products: { product_id: productId },
        },
      }
    );
    const userdata = await userModal.findOne({ email: user });
    const cartCollection = await cartModel.findOne({ user_id: userdata._id });
    const total = cartCollection.products.reduce((acc, crr) => acc + crr.total_price, 0)
    res.json({ success: true, total: total });
  } catch (error) {
    console.log(error)
  }
}

