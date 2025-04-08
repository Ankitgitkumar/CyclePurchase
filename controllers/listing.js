const Listing=require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index=async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm=(req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing=async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
    .populate({path: "reviews",
    populate:{
        path:"author",
    },
  })
    .populate("owner");
    if(!listing){
        req.flash("error","Listing you requested for does not exist!");
        res.redirect("/listings");
    }
    console.log(listing);
    res.render("listings/show.ejs", { listing });
};
// module.exports.createListing = async (req, res, next) => {
//   try {
//       console.log("Creating listing...");
//       console.log("Uploaded file:", req.file);

//       // Geocode the location from form input
//       const response = await geocodingClient.forwardGeocode({
//           query: req.body.listing.location,
//           limit: 1,
//       }).send();

//       console.log("Geocoding complete");

//       // Extract image info if uploaded
//       let url = req.file?.path;
//       let filename = req.file?.filename;

//       // Create the new listing
//       const newListing = new Listing(req.body.listing);
//       newListing.owner = req.user._id;
//       if (url && filename) {
//           newListing.image = { url, filename };
//       }
//       newListing.geometry = response.body.features[0]?.geometry;

//       const savedListing = await newListing.save();
//       console.log("Saved Listing:", savedListing);

//       req.flash("success", "New Listing Created!");
//       res.redirect("/listings");
//   } catch (err) {
//       console.error("Error while creating listing:", err);
//       req.flash("error", "Failed to create listing. Please try again.");
//       res.redirect("/listings/new");
//   }
// };
module.exports.createListing = async (req, res, next) => {
  try {
      console.log("Creating listing...");
      console.log("Uploaded files:", req.files); // Logs both image and qrCode

      // Geocode the location from form input
      const response = await geocodingClient.forwardGeocode({
          query: req.body.listing.location,
          limit: 1,
      }).send();

      console.log("Geocoding complete");

      // Extract image and qrCode info if uploaded
      const imageFile = req.files['listing[image]']?.[0];
      const qrCodeFile = req.files['listing[qrCode]']?.[0];
      console.log("Image file:", imageFile);
      console.log("QR Code file:", qrCodeFile);
      // Create the new listing

      const newListing = new Listing(req.body.listing);
      newListing.owner = req.user._id;

      // Set image if uploaded
      if (imageFile) {
          newListing.image = {
              url: imageFile.path,
              filename: imageFile.filename
          };
      }

      // Set QR code if uploaded
      if (qrCodeFile) {
          newListing.qrCode = {
              url: qrCodeFile.path,
              filename: qrCodeFile.filename
          };
      }

      // Set geolocation
      newListing.geometry = response.body.features[0]?.geometry;

      const savedListing = await newListing.save();
      console.log("Saved Listing:", savedListing);

      req.flash("success", "New Listing Created!");
      res.redirect("/listings");
  } catch (err) {
      console.error("Error while creating listing:", err);
      req.flash("error", "Failed to create listing. Please try again.");
      res.redirect("/listings/new");
  }
};

// module.exports.createListing = async (req, res, next) => {
//     let response=await geocodingClient.forwardGeocode({
//         query: req.body.listing.location,
//         limit: 1,
//       })
//     .send();
        
//     let url=req.file.path;
//     let filename=req.file.filename;
//     const newListing = new Listing(req.body.listing);
//     newListing.owner=req.user._id;
//     newListing.image={url,filename};
//     newListing.geometry= response.body.features[0].geometry;
//     let savedListing=await newListing.save();
//     console.log(savedListing);
//     req.flash("success","New Listing Created!");
//     res.redirect("/listings");
// };

module.exports.renderEditForm=async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
        req.flash("error","Listing you requested for does not exist!");
        res.redirect("/listings");

    }
    let originalImageUrl=listing.image.url;
    originalImageUrl=originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing=async (req, res) => {
    let { id } = req.params;
    let listing=await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    if(typeof req.file !=="undefined"){
    let url=req.file.path;
    let filename=req.file.filename;
    listing.image={url,filename};
    await listing.save();
    }
    req.flash("success","Listing updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.createListing = async (req, res) => {
  console.log("Creating listing...");
  console.log("Uploaded files:", req.files);

  const imageFile = req.files?.['listing[image]']?.[0];
  const qrCodeFile = req.files?.['listing[qrCode]']?.[0];

  let newListing = new Listing(req.body.listing);

  if (imageFile) {
    console.log("Image file:", imageFile);
    newListing.image = {
      url: imageFile.path,
      filename: imageFile.filename
    };
  }

  if (qrCodeFile) {
    console.log("QR Code file:", qrCodeFile);
    newListing.qrCode = {
      url: qrCodeFile.path,
      filename: qrCodeFile.filename
    };
  }

  newListing.owner = req.user._id;
  await newListing.save();

  console.log("Saved Listing:", newListing);
  req.flash("success", "New listing created!");
  res.redirect(`/listings/${newListing._id}`);
};

module.exports.destroyListing=async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success","Listing Deleted!");
    res.redirect("/listings");
};



