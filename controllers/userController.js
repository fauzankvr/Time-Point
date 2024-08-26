const bcrypt = require('bcrypt');
const user = require("../models/users");
const brandCollection = require("../models/brandModel");
const categoryCollection = require('../models/categoryModel');
const productsCollection = require('../models/products');
const nodeMailer = require("nodemailer");
const otpVerification = require("../models/otpverification");


exports.home = async (req, res) => { 
  const productData = await productsCollection.find();
  const user = req.session.user
  res.render("user/home", {productData,user});
}

exports.getRoot = async (req, res) => {
    const productData = await productsCollection.find();
    const user = req.session.user;
    res.render("user/home", { productData, user }); 
}

//get login page

exports.getLogin = async (req, res) => {
  if (req.session.user) {
    return res.redirect('/home');
  } else {
    return res.render("user/userLogin");
  }
    
}

//get sign up page

exports.getSignup = async (req, res) => {
  let invailed = req.session.invailed
  let password_invailed = req.session.password_invailed;
  res.render("user/userSignup", { invailed, password_invailed });
 
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.postLogin = async (req, res) => {
  const email1 = req.body.email;
  const password = req.body.password;
  try {
    const userData = await user.findOne({ email: email1 });
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

    req.session.user = userData; 
    res.redirect("/home");
  } catch (error) {
    console.log(error);
    res.render("userLogin", {
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
    const existUser = await user.findOne({
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
      // Store the OTP in the database
      await otpVerification.create({
        userId: userData.email, // Storing email as user_id
        otp: otpSend,
        createdAt: Date.now(),
        expiresAt: expiresAt,
      });

      //hashig password
      const saltRouds = 10 ;
      const hashedPassord = await bcrypt.hash(userData.password, saltRouds);
      userData.password = hashedPassord;
      req.session.user = userData;
      res.redirect("/verify-otp");
    }
  }catch (error) {
    console.log(error);
  }
};


exports.verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("Received OTP:", otp);

    // Fetch the most recent OTP for the user
    const userId = req.session.user.email;
    const otpRecord = await otpVerification.findOne({ userId });

    if (!otpRecord) {
      // Render with an error message if OTP is not found
       return res.json({
         success: false,
         message: "Entered OTP is not correct",
       });
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
       return res.json({ success: false, message: "OTP has expired" });
    }

    console.log("Provided OTP:", otp, "Stored OTP:", otpRecord.otp);

    // Check if the entered OTP matches the stored OTP
    if (otp === otpRecord.otp) {
      console.log("OTP verified successfully");

      // Create the user in the database
      await user.create({
        name: req.session.user.name,
        email: req.session.user.email,
        password: req.session.user.password,
        phone: req.session.user.phone,
      });

      // Clear the OTP from the database after successful verification
      await otpVerification.deleteOne({ userId });

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
  const datas = req.session.user
  res.render("user/otpPage",{data:datas.email});
};

exports.resendOtp = async (req, res) => {
  try {
    const otpSend = `${Math.floor(100000 + Math.random() * 900000)}`;
    console.log(`Resended OTP: ${otpSend}`);
    const mailOption = {
      from: process.env.ADMIN_MAIL,
      to: req.session.user.email,
      subject: "Verify Your Email From Time Point",
      html: `<p>Enter this <b>${otpSend}</b> in the app to verify email. 
      <b>This code expires in 30 minutes</b></p>`,
    }
    transporter.sendMail(mailOption);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    // Store the OTP in the database
    await otpVerification.create({
      userId: req.session.user.email, // Storing email as user_id
      otp: otpSend,
      createdAt: Date.now(),
      expiresAt: expiresAt,
    });
    res.json({ success: true, message: "OTP Resent successfully" });

  } catch (error) {
    console.log(error);
  }
}


exports.getShowProducts = async (req, res) => {
  try {
    const brandData = await brandCollection.find();
    const categoryData = await categoryCollection.find();
    const productData = await productsCollection.find()
     const user = req.session.user;
    res.render("user/shop", { brandData, categoryData, productData, user });
  } catch (error) {
    console.log(error);
  }
};

exports.getProductDetails = async(req, res) => {
  try {
    const id = req.params.id
    const productData = await productsCollection.findOne({ _id: id })
    const user = req.session.user;
    res.render("user/productDetails",{productData,user});
  } catch (error) {
    console.log(error) 
  }
}

exports.getLogout = async (req, res) => {
  req.session.destroy();
  res.redirect("/");
}