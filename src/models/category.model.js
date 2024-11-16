const mongoose = require("mongoose");

const subcategoriesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
  },
  {
    _id: true,
  }
);

const categoriesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    subcategories: {
      type: [subcategoriesSchema],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const CategoryModel = mongoose.model(
  "Category",
  categoriesSchema,
  "categories"
);
module.exports = CategoryModel;
