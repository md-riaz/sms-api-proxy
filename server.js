const express = require("express");
const morgan = require("morgan");
const url = require("url");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
require("dotenv").config();

// Create Express Server
const app = express();

// enable request from any origin
app.use(cors());

// for parsing application/json
app.use(express.json());

// Logging
app.use(morgan("dev"));

// Configuration
const PORT = process.env.PORT || 3000;
const API_SERVICE_URL = process.env.API_SERVICE_URL;

// Info GET endpoint
app.get("/info", (req, res, next) => {
  res.send(
    `This is a proxy service which proxies to ${process.env.API_SERVICE_URL}`
  );
});

app.post("/post", (req, res, next) => {
  console.log(req.body);
  res.json(req.body);
});

app.use(
  "/",
  createProxyMiddleware({
    target: API_SERVICE_URL,
    changeOrigin: true,
    secure: false,
    onProxyReq: function onProxyReq(proxyReq, req, res) {
      proxyReq.setHeader(
        "x-forwarded-for",
        req.headers["x-forwarded-for"].split(",")[0]
      );
      proxyReq.setHeader(
        "origin",
        req.headers["origin"] ?? "//" + process.env.APP_ORIGIN
      );
      if (req.method === "POST") {
        // Make any needed POST parameter changes
        let postBody = req.body;

        // user login conditions
        if (req.path === "/user/login/") {
          const ip = req.ip.replace("::ffff:", "") ?? "127.0.0.1";
          postBody.client_ip = ip;
          postBody["api_key"] = process.env.APP_KEY;
          postBody.origin = req.headers["origin"]
            ? url.parse(req.headers["origin"], true).hostname
            : process.env.APP_ORIGIN;
        }
        
        // user recharge conditions
        if (req.path === "/recharge/package/"){
          postBody["api_key"] = process.env.APP_KEY;
        }

        // URI encode JSON object
        postBody = Object.keys(postBody)
          .map(function (key) {
            return (
              encodeURIComponent(key) + "=" + encodeURIComponent(postBody[key])
            );
          })
          .join("&");

        // Update header
        proxyReq.setHeader("content-type", "application/x-www-form-urlencoded");
        proxyReq.setHeader("content-length", postBody.length);

        // Write out body changes to the proxyReq stream
        proxyReq.write(postBody);
        proxyReq.end();
      }
    },
    error: (err, req, res) => {
      res.json({
        error: 500,
        msg: "Something went wrong on the proxy server.",
      });
    },
  })
);

// Start the Proxy
app.listen(PORT, () => {
  console.log(`Starting Proxy at ${PORT}`);
});
