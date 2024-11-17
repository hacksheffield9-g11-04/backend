const mongoose = require("mongoose");

const cacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
    },
    activities: {
      type: [String],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const CacheModel = mongoose.model("Cache", cacheSchema, "caches");
module.exports = CacheModel;
