import { Badge } from "./ui/badge";

function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#18230f]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white/10 text-white">
              Spreadsheet to Browser
            </Badge>
            <span className="text-xs uppercase tracking-[0.25em] text-white/55">React + Node</span>
          </div>
          <h1 className="font-display text-2xl tracking-[0.04em] text-[#f8f3ea]">
            Website Navigator
          </h1>
          {/* <p className="text-sm text-[#f8f3ea]/72">
            Browse uploaded URLs without leaving the app.
          </p> */}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
