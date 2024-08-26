const user = require ("../models/users");

exports.isLoggedIn = async (req, res, next) => {
  const email1 = req.session.user.email 
  const userData = await user.findOne({ email: email1 }); 
  if (req.session.user && userData.is_block == false) {
    next();
  } else {
    res.redirect("/"); 
  } 
};

exports.isLoggedOut = async (req, res, next) => {
  if (!req.session.user) {
        next();     
  } else {
        res.redirect("/home");
  }
};


