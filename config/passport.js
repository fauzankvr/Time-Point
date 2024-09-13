const passport = require('passport'); 
const GoogleStategy = require('passport-google-oauth20').Strategy;
const User = require('../models/users');
const env = require('dotenv').config()

passport.use(
  new GoogleStategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        } else {
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id ,
          });
          await user.save();
          return done(null, user);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => {
      done(null, user);
    }) 
    .catch((err) => {
      console.error('Error in deserialization:', err); // Added logging
      done(err, null);
    });
});

module.exports = passport