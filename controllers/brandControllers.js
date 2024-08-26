
const brandCollection = require ('../models/brandModel')

exports.getBrandManagment = async (req, res) => {
    try {
        brandData = await brandCollection.find();
        res.render("brandManagement", { brandData });
    } catch (error) {
        console.log(error)
    }
}

exports.postBrandManagment = async (req, res) => {
    try {
        const brandcollectin = await new brandCollection({
          name: req.body.brand_name, 
        });
        brandcollectin.save()
        req.flash("success", "new brand added successfully");
        res.redirect("/adimin/brandManagment");
    }catch(error){
        console.log(error)
        req.flash("error", "new brand added not successfully");
        res.redirect("/adimin/brandManagment");
    }
}