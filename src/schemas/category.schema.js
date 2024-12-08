const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name: { type: String,trim: true },
});

module.exports = mongoose.model("CategoryData", CategorySchema);
