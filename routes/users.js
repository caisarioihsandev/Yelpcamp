const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');

// To access/load database
const db = require('../models/db_config');
const { storeReturnTo } = require('../middleware');
let sql;

router.get('/register', (req, res) => {
  res.render('users/register');
});

// Function to register a new user
const registerUser = async (username, email, password) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Save the new user to the database
  return new Promise((resolve, reject) => {
    sql =
      'INSERT INTO users (username, email, password, salt) VALUES (?, ?, ?, ?)';
    db.run(sql, [username, email, hashedPassword, salt], function (err) {
      if (err) return reject(err);
      // Return the newly created user object
      resolve({ id: this.lastID, username });
    });
  });
};

// Route for user registration
router.post('/register', async (req, res, next) => {
  const { username, email, password1 } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await new Promise((resolve, reject) => {
      sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
      db.get(sql, [username, email], (err, user) => {
        if (err) return reject(err);
        resolve(user);
      });
    });

    if (existingUser) {
      req.flash('error', 'User already exists.');
      res.redirect('register');
    }

    // Register the new user
    const newUser = await registerUser(username, email, password1);
    req.login(newUser, (err) => {
      if (err) {
        return next();
      }
      req.flash('success', 'Welcome to Yelpcamp!');
      res.redirect('/campgrounds');
    });
  } catch (err) {
    req.flash('error', 'Registration failed: ' + err.message);
  }
});

router.get('/login', (req, res) => {
  res.render('users/login');
});

// Route for login
router.post(
  '/login',
  storeReturnTo,
  passport.authenticate('local', {
    failureFlash: true,
    failureRedirect: '/login',
  }),
  (req, res) => {
    req.flash('success', 'Welcome back!');
    const redirectUrl = res.locals.returnTo || '/campgrounds';
    res.redirect(redirectUrl);
  }
);

// Route for logout
router.get('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash('success', 'Goodbye!');
    res.redirect('/campgrounds');
  });
});

module.exports = router;
