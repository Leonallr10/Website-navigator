const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const https = require("https");
const zlib = require("zlib");
const mongoose = require("mongoose");
const csvParser = require("csv-parser");
const xlsx = require("xlsx");
const UrlList = require("./models/UrlList");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/website-navigator";
const uploadsDir = path.join(__dirname, "uploads");
let isMongoConnected = false;

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    isMongoConnected = true;
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    isMongoConnected = false;
    console.warn(`MongoDB connection failed: ${error.message}`);
  });

mongoose.connection.on("connected", () => {
  isMongoConnected = true;
});

mongoose.connection.on("disconnected", () => {
  isMongoConnected = false;
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = [".xlsx", ".xls", ".csv"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      cb(new Error("Only .xlsx, .xls, and .csv files are supported."));
      return;
    }

    cb(null, true);
  },
});

const possibleUrlKeys = ["URL", "Url", "url", "Website", "website", "Link", "link"];

function getUrlValue(row) {
  for (const key of possibleUrlKeys) {
    if (row[key]) {
      return String(row[key]).trim();
    }
  }

  return "";
}

function isValidHttpUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function parseFrameAncestors(cspHeader) {
  if (!cspHeader) {
    return [];
  }

  const directive = cspHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("frame-ancestors"));

  if (!directive) {
    return [];
  }

  return directive
    .split(/\s+/)
    .slice(1)
    .map((value) => value.trim())
    .filter(Boolean);
}

function isFrontendAllowedByFrameAncestors(ancestors) {
  if (ancestors.length === 0) {
    return true;
  }

  if (ancestors.includes("'none'")) {
    return false;
  }

  if (ancestors.includes("*")) {
    return true;
  }

  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:*",
    "http://127.0.0.1:*",
  ];

  return ancestors.some((ancestor) => {
    if (ancestor === "'self'") {
      return false;
    }

    return allowedOrigins.includes(ancestor);
  });
}

function inspectFramePolicy(headers) {
  const xFrameOptions = headers["x-frame-options"];
  const contentSecurityPolicy = headers["content-security-policy"];
  const frameAncestors = parseFrameAncestors(contentSecurityPolicy);

  if (xFrameOptions) {
    const normalized = xFrameOptions.toLowerCase();

    if (normalized.includes("deny") || normalized.includes("sameorigin")) {
      return {
        embeddable: false,
        reason: `Blocked by X-Frame-Options: ${xFrameOptions}`,
      };
    }
  }

  if (!isFrontendAllowedByFrameAncestors(frameAncestors)) {
    return {
      embeddable: false,
      reason: "Blocked by Content-Security-Policy frame-ancestors",
    };
  }

  return {
    embeddable: true,
    reason: "No blocking frame policy detected.",
  };
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    ""
  );
}

function buildOutgoingHeaders(targetUrl, req, extraHeaders = {}) {
  const target = new URL(targetUrl);

  return {
    "user-agent":
      req.headers["user-agent"] ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    accept:
      req.headers.accept ||
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "accept-language": req.headers["accept-language"] || "en-US,en;q=0.9",
    "accept-encoding": "gzip, deflate, br",
    "cache-control": req.headers["cache-control"] || "no-cache",
    pragma: req.headers.pragma || "no-cache",
    referer: extraHeaders.referer || `${target.origin}/`,
    origin: extraHeaders.origin || target.origin,
    "x-forwarded-for": getClientIp(req),
    ...extraHeaders,
  };
}

function decodeBody(buffer, encoding) {
  if (!buffer || !encoding) {
    return buffer;
  }

  const normalized = String(encoding).toLowerCase();

  if (normalized.includes("gzip")) {
    return zlib.gunzipSync(buffer);
  }

  if (normalized.includes("deflate")) {
    return zlib.inflateSync(buffer);
  }

  if (normalized.includes("br")) {
    return zlib.brotliDecompressSync(buffer);
  }

  return buffer;
}

