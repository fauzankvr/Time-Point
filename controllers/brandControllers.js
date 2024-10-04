const brandCollection = require ('../models/brandModel')

exports.getBrandManagment = async (req, res) => {
    try {
        brandData = await brandCollection.find();
        res.render("admin/brandManagement", { brandData });
    } catch (error) {
        console.log(error)
    }
}

exports.postBrandManagment = async (req, res) => {
    try {
        const brandcollectoin = await new brandCollection({
          name: req.body.brand_name, 
        });
        brandcollectoin.save()
        req.flash("success", "new brand added successfully");
        res.redirect("/adimin/brandManagment");
    }catch(error){
        console.log(error)
        req.flash("error", "new brand added not successfully");
        res.redirect("/adimin/brandManagment");
    }
}

exports.postBlockBrand = async (req, res) => {
    try {
        const brandId = req.params.id;
        await brandCollection.updateOne(
          { _id: brandId },
            { $set: { is_delete: true } }
          
          ) 
            req.flash("success", "blocked brand successfully");
             res.redirect("/adimin/brandManagment");
    } catch (err) {
      console.log(err)
      req.flash("error", "some issue due to blockig time");
      res.redirect("/adimin/brandManagment");
    }
}

exports.postunBlockBrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    await brandCollection.updateOne({ _id: brandId }, { $set: { is_delete: false } })
    req.flash("success", "Unblocked brand successfully");
      res.redirect("/adimin/brandManagment");
  } catch (err) {  
    console.log(err);
  }
}