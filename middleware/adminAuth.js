

exports.isLoggedIn = async (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        res.redirect("/admin");
    }
}

exports.isLoggedOut = async (req,res,next) => {
    if (req.session.admin) {
      res.redirect('/admin/dashboard')
    } else {
        next()
  }
}