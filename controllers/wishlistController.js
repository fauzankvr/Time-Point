const wishlistModel = require("../models/wishlistModal");
const User = require("../models/users");


exports.getWishlist = async (req, res) => {
  try {
    const user = req.session.user;
  const userData = await User.findOne({ email: req.session.user });
    const wishlist = await wishlistModel.findOne({ user_id: userData._id }).populate("products");
    if(!wishlist){
      return res.render("user/wishlist", { wishListData: [], user});
    }
  const wishListData = wishlist.products;
  res.render("user/wishlist", { wishListData, user});
  } catch (error) {
    console.log(error);
    res.json({ success: false, data: "Something went wrong in server" });
  }
};

exports.postWishlist = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.json({
        success: false,
        data: "You can't add to the wishlist without logging in",
      });
    }

    const userData = await User.findOne({ email: req.session.user });
    let wishlist = await wishlistModel.findOne({ user_id: userData._id });

    if (!wishlist) {
      wishlist = new wishlistModel({
        user_id: userData._id,
        products: [],
      });
      await wishlist.save();
    }

    const existingProductIndex = wishlist.products.findIndex(
      (product) => product._id.toString() === req.body.productId
    );

    if (existingProductIndex !== -1) {
      return res.json({
        success: false,
        data: "Product already added to wishlist",
      });
    } else {
      wishlist.products.push({ _id: req.body.productId });
    }

    await wishlist.save();
    res.json({ success: true, data: "Product added to wishlist" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, data: "Something went wrong on the server" });
  }
};



exports.deleteWishlist = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ email: req.session.user });
    const productId = req.body.product_id;
    const wishlist = await wishlistModel.findOne({ user_id: userData._id });
    const productIndex = wishlist.products.findIndex(
      (product) => product._id.toString() === productId
    );
    if (productIndex !== -1) {
      wishlist.products.splice(productIndex, 1);
      await wishlist.save();
      res.json({ success: true, data: "Product removed from wishlist" });
    } else {
      res.json({ success: false, data: "Product not found in wishlist" });
    }
  } catch (error) {
    console.log(error)
    res.json({ success: false, data: "Something went wrong in server" });
  }
};