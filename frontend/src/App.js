import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./components/Navbar";
import FileUpload from "./components/FileUpload";
import WebViewer from "./components/WebViewer";
import NavButtons from "./components/NavButtons";
import HistoryPanel from "./components/HistoryPanel";

const API_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

function App() {
  const [urls, setUrls] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fileName, setFileName] = useState("");
  const [historySessions, setHistorySessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [deletingSessionId, setDeletingSessionId] = useState("");

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await axios.get(`${API_BASE_URL}/history`);
      setHistorySessions(response.data.sessions || []);
    } catch (error) {
      setHistorySessions([]);
      setHistoryError(
        error.response?.data?.message ||
          "Unable to load saved history. Check your MongoDB connection."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleUploadSuccess = ({
    urls: uploadedUrls,
    fileName: uploadedFileName,
    savedSessionId,
  }) => {
    setUrls(uploadedUrls);
    setCurrentIndex(0);
    setFileName(uploadedFileName);
    setActiveSessionId(savedSessionId || null);
    loadHistory();
  };

  const handleOpenSession = (session) => {
    setUrls(session.urls || []);
    setCurrentIndex(0);
    setFileName(session.fileName || "Saved session");
    setActiveSessionId(session.id || null);
  };

  const handleDeleteSession = async (session) => {
    if (!session?.id) {
      return;
    }

    try {
      setDeletingSessionId(session.id);
      setHistoryError("");

      await axios.delete(`${API_BASE_URL}/history/${session.id}`);

      if (activeSessionId === session.id) {
        setUrls([]);
        setCurrentIndex(0);
        setFileName("");
        setActiveSessionId(null);
      }

      await loadHistory();
    } catch (error) {
      setHistoryError(
        error.response?.data?.message ||
          "Unable to delete the saved history entry. Please try again."
      );
    } finally {
      setDeletingSessionId("");
    }
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
            <HistoryPanel
              sessions={historySessions}
              isLoading={historyLoading}
              error={historyError}
              activeSessionId={activeSessionId}
              deletingSessionId={deletingSessionId}
              onReload={loadHistory}
              onOpenSession={handleOpenSession}
              onDeleteSession={handleDeleteSession}
            />
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