function requestUrl(targetUrl, req, redirectCount = 0, requestOptions = {}) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects while fetching the target URL."));
      return;
    }

    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === "https:" ? https : http;
    const method = requestOptions.method || "GET";
    const includeBody = requestOptions.includeBody !== false;
    const headers = buildOutgoingHeaders(targetUrl, req, requestOptions.headers);

    const request = client.request(
      targetUrl,
      {
        method,
        headers,
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;
        const chunks = [];

        if (includeBody) {
          response.on("data", (chunk) => {
            chunks.push(chunk);
          });
        } else {
          response.resume();
        }

        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume();
          const redirectUrl = new URL(location, targetUrl).toString();
          resolve(
            requestUrl(redirectUrl, req, redirectCount + 1, {
              ...requestOptions,
              headers: {
                ...requestOptions.headers,
                referer: targetUrl,
                origin: new URL(redirectUrl).origin,
              },
            })
          );
          return;
        }

        response.on("end", () => {
          const rawBody = includeBody ? Buffer.concat(chunks) : null;
          const body = includeBody
            ? decodeBody(rawBody, response.headers["content-encoding"])
            : null;

          resolve({
            finalUrl: targetUrl,
            headers: response.headers,
            statusCode,
            body,
          });
        });
      }
    );

    request.on("error", reject);
    request.setTimeout(8000, () => {
      request.destroy(new Error("Timed out while checking iframe support."));
    });
    request.end();
  });
}

function buildProxyUrl(targetUrl) {
  return `/proxy?url=${encodeURIComponent(targetUrl)}`;
}

function shouldProxyNavigation(tagName, attributeName, relValue) {
  const lowerTagName = tagName.toLowerCase();
  const lowerAttributeName = attributeName.toLowerCase();
  const lowerRelValue = (relValue || "").toLowerCase();

  if (lowerTagName === "a" && lowerAttributeName === "href") {
    return true;
  }

  if (lowerTagName === "form" && lowerAttributeName === "action") {
    return true;
  }

  if (lowerTagName === "link" && lowerAttributeName === "href" && !lowerRelValue.includes("stylesheet")) {
    return true;
  }

  return false;
}

