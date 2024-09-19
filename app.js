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

app.get('/', (req, res) => {
  res.render('home');
});

app.get(
  '/campgrounds',
  catchAsync(async (req, res) => {
    // Show all campgrounds data from database
    try {
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
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  })
);

// Add New Campground page
app.get('/campgrounds/new', (req, res) => {
  res.render('campgrounds/new');
});

// To insert new campground
app.post(
  '/campgrounds',
  catchAsync(async (req, res, next) => {
    if (!req.body.campground)
      throw new ExpressError('Invalid Campground Data', 400);

    sql = `INSERT INTO campgrounds (title, location, image, price, description)
      VALUES (?, ?, ?, ?, ?)`;
    const { title, location, image, price, description } = req.body.campground;
    const priceNumber = Number(price);

    if (!priceNumber) {
      throw new ExpressError('Invalid Campground Data', 400);
    } else if (priceNumber < 0) {
      throw new ExpressError('Price must be greater than 0', 400);
    }

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
    sql = `SELECT * FROM campgrounds WHERE id=?`;
    const campground = await new Promise((resolve, reject) => {
      db.get(sql, [campId], (err, rows) => {
        if (err) {
          return reject(err);
        }

        resolve(rows);
      });
    });
    res.render('campgrounds/show', { campground });
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
          console.log('There is no camp!!');
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
  catchAsync(async (req, res) => {
    if (!req.body.campground)
      throw new ExpressError('Invalid Campground Data', 400);
    const campId = req.params.id;
    const { title, location, image, price, description } = req.body.campground;
    const priceNumber = Number(price);

    if (!priceNumber) {
      throw new ExpressError('Invalid Campground Data', 400);
    } else if (priceNumber < 0) {
      throw new ExpressError('Price must be greater than 0', 400);
    }

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
      return res.status(404).send('Campground not found');
    }

    res.redirect(`/campgrounds/${campId}`);
  })
);

// delete campground
app.delete(
  '/campgrounds/:id',
  catchAsync(async (req, res) => {
    const campId = req.params.id;
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
