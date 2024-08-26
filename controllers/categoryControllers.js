const categoryCollections = require('../models/categoryModel')

exports.getCatogoryManagment = async (req, res) => {
  const categoryData = await categoryCollections.find();
  res.render("categoryManagment", { categoryData });
};

exports.postAddCategory = async (req, res) => {
    try {
        const category = new categoryCollections({ name: req.body.category_name });
        await category.save();
        req.flash("success","new category added successfully");
        res.redirect("/admin/catogoryManagment");
    } catch (error) {
        console.log(error)
    }
    
}