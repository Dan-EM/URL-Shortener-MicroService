require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("node:dns");
let mongoose = require("mongoose");
let bodyParser = require("body-parser");
const { hostname } = require("node:os");
const { HostAddress } = require("mongodb");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
});

// Basic Configuration
const port = process.env.PORT || 3000;

const URLShortSchema = new mongoose.Schema({
  original_url: { type: String, required: true, unique: true },
  short_url: { type: String, required: true, unique: true },
});

let URLModel = mongoose.model("url", URLShortSchema);

app.use("/", bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Short URL API endpoint
app.post("/api/shorturl", function (req, res) {
  console.log(req.body);

  let url = req.body.url;

  //Validate URL and Respond with Invalid if invalid
  try {
    urlObj = new URL(url);
    console.log(urlObj);
    dns.lookup(urlObj.hostname, (error, address, family) => {
      //if domain doesnt exist, else it does
      if (!address) {
        res.json({ error: "invalid url" });
      } else {
        let original_url = urlObj.href;
        let short_url = 1;
        URLModel.find({})
          .sort({ short_url: -1 })
          .limit(1)
          .then((latestURL) => {
            if (latestURL.length > 0) {
              short_url = Number.parseInt(latestURL[0].short_url) + 1;
            }
            resObj = {
              original_url: original_url,
              short_url: short_url,
            };
            let newUrl = new URLModel(resObj);
            newUrl.save();
            res.json(resObj);
          });
      }
    });
  } catch {
    res.json({ error: "invalid url" });
  }
});

app.get("/api/shorturl/:short_url", function (req, res) {
  let short_url = req.params.short_url;
  URLModel.findOne({ short_url: short_url }).then((foundURL) => {
    if (foundURL) {
      let oUrl = foundURL.original_url;
      res.redirect(oUrl);
    } else {
      res.json({ message: "invalid short url" });
    }
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
