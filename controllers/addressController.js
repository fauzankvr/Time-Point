const addressModel = require("../models/addressModal")
const userModel = require ("../models/users")

exports.getAddAddress = async (req, res) => {
    const user = req.session.user
    const profile = req.query.profile;
    res.render("user/addAddress" , {user,address:"",profile});
}

exports.postAddAddress = async (req, res) => {
    const user = req.session.user
    const profile = req.body.profile  
    const userData = await userModel.findOne({ email: user });
    const { name, phone, pincode, locality, address, city, state, landmark, alternatePhone } = req.body
    let address1 = await addressModel.findOne({ user_id: userData._id })
    if(!address1){
        address1 = new addressModel({
            user_id: userData._id,
            addresses: []
        })
    }
    address1.addresses.push({
      name: name,
      phone: phone,
      pincode: pincode,
      locality: locality,
      address: address,
      city: city,
      state: state,
      landmark: landmark,
      alternatePhone: alternatePhone,
    }); 
    await address1.save()
    if(profile=="true"){
        res.redirect("/home/profile"); 
    } else {
        res.redirect("/home/deliveryAddress");
    }
    
}

exports.getEditAddress = async (req, res) => {
    const user = req.session.user
    const profile = req.query.profile;
    const id = req.params.id
    const userData = await userModel.findOne({ email: user });
    const addressData = await addressModel.findOne({ user_id: userData._id });
    if (!addressData) {
      res.redirect("/home/profile");
    }
    const address = addressData.addresses.find((address) => address._id == id);
    
    res.render("user/addAddress", { address, user ,profile});
}
  
exports.postEditAddress = async (req, res) => {
    const user = req.session.user;
    const profile = req.body.profile;
    
  const id = req.params.id;

  const userData = await userModel.findOne({ email: user });
  const addressData = await addressModel.findOne({ user_id: userData._id });
  if (!addressData) {
    res.redirect("/home/profile");
  }
  const address = addressData.addresses.find((address) => address._id == id);
  address.name = req.body.name;
  address.phone = req.body.phone;
  address.pincode = req.body.pincode;
  address.locality = req.body.locality;
  address.address = req.body.address;
  address.city = req.body.city;
  address.state = req.body.state;
  address.landmark = req.body.landmark;
  address.alternatePhone = req.body.alternatePhone;
  await addressData.save();
      if (profile == "true") {
        res.redirect("/home/profile");
      } else {
        res.redirect("/home/deliveryAddress");
      }
};

exports.deleteAddress = async (req, res)=>{
    const user = req.session.user
    const id = req.params.id
    const userData = await userModel.findOne({ email: user });
    const updatedData = await addressModel.updateOne(
        { user_id: userData._id },
        {
            $pull: {
                addresses: {
                    _id: id
                }
            }
        }
    )
    res.json({
      status: true,
      message: "Address deleted successfully",
    });

}