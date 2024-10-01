const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');

const app = express();
const port = 3000;

// To access/load database
const db = require('./models/db_config');
let sql;

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

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

app.get('/', (req, res) => {
  res.render('home');
});

app.get(
  '/campgrounds',
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
app.get('/campgrounds/new', (req, res) => {
  res.render('campgrounds/new');
});

// To insert new campground
app.post(
  '/campgrounds',
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

    res.redirect(`/campgrounds/${addedCampground.id}`);
  })
);

// For single campground page
app.get(
  '/campgrounds/:id',
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

    res.render('campgrounds/show', { campground, reviews });
  })
);

// Edit form
app.get(
  '/campgrounds/:id/edit',
  catchAsync(async (req, res) => {
    const campId = req.params.id;
    sql = `SELECT * FROM campgrounds WHERE id=?`;
    const campground = await new Promise((resolve, reject) => {
      db.get(sql, [campId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        if (!rows) {
          throw new ExpressError('There is no camp!!', 400);
        }

        resolve(rows);
      });
    });
    res.render('campgrounds/edit', { campground });
  })
);

// edit campground
app.put(
  '/campgrounds/:id',
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

    res.redirect(`/campgrounds/${campId}`);
  })
);

// delete campground
app.delete(
  '/campgrounds/:id',
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

    res.redirect('/campgrounds');
  })
);

app.post(
  '/campgrounds/:id/reviews',
  catchAsync(async (req, res) => {
    const campId = req.params.id;
    const { rating, body } = req.body.review;
    const ratingNumber = Number(rating);

    sql = `INSERT INTO reviews (body, rating, camp_id) VALUES  (?, ?, ?)`;
    const addedReview = await new Promise((resolve, reject) => {
      db.run(sql, [body, ratingNumber, campId], function (err) {
        if (err) {
          return reject(err);
        }
        // to grab the id of insertion data
        resolve({ id: this.lastID });
      });
    });

    res.redirect(`/campgrounds/${campId}`);
  })
);

app.delete(
  '/campgrounds/:id/reviews/:reviewId',
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

    res.redirect(`/campgrounds/${campId}`);
  })
);

app.all('*', (req, res, next) => {
  next(new ExpressError('Page Not Found'), 404);
});

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = 'Something went wrong!';
  res.status(statusCode).render('error', { err });
});

app.listen(port, () => {
  console.log(`Serving on port ${port}`);
});
