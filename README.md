# Website Navigator

Website Navigator is a full-stack web application that lets users upload an Excel or CSV file, extract website URLs on the backend, and browse those sites inside the app with previous and next controls.

## Project Overview

The app follows the PRD flow:

- Upload an `.xlsx`, `.xls`, or `.csv` file from the React frontend
- Send the file to a Node.js + Express backend using `FormData`
- Parse the uploaded spreadsheet and extract URLs from the `URL` column
- Return the cleaned URL list to the frontend as JSON
- Display the current URL inside an iframe
- Proxy website rendering through the backend to improve support for sites that block direct iframe embedding
- Navigate through websites with Previous and Next buttons
- Provide a fallback link for websites that block iframe embedding

## Folder Structure

```text
website-nav/
├── backend/
│   ├── uploads/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── NavButtons.jsx
│   │   │   └── WebViewer.jsx
│   │   ├── App.css
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── sample-data/
│   └── websites.csv
└── README.md
```

## Features

- Upload Excel and CSV files
- Parse the first worksheet from Excel files
- Parse CSV files with streaming
- Extract and validate HTTP/HTTPS URLs
- Show upload feedback and API errors in the UI
- Display websites in an iframe
- Navigate through the uploaded URL list
- Responsive layout for desktop and mobile
- Backend proxy route for iframe rendering
- Fallback "Open in new tab" link for iframe-blocked websites

## Setup

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs on `http://localhost:5000`.

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000`.

## Sample Excel / CSV Format

The file should include a `URL` column. Example:

```text
Name,URL
Example,https://example.com
MDN,https://developer.mozilla.org
Wikipedia,https://wikipedia.org
```

You can use the sample CSV in [sample-data/websites.csv](./sample-data/websites.csv).

## Assumptions

- The first sheet of an Excel workbook is used.
- Valid URLs must begin with `http://` or `https://`.
- The parser primarily expects a `URL` column and also accepts common variants like `Url`, `url`, `Website`, and `Link`.
- Some websites will not render in an iframe because of `X-Frame-Options` or `Content-Security-Policy`.
- The backend proxy improves compatibility for some blocked sites, but complex apps can still break because of CSP, client-side routing, anti-bot protections, or absolute asset behavior.
- MongoDB history is optional and is not implemented in this version.

## Screenshots

Add these before submission:

- Upload screen before a file is chosen
- App displaying a website inside the iframe
- Navigation buttons in action

## Demo Video Checklist

- Show the prepared Excel/CSV file
- Upload the file in the app
- Demonstrate URLs loading into the iframe
- Use Previous and Next buttons
- Show the new-tab fallback for iframe-blocked websites

## Suggested Test URLs

These are good candidates for demo data because they commonly work better than sites like Google in iframes:

- https://example.com
- https://developer.mozilla.org
- https://httpbin.org
- https://quotes.toscrape.com
- https://books.toscrape.com
