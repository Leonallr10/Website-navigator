import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";

function NavButtons({ currentIndex, total, onPrev, onNext }) {
  if (total === 0) {
    return (
      <div className="mb-5 rounded-2xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        Upload a file to begin navigating websites.
      </div>
    );
  }

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/72 px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex w-full gap-3 sm:w-auto">
        <Button
          className="h-11 flex-1 rounded-2xl sm:flex-none"
          onClick={onPrev}
          disabled={currentIndex === 0}
          variant="secondary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button
          className="h-11 flex-1 rounded-2xl sm:flex-none"
          onClick={onNext}
          disabled={currentIndex === total - 1}
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground md:text-right">
        Showing website {currentIndex + 1} of {total}
      </p>
    </div>
  );
}

export default NavButtons;
