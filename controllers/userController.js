const bcrypt = require('bcrypt');
const User = require ("../models/users");
const brandCollection = require("../models/brandModel");
const categoryCollection = require('../models/categoryModel');
const productsCollection = require('../models/products');
const nodeMailer = require("nodemailer");
const otpVerification = require("../models/otpverification");
const addressModal = require('../models/addressModal');
const orderModal = require('../models/orderModal');
const mongoose = require('mongoose')

exports.home = async (req, res) => { 
  const productData = await productsCollection.find({is_delete:false}); 
  const user = req.session.user
  res.render("user/home", {productData,user});
}

exports.getRoot = async (req, res) => {
    const productData = await productsCollection.find({is_delete:false});
    const user = req.session.user;
    res.render("user/home", { productData, user }); 
}

//get login page
  exports.getLogin = (req, res) => {
    res.render("user/userLogin");
  }; 

//get sign up page

exports.getSignup = async (req, res) => {
  let invailed = req.session.invailed
  let password_invailed = req.session.password_invailed;
  res.render("user/userSignup", { invailed, password_invailed });
 
}

exports.postLogin = async (req, res) => {
  try {
    const email1 = req.body.email;
    const password = req.body.password;

    const userData = await User.findOne({ email: email1 });

    if (userData == null) {
      req.flash("invailedmessage", "You entered invalid Email");
      return res.redirect("/login");
    }
    const Mpassword = await bcrypt.compare(password, userData.password);
    if (!Mpassword) {
      req.flash("invailedmessage", "You entered incorrect Password");
      return res.redirect("/login");
    }
    if (userData.is_block) {
      req.flash("invailedmessage", "Your account has been blocked");
      return res.redirect("/login");
    }

    req.session.user = userData.email;
    res.redirect("/home");
  } catch (error) {
    console.log(error);
    res.render("user/userLogin", {
      message_error: "An error occurred during login",
    });
  }
};

// create  a transporter to send mail 
const transporter = nodeMailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_MAIL,
    pass: process.env.APP_PASSWORD,
  },
});

//Register user
exports.postSignup = async (req, res) => {
  try {
    const otpSend = `${Math.floor(100000 + Math.random() * 900000)}`; //six digit otp
    console.log(`Generated OTP: ${otpSend}`);
    const userData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
    };
    //check if user alredy exist
    req.session.invailed = null;
    const existUser = await User.findOne({
      $or: [{ email: userData.email }, { phone: userData.phone }],
    });
    if (existUser) {
      req.flash(
        "invailed",
        "user alredy exist,email or phone number are alredy use"
      );
      res.redirect("/signup");
    } else {
      // Send an email with the OTP
      const mailOption = {
        from: process.env.ADMIN_MAIL,
        to: userData.email,
        subject: "Verify Your Email From Time Point",
        html: `<p>Enter this <b>${otpSend}</b> in the app to verify email. 
      <b>This code expires in 30 minutes</b></p>`,
      };
      transporter.sendMail(mailOption);
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
      
      await otpVerification.create({
        userId: userData.email, 
        otp: otpSend,
        createdAt: Date.now(),
        expiresAt: expiresAt,
      });

      const saltRouds = 10 ;
      const hashedPassord = await bcrypt.hash(userData.password, saltRouds);
      userData.password = hashedPassord;
      req.session.userData = userData;
              
      res.redirect("/verify-otp");
    }
  }catch (error) {
    console.log(error);
  }
};


exports.postverifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("Received OTP:", otp);
    const userId = req.session.userData.email;
    const otpRecord = await otpVerification.findOne({ userId });

    if (!otpRecord) {
 
       return res.json({
         success: false,
         message: "Entered OTP is not correct",
       });
    }

  
    if (new Date() > otpRecord.expiresAt) {
       return res.json({ success: false, message: "OTP has expired" });
    }

    console.log("Provided OTP:", otp, "Stored OTP:", otpRecord.otp);
    if (otp === otpRecord.otp) {
      console.log("OTP verified successfully");

      await User.create({
        name: req.session.userData.name,
        email: req.session.userData.email,
        password: req.session.userData.password,
        phone: req.session.userData.phone,
      });
      req.session.user = req.session.userData.email;
      return res.json({ success: true, message: "OTP verified successfully" });
    } else {
      // Handle incorrect OTP case
      console.log("OTP is incorrect");
      return res.json({
        success: false,
        message: "Entered OTP is not correct",
      });
    }
  } catch (err) {
    console.log("Error:", err);
    return res.json({ success: false, message: "Internal server error" });
  }
};

