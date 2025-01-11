const catchAsync = require('../utils/catchAsync');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapboxToken = process.env.MAPBOX_TOKEN;
const geoCoder = mbxGeocoding({ accessToken: mapboxToken });
const { cloudinary } = require('../cloudinary');

// To access/load database
const db = require('../models/db_config');
let sql;

const campgrounds = {
  index: catchAsync(async (req, res) => {
    // Show all campgrounds data with one image from database
    sql = `
      SELECT campgrounds.*, images.path AS image_url
      FROM campgrounds
      LEFT JOIN images ON campgrounds.id = images.campid
      GROUP BY campgrounds.id
    `;

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

    // Show map info from database
    sql = `SELECT geometries.*, campgrounds.title AS title, campgrounds.location AS location 
      FROM geometries LEFT JOIN campgrounds ON geometries.campid = campgrounds.id
      GROUP BY geometries.id`;
    const geo = await new Promise((resolve, reject) => {
      db.all(sql, (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });

    res.render('campgrounds/index', { campgrounds, geo });
  }),

  renderNewForm: (req, res) => {
    res.render('campgrounds/new');
  },

  createCampground: catchAsync(async (req, res, next) => {
    const { title, location, price, description } = req.body.campground;

    sql = `INSERT INTO campgrounds (title, location, price, description, author)
          VALUES (?, ?, ?, ?, ?)`;

    const priceNumber = Number(price);
    const author = req.user.id;

    const addedCampground = await new Promise((resolve, reject) => {
      db.run(
        sql,
        [title, location, priceNumber, description, author],
        function (err) {
          if (err) {
            return reject(err);
          }
          // to grab the id of insertion data
          resolve({ id: this.lastID });
        }
      );
    });

    // Adding image URL to database
    sql = `INSERT INTO images (name, path, campid) VALUES (?, ?, ?)`;
    const images = req.files;

    images.forEach(async (image) => {
      await new Promise((resolve, reject) => {
        db.run(
          sql,
          [image.filename, image.path, addedCampground.id],
          function (err) {
            if (err) {
              return reject(err);
            }
            resolve();
          }
        );
      });
    });

    // Adding geometry (type, longitude & latitude to database)
    sql = `INSERT INTO geometries (type, longitude, latitude, campid) 
        VALUES (?, ?, ?, ?)`;

    // Perform forward geocoding
    const geoData = await geoCoder
      .forwardGeocode({
        query: location,
        limit: 1,
      })
      .send();

    const geo = geoData.body.features[0].geometry;
    await new Promise((resolve, reject) => {
      db.run(
        sql,
        [geo.type, geo.coordinates[0], geo.coordinates[1], addedCampground.id],
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
  }),

  showCampground: catchAsync(async (req, res) => {
    const campId = req.params.id;

    // Show campground info from database
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

    // Show image info from database
    sql = `SELECT * FROM images WHERE campid = ?`;
    const images = await new Promise((resolve, reject) => {
      db.all(sql, [campId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });

    // Show review info from database
    sql = `SELECT reviews.*, users.username, users.email FROM reviews 
      INNER JOIN users ON users.id = reviews.author WHERE reviews.camp_id = ?`;
    const reviews = await new Promise((resolve, reject) => {
      db.all(sql, [campId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });

    // Show map info from database
    sql = `SELECT * FROM geometries WHERE campid = ?`;
    const geo = await new Promise((resolve, reject) => {
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
      res.render('campgrounds/show', { campground, images, reviews, geo });
    }
  }),

  renderEditForm: catchAsync(async (req, res) => {
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

    sql = `SELECT * FROM images WHERE campid = ?`;
    const images = await new Promise((resolve, reject) => {
      db.all(sql, [campId], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });

    res.render('campgrounds/edit', { campground, images });
  }),

  updateCampground: catchAsync(async (req, res) => {
    const campId = req.params.id;
    const author = req.user.id;
    const { title, location, price, description } = req.body.campground;
    const priceNumber = Number(price);

    sql = `UPDATE campgrounds SET title = ?, location = ?, price = ?, description = ? 
          WHERE id = ? AND author = ?`;

    await new Promise((resolve, reject) => {
      db.run(
        sql,
        [title, location, priceNumber, description, campId, author],
        function (err) {
          if (err) {
            return reject(err);
          }

          resolve({ changes: this.changes });
        }
      );
    });

    sql = `INSERT INTO images (name, path, campid) VALUES (?, ?, ?)`;
    const images = req.files;

    images.forEach(async (image) => {
      await new Promise((resolve, reject) => {
        db.run(sql, [image.filename, image.path, campId], function (err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });

    if (req.body.deleteImages) {
      const imgs = req.body.deleteImages;
      for (const filename of req.body.deleteImages) {
        // Step 1: delete from hosting (cloudinary)
        await cloudinary.uploader.destroy(filename);

        // Step 2: delete from database
        sql = `DELETE FROM images WHERE name = ?`;
        await new Promise((resolve, reject) => {
          db.run(sql, [filename], function (err) {
            if (err) {
              return reject(err);
            }

            resolve({ changes: this.changes });
          });
        });
      }
    }

    // Deleting the past geometry
    sql = `DELETE FROM geometries WHERE campid = ?`;

    await new Promise((resolve, reject) => {
      db.run(sql, [campId], function (err) {
        return reject(err);
      });
      resolve({ changes: this.changes });
    });

    // Adding geometry (type, longitude & latitude to database)
    sql = `INSERT INTO geometries (type, longitude, latitude, campid) 
        VALUES (?, ?, ?, ?)`;

    // Perform forward geocoding
    const geoData = await geoCoder
      .forwardGeocode({
        query: location,
        limit: 1,
      })
      .send();

    const geo = geoData.body.features[0].geometry;
    await new Promise((resolve, reject) => {
      db.run(
        sql,
        [geo.type, geo.coordinates[0], geo.coordinates[1], campId],
        function (err) {
          if (err) {
            return reject(err);
          }
          // to grab the id of insertion data
          resolve({ id: this.lastID });
        }
      );
    });

    req.flash('success', 'Succesfully updated campground!');
    res.redirect(`/campgrounds/${campId}`);
  }),

  deleteCampground: catchAsync(async (req, res) => {
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
      });
    }

    const author = req.user.id;
    sql = `DELETE FROM campgrounds WHERE id = ? AND author = ?`;

    const deletedCampground = await new Promise((resolve, reject) => {
      db.run(sql, [campId, author], function (err) {
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
  }),
};

module.exports = { campgrounds };
