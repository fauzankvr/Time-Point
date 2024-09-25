const mongoose = require('mongoose')

function generateCustomUUID() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
async function generateUniqueOrderID() {
  let orderId;
  let orderExists = true;
  while (orderExists) {
    orderId = generateCustomUUID();
    const existingOrder = await orderModal.findOne({ order_id: orderId });
    if (!existingOrder) {
      orderExists = false; 
    }
  }
  return orderId;
}

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    order_id: {
      type: String,
      required: true,
      unique: true,
      default: async function () {
        return await generateUniqueOrderID()
      }
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
    paymentStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "paid", "failed"],
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