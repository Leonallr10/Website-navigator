import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./components/Navbar";
import FileUpload from "./components/FileUpload";
import WebViewer from "./components/WebViewer";
import NavButtons from "./components/NavButtons";
import HistoryPanel from "./components/HistoryPanel";
import { Globe, Link2, Sheet, Sparkles } from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Card, CardContent } from "./components/ui/card";
import { Separator } from "./components/ui/separator";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(223,192,140,0.28),transparent_30%),radial-gradient(circle_at_top_right,rgba(105,160,123,0.18),transparent_24%)]">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        <section className="space-y-4">

          {/* <div className="space-y-3">
            <h1 className="max-w-5xl font-display text-[2.4rem] leading-[1.02] sm:text-5xl md:text-6xl">
              Upload a link sheet and navigate websites in one focused workspace.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Import a file with a <strong className="text-foreground">URL</strong> column,
              preview each site, and move through the list with quick previous and next
              controls.
            </p>
          </div> */}
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <FileUpload onUploadSuccess={handleUploadSuccess} />
            <Card className="border-white/40 bg-white/55">
              <CardContent className="grid gap-3 p-5">
                <div className="rounded-2xl border border-white/60 bg-white/72 p-4 shadow-sm">
                  <Sheet className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Spreadsheet Parsing</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    CSV and Excel uploads
                  </p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/72 p-4 shadow-sm">
                  <Globe className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Embedded Browsing</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Preview sites inline
                  </p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/72 p-4 shadow-sm">
                  <Sparkles className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Session History</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Reopen saved uploads
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/40 bg-white/60">
            <CardContent className="p-4 sm:p-6">
              <NavButtons
                currentIndex={currentIndex}
                total={urls.length}
                onPrev={handlePrev}
                onNext={handleNext}
              />
              <WebViewer currentUrl={currentUrl} />
            </CardContent>
          </Card>

          <Card className="h-fit border-white/40 bg-white/60">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Session Details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Track the active file and jump back into older uploads.
                </p>
              </div>
              <Separator />
              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/60 bg-white/72 p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">Uploaded file</p>
                  <p className="mt-1 break-words font-semibold leading-6">
                    {fileName || "No file uploaded yet"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/72 p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">Total URLs</p>
                  <p className="mt-1 font-semibold">{urls.length}</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/72 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Current URL</p>
                  </div>
                  <p className="mt-1 break-words font-semibold leading-6">
                    {currentUrl || "Waiting for upload"}
                  </p>
                </div>
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
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

export default App;
