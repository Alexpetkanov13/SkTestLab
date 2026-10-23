(() => {
  const api = acquireVsCodeApi();
  const saved = api.getState() || {};
  const theme = document.getElementById("dashboard-theme");
  if (theme) {
    theme.value = document.body.dataset.theme || "auto";
    theme.addEventListener("change", () => {
      if (!["auto", "white", "dark"].includes(theme.value)) return;
      document.body.dataset.theme = theme.value;
      api.postMessage({ type: "theme", theme: theme.value });
    });
  }
  let filter = ["all", "issues", "passed", "other"].includes(saved.filter)
    ? saved.filter
    : "all";
  const input = document.getElementById("search");
  const mode = document.getElementById("mode-filter");
  const sort = document.getElementById("result-sort");
  if (mode && ["all", "offline", "runtime"].includes(saved.mode))
    mode.value = saved.mode;
  if (sort && ["original", "slowest", "name", "issues"].includes(saved.sort))
    sort.value = saved.sort;
  const persist = () =>
    api.setState({
      filter,
      query: input?.value ?? "",
      mode: mode?.value ?? "all",
      sort: sort?.value ?? "original",
      scroll: window.scrollY,
    });
  if (input && typeof saved.query === "string") input.value = saved.query;
  const applyFilters = () => {
    const query = input ? input.value.toLowerCase().trim() : "";
    let visible = 0;
    document.querySelectorAll(".test-row").forEach((row) => {
      const status = row.dataset.status;
      const match =
        filter === "all" ||
        (filter === "issues" && ["failed", "errored"].includes(status)) ||
        (filter === "passed" && status === "passed") ||
        (filter === "other" &&
          !["passed", "failed", "errored"].includes(status));
      row.hidden = !(
        match &&
        row.dataset.search.includes(query) &&
        (!mode || mode.value === "all" || row.dataset.mode === mode.value)
      );
      if (!row.hidden) visible++;
    });
    document.querySelectorAll("[data-filter]").forEach((button) => {
      const selected = button.dataset.filter === filter;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const count = document.getElementById("visible-count");
    if (count)
      count.textContent = visible + (visible === 1 ? " test" : " tests");
    const empty = document.getElementById("no-matches");
    if (empty) empty.hidden = visible > 0;
    persist();
  };
  const applySort = () => {
    const list = document.querySelector(".test-list");
    if (!list || !sort) return;
    const rank = (status) =>
      status === "errored"
        ? 0
        : status === "failed"
          ? 1
          : status === "passed"
            ? 3
            : 2;
    const rows = Array.from(list.querySelectorAll(".test-row"));
    rows.sort((a, b) =>
      sort.value === "slowest"
        ? Number(b.dataset.duration) - Number(a.dataset.duration)
        : sort.value === "name"
          ? a.dataset.name.localeCompare(b.dataset.name)
          : sort.value === "issues"
            ? rank(a.dataset.status) - rank(b.dataset.status)
            : Number(a.dataset.order) - Number(b.dataset.order),
    );
    rows.forEach((row) => list.appendChild(row));
    persist();
  };
  mode?.addEventListener("change", applyFilters);
  sort?.addEventListener("change", applySort);
  document
    .getElementById("expand-results")
    ?.addEventListener("click", () =>
      document
        .querySelectorAll(".test-row:not([hidden])")
        .forEach((row) => (row.open = true)),
    );
  document
    .getElementById("collapse-results")
    ?.addEventListener("click", () =>
      document
        .querySelectorAll(".test-row")
        .forEach((row) => (row.open = false)),
    );
  document
    .querySelectorAll("[data-height]")
    .forEach(
      (bar) =>
        (bar.style.height =
          Math.max(0, Math.min(100, Number(bar.dataset.height) || 0)) + "%"),
    );
  document.querySelectorAll(".segment").forEach((segment) => {
    const size = Number(segment.dataset.segment);
    segment.style.flexGrow = String(
      Number.isFinite(size) ? Math.max(0, size) : 0,
    );
    if (!size) segment.hidden = true;
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    if (button.dataset.filter) {
      filter = button.dataset.filter;
      applyFilters();
      return;
    }
    if (button.hasAttribute("data-refresh"))
      api.postMessage({ type: "refresh" });
    else if (button.dataset.action)
      api.postMessage({ type: "action", action: button.dataset.action });
    else if (button.dataset.selectRun)
      api.postMessage({ type: "selectRun", id: button.dataset.selectRun });
    else if (button.dataset.source !== undefined)
      api.postMessage({
        type: "openSource",
        runId: button.dataset.run,
        index: Number(button.dataset.source),
      });
    const live = document.getElementById("action-status");
    if (live) live.textContent = button.textContent.trim() + " requested";
  });
  const updateNavigation = () =>
    document.querySelectorAll(".nav-link").forEach((link) => {
      const current =
        link.getAttribute("href") === (window.location.hash || "#overview");
      link.classList.toggle("active", current);
      if (current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  window.addEventListener("hashchange", updateNavigation);
  updateNavigation();
  if (input) input.addEventListener("input", applyFilters);
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      input &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
    ) {
      event.preventDefault();
      input.focus();
    }
    if (event.key === "Escape" && input && document.activeElement === input) {
      input.value = "";
      applyFilters();
    }
  });
  window.addEventListener("scroll", persist, { passive: true });
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "error") {
      const live = document.getElementById("action-status");
      if (live) live.textContent = event.data.message;
    }
  });
  applyFilters();
  applySort();
  if (Number.isFinite(saved.scroll)) window.scrollTo(0, saved.scroll);
  api.postMessage({ type: "ready" });
})();
