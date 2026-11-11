// Runs in the browser, after the toolbar.
(() => {
  // Close the "Sample data forms" menu after picking a page, or when clicking anywhere else.
  const menu = document.getElementById("dev-pages");
  document.addEventListener("click", (e) => {
    if (menu.open && (!menu.contains(e.target) || e.target.closest("a"))) menu.open = false;
  });
})();
