const express = require('express');
const router = express.Router();
const passport = require('passport');
const { users } = require('../controllers/users');
const { storeReturnTo } = require('../middleware');
const { post } = require('./campgrounds');

router.route('/register').get(users.renderRegister).post(users.register);

router
  .route('/login')
  .get(users.renderLogin)
  .post(
    storeReturnTo,
    passport.authenticate('local', {
      failureFlash: true,
      failureRedirect: '/login',
    }),
    users.login
  );

// Route for logout
router.get('/logout', users.logout);

module.exports = router;
