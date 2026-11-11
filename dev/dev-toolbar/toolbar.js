// Runs in the browser, after the toolbar.
(() => {
  const bar = document.getElementById("dev-bar");

  // Bold the Navigation link for the kind of page you're on, whichever forum, topic or member it is.
  const q = new URLSearchParams(location.search);
  const act = (q.get("act") || "").toLowerCase();
  const page =
    q.has("showtopic") ? "topic" :
    q.has("showforum") ? "forum" :
    q.has("showuser") ? "profile" :
    act === "members" ? "members" :
    !act && /^\/(index\.php)?$/.test(location.pathname) ? "index" : null; // the index, a category (?c=) or ?guest=1
  const current = page && bar.querySelector(`[data-page="${page}"]`);
  if (current) current.setAttribute("aria-current", "page");

  // Close the "Sample data forms" menu after picking a page, or when clicking anywhere else.
  const menu = document.getElementById("dev-pages");
  document.addEventListener("click", (e) => {
    if (menu.open && (!menu.contains(e.target) || e.target.closest("a"))) menu.open = false;
  });

  // ---- Dragging ----
  // The position is saved in localStorage with the server's start time (data-boot), so it's kept
  // across reloads and pages, but forgotten once the server restarts.
  const KEY = "dev_toolbar_pos";
  const grip = bar.querySelector(".dev-grip");
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
    set(v) { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {} },
  };

  // Keep the whole bar on screen.
  function place(x, y) {
    x = Math.max(0, Math.min(x, innerWidth - bar.offsetWidth));
    y = Math.max(0, Math.min(y, innerHeight - bar.offsetHeight));
    Object.assign(bar.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" });
    // In the top half, menus open downward so they stay on screen.
    bar.classList.toggle("dev-top", y + bar.offsetHeight / 2 < innerHeight / 2);
    return { x, y };
  }

  function reset() {
    store.set(null);
    Object.assign(bar.style, { left: "", top: "", right: "", bottom: "" });
    bar.classList.remove("dev-top");
  }

  const saved = store.get();
  if (saved && saved.boot === bar.dataset.boot) place(saved.x, saved.y);
  else store.set(null);

  grip.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const r = bar.getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    grip.setPointerCapture(e.pointerId);
    bar.classList.add("dev-dragging");
    const move = (ev) => place(ev.clientX - dx, ev.clientY - dy);
    const up = () => {
      grip.removeEventListener("pointermove", move);
      bar.classList.remove("dev-dragging");
      const b = bar.getBoundingClientRect();
      store.set({ boot: bar.dataset.boot, x: b.left, y: b.top });
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", up, { once: true });
    grip.addEventListener("pointercancel", up, { once: true });
  });

  grip.addEventListener("dblclick", reset);

  // If the window gets smaller, pull the bar back on screen (without changing the saved spot).
  addEventListener("resize", () => {
    const s = store.get();
    if (s && s.boot === bar.dataset.boot) place(s.x, s.y);
  });
})();
