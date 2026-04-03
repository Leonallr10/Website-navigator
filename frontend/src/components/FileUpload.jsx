import { useRef, useState } from "react";
import axios from "axios";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

const API_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function FileUpload({ onUploadSuccess }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isAllowedFile = (file) => {
    const lowerName = file.name.toLowerCase();
    return ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      setMessage("");
      setError("");
      return;
    }

    if (!isAllowedFile(file)) {
      setSelectedFile(null);
      setMessage("");
      setError("Invalid file type. Please choose a .xlsx, .xls, or .csv file.");
      resetFileInput();
      return;
    }

    setSelectedFile(file);
    setMessage(file ? `Selected file: ${file.name}` : "");
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Choose a .xlsx, .xls, or .csv file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsUploading(true);
      setError("");
      setMessage("Uploading and extracting URLs...");

      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      onUploadSuccess(response.data);
      setMessage(`Loaded ${response.data.total} URL(s) from ${response.data.fileName}.`);
      setSelectedFile(null);
      resetFileInput();
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || "Upload failed. Please try again.");
      setMessage("");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="border-dashed border-primary/25 bg-card/95 shadow-none">
      <CardHeader className="space-y-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-accent p-3 text-accent-foreground shadow-sm">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>Upload Spreadsheet</CardTitle>
            <CardDescription className="mt-1 leading-6">
              Import a file with a URL column and load every site into the viewer.
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">.xlsx</Badge>
          <Badge variant="outline">.xls</Badge>
          <Badge variant="outline">.csv</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="rounded-[1.25rem] border border-white/70 bg-white/85 p-4 shadow-sm">
          <p className="mb-3 text-sm leading-6 text-muted-foreground">
            The file should contain a <span className="font-semibold text-foreground">URL</span>{" "}
            column with values starting with{" "}
            <span className="font-semibold text-foreground">http://</span> or{" "}
            <span className="font-semibold text-foreground">https://</span>.
          </p>
          <Input
            ref={fileInputRef}
            className="bg-white"
            type="file"
            accept=".xlsx,.xls,.csv"
            onClick={(event) => {
              event.target.value = "";
            }}
            onChange={handleFileChange}
          />
        </div>

        <Button className="h-12 w-full rounded-2xl shadow-sm" onClick={handleUpload} disabled={isUploading}>
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? "Uploading..." : "Upload and Load URLs"}
        </Button>

        {message ? (
          <div className="rounded-2xl border border-primary/20 bg-accent/60 px-4 py-3 text-sm text-secondary-foreground">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Supported formats: Excel (.xlsx, .xls) and CSV (.csv)
        </p>
      </CardContent>
    </Card>
  );
}

export default FileUpload;
