const mongoose = require("mongoose");

const urlListSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      trim: true,
      default: "Untitled upload",
    },
    urls: {
      type: [String],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one URL is required.",
      },
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("UrlList", urlListSchema);
