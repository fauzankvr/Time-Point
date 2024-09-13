const user = require ("../models/users");

exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.session.user) {
      const userData = await user.find({ email: req.session.user });
      if (userData[0].is_block) {
        req.session.destroy();
       
        res.redirect("/");
      } else {
        next();
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error);
  }
};


exports.isLoggedOut = async (req, res, next) => {
  try {
    if (req.session.user ) {
      res.redirect("/home");
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
  }
};


