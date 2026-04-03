import { Clock3, FolderOpen, RefreshCcw, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

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
    <div className="mt-5 rounded-[1.4rem] border border-white/60 bg-white/68 p-4 shadow-sm">
      <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold">Saved History</h2>
          <p className="text-sm text-muted-foreground">Reopen previous uploads.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl bg-white/80 sm:w-auto"
          onClick={onReload}
          disabled={isLoading}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Separator className="mb-4" />

      {error ? (
        <div className="mb-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!error && sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground">
          No saved sessions yet. Upload a file to create one.
        </div>
      ) : null}

      <ScrollArea className="max-h-[26rem]">
        <div className="space-y-3 pr-3">
          {sessions.map((session) => (
            <article
              className={`rounded-2xl border bg-card/95 p-4 transition-all ${
                activeSessionId === session.id
                  ? "border-primary/35 shadow-[0_10px_24px_rgba(47,111,79,0.08)] ring-1 ring-primary/10"
                  : "border-white/70 shadow-sm"
              }`}
              key={session.id}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold leading-6">{session.fileName}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{session.total} URL(s)</Badge>
                      {activeSessionId === session.id ? <Badge>Active</Badge> : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  <span>{formatUploadedAt(session.uploadedAt)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="rounded-xl"
                    variant="secondary"
                    onClick={() => onOpenSession(session)}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open
                  </Button>
                  <Button
                    className="rounded-xl"
                    variant="destructive"
                    onClick={() => onDeleteSession(session)}
                    disabled={deletingSessionId === session.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingSessionId === session.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default HistoryPanel;
