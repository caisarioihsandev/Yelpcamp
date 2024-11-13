const express = require('express');
const router = express.Router({ mergeParams: true });
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
const { validateReview, isLoggedIn, isReviewAuthor } = require('../middleware');

// To access/load database
const db = require('../models/db_config');
let sql;

router.post(
  '/',
  isLoggedIn,
  validateReview,
  catchAsync(async (req, res) => {
    const campId = req.params.id;
    const author = req.user.id;
    const { rating, body } = req.body.review;
    const ratingNumber = Number(rating);

    sql = `INSERT INTO reviews (body, rating, camp_id, author) VALUES  (?, ?, ?, ?)`;
    const addedReview = await new Promise((resolve, reject) => {
      db.run(sql, [body, ratingNumber, campId, author], function (err) {
        if (err) {
          return reject(err);
        }
        // to grab the id of insertion data
        resolve({ id: this.lastID });
      });
    });

    req.flash('success', 'Created new review!');
    res.redirect(`/campgrounds/${campId}`);
  })
);

router.delete(
  '/:reviewId',
  isLoggedIn,
  isReviewAuthor,
  catchAsync(async (req, res) => {
    const { id: campId, reviewId } = req.params;
    sql = `DELETE FROM reviews WHERE id = ?`;

    const deletedReview = await new Promise((resolve, reject) => {
      db.run(sql, [reviewId], function (err) {
        if (err) {
          return reject(err);
        }

        resolve({ changes: this.changes });
      });
    });

    if (deletedReview.changes === 0) {
      throw new ExpressError('Review not found', 404);
    }

    req.flash('success', 'Deleted a review!');
    res.redirect(`/campgrounds/${campId}`);
  })
);

module.exports = router;
