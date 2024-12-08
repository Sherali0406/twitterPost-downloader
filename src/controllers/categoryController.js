const CategoryData= require('../schemas/category.schema')

const createCategory = async (name) => {
    const category = new CategoryData({ name });
    await category.save();
    console.log('Category created:', category);
    return category;
};

module.exports = { createCategory };