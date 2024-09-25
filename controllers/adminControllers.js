const usersCollection = require('../models/users')
const orderModal = require('../models/orderModal')
const productModal = require('../models/products')
const bcrypt = require('bcrypt')
const pdf = require("html-pdf");
const ExcelJS = require("exceljs");

exports.getAdmin = async (req, res) => {
  res.render("admin/adminLogin");
}


exports.postAdmin = async (req, res) => {
  try {
  const { email, password } = req.body;
  const userData = await usersCollection.findOne({ email: email })
  if(userData == null){
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
  }catch(error){
    console.log(error)
  }
};

exports.getuseManagment = async (req, res) => {
    try {
        const userData = await usersCollection.find()
        res.render('admin/usersManagment',{userData})
    }
    catch (error) {
        console.log(error)
    } 
 
}

exports.blockUser = async (req, res) => {
    try {
    const userId = req.params.id;
    await usersCollection.updateOne(
      { _id: userId },
        { $set: { is_block: true } }
      
      ) 
        req.flash("success", "blocked user successfully");
         res.redirect("/admin/userManagment");
    } catch (err) {
      console.log(err)
      req.flash("error", "some issue due to blockig time");
      res.redirect("/admin/userManagment");
    }
}

exports.unBlockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await usersCollection.updateOne({ _id: userId }, { $set: { is_block: false } })
    req.flash("success", "Unblocked user successfully");
      res.redirect("/admin/userManagment");
  } catch (err) {  
    console.log(err);
  }
};


exports.getDashbord = async (req, res) => {
  const { sort, startDate, endDate } = req.query;

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

  const orderData = await orderModal.find({
    createdAt: { $gte: filterStartDate, $lt: filterEndDate },
  }).populate("products.product_id");


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
      totalDiscount1 += product.product_price - product.total_price;
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
      // Dynamically get data for each year
      filterStartDate = new Date(currentDate.getFullYear() - 4, 0, 1); // Start 5 years ago
      filterEndDate = new Date(currentDate.getFullYear() + 1, 0, 1); // End of the current year

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
        { $sort: { _id: 1 } }, // Sort by year ascending
      ]);

      // Initialize an array of 5 years with 0 as the default value for totalAmount
      let yearlyAmounts = new Array(5).fill(0);
      let yearLabels = [
        currentDate.getFullYear() - 4,
        currentDate.getFullYear() - 3,
        currentDate.getFullYear() - 2,
        currentDate.getFullYear() - 1,
        currentDate.getFullYear(),
      ];

      // Update the values in the array for years that have data
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
        labels: yearLabels,
        values: yearlyAmounts,
        totalPrice: yearlyTotalPrice, // This array now has 0 for missing years
      };
      break;

    case "month":
      // Dynamically get data for each month of the current year
      filterStartDate = new Date(currentDate.getFullYear(), 0, 1); // Start of the year
      filterEndDate = new Date(currentDate.getFullYear() + 1, 0, 1); // Start of next year

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
        { $sort: { _id: 1 } }, // Sort by month ascending
      ]);

      // Initialize an array of 12 months with 0 as the default value for totalAmount
      let monthlyAmounts = new Array(12).fill(0);

      // Update the values in the array for months that have data
      monthlyData.forEach((d) => {
        monthlyAmounts[d._id - 1] = d.totalAmount; // -1 because array index starts at 0
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
        values: monthlyAmounts,
        totalPrice: monthlyTotalPrice, // This array now has 0 for missing months
      };
      break;

    case "week":
      // Dynamically get data for each day of the current week
      const currentDay = currentDate.getDay(); // Current day of the week (0 = Sunday)
      filterStartDate = new Date(
        currentDate.setDate(currentDate.getDate() - currentDay)
      ); // Start of the week
      filterEndDate = new Date(currentDate.setDate(currentDate.getDate() + 7)); // End of the week

      const weeklyData = await orderModal.aggregate([
        {
          $match: {
            createdAt: { $gte: filterStartDate, $lt: filterEndDate },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" }, // Group by day of the week
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: "$grant_total_" },
          },
        },
        { $sort: { _id: 1 } }, // Sort by day of the week ascending (1 = Sunday, 7 = Saturday)
      ]);

      // Initialize an array of 7 days with 0 as default values for totalAmount
      let weeklyAmounts = new Array(7).fill(0);

      // Update the values in the array for days that have data
      weeklyData.forEach((d) => {
        weeklyAmounts[d._id - 1] = d.totalAmount; // -1 because _id is 1 for Sunday
      });
 const weeklyTotalPrice = weeklyData.reduce(
   (acc, curr) => acc + curr.totalAmount,
   0
 );
 
      data = {
        labels: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
        values: weeklyAmounts,
        totalPrice: weeklyTotalPrice, // This array now has 0 for missing days
      };
      break;

    default:
      // Default to weekly data
      const currentDay1 = currentDate.getDay(); // Current day of the week (0 = Sunday)
      filterStartDate = new Date(
        currentDate.setDate(currentDate.getDate() - currentDay1)
      ); // Start of the week
      filterEndDate = new Date(currentDate.setDate(currentDate.getDate() + 7)); // End of the week

      const defaultData = await orderModal.aggregate([
        {
          $match: {
            createdAt: { $gte: filterStartDate, $lt: filterEndDate },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" }, // Group by day of the week
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: "$grant_total_" },
          },
        },
        { $sort: { _id: 1 } }, // Sort by day of the week ascending (1 = Sunday, 7 = Saturday)
      ]);

      let defaultWeeklyAmounts = new Array(7).fill(0);
      defaultData.forEach((d) => {
        defaultWeeklyAmounts[d._id - 1] = d.totalAmount;  
      });

      const defultTotalPrice = defaultData.reduce(
        (acc, curr) => acc + curr.totalAmount,
        0
      );

      data = {
        labels: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
        values: defaultWeeklyAmounts,
        totalPrice: defultTotalPrice, // This array now has 0 for missing days
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
  });
};


