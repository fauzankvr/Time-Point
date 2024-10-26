const usersCollection = require("../models/users");
const orderModal = require("../models/orderModal");
const productModal = require("../models/products");
const bcrypt = require("bcrypt");
const ExcelJS = require("exceljs");

exports.getAdmin = async (req, res) => {
  res.render("admin/adminLogin");
};
exports.postAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await usersCollection.findOne({ email: email });
    if (userData == null) {
      req.flash("invailedmessage", "You entered invalid Email");
      return res.redirect("/admin");
    }
    if (userData.is_admin == true) {
      const isPassword = await bcrypt.compare(password, userData.password);
      if (isPassword) {
        req.session.admin = userData._id;
        return res.redirect("/admin/dashboard");
      } else {
        req.flash("invailedmessage", "You entered invalid Password");
        return res.redirect("/admin");
      }
    } else {
      req.flash("invailedmessage", "You entered invalid Email");
      return res.redirect("/admin");
    }
  } catch (error) {
    console.log(error);
  }
};

exports.getuseManagment = async (req, res) => {
  try {
    const userData = await usersCollection.find().sort({ createdAt: -1 });
    res.render("admin/usersManagment", { userData });
  } catch (error) {
    console.log(error);
  }
};

exports.blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await usersCollection.updateOne(
      { _id: userId },
      { $set: { is_block: true } }
    );
    req.flash("success", "blocked user successfully");
    res.redirect("/admin/userManagment");
  } catch (err) {
    console.log(err);
    req.flash("error", "some issue due to blockig time");
    res.redirect("/admin/userManagment");
  }
};

exports.unBlockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await usersCollection.updateOne(
      { _id: userId },
      { $set: { is_block: false } }
    );
    req.flash("success", "Unblocked user successfully");
    res.redirect("/admin/userManagment");
  } catch (err) {
    console.log(err);
  }
};

