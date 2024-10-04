const express = require("express");
const path = require('path')
const session = require('express-session')
const bcrypt = require ('bcrypt')
const nocache = require('nocache')

const passport = require ('./config/passport.js')
const flash = require('connect-flash')

// const expressLayouts = require("express-ejs-layouts");

const app = express();
const port = process.env.PORT || 3013;

require("dotenv").config();

app.use(express.json()) 
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('public'));

app.use(
  session({
    secret: "294872349872",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

app.use(passport.initialize())
app.use(passport.session())

// desabling nocache
app.use(nocache())


app.set('view engine','ejs')

// =======================routs ===========
const TimePointDB = require('./config/db.js')
const userRoutes = require('./routes/userRouts.js')
const adminRouts = require("./routes/adminRouts.js");

// Connect to MongoDB
TimePointDB()

app.use("/", userRoutes);

app.use("/", adminRouts);

app.get("*", (req, res) => {
  res.render("user/404");
});

app.listen(port, () =>
  console.log(`this is working in : http://localhost:${port}`)
);