exports.generatePdf = async (req, res) => {
  const { sort, startDate, endDate } = req.query;
  let filter = {};

  // Filter based on the sorting criteria
  if (sort === "month") {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    filter.createdAt = { $gte: startOfMonth };
  } else if (sort === "week") {
    // Get the current date
    const currentDate = new Date();
    // Find the first day of the week (assuming Sunday as the start of the week)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Set to the last Sunday
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

    // Generate HTML content for the PDF
    const htmlContent = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
          }
          h1 {
            color: #333;
          }
          p {
            font-size: 14px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .grand-total {
            font-weight: bold;
            margin-top: 30px;
            font-size: 23px;
          }
        </style>
      </head>
      <body>
        <h1>Sales Report</h1>
        <p>Sort: ${sort ? sort : "Default"}</p>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>User</th>
              <th>Total Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .map(
                (order) => `
                  <tr>
                    <td>${order.order_id}</td>
                    <td>${order.user_id.name}</td>
                    <td>${order.grant_total_}</td>
                    <td>${order.createdAt.toDateString()}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
        <p class="grand-total">Grand Total: ${orders.reduce(
          (total, order) => total + order.grant_total_,
          0
        )}</p> 
      </body>
    </html>
    `;

    // Create PDF from HTML content
    pdf.create(htmlContent).toStream((err, stream) => {
      if (err) {
        console.error("Error creating PDF:", err);
        return res.status(500).send("Error creating PDF");
      }
      res.setHeader("Content-Type", "application/pdf");
      stream.pipe(res);
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF");
  }
};




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
    const orders = await orderModal.find(filter).populate("user_id");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    // Add column headers
    worksheet.columns = [
      { header: "Order ID", key: "order_id", width: 20 },
      { header: "User", key: "user", width: 30 },
      { header: "Total Amount", key: "total_amount", width: 15 },
      { header: "Date", key: "date", width: 20 },
    ];

    // Add rows to the worksheet
    orders.forEach((order) => {
      worksheet.addRow({
        order_id: order.order_id,
        user: order.user_id.name,
        total_amount: order.grant_total_,
        date: order.createdAt.toDateString(),
      });
    });

    // Add a grand total row at the end
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

    // Write the workbook to the response stream
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).send("Error generating Excel report");
  }
};


exports.bestSellingProducts = async (req, res)=>{
  try {
   
    const bestSellingProducts = await orderModal.aggregate([
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.product_id',
          totalQuantity: { $sum: '$products.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products', 
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $project: {
          _id: 0,
          product_id: '$_id',
          totalQuantity: 1,
          productDetails: { $arrayElemAt: ['$productDetails', 0] },
          product_name: { $arrayElemAt: ['$productDetails.name', 0] },
          product_image: { $arrayElemAt: ['$productDetails.image', 0] },
          product_price: { $arrayElemAt: ['$productDetails.price', 0] }
        }
      }
    ]);
    
    res.json(bestSellingProducts);
  } catch (error) {
    console.error('Error fetching best-selling products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

exports.bestSellingCategories = async (req, res)=>{
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
}


exports.bestSellingBrands = async (req, res) => {
  try{
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
}

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

  // Function to get revenue for the current week
  async function getWeeklyRevenue() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const orders = await Order.aggregate([
      { $match: { created_at: { $gte: startOfWeek, $lt: new Date() } } },
      { $group: { _id: null, totalRevenue: { $sum: "$grand_total_" } } },
    ]);

    return { labels: ["This Week"], values: [orders[0]?.totalRevenue || 0] };
  }

  // Function to get revenue for the current month
  async function getMonthlyRevenue() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const orders = await Order.aggregate([
      { $match: { created_at: { $gte: startOfMonth, $lt: now } } },
      { $group: { _id: null, totalRevenue: { $sum: "$grand_total_" } } },
    ]);

    return { labels: ["This Month"], values: [orders[0]?.totalRevenue || 0] };
  }

  // Function to get revenue for the current year
  async function getYearlyRevenue() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const orders = await Order.aggregate([
      { $match: { created_at: { $gte: startOfYear, $lt: now } } },
      { $group: { _id: null, totalRevenue: { $sum: "$grand_total_" } } },
    ]);

    return { labels: ["This Year"], values: [orders[0]?.totalRevenue || 0] };
  }

  // Function to get revenue for a custom date range
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

  // Route to handle fetching chart data based on the sort option
 
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