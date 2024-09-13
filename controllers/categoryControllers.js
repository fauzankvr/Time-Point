const categoryCollections = require('../models/categoryModel')
const productCollections = require('../models/products')

exports.getCatogoryManagment = async (req, res) => {
  const categoryData = await categoryCollections.find();
  res.render("admin/categoryManagment", { categoryData });
};

exports.postAddCategory = async (req, res) => {
    try {
        const catogoryName = req.body.category_name.trim();
       const categoryData = await categoryCollections.findOne({
         name: catogoryName,
       });
        if (!categoryData) {
             const category = new categoryCollections({
               name: catogoryName,
             });

            await category.save();
            req.flash("success", "new category added successfully");
            return res.redirect("/admin/catogoryManagment");
        
        }
        
        if (catogoryName == categoryData.name.trim()) {
          req.flash("error", "category already exist");
          return res.redirect("/admin/catogoryManagment");
        } 
           
         
        
    } catch (error) {
        console.log(error)
        req.flash("error", "category adding some issue");
        res.redirect("/admin/catogoryManagment");
    }
}

exports.blockCatogory = async (req, res) => {
    try {
        const id = req.params.id;
        await categoryCollections.findByIdAndUpdate(id, { is_delete: false });
        await productCollections.updateMany({ category_id: id }, { is_list: false });
        req.flash("success", "category unblocked successfully");
        res.redirect("/admin/catogoryManagment");
    } catch (error) {
        console.log(error)
    }
}

exports.unBlockCatogory = async (req, res) => {
    try {
        const id = req.params.id;
        await categoryCollections.findByIdAndUpdate(id, { is_delete: true });
        await productCollections.updateMany({ category_id: id }, { is_list: true });
        req.flash("success", "category blocked successfully");
        res.redirect("/admin/catogoryManagment");
    } catch (error) {
        req.flash("error", "An error occurred while blocking the category");
        res.redirect("/admin/catogoryManagment");
    }
}

exports.getEditCatogory = async (req, res) => {
    try {
        const id = req.params.id;
        const categoryDataEdit = await categoryCollections.findById(id);
        res.render("admin/editCatogory", { categoryDataEdit });
    } catch (error) {
        console.log(error)
    }
}

exports.postEditCatogory = async (req, res) => {
    try {
        const id = req.params.id;
        const catogoryName = await categoryCollections.findById(id);

        if (catogoryName.name.trim() == req.body.category_name.trim()) {
            req.flash("error", "category already exist");
            return res.redirect("/admin/catogoryManagment");
        }
        await categoryCollections.findByIdAndUpdate(id, { name: req.body.category_name });

        req.flash("success", "category updated successfully");
        res.redirect("/admin/catogoryManagment");
    } catch (error) {
        console.log(error)
    }
}