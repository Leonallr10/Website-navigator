const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const https = require("https");
const csvParser = require("csv-parser");
const xlsx = require("xlsx");

const app = express();
const PORT = process.env.PORT || 5000;
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

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

function requestUrl(targetUrl, redirectCount = 0, includeBody = false) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects while fetching the target URL."));
      return;
    }

    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === "https:" ? https : http;

    const request = client.request(
      targetUrl,
      {
        method: "GET",
        headers: {
          "User-Agent": "Website-Navigator/1.0",
        },
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
          resolve(requestUrl(redirectUrl, redirectCount + 1, includeBody));
          return;
        }

        response.on("end", () => {
          resolve({
            finalUrl: targetUrl,
            headers: response.headers,
            statusCode,
            body: includeBody ? Buffer.concat(chunks) : null,
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

function shouldProxyNavigation(tagName, attributeName, attributeValue, relValue) {
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

function rewriteHtml(html, targetUrl) {
  const origin = new URL(targetUrl).origin;

  let rewrittenHtml = html.replace(
    /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
    ""
  );

  if (/<head[^>]*>/i.test(rewrittenHtml)) {
    rewrittenHtml = rewrittenHtml.replace(
      /<head([^>]*)>/i,
      `<head$1><base href="${targetUrl}">`
    );
  }

  rewrittenHtml = rewrittenHtml.replace(
    /<(a|link|img|script|iframe|source|video|audio|form)\b([^>]*?)\s(href|src|action)=["']([^"'#]+)["']([^>]*)>/gi,
    (match, tagName, beforeAttrs, attributeName, attributeValue, afterAttrs) => {
      const trimmedValue = attributeValue.trim();

      if (
        !trimmedValue ||
        trimmedValue.startsWith("data:") ||
        trimmedValue.startsWith("mailto:") ||
        trimmedValue.startsWith("tel:") ||
        trimmedValue.startsWith("javascript:")
      ) {
        return match;
      }

      const relMatch = `${beforeAttrs} ${afterAttrs}`.match(/\srel=["']([^"']+)["']/i);
      const resolvedUrl = new URL(trimmedValue, targetUrl).toString();
      const replacementValue = shouldProxyNavigation(
        tagName,
        attributeName,
        trimmedValue,
        relMatch?.[1]
      )
        ? buildProxyUrl(resolvedUrl)
        : resolvedUrl;

      return `<${tagName}${beforeAttrs} ${attributeName}="${replacementValue}"${afterAttrs}>`;
    }
  );

  rewrittenHtml = rewrittenHtml.replace(
    /<(form)\b([^>]*?)\smethod=["']post["']([^>]*)>/gi,
    "<$1$2 method=\"get\"$3>"
  );

  rewrittenHtml = rewrittenHtml.replace(
    /<body([^>]*)>/i,
    `<body$1><script>
      window.addEventListener("click", function (event) {
        const anchor = event.target.closest("a[href]");
        if (!anchor) return;
        const href = anchor.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
        if (anchor.target === "_blank") return;
        anchor.setAttribute("href", href);
      });
    </script>`
  );

  return rewrittenHtml;
}

function setProxyHeaders(res, headers) {
  const hopByHopHeaders = new Set([
    "connection",
    "content-length",
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
  res.json({ ok: true, message: "Website Navigator backend is running." });
});

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    res.status(400).send("A valid http:// or https:// URL is required.");
    return;
  }

  try {
    const result = await requestUrl(targetUrl, 0, true);
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
    const result = await requestUrl(url, 0, false);
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

    res.json({
      urls,
      total: urls.length,
      fileName: req.file.originalname,
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