//search

module.exports.search = async (req, res) => {
    console.log(req.query.q);
    let input = req.query.q.trim().replace(/\s+/g, " ");
    console.log(input);
    if (input == "" || input == " ") {
      req.flash("error", "Search value empty !!!");
      res.redirect("/listings");
    }
  
    let data = input.split("");
    let element = "";
    let flag = false;
    for (let index = 0; index < data.length; index++) {
      if (index == 0 || flag) {
        element = element + data[index].toUpperCase();
      } else {
        element = element + data[index].toLowerCase();
      }
      flag = data[index] == " ";
    }
    console.log(element);

    let allListings = await Listing.find({
      title: { $regex: element, $options: "i" },
    });
    if (allListings.length != 0) {
      res.locals.success = "Listings searched by Title";
      res.render("listings/index.ejs", { allListings });
      return;
    }
  
    if (allListings.length == 0) {
      allListings = await Listing.find({
        category: { $regex: element, $options: "i" },
      }).sort({ _id: -1 });
      if (allListings.length != 0) {
        res.locals.success = "Listings searched by Category";
        res.render("listings/index.ejs", { allListings });
        return;
      }
    }
    if (allListings.length == 0) {
      allListings = await Listing.find({
        country: { $regex: element, $options: "i" },
      }).sort({ _id: -1 });
      if (allListings.length != 0) {
        res.locals.success = "Listings searched by Location";
        res.render("listings/index.ejs", { allListings });
        return;
      }
    }
  
    const intValue = parseInt(element, 10);
    const intDec = Number.isInteger(intValue);
  
    if (allListings.length == 0 && intDec) {
      allListings = await Listing.find({ price: { $lte: element } }).sort({
        price: 1,
      });
      if (allListings.length != 0) {
        res.locals.success = `Listings searched for less than Rs ${element}`;
        res.render("listings/index.ejs", { allListings });
        return;
      }
    }
    if (allListings.length == 0) {
      req.flash("error", "Listings is not here !!!");
      console.log("Listings not found");
      res.redirect("/listings");
    }
  };


// module.exports.search = async (req, res) => {
//   console.log(req.query.q);
//   let input = req.query.q.trim().replace(/\s+/g, " ");
//   console.log(input);

//   if (input == "" || input == " ") {
//     req.flash("error", "Search value empty !!!");
//     return res.redirect("/listings");  
//   }

//   let data = input.split("");
//   let element = "";
//   let flag = false;
//   for (let index = 0; index < data.length; index++) {
//     if (index == 0 || flag) {
//       element = element + data[index].toUpperCase();
//     } else {
//       element = element + data[index].toLowerCase();
//     }
//     flag = data[index] == " ";
//   }
//   console.log(element);

//   let allListings = await Listing.find({
//     title: { $regex: element, $options: "i" },
//   });
//   if (allListings.length != 0) {
//     res.locals.success = "Listings searched by Title";
//     return res.render("listings/index.ejs", { allListings });
//   }

//   if (allListings.length == 0) {
//     allListings = await Listing.find({
//       category: { $regex: element, $options: "i" },
//     }).sort({ _id: -1 });
//     if (allListings.length != 0) {
//       res.locals.success = "Listings searched by Category";
//       return res.render("listings/index.ejs", { allListings });  
//     }
//   }

//   if (allListings.length == 0) {
//     allListings = await Listing.find({
//       country: { $regex: element, $options: "i" },
//     }).sort({ _id: -1 });
//     if (allListings.length != 0) {
//       res.locals.success = "Listings searched by Location";
//       return res.render("listings/index.ejs", { allListings });  
//     }
//   }

//   const intValue = parseInt(element, 10);
//   const intDec = Number.isInteger(intValue);

//   if (allListings.length == 0 && intDec) {
//     allListings = await Listing.find({ price: { $lte: element } }).sort({
//       price: 1,
//     });
//     if (allListings.length != 0) {
//       res.locals.success = `Listings searched for less than Rs ${element}`;
//       return res.render("listings/index.ejs", { allListings });  
//     }
//   }

  
//   req.flash("error", "Listings is not here !!!");
//   return res.redirect("/listings");  
// };


