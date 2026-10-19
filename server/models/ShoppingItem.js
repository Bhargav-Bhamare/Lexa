
const mongoose = require("mongoose");

const shoppingItemSchema = new mongoose.Schema(
  {
    name:{
      type: String,
      required: [true,"Item name is required"],
      trim: true,
      minlength: [1, "Item name cannot be empty"],
      maxlength: [100,"Item name cannot exceed 100 characters"]
    },

    quantity:{
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"]
    },

    purchased: {
      type: Boolean,
      default:false
    }
  },
  {
    timestamps:true
  }
);

module.exports = mongoose.model(
  "ShoppingItem",
  shoppingItemSchema
);
