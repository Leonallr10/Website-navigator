function WebViewer({ currentUrl }) {
  if (!currentUrl) {
    return (
      <div className="viewer-state">
        <div>
          <h3>Ready for your first upload</h3>
          <p>
            Import a spreadsheet and the current website will appear here inside an iframe.
            You can then move through the list using the navigation buttons above.
          </p>
        </div>
      </div>
    );
  }

  const proxiedUrl = `http://localhost:5000/proxy?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="viewer-frame-wrap">
      <div className="viewer-toolbar">
        <p>
          This preview is served through the backend proxy so websites that block direct
          iframe embedding have a better chance of loading.
        </p>
        <a
          className="new-tab-link"
          href={currentUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open current site in new tab
        </a>
      </div>

      <iframe
        className="iframe-frame"
        src={proxiedUrl}
        title={`Website preview for ${currentUrl}`}
        loading="lazy"
      />
    </div>
  );
}

export default WebViewer;
