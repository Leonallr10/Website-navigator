function formatUploadedAt(value) {
  if (!value) {
    return "Unknown upload time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown upload time";
  }

  return date.toLocaleString();
}

function HistoryPanel({
  sessions,
  isLoading,
  error,
  activeSessionId,
  deletingSessionId,
  onReload,
  onOpenSession,
  onDeleteSession,
}) {
  return (
    <div className="panel panel-history">
      <div className="history-header">
        <div>
          <h2>Saved History</h2>
          <p className="history-subtitle">Reopen previous uploads saved in MongoDB.</p>
        </div>
        <button className="history-refresh-button" onClick={onReload} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <p className="status-text error-text">{error}</p> : null}

      {!error && sessions.length === 0 ? (
        <p className="history-empty">No saved sessions yet. Upload a file to create one.</p>
      ) : null}

      <div className="history-list">
        {sessions.map((session) => (
          <article
            className={`history-item ${activeSessionId === session.id ? "history-item-active" : ""}`}
            key={session.id}
          >
            <div className="history-copy">
              <h3>{session.fileName}</h3>
              <p>{session.total} URL(s)</p>
              <p>{formatUploadedAt(session.uploadedAt)}</p>
            </div>
            <div className="history-actions">
              <button className="history-open-button" onClick={() => onOpenSession(session)}>
                Open
              </button>
              <button
                className="history-delete-button"
                onClick={() => onDeleteSession(session)}
                disabled={deletingSessionId === session.id}
              >
                {deletingSessionId === session.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default HistoryPanel;
