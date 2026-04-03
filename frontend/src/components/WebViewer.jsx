import { ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

const API_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

function WebViewer({ currentUrl }) {
  if (!currentUrl) {
    return (
      <div className="grid min-h-[68vh] place-items-center rounded-[1.5rem] border border-dashed border-primary/20 bg-gradient-to-br from-accent/70 to-card/90 p-8 text-center shadow-inner">
        <div className="max-w-2xl">
          <h3 className="mb-3 text-3xl font-semibold">Ready for your first upload</h3>
          <p className="text-base leading-7 text-muted-foreground">
            Import a spreadsheet and the current website will appear here inside an iframe.
            You can then move through the list using the navigation buttons above.
          </p>
        </div>
      </div>
    );
  }

  const proxiedUrl = `${API_BASE_URL}/proxy?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/72 px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          This preview is served through the backend proxy so websites that block direct
          iframe embedding have a better chance of loading.
        </p>
        <Button asChild variant="secondary" className="w-full rounded-xl lg:w-auto">
          <a href={currentUrl} target="_blank" rel="noreferrer">
            Open current site in new tab
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>

      <iframe
        className="min-h-[68vh] w-full rounded-[1.5rem] border border-white/70 bg-white shadow-inner"
        src={proxiedUrl}
        title={`Website preview for ${currentUrl}`}
        loading="lazy"
      />
    </div>
  );
}

export default WebViewer;
