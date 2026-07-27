// Apply the saved/system theme before first paint to avoid a flash.
// External (not inline) so the app can enforce a strict script-src 'self' CSP
// without an inline-script hash to maintain. Loaded render-blocking in <head>.
(function () {
  try {
    let t = localStorage.getItem("gr33t-theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }
    document.documentElement.classList.add("theme-" + t);
    document.documentElement.style.colorScheme = t;
  } catch {
    // Best-effort: no localStorage/matchMedia (e.g. privacy mode) -> skip.
  }
})();
