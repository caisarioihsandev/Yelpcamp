const ExpressError = require('./utils/ExpressError');

// To access/load database
const db = require('./models/db_config');
let sql;

const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'You must be signed in!');
    return res.redirect('/login');
  }
  next();
};

const storeReturnTo = (req, res, next) => {
  if (req.session.returnTo) {
    res.locals.returnTo = req.session.returnTo;
  }
  next();
};

const validateCampground = (req, res, next) => {
  if (!req.body.campground)
    throw new ExpressError('Invalid Campground Data', 400);

  const { title, location, image, price, description } = req.body.campground;
  const priceNumber = Number(price);

  if (!priceNumber) {
    throw new ExpressError('Invalid Campground Data', 400);
  } else if (priceNumber < 0) {
    throw new ExpressError('Price must be greater than or equal to 0', 400);
  } else if (!title) {
    throw new ExpressError('Title must be required', 400);
  } else if (!location) {
    throw new ExpressError('Location must be required', 400);
  } else if (!image) {
    throw new ExpressError('Image must be required', 400);
  } else if (!description) {
    throw new ExpressError('Description must be required', 400);
  } else {
    next();
  }
};

const isAuthor = async (req, res, next) => {
  const campId = req.params.id;
  sql = `SELECT campgrounds.*, users.username, users.email FROM campgrounds 
      INNER JOIN users ON users.id = campgrounds.author
      WHERE campgrounds.id = ?`;

  const campground = await new Promise((resolve, reject) => {
    db.get(sql, [campId], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });

  if (campground.author !== req.user.id) {
    req.flash('error', 'You do not have permission to do that!');
    return res.redirect(`/campgrounds/${campId}`);
  }

  next();
};

const isReviewAuthor = async (req, res, next) => {
  const { id: campId, reviewId } = req.params;
  sql = `SELECT reviews.*, users.username, users.email FROM reviews 
      INNER JOIN users ON users.id = reviews.author
      WHERE reviews.id = ?`;

  const review = await new Promise((resolve, reject) => {
    db.get(sql, [reviewId], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });

  if (review.author !== req.user.id) {
    req.flash('error', 'You do not have permission to do that!');
    return res.redirect(`/campgrounds/${campId}`);
  }

  next();
};

const validateReview = (req, res, next) => {
  if (!req.body.review) throw new ExpressError('Invalid Campground Data', 400);

  const { rating, body } = req.body.review;
  const ratingNumber = Number(rating);

  if (!ratingNumber) {
    throw new ExpressError('Invalid Campground Data', 400);
  } else if (ratingNumber < 0) {
    throw new ExpressError('Price must be greater than or equal to 0', 400);
  } else if (!body) {
    throw new ExpressError('Review text must be required', 400);
  } else {
    next();
  }
};

module.exports = {
  isLoggedIn,
  storeReturnTo,
  validateCampground,
  isAuthor,
  isReviewAuthor,
  validateReview,
};
