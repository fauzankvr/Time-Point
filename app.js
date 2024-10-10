const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const nocache = require("nocache");
const passport = require("./config/passport.js");
const flash = require("connect-flash");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3013;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static("public"));

const MongoStore = require("connect-mongo");

app.use(
  session({
    secret: "294872349872",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { secure: false, maxAge: 3600000 }, // 1 hour expiration
  })
);

app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

app.use(passport.initialize());
app.use(passport.session());
app.use(nocache());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
const TimePointDB = require("./config/db.js");
const userRoutes = require("./routes/userRouts.js");
const adminRouts = require("./routes/adminRouts.js");

TimePointDB();

app.use("/", userRoutes);
app.use("/", adminRouts);

// Catch-all for 404
app.get("*", (req, res) => {
  res.render("user/404");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(err.stack);
});

app.listen(port, () =>
  console.log(`Server running at: http://localhost:${port}`)
);
