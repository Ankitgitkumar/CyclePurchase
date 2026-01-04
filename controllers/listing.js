


const Listing = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapToken });

// INDEX
module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

// NEW FORM
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// SHOW
module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: { path: "author" },
    })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  res.render("listings/show.ejs", { listing });
};

// ✅ CREATE
module.exports.createListing = async (req, res) => {
  try {
    console.log("Creating listing...");
    console.log("Uploaded files:", req.files);

    // Geocode the location
    const geoData = await geocoder.forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    }).send();

    // Create new Listing from form
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.geometry = geoData.body.features[0].geometry;

    // Handle image upload
    const imageFile = req.files?.["listing[image]"]?.[0];
    if (imageFile) {
      newListing.image = {
        url: imageFile.path,
        filename: imageFile.filename,
      };
    }

    // Handle QR code upload
    const qrCodeFile = req.files?.["listing[qrCode]"]?.[0];
    if (qrCodeFile) {
      newListing.qrCode = {
        url: qrCodeFile.path,
        filename: qrCodeFile.filename,
      };
    }

    // Save to DB
    await newListing.save();
    req.flash("success", "New listing created!");
    res.redirect(`/listings/${newListing._id}`);
  } catch (err) {
    console.error("Error while creating listing:", err);
    req.flash("error", "Failed to create listing. Please try again.");
    res.redirect("/listings/new");
  }
};

// EDIT FORM
module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }
  let originalImageUrl = listing.image?.url?.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

// UPDATE
module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  const imageFile = req.files?.["listing[image]"]?.[0];
  if (imageFile) {
    listing.image = {
      url: imageFile.path,
      filename: imageFile.filename,
    };
  }

  const qrCodeFile = req.files?.["listing[qrCode]"]?.[0];
  if (qrCodeFile) {
    listing.qrCode = {
      url: qrCodeFile.path,
      filename: qrCodeFile.filename,
    };
  }

  await listing.save();
  req.flash("success", "Listing updated!");
  res.redirect(`/listings/${id}`);
};

// DELETE
module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};

// DEMO BUY - mark listing sold (no real payment)
module.exports.buyDemo = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }
  // Owner cannot buy their own listing
  if (listing.owner.equals(req.user._id)) {
    req.flash("error", "You cannot buy your own listing");
    return res.redirect(`/listings/${id}`);
  }
  if (listing.sold) {
    req.flash("error", "This listing is already sold");
    return res.redirect(`/listings/${id}`);
  }

  listing.sold = true;
  listing.buyer = req.user._id;
  await listing.save();
  req.flash("success", "Demo purchase complete — listing marked as sold.");
  res.redirect(`/listings/${id}`);
};

// SEARCH
module.exports.search = async (req, res) => {
  let input = req.query.q.trim().replace(/\s+/g, " ");
  if (input === "") {
    req.flash("error", "Search value empty!");
    return res.redirect("/listings");
  }

  let formatted = "";
  let capitalize = true;
  for (let char of input) {
    if (capitalize) {
      formatted += char.toUpperCase();
    } else {
      formatted += char.toLowerCase();
    }
    capitalize = char === " ";
  }

  let allListings = await Listing.find({ title: { $regex: formatted, $options: "i" } });
  if (allListings.length === 0) {
    allListings = await Listing.find({ category: { $regex: formatted, $options: "i" } });
  }
  if (allListings.length === 0) {
    allListings = await Listing.find({ country: { $regex: formatted, $options: "i" } });
  }
  if (allListings.length === 0 && !isNaN(parseInt(formatted))) {
    allListings = await Listing.find({ price: { $lte: parseInt(formatted) } });
  }

  if (allListings.length === 0) {
    req.flash("error", "No matching listings found!");
    return res.redirect("/listings");
  }

  res.locals.success = "Listings filtered!";
  res.render("listings/index.ejs", { allListings });
};