exports.getDashbord = async (req, res) => {
  const { sort, startDate, endDate } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 7;
  const skip = (page - 1) * limit;

  let filterStartDate, filterEndDate;

  if (sort === "month") {
    const currentDate = new Date();
    filterStartDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    filterEndDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1
    );
  } else if (sort === "week") {
    const currentDate = new Date();
    const currentDay = currentDate.getDay();
    filterStartDate = new Date(
      currentDate.setDate(currentDate.getDate() - currentDay)
    );
    filterEndDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
  } else if (sort === "day") {
    filterStartDate = new Date().setHours(0, 0, 0, 0);
    filterEndDate = new Date().setHours(23, 59, 59, 999);
  } else if (startDate && endDate) {
    filterStartDate = new Date(startDate);
    filterEndDate = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    filterStartDate = new Date(0);
    filterEndDate = new Date();
  }

  const orderData = await orderModal
    .find({ createdAt: { $gte: filterStartDate, $lt: filterEndDate } })
    .skip(skip)
    .limit(limit)
    .populate("products.product_id");

  const totalOrders = orderData.reduce(
    (acc, item) => acc + item.products.length,
    0
  );

  const totalAmount1 = orderData.reduce(
    (acc, item) => acc + item.grant_total_,
    0
  );

  let totalDiscount1 = 0;
  orderData.forEach((item) => {
    item.products.forEach((product) => {
      totalDiscount1 += product.product_price * product.quantity - product.total_price;
    });
  });

  function formatIndianNumber(number) {
    const [integerPart, fractionalPart] = number.toString().split(".");
    const lastThreeDigits = integerPart.slice(-3);
    const otherDigits = integerPart.slice(0, -3);
    const formattedInteger =
      otherDigits !== ""
        ? otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") +
          "," +
          lastThreeDigits
        : lastThreeDigits;
    const formattedFractional = fractionalPart
      ? "." + fractionalPart.slice(0, 1)
      : "";
    return formattedInteger + formattedFractional;
  }

  const products = await productModal.find();
  const productCount = products.length;

  const users = await usersCollection.find();
  const usersCount = users.length;

  const totalAmount = formatIndianNumber(totalAmount1);
  const totalDiscount = formatIndianNumber(totalDiscount1);

  // chart
  const { chart } = req.query;
  let data = {};
  const currentDate = new Date();

  switch (chart) {
    case "year":
      filterStartDate = new Date(currentDate.getFullYear() - 4, 0, 1);
      filterEndDate = new Date(currentDate.getFullYear() + 1, 0, 1);

      const yearlyData = await orderModal.aggregate([
        {
          $match: {
            createdAt: { $gte: filterStartDate, $lt: filterEndDate },
          },
        },
        {
          $group: {
            _id: { $year: "$createdAt" },
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: "$grant_total_" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      let yearlyAmounts = new Array(5).fill(0);
      let yearLabels = [
        currentDate.getFullYear() - 4,
        currentDate.getFullYear() - 3,
        currentDate.getFullYear() - 2,
        currentDate.getFullYear() - 1,
        currentDate.getFullYear(),
      ];

      yearlyData.forEach((d) => {
        const index = yearLabels.indexOf(d._id);
        if (index !== -1) {
          yearlyAmounts[index] = d.totalAmount;
        }
      });
      const yearlyTotalPrice = yearlyData.reduce(
        (acc, curr) => acc + curr.totalAmount,
        0
      );

      data = {
        label: "Yearly",
        labels: yearLabels,
        values: yearlyAmounts,
        totalPrice: yearlyTotalPrice,
      };
      break;

    case "month":
      filterStartDate = new Date(currentDate.getFullYear(), 0, 1);
      filterEndDate = new Date(currentDate.getFullYear() + 1, 0, 1);

      const monthlyData = await orderModal.aggregate([
        {
          $match: {
            createdAt: { $gte: filterStartDate, $lt: filterEndDate },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: "$grant_total_" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      let monthlyAmounts = new Array(12).fill(0);
      monthlyData.forEach((d) => {
        monthlyAmounts[d._id - 1] = d.totalAmount;
      });
      const monthlyTotalPrice = monthlyData.reduce(
        (acc, curr) => acc + curr.totalAmount,
        0
      );

      data = {
        labels: [
          "JAN",
          "FEB",
          "MAR",
          "APR",
          "MAY",
          "JUN",
          "JUL",
          "AUG",
          "SEP",
          "OCT",
          "NOV",
          "DEC",
        ],
        label: "Monthly",
        values: monthlyAmounts,
        totalPrice: monthlyTotalPrice,
      };
      break;

    case "week":
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const weeklyData = await orderModal.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfWeek, $lte: endOfWeek },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: "$grant_total_" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      let weeklyAmounts = new Array(7).fill(0);
      weeklyData.forEach((d) => {
        weeklyAmounts[d._id - 1] = d.totalAmount; // Index adjustment
      });

      const weeklyTotalPrice = weeklyData.reduce(
        (acc, curr) => acc + curr.totalAmount,
        0
      );

      data = {
        labels: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
        label: "Weekly",
        values: weeklyAmounts,
        totalPrice: weeklyTotalPrice,
      };
      break;

    default:
      const startOfWeekDe = new Date(currentDate);
      startOfWeekDe.setDate(currentDate.getDate() - currentDate.getDay());
      startOfWeekDe.setHours(0, 0, 0, 0); // Set time to start of the day

      const endOfWeekDe = new Date(startOfWeekDe);
      endOfWeekDe.setDate(startOfWeekDe.getDate() + 6);
      endOfWeekDe.setHours(23, 59, 59, 999); // Set time to end of the day

      const weeklyDataDe = await orderModal.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfWeekDe, $lte: endOfWeekDe },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: "$grant_total_" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      let weeklyAmountsDe = new Array(7).fill(0);
      weeklyDataDe.forEach((d) => {
        weeklyAmountsDe[d._id - 1] = d.totalAmount;
      });

      const weeklyTotalPriceDe = weeklyDataDe.reduce(
        (acc, curr) => acc + curr.totalAmount,
        0
      );

      data = {
        labels: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
        label: "Weekly",
        values: weeklyAmountsDe,
        totalPrice: weeklyTotalPriceDe,
      };
      break;
  }

  res.render("admin/admindash", {
    data: JSON.stringify(data),
    totalOrders,
    totalAmount,
    productCount,
    usersCount,
    totalDiscount,
    orderData,
    currentPage: page,
    totalPages: Math.ceil(totalOrders / limit),
  });
};


const PDFDocument = require("pdfkit");
const fs = require("fs");

exports.generatePdf = async (req, res) => {
  const { sort, startDate, endDate } = req.query;
  let filter = {};

  if (sort === "month") {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    filter.createdAt = { $gte: startOfMonth };
  } else if (sort === "week") {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    filter.createdAt = { $gte: startOfWeek };
  } else if (sort === "day") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: startOfDay };
  } else if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }
  try {
    let orders = await orderModal.find(filter).populate("user_id");
    if (sort) {
      if (sort === "amount") {
        orders.sort((a, b) => b.grant_total_ - a.grant_total_);
      } else if (sort === "date") {
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    }
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const path = "./SalesReport.pdf";
    const writeStream = fs.createWriteStream(path);
    doc.pipe(writeStream);
    doc
      .fontSize(20)
      .text("Sales Report", { align: "center" })
      .moveDown()
      .fontSize(12)
      .text(`Sort: ${sort ? sort : "Default"}`, { align: "left" })
      .moveDown();

    doc
      .fontSize(12)
      .text("Order ID", 40, doc.y, { continued: true })
      .text("User", 130, doc.y, { continued: true })
      .text("Date", 250, doc.y, { continued: true })
      .text("Total Amount", 390, doc.y);

    generateHr(doc, doc.y + 6);
    doc.moveDown();
    orders.forEach((order) => {
      doc.fontSize(9);
      doc
        .text(order.order_id, 40, doc.y, { continued: true })
        .text(order.user_id.name, 120, doc.y, { continued: true })
        .text(order.createdAt.toDateString(), 190, doc.y, { continued: true })
        .text(formatCurrency(order.grant_total_), 310, doc.y);

      doc.moveDown();
    });
    const grandTotal = orders.reduce(
      (total, order) => total + order.grant_total_,
      0
    );
    doc
      .moveDown()
      .fontSize(12)
      .text(`Grand Total: ${grandTotal.toFixed(2)}`, { align: "right" });

    doc.end();
    writeStream.on("finish", () => {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=SalesReport.pdf"
      );
      const readStream = fs.createReadStream(path);
      readStream.pipe(res);

      readStream.on("error", (err) => {
        console.error("Error reading PDF file:", err);
        res.status(500).send("Error generating PDF");
      });
    });

    writeStream.on("error", (err) => {
      console.error("Error writing PDF file:", err);
      res.status(500).send("Error generating PDF");
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF");
  }
};

function generateHr(doc, y) {
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}

function formatCurrency(amount) {
  return amount.toFixed(2);
}


exports.generateExcel = async (req, res) => {
  const { sort, startDate, endDate } = req.query;
  const filter = {};

  if (sort === "month") {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    filter.createdAt = { $gte: startOfMonth };
  } else if (sort === "week") {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    filter.createdAt = { $gte: startOfWeek };
  } else if (sort === "day") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: startOfDay };
  } else if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  try {
    const orders = await orderModal
      .find(filter)
      .populate("user_id")
      .populate("products.product_id");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "Order ID", key: "order_id", width: 20 },
      { header: "User", key: "user", width: 30 },
      { header: "Product", key: "product", width: 30 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Payment Type", key: "payment_type", width: 20 },
      { header: "Date", key: "date", width: 20 },
      { header: "Total Amount", key: "total_amount", width: 15 },
    ];

    orders.forEach((order) => {
      order.products.forEach((product) => {
        worksheet.addRow({
          order_id: order.order_id,
          user: order.user_id.name,
          product: product.product_id.product_name,
          quantity: product.quantity,
          payment_type: order.paymentOption,
          total_amount: order.grant_total_,
          date: order.createdAt.toDateString(),
        });
      });
    });

    worksheet.addRow({
      order_id: "Grand Total",
      total_amount: orders.reduce(
        (total, order) => total + order.grant_total_,
        0
      ),
    });

    worksheet.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "sales-report.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).send("Error generating Excel report");
  }
};

exports.bestSellingProducts = async (req, res) => {
  try {
    const bestSellingProducts = await orderModal.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product_id",
          totalQuantity: { $sum: "$products.quantity" },
          totalPrice: { $sum: "$products.price" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $project: {
          _id: 0,
          product_id: "$_id",
          totalQuantity: 1,
          productDetails: { $arrayElemAt: ["$productDetails", 0] },
          product_name: { $arrayElemAt: ["$productDetails.name", 0] },
          product_image: { $arrayElemAt: ["$productDetails.image", 0] },
          product_price: { $arrayElemAt: ["$productDetails.price", 0] },
        },
      },
    ]);

    res.json(bestSellingProducts);
  } catch (error) {
    console.error("Error fetching best-selling products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.bestSellingCategories = async (req, res) => {
  try {
    const categoryProductCounts = await orderModal.aggregate([
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categorymodels",
          localField: "productDetails.category_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $group: {
          _id: "$categoryDetails.name",
          productCount: { $sum: "$products.quantity" },
          totalPrice: { $sum: "$products.total_price" },
        },
      },
      { $sort: { productCount: -1 } },
      { $limit: 10 },
    ]);

    res.json(categoryProductCounts);
  } catch (error) {
    console.error("Error fetching category product counts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.bestSellingBrands = async (req, res) => {
  try {
    const brandProductCounts = await orderModal.aggregate([
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "brandmodels",
          localField: "productDetails.brand_id",
          foreignField: "_id",
          as: "brandDetails",
        },
      },
      { $unwind: "$brandDetails" },
      {
        $group: {
          _id: "$brandDetails.name",
          productCount: { $sum: "$products.quantity" },
          totalPrice: { $sum: "$products.total_price" },
        },
      },
      { $sort: { productCount: -1 } },
      { $limit: 10 },
    ]);

    res.json(brandProductCounts);
  } catch (error) {
    console.error("Error fetching category product counts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getChart = async (req, res) => {
  async function getDailyRevenue() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const now = new Date();

    const orders = await Order.aggregate([
      { $match: { created_at: { $gte: startOfDay, $lt: now } } },
      { $group: { _id: null, totalRevenue: { $sum: "$grand_total_" } } },
    ]);

    return { labels: ["Today"], values: [orders[0]?.totalRevenue || 0] };
  }

  async function getWeeklyRevenue() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const orders = await Order.aggregate([
      { $match: { created_at: { $gte: startOfWeek, $lt: new Date() } } },
      { $group: { _id: null, totalRevenue: { $sum: "$grand_total_" } } },
    ]);

    return { labels: ["This Week"], values: [orders[0]?.totalRevenue || 0] };
  }

  async function getMonthlyRevenue() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const orders = await Order.aggregate([
      { $match: { created_at: { $gte: startOfMonth, $lt: now } } },
      { $group: { _id: null, totalRevenue: { $sum: "$grand_total_" } } },
    ]);

    return { labels: ["This Month"], values: [orders[0]?.totalRevenue || 0] };
  }

  async function getYearlyRevenue() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const orders = await Order.aggregate([
      { $match: { created_at: { $gte: startOfYear, $lt: now } } },
      { $group: { _id: null, totalRevenue: { $sum: "$grand_total_" } } },
    ]);

    return { labels: ["This Year"], values: [orders[0]?.totalRevenue || 0] };
  }

  async function getCustomDateRevenue(startDate, endDate) {
    const orders = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      { $group: { _id: null, totalRevenue: { $sum: "$grand_total_" } } },
    ]);

    return { labels: ["Custom Range"], values: [orders[0]?.totalRevenue || 0] };
  }

  const sortOption = req.query.sort1;
  const { start, end } = req.query;

  let data;

  try {
    if (sortOption === "day") {
      data = await getDailyRevenue();
    } else if (sortOption === "week") {
      data = await getWeeklyRevenue();
    } else if (sortOption === "month") {
      data = await getMonthlyRevenue();
    } else if (sortOption === "year") {
      data = await getYearlyRevenue();
    } else if (start && end) {
      data = await getCustomDateRevenue(start, end);
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching data" });
  }
};
