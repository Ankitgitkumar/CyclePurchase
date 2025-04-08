// const express = require("express");
// const router = express.Router();
// const wrapAsync = require("../utils/wrapAsync.js");
// const Listing = require("../models/listing.js");
// const {isLoggedIn,isOwner,validateListing}=require("../middleware.js");
// const listingController = require("../controllers/listing.js");
// const multer  = require('multer');
// const {storage}=require("../cloudConfig.js");
// const upload = multer({storage});

// router
// .route("/")
//  .get(wrapAsync(listingController.index))
//  .post(isLoggedIn, 
//     upload.single('listing[image]'),
//     validateListing,
//  wrapAsync(listingController.createListing));



//  //New route
// router.get("/new",isLoggedIn,listingController.renderNewForm);
// router.get("/search", listingController.search);


//  router.route("/:id")
//  .get( wrapAsync(listingController.showListing))
//  .put(isLoggedIn,isOwner,
//    upload.single('listing[image]'),
//      validateListing,
//     wrapAsync(listingController.updateListing))
//     .delete(isLoggedIn,isOwner, wrapAsync(listingController.destroyListing));


// //Edit route
// router.get("/:id/edit",isLoggedIn,isOwner, wrapAsync(listingController.renderEditForm));



// module.exports = router;


const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listing.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    upload.fields([
      { name: 'listing[image]', maxCount: 1 },
      { name: 'listing[qrCode]', maxCount: 1 }
    ]),
    validateListing,
    wrapAsync(listingController.createListing)
  );

// New form route
router.get("/new", isLoggedIn, listingController.renderNewForm);

// Search route
router.get("/search", listingController.search);

// Show, Update, and Delete
router
  .route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.fields([
      { name: 'listing[image]', maxCount: 1 },
      { name: 'listing[qrCode]', maxCount: 1 }
    ]),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

// Edit form route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;
