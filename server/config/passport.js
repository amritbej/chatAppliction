const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

const cleanUsername = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 20);

const makeUniqueUsername = async (profile) => {
  const emailName = profile.emails?.[0]?.value?.split("@")[0];
  let base = cleanUsername(profile.displayName || emailName || "user") || "user";
  if (base.length < 3) base = `${base}user`.slice(0, 20);
  let username = base;
  let suffix = 1;

  while (await User.exists({ username })) {
    username = `${base}${suffix}`;
    suffix += 1;
  }

  return username;
};

const configurePassport = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("Google account does not expose an email"));
          }

          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            user = await User.findOne({ email });
          }

          if (user) {
            user.googleId = user.googleId || profile.id;
            user.avatar = user.avatar || profile.photos?.[0]?.value || "";
            await user.save();
            return done(null, user);
          }

          user = await User.create({
            username: await makeUniqueUsername(profile),
            email,
            googleId: profile.id,
            authProvider: "google",
            avatar: profile.photos?.[0]?.value || "",
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      done(null, await User.findById(id));
    } catch (err) {
      done(err);
    }
  });

  return true;
};

module.exports = { configurePassport };
