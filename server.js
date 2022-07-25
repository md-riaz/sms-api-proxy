const express = require("express");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");

// Create Express Server
const app = express();

app.use(express.json());

// Configuration
const PORT = 5000;
const API_SERVICE_URL = process.env.API_SERVICE_URL;

// Logging
app.use(morgan("dev"));

// Info GET endpoint
app.get("/info", (req, res, next) => {
  res.send(
    `This is a proxy service which proxies to ${process.env.API_SERVICE_URL}`
  );
});

app.use(
  "/",
  createProxyMiddleware({
    target: API_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: function onProxyReq(proxyReq, req, res) {
      proxyReq.setHeader('x-forwarded-for', req.headers['x-forwarded-for'].split(',')[0]);
      if (req.method === "POST") {
        // Make any needed POST parameter changes
        let body = new Object();

        if (req.path === "/user/login/") {
          let postBody = req.body;
          const ip = req.ip.replace("::ffff:", "") ?? "127.0.0.1";
          body.client_ip = ip;
          body["api_key"] = process.env.APP_KEY;
          body.origin = process.env.APP_ORIGIN;
          
          body = {...body, ...postBody};
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
        proxyReq.setHeader("content-type", "application/x-www-form-urlencoded");
        proxyReq.setHeader("content-length", body.length);

        // Write out body changes to the proxyReq stream
        proxyReq.write(body);
        proxyReq.end();
      }
    },
  })
);

// Start the Proxy
app.listen(PORT, () => {
  console.log(`Starting Proxy at ${PORT}`);
});
