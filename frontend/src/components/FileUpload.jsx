import { useRef, useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
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
    <aside className="upload-card">
      <h2>Upload Spreadsheet</h2>
      <p>
        The file should contain a <strong>URL</strong> column with values starting with
        <strong> http://</strong> or <strong>https://</strong>.
      </p>

      <input
        ref={fileInputRef}
        className="file-input"
        type="file"
        accept=".xlsx,.xls,.csv"
        onClick={(event) => {
          event.target.value = "";
        }}
        onChange={handleFileChange}
      />

      <button className="upload-button" onClick={handleUpload} disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload and Load URLs"}
      </button>

      {message ? <p className="status-text">{message}</p> : null}
      {error ? <p className="status-text error-text">{error}</p> : null}
      <p className="helper-text">Supported formats: Excel (.xlsx, .xls) and CSV (.csv)</p>
    </aside>
  );
}

export default FileUpload;