exports.getVerifyOtp = (req, res) => {
  const datas = req.session.userData
  res.render("user/otpPage",{data:datas.email});
};

exports.resendOtp = async (req, res) => {
  try {
    const otpSend = `${Math.floor(100000 + Math.random() * 900000)}`;
    const userData = req.session.userData;
    console.log(`Resended OTP: ${otpSend}`);
    const mailOption = {
      from: process.env.ADMIN_MAIL,
      to: userData.email,
      subject: "Verify Your Email From Time Point",
      html: `<p>Enter this <b>${otpSend}</b> in the app to verify email. 
      <b>This code expires in 30 minutes</b></p>`,
    };
    transporter.sendMail(mailOption);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    // Store the OTP in the database
    await otpVerification.create({
      userId: userData.email, 
      otp: otpSend,
      createdAt: Date.now(),
      expiresAt: expiresAt,
    });
    res.json({ success: true, message: "OTP Resent successfully" });

  } catch (error) {
    console.log(error);
     res.json({ success: false , message: "OTP Resent some issue" });
  }
}

exports.getShowProducts = async (req, res) => {
  try {
    const { query, sort, gender, brand, category } = req.query;

    let filter = {
      is_delete: false,
      is_list: false,
    };

    if (query) {
      filter.product_name = { $regex: query, $options: "i" };
    }

    if (gender) {
      filter.gender = { $in: Array.isArray(gender) ? gender : [gender] }; // Support multiple values
    }

    if (brand) {
      filter.brand_id = { $in: Array.isArray(brand) ? brand : [brand] }; // Support multiple values
    }

    if (category) {
      filter.category_id = {
        $in: Array.isArray(category) ? category : [category],
      }; // Support multiple values
    }

    const brandData = await brandCollection.find();
    const categoryData = await categoryCollection.find({ is_delete: false });

    let sortOption = {};
    switch (sort) {
      case "asc":
        sortOption.price = 1;
        break;
      case "desc":
        sortOption.price = -1;
        break;
      case "a-z":
        sortOption.product_name = 1;
        break;
      case "z-a":
        sortOption.product_name = -1;
        break;
      default:
        sortOption = { _id: -1 }; // Default sort by newest
        break;
    }

    const productData = await productsCollection.find(filter).sort(sortOption);

    const user = req.session.user;

    res.render("user/shop", {
      brandData,
      categoryData,
      productData,
      user,
      query,
      gender,
      brand,
      category,
      sort,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Server Error");
  }
};


exports.getProductDetails = async(req, res) => {
  try {
    const id = req.params.id
    const productData = await productsCollection.findOne({ _id: id }).populate('offer')
    const user = req.session.user;
    res.render("user/productDetails",{productData,user});
  } catch (error) {
    console.log(error) 
  }
}

exports.getLogout = async (req, res) => {
   req.session.destroy((err) => {
     if (err) {
       console.log(err);
       res.redirect("/home");
     } else {
       res.redirect("/");
     } 
 });

}



exports.getProfile = async (req, res) => {
  const user = req.session.user;
  const userData = await User.findOne({ email: user });
  const addressData1 = await addressModal.find({ user_id: userData._id })
  const orderData = await orderModal
    .find({ user_id: userData._id })
    .populate("products.product_id");
  if (addressData1.length == 0) {
    return res.render("user/profile", { userData, user,orderData:[] ,addressData:[]});
  } else {
    const addressData = addressData1[0].addresses;
    res.render("user/profile", { userData, user, addressData ,orderData });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, email, phone } = req.body;
  const userData = await User.findOne({ email: email });
  userData.name = name;
  userData.phone = phone
  userData.save()
  res.redirect("/home/profile");
}; 

exports.getForgotPassword = async (req, res) => {
  res.render("user/enterEmail");
};

exports.postForgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log(email);
  const userData = await User.findOne({ email: email });
  if (!userData) {
    return res.json({ success: false, message: "not successful" });
  } else {
    const otpSend = `${Math.floor(100000 + Math.random() * 900000)}`;
    console.log(`Resended OTP: ${otpSend}`);
    const mailOption = {
      from: process.env.ADMIN_MAIL,
      to: email,
      subject: "Verify Your Email From Time Point",
      html: `<p>Enter this <b>${otpSend}</b> in the app to verify email. 
      <b>This code expires in 30 minutes</b></p>`,
    };
    transporter.sendMail(mailOption);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    // Store the OTP in the database
    await otpVerification.create({
      userId: email, // Storing email as user_id
      otp: otpSend,
      createdAt: Date.now(),
      expiresAt: expiresAt,
    });
    req.session.user = userData;
    res.json({ success: true, message: "success" });
  }
};

exports.verifyOTP = async (req, res) => {
  const { email } = req.body;
  res.render("user/otpPage2", { data: email });
};

exports.verifyOTP2 = async (req, res) => {
  const { otp } = req.body;
  const userData = await otpVerification.findOne({
    userId: req.session.user.email,
  });
  if (!userData) {
    return res.json({ success: false, message: "not successful" });
  } else {
    if (otp === userData.otp) {
      return res.json({ success: true, message: "OTP verified successfully" });
    } else {
      return res.json({ success: false, message: "Enterd OTP is not correct" });
    }
  }
};

exports.changePassword = async (req, res) => {
  res.render("user/resetPassword");
};

exports.profileChangePassword = async (req, res) => {
  res.render("user/changePassword");
};


exports.resetPassword = async (req, res) => {
  let { password } = req.body;
  const userData = await User.findOne({ email: req.session.user.email });
  password = await bcrypt.hash(password, 10);
  const updateData = await userData.updateOne({ password });
  req.session.user = userData.email;
  res.json({ success: true, message: "Password changed successfully" });
};

exports.profileResetPassword = async (req, res) => {
  let { password } = req.body;
  const userData = await User.findOne({ email: req.session.user});
  password = await bcrypt.hash(password, 10);
  const updateData = await userData.updateOne({ password });
  req.session.user = userData.email;
  res.json({ success: true, message: "Password changed successfully" });
};
  

exports.getForgotPassword = async (req, res) => {
  res.render("user/enterEmail");
};

exports.postForgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log(email);
  const userData = await User.findOne({ email: email });
  if (!userData) {
    return res.json({ success: false, message: "not successful" });
  } else {
    const otpSend = `${Math.floor(100000 + Math.random() * 900000)}`;
    console.log(`Resended OTP: ${otpSend}`);
    const mailOption = {
      from: process.env.ADMIN_MAIL,
      to: email,
      subject: "Verify Your Email From Time Point",
      html: `<p>Enter this <b>${otpSend}</b> in the app to verify email. 
      <b>This code expires in 30 minutes</b></p>`,
    };
    transporter.sendMail(mailOption);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    // Store the OTP in the database
    await otpVerification.create({
      userId: email, // Storing email as user_id
      otp: otpSend,
      createdAt: Date.now(),
      expiresAt: expiresAt,
    });
    req.session.user = userData;
    res.json({ success: true, message: "success" });
  }
};

exports.verifyOTP = async (req, res) => {
  const { email } = req.body;
  res.render("user/otpPage2", { data: email });
};

exports.verifyOTP2 = async (req, res) => {
  const { otp } = req.body;
  const userData = await otpVerification.findOne({
    userId: req.session.user.email,
  });
  if (!userData) {
    return res.json({ success: false, message: "not successful" });
  } else {
    if (otp === userData.otp) {
      return res.json({ success: true, message: "OTP verified successfully" });
    } else {
      return res.json({ success: false, message: "Enterd OTP is not correct" });
    }
  }
};


