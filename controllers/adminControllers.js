const usersCollection = require('../models/users')
const bcrypt = require('bcrypt')

exports.getAdmin = async (req, res) => {
  res.render("admin/adminLogin");
}


exports.postAdmin = async (req, res) => {
  try {
  const { email, password } = req.body;
  const userData = await usersCollection.findOne({ email: email })
  if (userData.is_admin == true) { 
  const isPassword = await bcrypt.compare(password, userData.password);
    if (isPassword) {
      req.session.admin = userData._id; 
      return res.redirect("/admin/dashboard");
    } else {
      req.flash("invailedmessage", "You entered invalid Password");
      return res.redirect("/admin");
    }
  } 
  }catch(error){
    console.log(error)
  }
};

exports.getuseManagment = async (req, res) => {
    try {
        const userData = await usersCollection.find()
        res.render('usersManagment',{userData})
    }
    catch (error) {
        console.log(error)
    } 
 
}

exports.blockUser = async (req, res) => {
    try {
    const userId = req.params.id;
    await usersCollection.updateOne(
      { _id: userId },
        { $set: { is_block: true } }
      
    )
         res.redirect("/admin/userManagment");
    } catch (err) {
        console.log(err)
    }
}

exports.unBlockUser = async (req, res) => {
  try {
    const userId = req.params.id;
      await usersCollection.updateOne({ _id: userId }, { $set: { is_block: false } })
      res.redirect("/admin/userManagment");
  } catch (err) {  
    console.log(err);
  }
};

exports.getDashbord = async (req, res) => {
  res.render('admin/admindash');
}



