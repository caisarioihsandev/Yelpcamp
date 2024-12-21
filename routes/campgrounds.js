const express = require('express');
const router = express.Router();
const { isLoggedIn, isAuthor, validateCampground } = require('../middleware');
const { campgrounds } = require('../controllers/campgrounds');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });

router
  .route('/')
  .get(campgrounds.index) // All Campgrounds
  .post(
    isLoggedIn,
    upload.array('images'),
    validateCampground,
    campgrounds.createCampground
  ); // To insert new campground

// Add New Campground page
router.get('/new', isLoggedIn, campgrounds.renderNewForm);

router
  .route('/:id')
  .get(campgrounds.showCampground)
  .put(
    isLoggedIn,
    isAuthor,
    upload.array('images'),
    validateCampground,
    campgrounds.updateCampground
  )
  .delete(isLoggedIn, isAuthor, campgrounds.deleteCampground);

// Edit form
router.get('/:id/edit', isLoggedIn, isAuthor, campgrounds.renderEditForm);

module.exports = router;
