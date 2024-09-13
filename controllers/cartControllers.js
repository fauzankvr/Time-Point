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
      .populate("products.product_id");

    if (!cartCollection) { 
      const cartData = []
      const total = 0
      return res.render("user/cart", { user, cartData, total });
    }
    if (cartCollection) {
      // Filter products where `is_delete` is false
      cartCollection.products = cartCollection.products.filter(
        (product) => product.product_id.is_delete === false
      );
    }
    const cartData = cartCollection.products;
    
    const total = cartData.reduce((acc, item) => {
      if (item.product_id.stock > 0 ) { 
        return acc + item.total_price;    
      } 
      return acc; 
    },0)

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
      return res.json({ success: false, data: "You cant add to cart without login" });
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

      if (productInCart.quantity >= productData.stock) {
        return res.json({ success: false, data: "You added maximum quantity" }); 
      }

      productInCart.quantity += 1;
      productInCart.total_price =
        productInCart.product_price * productInCart.quantity;
    } else {
      cart.products.push({
        product_id: productId,
        product_price: productData.price,
        quantity: 1,
        total_price: productData.price * 1,
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
       
      const productData = await productModal.find({ _id: productId });
      
      if (productData[0].stock < quantity) {
            console.log(productData.stock)
            return res.json({success:false , message:"This product maximus quantity you added"});
        }
        const updatedProduct = await cartModel.updateOne(
          {
            "products.product_id": productId,
          },
          {
            $set: {
              "products.$.quantity": quantity,
              "products.$.total_price": quantity * productData[0].price,
            },
          }
      );
      const userdata = await userModal.findOne({ email: user });
      const cartCollection = await cartModel
        .findOne({ user_id: userdata._id })
        .populate("products.product_id"); 

      if (cartCollection) {
        cartCollection.products = cartCollection.products.filter(
          (product) =>
            product.product_id && product.product_id.is_delete === false
        );
      }

    
      const total = cartCollection.products.reduce((acc, crr) => acc + crr.total_price, 0)
   
        res.json({
          success: true,
          message: { name: productData[0].product_name, quantity: quantity ,total:total},
        });
    } catch (error) {
        console.log(error)
    }
}

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

