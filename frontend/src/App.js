import { useState } from "react";
import Navbar from "./components/Navbar";
import FileUpload from "./components/FileUpload";
import WebViewer from "./components/WebViewer";
import NavButtons from "./components/NavButtons";

function App() {
  const [urls, setUrls] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fileName, setFileName] = useState("");

  const handleUploadSuccess = ({ urls: uploadedUrls, fileName: uploadedFileName }) => {
    setUrls(uploadedUrls);
    setCurrentIndex(0);
    setFileName(uploadedFileName);
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, urls.length - 1));
  };

  const currentUrl = urls[currentIndex] || "";

  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">Excel / CSV Website Browser</p>
            <h1>Upload a link sheet and navigate websites in one focused workspace.</h1>
            <p className="hero-text">
              Import a file with a <strong>URL</strong> column, preview each site, and move
              through the list with quick previous and next controls.
            </p>
          </div>

          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </section>

        <section className="viewer-layout">
          <div className="panel panel-meta">
            <h2>Session Details</h2>
            <div className="meta-row">
              <span>Uploaded file</span>
              <strong>{fileName || "No file uploaded yet"}</strong>
            </div>
            <div className="meta-row">
              <span>Total URLs</span>
              <strong>{urls.length}</strong>
            </div>
            <div className="meta-row">
              <span>Current URL</span>
              <strong className="url-preview">{currentUrl || "Waiting for upload"}</strong>
            </div>
            <p className="meta-note">
              Some websites block iframes for security reasons. If that happens, use the
              fallback link to open the current site in a new tab.
            </p>
          </div>

          <div className="panel panel-viewer">
            <NavButtons
              currentIndex={currentIndex}
              total={urls.length}
              onPrev={handlePrev}
              onNext={handleNext}
            />
            <WebViewer currentUrl={currentUrl} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
