function NavButtons({ currentIndex, total, onPrev, onNext }) {
  if (total === 0) {
    return (
      <div className="nav-controls">
        <p className="counter-text">Upload a file to begin navigating websites.</p>
      </div>
    );
  }

  return (
    <div className="nav-controls">
      <div className="nav-group">
        <button className="nav-button" onClick={onPrev} disabled={currentIndex === 0}>
          Previous
        </button>
        <button className="nav-button" onClick={onNext} disabled={currentIndex === total - 1}>
          Next
        </button>
      </div>

      <p className="counter-text">
        Showing website {currentIndex + 1} of {total}
      </p>
    </div>
  );
}

export default NavButtons;
