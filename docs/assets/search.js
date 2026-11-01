// Course search. build.py writes every page, split at its headings, into
// assets/search-index.js as window.SEARCH_INDEX = [{p: page, h: heading, u: url, t: text}, ...].
// Everything runs in the browser: no server, no outside service.
(function () {
  var root = document.body.getAttribute("data-root") || "";
  var panel = document.querySelector(".search-panel");
  var input = panel.querySelector(".search-input");
  var list = panel.querySelector(".search-results");
  var status = panel.querySelector(".search-status");
  var openers = document.querySelectorAll(".search-open, .search-bar");
  var lastFocus = null;
  var active = -1;

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function terms(q) {
    return q.toLowerCase().split(/[^a-z0-9_.]+/).filter(function (w) { return w.length > 1; });
  }

  function count(hay, word) {
    var n = 0, i = hay.indexOf(word);
    while (i !== -1 && n < 20) { n++; i = hay.indexOf(word, i + word.length); }
    return n;
  }

  // Every word must appear somewhere in the section (page title, heading, or text).
  // Matches in the page title and heading count far more than matches in the text.
  function score(entry, words) {
    var page = entry.p.toLowerCase(), head = entry.h.toLowerCase(), text = entry.t.toLowerCase();
    var total = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var s = (page.indexOf(w) !== -1 ? 8 : 0) + (head.indexOf(w) !== -1 ? 12 : 0) + Math.min(count(text, w), 10);
      if (s === 0) return 0;
      total += s;
    }
    if (words.length > 1 && (head + " " + text).indexOf(words.join(" ")) !== -1) total += 15;
    return total;
  }

  function snippet(text, words) {
    var lower = text.toLowerCase(), at = -1;
    for (var i = 0; i < words.length && at === -1; i++) at = lower.indexOf(words[i]);
    var start = Math.max(0, at - 60);
    var piece = (start > 0 ? "… " : "") + text.slice(start, start + 180) + (start + 180 < text.length ? " …" : "");
    return highlight(piece, words);
  }

  function highlight(s, words) {
    var safe = escapeHtml(s);
    if (!words.length) return safe;
    var re = new RegExp("(" + words.map(escapeRegex).join("|") + ")", "gi");
    return safe.replace(re, "<mark>$1</mark>");
  }

  function run() {
    var q = input.value.trim();
    var words = terms(q);
    list.innerHTML = "";
    active = -1;
    if (!window.SEARCH_INDEX) { if (loading) status.textContent = "Loading…"; return; }
    if (!words.length) { status.textContent = "Type a word, like encoder, PID, or Elastic."; return; }
    var hits = [];
    window.SEARCH_INDEX.forEach(function (e) {
      var s = score(e, words);
      if (s) hits.push({ e: e, s: s });
    });
    hits.sort(function (a, b) { return b.s - a.s; });
    hits = hits.slice(0, 25);
    status.textContent = hits.length ? hits.length + (hits.length === 25 ? "+" : "") + " matches" : "No matches for “" + q + "”.";
    hits.forEach(function (hit) {
      var e = hit.e;
      var li = document.createElement("li");
      li.innerHTML =
        '<a href="' + escapeHtml(root + e.u) + '">' +
        '<span class="search-page">' + highlight(e.p, words) + "</span>" +
        (e.h ? '<span class="search-heading">' + highlight(e.h, words) + "</span>" : "") +
        '<span class="search-snippet">' + snippet(e.t, words) + "</span></a>";
      list.appendChild(li);
    });
  }

  function move(step) {
    var links = list.querySelectorAll("a");
    if (!links.length) return;
    active = (active + step + links.length) % links.length;
    links.forEach(function (a, i) { a.classList.toggle("is-active", i === active); });
    links[active].scrollIntoView({ block: "nearest" });
  }

  // The index is about half a megabyte, so it loads the first time someone opens search.
  var loading = false;
  function loadIndex() {
    if (window.SEARCH_INDEX || loading) return;
    loading = true;
    status.textContent = "Loading…";
    var s = document.createElement("script");
    s.src = root + "assets/search-index.js";
    s.onload = run;
    s.onerror = function () { loading = false; status.textContent = "The search list didn't load. Check your connection and try again."; };
    document.head.appendChild(s);
  }

  function open() {
    lastFocus = document.activeElement;
    loadIndex();
    panel.hidden = false;
    document.documentElement.classList.add("search-is-open");
    input.focus();
    input.select();
    run();
  }
  function close() {
    panel.hidden = true;
    document.documentElement.classList.remove("search-is-open");
    if (lastFocus) lastFocus.focus();
  }

  openers.forEach(function (b) { b.addEventListener("click", open); });
  panel.querySelector(".search-close").addEventListener("click", close);
  panel.addEventListener("click", function (ev) { if (ev.target === panel) close(); });
  input.addEventListener("input", run);
  input.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowDown") { ev.preventDefault(); move(1); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); move(-1); }
    else if (ev.key === "Enter") {
      var links = list.querySelectorAll("a");
      if (links.length) { ev.preventDefault(); (links[active >= 0 ? active : 0]).click(); }
    }
  });
  // Clicking a result on the same page only changes the #anchor, so close the panel too.
  list.addEventListener("click", function (ev) { if (ev.target.closest("a")) close(); });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !panel.hidden) { close(); return; }
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (panel.hidden && !typing && (ev.key === "/" || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k"))) {
      ev.preventDefault();
      open();
    }
  });
})();
