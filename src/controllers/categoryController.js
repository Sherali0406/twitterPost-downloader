const CategoryData = require('../schemas/category.schema');

const createCategory = async (name) => {
    try {
        const category = new CategoryData({ name });
        await category.save();
        return category;
    } catch (error) {
        throw new Error('Failed to create category');
    }
};

module.exports = { createCategory };