function rewriteCssUrls(cssText, baseUrl) {
  if (!cssText) {
    return cssText;
  }

  let rewrittenCss = cssText.replace(
    /url\((['"]?)([^'")]+)\1\)/gi,
    (match, quote = "", assetUrl) => {
      const trimmedUrl = assetUrl.trim();

      if (
        !trimmedUrl ||
        trimmedUrl.startsWith("data:") ||
        trimmedUrl.startsWith("javascript:") ||
        trimmedUrl.startsWith("#")
      ) {
        return match;
      }

      const resolvedUrl = new URL(trimmedUrl, baseUrl).toString();
      return `url(${quote}${buildProxyUrl(resolvedUrl)}${quote})`;
    }
  );

  rewrittenCss = rewrittenCss.replace(
    /@import\s+(url\()?(["']?)([^"')\s]+)\2\)?/gi,
    (match, hasUrlFn = "", quote = "", importUrl) => {
      const resolvedUrl = new URL(importUrl, baseUrl).toString();
      const proxiedUrl = buildProxyUrl(resolvedUrl);
      return hasUrlFn
        ? `@import url(${quote}${proxiedUrl}${quote})`
        : `@import ${quote}${proxiedUrl}${quote}`;
    }
  );

  return rewrittenCss;
}

function rewriteSrcset(srcsetValue, baseUrl) {
  return srcsetValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [assetUrl, descriptor] = entry.split(/\s+/, 2);

      if (!assetUrl || assetUrl.startsWith("data:")) {
        return entry;
      }

      const resolvedUrl = new URL(assetUrl, baseUrl).toString();
      return descriptor
        ? `${buildProxyUrl(resolvedUrl)} ${descriptor}`
        : buildProxyUrl(resolvedUrl);
    })
    .join(", ");
}

function injectProxyRuntime(html, baseUrl) {
  const runtimeScript = `<script>
    (function () {
      const proxify = function (value) {
        try {
          if (!value) return value;
          if (value.startsWith("data:") || value.startsWith("javascript:") || value.startsWith("#")) return value;
          const absolute = new URL(value, ${JSON.stringify(baseUrl)}).toString();
          return "/proxy?url=" + encodeURIComponent(absolute);
        } catch (error) {
          return value;
        }
      };

      const originalFetch = window.fetch;
      if (originalFetch) {
        window.fetch = function (input, init) {
          if (typeof input === "string") {
            return originalFetch.call(this, proxify(input), init);
          }

          if (input && input.url) {
            return originalFetch.call(this, proxify(input.url), init);
          }

          return originalFetch.call(this, input, init);
        };
      }

      const originalOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url) {
        const args = Array.prototype.slice.call(arguments);
        args[1] = proxify(url);
        return originalOpen.apply(this, args);
      };

      const originalWindowOpen = window.open;
      window.open = function (url, target, features) {
        if (target === "_blank") {
          return originalWindowOpen.call(window, url, target, features);
        }

        return originalWindowOpen.call(window, proxify(url), target, features);
      };
    })();
  </script>`;

  return html.replace(/<body([^>]*)>/i, `<body$1>${runtimeScript}`);
}

function rewriteHtml(html, targetUrl) {
  let rewrittenHtml = html.replace(
    /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
    ""
  );

  rewrittenHtml = rewrittenHtml.replace(
    /<meta([^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=)([^"']+)(["'][^>]*)>/gi,
    (_match, prefix, refreshUrl, suffix) => {
      const resolvedUrl = new URL(refreshUrl.trim(), targetUrl).toString();
      return `<meta${prefix}${buildProxyUrl(resolvedUrl)}${suffix}>`;
    }
  );

  if (/<head[^>]*>/i.test(rewrittenHtml)) {
    rewrittenHtml = rewrittenHtml.replace(
      /<head([^>]*)>/i,
      `<head$1><base href="${targetUrl}">`
    );
  }

  const attributePattern = /(href|src|action|poster|data-src|data-href)=["']([^"'#]+)["']/gi;

  rewrittenHtml = rewrittenHtml.replace(
    /<(a|link|img|script|iframe|source|video|audio|form|embed|track|input|object)\b([^>]*)>/gi,
    (match, tagName, attrs) => {
      const relMatch = attrs.match(/\srel=["']([^"']+)["']/i);
      let updatedAttrs = attrs.replace(
        attributePattern,
        (_attrMatch, attributeName, attributeValue) => {
          const trimmedValue = attributeValue.trim();

          if (
            !trimmedValue ||
            trimmedValue.startsWith("data:") ||
            trimmedValue.startsWith("mailto:") ||
            trimmedValue.startsWith("tel:") ||
            trimmedValue.startsWith("javascript:")
          ) {
            return `${attributeName}="${trimmedValue}"`;
          }

          const resolvedUrl = new URL(trimmedValue, targetUrl).toString();
          const replacementValue = shouldProxyNavigation(tagName, attributeName, relMatch?.[1])
            ? buildProxyUrl(resolvedUrl)
            : buildProxyUrl(resolvedUrl);

          return `${attributeName}="${replacementValue}"`;
        }
      );

      updatedAttrs = updatedAttrs.replace(
        /\ssrcset=["']([^"']+)["']/gi,
        (_srcsetMatch, srcsetValue) => ` srcset="${rewriteSrcset(srcsetValue, targetUrl)}"`
      );

      updatedAttrs = updatedAttrs.replace(
        /\sstyle=["']([^"']+)["']/gi,
        (_styleMatch, styleValue) =>
          ` style="${rewriteCssUrls(styleValue, targetUrl).replace(/"/g, "&quot;")}"`
      );

      return `<${tagName}${updatedAttrs}>`;
    }
  );

  rewrittenHtml = rewrittenHtml.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_match, styleAttrs, cssText) => `<style${styleAttrs}>${rewriteCssUrls(cssText, targetUrl)}</style>`
  );

  rewrittenHtml = rewrittenHtml.replace(
    /<(form)\b([^>]*?)\smethod=["']post["']([^>]*)>/gi,
    "<$1$2 method=\"get\"$3>"
  );

  return injectProxyRuntime(rewrittenHtml, targetUrl);
}

function setProxyHeaders(res, headers) {
  const hopByHopHeaders = new Set([
    "connection",
    "content-length",
    "content-encoding",
    "content-security-policy",
    "content-security-policy-report-only",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "x-frame-options",
  ]);

  Object.entries(headers).forEach(([headerName, value]) => {
    if (hopByHopHeaders.has(headerName.toLowerCase())) {
      return;
    }

    if (value !== undefined) {
      res.setHeader(headerName, value);
    }
  });

  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("Content-Security-Policy-Report-Only");
}

function normalizeUrls(rows) {
  return rows
    .map(getUrlValue)
    .filter(Boolean)
    .map((url) => url.trim())
    .filter(isValidHttpUrl);
}

function parseExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(firstSheet, { defval: "" });

  return normalizeUrls(rows);
}

function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", () => {
        resolve(normalizeUrls(rows));
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

async function parseUploadedFile(filePath, extension) {
  if (extension === ".csv") {
    return parseCsvFile(filePath);
  }

  return parseExcelFile(filePath);
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    message: "Website Navigator backend is running.",
    database: isMongoConnected ? "connected" : "disconnected",
  });
});

app.get("/history", async (_req, res) => {
  if (!isMongoConnected) {
    res.status(503).json({
      message: "MongoDB is not connected. URL history is currently unavailable.",
    });
    return;
  }

  try {
    const sessions = await UrlList.find({})
      .sort({ uploadedAt: -1 })
      .select("_id fileName urls uploadedAt")
      .lean();

    res.json({
      sessions: sessions.map((session) => ({
        id: session._id,
        fileName: session.fileName,
        total: session.urls.length,
        urls: session.urls,
        uploadedAt: session.uploadedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch URL history.",
      error: error.message,
    });
  }
});

app.get("/history/:id", async (req, res) => {
  if (!isMongoConnected) {
    res.status(503).json({
      message: "MongoDB is not connected. URL history is currently unavailable.",
    });
    return;
  }

  try {
    const session = await UrlList.findById(req.params.id).lean();

    if (!session) {
      res.status(404).json({ message: "Saved URL session not found." });
      return;
    }

    res.json({
      id: session._id,
      fileName: session.fileName,
      urls: session.urls,
      total: session.urls.length,
      uploadedAt: session.uploadedAt,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch the saved URL session.",
      error: error.message,
    });
  }
});

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    res.status(400).send("A valid http:// or https:// URL is required.");
    return;
  }

  try {
    const result = await requestUrl(targetUrl, req, 0, {
      includeBody: true,
    });
    const contentType = result.headers["content-type"] || "application/octet-stream";

    setProxyHeaders(res, result.headers);
    res.status(result.statusCode || 200);

    if (contentType.includes("text/html")) {
      const html = result.body ? result.body.toString("utf8") : "";
      const rewrittenHtml = rewriteHtml(html, result.finalUrl);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(rewrittenHtml);
      return;
    }

    if (contentType.includes("text/css")) {
      const cssText = result.body ? result.body.toString("utf8") : "";
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      res.send(rewriteCssUrls(cssText, result.finalUrl));
      return;
    }

    res.setHeader("Content-Type", contentType);
    res.send(result.body);
  } catch (error) {
    res.status(502).send(error.message || "Failed to proxy the target website.");
  }
});

app.post("/check-embed", async (req, res) => {
  const { url } = req.body || {};

  if (!url || !isValidHttpUrl(url)) {
    res.status(400).json({ message: "A valid http:// or https:// URL is required." });
    return;
  }

  try {
    const result = await requestUrl(url, req, 0, { includeBody: false });
    const policy = inspectFramePolicy(result.headers);

    res.json({
      url,
      finalUrl: result.finalUrl,
      statusCode: result.statusCode,
      embeddable: policy.embeddable,
      reason: policy.reason,
    });
  } catch (error) {
    res.json({
      url,
      embeddable: false,
      reason: error.message || "Unable to verify iframe support.",
    });
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "Please upload an Excel or CSV file." });
    return;
  }

  const filePath = req.file.path;
  const extension = path.extname(req.file.originalname).toLowerCase();

  try {
    const urls = await parseUploadedFile(filePath, extension);

    if (urls.length === 0) {
      res.status(400).json({
        message: "No valid URLs were found. Make sure the file contains a URL column with http:// or https:// values.",
      });
      return;
    }

    let savedSessionId = null;

    if (isMongoConnected) {
      const savedSession = await UrlList.create({
        fileName: req.file.originalname,
        urls,
      });

      savedSessionId = savedSession._id;
    }

    res.json({
      urls,
      total: urls.length,
      fileName: req.file.originalname,
      savedSessionId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to parse the uploaded file.",
      error: error.message,
    });
  } finally {
    try {
      await fsp.unlink(filePath);
    } catch (_cleanupError) {
      // Ignore cleanup failures for temp uploads.
    }
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({
    message: error.message || "File upload failed.",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
