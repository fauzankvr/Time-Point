const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    products: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "products",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
        product_price: {
          type: Number,
          required: true,
        },
        total_price: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          default: "pending",
          enum: ["pending", "delivered", "cancelled", "returned"],
        },
        return_status: {
          type: String,
          enum: ["requested", "rejected", "approved"],
        },
        retrun_reason: {
          type: String,
        },
      },
    ],
    paymentOption: {
      type: String,
      enum: ["COD", "RazorPay"],
      required: true,
    },
    grant_total_: {
      type: Number,
      required: true,
    },
    address: {
      type: Object,
      required: true,
    },
    coupon: {
      coupon_code: {
        type: String,
      },
      discountTotal: {
        type: Number,
        default:0
      }
    },
  },
  { timestamps: true }
);

const orderModal = mongoose.model("orderModal", orderSchema);
module.exports = orderModal;