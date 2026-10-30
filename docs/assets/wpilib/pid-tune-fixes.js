// Small fixes for WPILib's PID tuning simulators on this site (our addition, not WPILib's code).
//
// WPILib's BaseSim only redraws when the TOP or BOTTOM edge of the simulator is on screen.
// On phones the simulator is taller than the screen, so in the middle neither edge shows
// and the graphs stop drawing. Redraw whenever ANY part of it is on screen instead.
BaseSim.prototype.isInViewport = function () {
  const rect = this.containerDiv.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom >= 0 && rect.top <= viewHeight;
};
