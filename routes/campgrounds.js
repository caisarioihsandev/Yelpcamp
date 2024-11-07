const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
const { isLoggedIn } = require('../middleware');

// To access/load database
const db = require('../models/db_config');
let sql;

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

router.get(
  '/',
  catchAsync(async (req, res) => {
    // Show all campgrounds data from database
    sql = `SELECT * FROM campgrounds;`;
    const campgrounds = await new Promise((resolve, reject) => {
      db.all(sql, (err, rows) => {
        if (err) {
          return reject(err);
        }
        if (rows.length === 0) {
          console.log('There is no camp!!');
        }

        resolve(rows);
      });
    });
    res.render('campgrounds/index', { campgrounds });
  })
);

// Add New Campground page
router.get('/new', isLoggedIn, (req, res) => {
  res.render('campgrounds/new');
});

// To insert new campground
router.post(
  '/',
  isLoggedIn,
  validateCampground,
  catchAsync(async (req, res, next) => {
    sql = `INSERT INTO campgrounds (title, location, image, price, description)
        VALUES (?, ?, ?, ?, ?)`;
    const { title, location, image, price, description } = req.body.campground;
    const priceNumber = Number(price);

    const addedCampground = await new Promise((resolve, reject) => {
      db.run(
        sql,
        [title, location, image, priceNumber, description],
        function (err) {
          if (err) {
            return reject(err);
          }
          // to grab the id of insertion data
          resolve({ id: this.lastID });
        }
      );
    });

    req.flash('success', 'Succesfully made a new campground!');
    res.redirect(`/campgrounds/${addedCampground.id}`);
  })
);

// For single campground page
router.get(
  '/:id',
  catchAsync(async (req, res) => {
    const campId = req.params.id;
    sql = `SELECT * FROM campgrounds WHERE id = ?`;

    const campground = await new Promise((resolve, reject) => {
      db.get(sql, [campId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });

    sql = `SELECT * FROM reviews WHERE camp_id = ?`;
    const reviews = await new Promise((resolve, reject) => {
      db.all(sql, [campId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });

    if (!campground) {
      req.flash('error', 'Cannot find that campground!');
      res.redirect('/campgrounds');
    } else {
      res.render('campgrounds/show', { campground, reviews });
    }
  })
);

// Edit form
router.get(
  '/:id/edit',
  isLoggedIn,
  catchAsync(async (req, res) => {
    const campId = req.params.id;
    sql = `SELECT * FROM campgrounds WHERE id=?`;
    const campground = await new Promise((resolve, reject) => {
      db.get(sql, [campId], (err, rows) => {
        if (err) {
          return reject(err);
        }

        resolve(rows);
      });
    });

    if (!campground) {
      req.flash('error', 'Cannot find that campground!');
      res.redirect('/campgrounds');
    } else {
      res.render('campgrounds/edit', { campground });
    }
  })
);

// edit campground
router.put(
  '/:id',
  isLoggedIn,
  validateCampground,
  catchAsync(async (req, res) => {
    const campId = req.params.id;
    const { title, location, image, price, description } = req.body.campground;
    const priceNumber = Number(price);

    sql = `UPDATE campgrounds SET title = ?, location = ?, image = ?, price = ?, description = ? 
          WHERE id = ?`;

    const editedCampground = await new Promise((resolve, reject) => {
      db.run(
        sql,
        [title, location, image, priceNumber, description, campId],
        function (err) {
          if (err) {
            return reject(err);
          }

          resolve({ changes: this.changes });
        }
      );
    });

    if (editedCampground.changes === 0) {
      throw new ExpressError('Campground not found', 404);
    }

    req.flash('success', 'Succesfully updated campground!');
    res.redirect(`/campgrounds/${campId}`);
  })
);

// delete campground
router.delete(
  '/:id',
  isLoggedIn,
  catchAsync(async (req, res) => {
    const campId = req.params.id;

    sql = `SELECT * FROM reviews WHERE camp_id = ?`;
    const reviews = await new Promise((resolve, reject) => {
      db.all(sql, [campId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });

    if (reviews) {
      reviews.forEach(async (review) => {
        sql = `DELETE FROM reviews WHERE id = ?`;
        const deletedReview = await new Promise((resolve, reject) => {
          db.run(sql, [review.id], function (err) {
            if (err) {
              return reject(err);
            }

            resolve({ changes: this.changes });
          });
        });

        if (deletedReview.changes === 0) {
          throw new ExpressError('Review not found', 404);
        }
      });
    }

    sql = `DELETE FROM campgrounds WHERE id = ?`;

    const deletedCampground = await new Promise((resolve, reject) => {
      db.run(sql, [campId], function (err) {
        if (err) {
          return reject(err);
        }

        resolve({ changes: this.changes });
      });
    });

    if (deletedCampground.changes === 0) {
      return res.status(404).send('Campground not found');
    }

    req.flash('success', 'Succesfully deleted a campground!');
    res.redirect('/campgrounds');
  })
);

module.exports = router;
