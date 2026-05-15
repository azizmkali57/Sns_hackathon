// Models/contact.js

import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    phone: {
      type:     String,
      required: true,
      trim:     true,
    },
    email: {
      type:    String,
      default: null,
      trim:    true,
      lowercase: true,
    },
    relation: {
      type:     String,
      required: true,
      trim:     true,
    },
    isPrimary: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Contact ||
  mongoose.model("Contact", contactSchema);