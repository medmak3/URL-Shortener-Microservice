require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongo = require("mongodb");
const mongoose = require("mongoose");
const validator = require("validator");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  // Handle initial error
  .catch((err) => console.error(err))
  // Success
  .then(() => console.log("Connected to DB"));

// Handle errors after established connection
mongoose.connection.on(
  "error",
  console.error.bind(console, "Connection error")
);

// Schema
const shortUrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});

// Model
const ShortUrl = mongoose.model("ShortUrl", shortUrlSchema);

app.use(cors());

// Body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', (req,res)=> {
  const givenUrl = Object.values(req.body)[0];

  // Checking if URL is valid
  if (validator.isURL(givenUrl, { require_protocol: true })) {
    // Checking if URL is in DB
    ShortUrl.findOne({ original_url: givenUrl })
      .exec()
      .then((result) => {
        if (result) {
          // Not new
          const { original_url, short_url } = result;
          res.json({ original_url, short_url });
        } else {
          // New
          let short_url = 1;
          ShortUrl.find()
            .sort({ short_url: -1 })
            .limit(1)
            .exec()
            .then((result) => {
              console.log("====>", result)
              if (result[0] !== undefined) {
               short_url = result[0].short_url + 1;
              }
              const short = new ShortUrl({ original_url: givenUrl, short_url});
          short.save((err, short) => {
                if (err) return console.error(err);
                return console.log("URL saved");
              });
              res.json({
                original_url: givenUrl,
                short_url,
              });
            })
            .catch((err) => console.error(err));
        }
      })
      .catch((err) => console.error(err));
  } else {
    // Incorrect
    res.json({ error: "invalid url" });
  }
});

// API use shortcut
app.get("/api/shorturl/:short", (req, res) => {
  // checking if shortcut is valid
  ShortUrl.findOne({ short_url: req.params.short })
    .exec()
    .then((response) => {
      if (response) {
        res.redirect(response.original_url);
      } else {
        res.json({ error: "shortcut not found" });
      }
    })
    .catch((err) => console.error(err));
});



app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
