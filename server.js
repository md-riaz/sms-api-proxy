const express = require("express");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
require("dotenv").config();

// Create Express Server
const app = express();
app.use(cors());
app.use(express.json());

// Logging
app.use(morgan("dev"));

// Configuration
const PORT = process.env.PORT || 5000;
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
    on: {
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
          let body = new Object();

          if (req.path === "/user/login/") {
            let postBody = req.body;
            const ip = req.ip.replace("::ffff:", "") ?? "127.0.0.1";
            body.client_ip = ip;
            body["api_key"] = process.env.APP_KEY;
            body.origin = process.env.APP_ORIGIN;

            body = { ...body, ...postBody };
          }

          // URI encode JSON object
          body = Object.keys(body)
            .map(function (key) {
              return (
                encodeURIComponent(key) + "=" + encodeURIComponent(body[key])
              );
            })
            .join("&");

          // Update header
          proxyReq.setHeader(
            "content-type",
            "application/x-www-form-urlencoded"
          );
          proxyReq.setHeader("content-length", body.length);

          // Write out body changes to the proxyReq stream
          proxyReq.write(body);
          proxyReq.end();
        }
      },
      proxyRes: (proxyRes, req, res) => {
        /* handle proxyRes */
      },
      error: (err, req, res) => {
        res.json({
          error: 500,
          msg: "Something went wrong on the proxy server.",
        });
      },
    },
  })
);

// Start the Proxy
app.listen(PORT, () => {
  console.log(`Starting Proxy at ${PORT}`);
});
