"""Builds the course into plain HTML.

Write lessons in Markdown under src/, then run:

    pip install markdown pymdown-extensions pygments
    python build.py

The finished site lands in docs/, which GitHub Pages serves directly.
You can also edit the HTML in docs/ by hand, but it will be overwritten
the next time someone runs build.py.
"""

import html
import json
import os
import re
import shutil
from pathlib import Path

import markdown
from pygments.formatters import HtmlFormatter
from pymdownx.superfences import fence_div_format

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "docs"
ASSETS = ROOT / "assets"

SITE_TITLE = "RoboJacks 4674"
SITE_SUBTITLE = "FRC Programming Course"

# (section, [(title, path), ...]). This is the site's navigation and lesson order.
NAV = [
    ("Start", [("Home", "index.md")]),
    ("Foundations", [
        ("0. Setup", "foundations/00-setup.md"),
        ("1. Git & Version Control", "foundations/01-git.md"),
        ("2. The Terminal", "foundations/02-terminal.md"),
        ("3. Java Reference", "foundations/03-java.md"),
    ]),
    ("Hardware", [
        ("4. Electronics", "hardware/04-electronics.md"),
        ("4.1 Motors: NEO, CIM, and 775pro", "hardware/04b-motors.md"),
        ("4.2 The SPARK MAX", "hardware/04c-spark-max.md"),
        ("4.3 Sensors", "hardware/04d-sensors.md"),
        ("5. Pneumatics", "hardware/05-pneumatics.md"),
    ]),
    ("Robot Code", [
        ("6. How a Robot Program Runs", "robot-code/06-robot-program.md"),
        ("6.1 Dashboards: NetworkTables and Elastic", "robot-code/06b-dashboards.md"),
        ("7. Command-Based Programming", "robot-code/07-command-based.md"),
        ("7.1 How the Command Scheduler Works", "robot-code/07b-scheduler.md"),
        ("8. Sensors & Units", "robot-code/08-sensors.md"),
        ("9. Testing, Debugging & Simulation", "robot-code/09-debugging.md"),
    ]),
    ("Drivetrain Project", [
        ("10. Teleop", "project/10-teleop.md"),
        ("11. Autonomous", "project/11-autonomous.md"),
    ]),
    ("Controls", [
        ("12. PID Feedback", "controls/12-pid.md"),
        ("13. Feedforward", "controls/13-feedforward.md"),
        ("13.1 Characterizing with SysId", "controls/13b-sysid.md"),
        ("14. Motion Profiles", "controls/14-profiles.md"),
    ]),
    ("Team Workflow", [
        ("15. Branches, PRs & Code Review", "workflow/15-team-process.md"),
        ("16. Unit Testing & CI", "workflow/16-unit-testing.md"),
    ]),
    ("Going Further", [
        ("17. Poses and Odometry", "going-further/17-odometry.md"),
        ("18. Vision: AprilTags and PhotonVision", "going-further/18-vision.md"),
        ("19. Autos with PathPlanner", "going-further/19-pathplanner.md"),
        ("19.1 Using the PathPlanner App", "going-further/19b-pathplanner-app.md"),
        ("20. Logs, AdvantageScope & AdvantageKit", "going-further/20-logging.md"),
        ("21. Swerve Drive", "going-further/21-swerve.md"),
        ("21.1 Our Swerve Today: REV MAXSwerve", "going-further/21b-swerve-maxswerve.md"),
        ("21.2 Next Year: SDS MK5i with CTRE", "going-further/21c-swerve-ctre.md"),
        ("21.3 Using Phoenix Tuner X", "going-further/21d-phoenix-tuner.md"),
    ]),
    ("Reference", [
        ("Where to Go Next", "reference/next-steps.md"),
        ("Glossary", "reference/glossary.md"),
        ("Resources", "reference/resources.md"),
        ("Credits", "reference/credits.md"),
    ]),
    ("Contributing", [
        ("How to Contribute", "contributing/index.md"),
        ("Lesson Template", "contributing/lesson-template.md"),
        ("Yearly Checklist", "contributing/yearly-checklist.md"),
    ]),
]

# The Labs tab has its own menu.
LABS_NAV = [
    ("Test Bed Labs", [
        ("Overview", "testbed/index.md"),
        ("Lab 0: Set Up the TestBed Project", "testbed/lab0-first-project.md"),
        ("Lab 1: Spin a Brushless Motor", "testbed/lab1-spin-motor.md"),
        ("Lab 1.1: Put It on the Dashboard", "testbed/lab1b-dashboard.md"),
        ("Lab 2: Drive a West Coast Drive", "testbed/lab2-west-coast-drive.md"),
        ("Lab 3: Buttons and Triggers", "testbed/lab3-buttons-triggers.md"),
        ("Lab 4: Stop at a Limit Switch", "testbed/lab4-limit-switch.md"),
        ("Lab 5: Control Speed with a Knob", "testbed/lab5-knob-speed.md"),
        ("Lab 6: Count Turns with an Encoder", "testbed/lab6-encoder.md"),
        ("Lab 7: Timed Autonomous", "testbed/lab7-timed-auto.md"),
        ("Lab 8: Gyro Turns and Encoder Distances", "testbed/lab8-navx-gyro.md"),
        ("Lab 9: PID on the Wheel", "testbed/lab9-pid-wheel.md"),
        ("Lab 10: Elevator Position Control", "testbed/lab10-elevator.md"),
        ("Lab 11: Track the Robot on the Field", "testbed/lab11-odometry.md"),
    ]),
]

# (tab name, page the tab opens, that tab's menu). Shown across the top of every page.
TABS = [
    ("Lessons", "index.md", NAV),
    ("Labs", "testbed/index.md", LABS_NAV),
]


def tab_for(path: str):
    """The tab a page belongs to."""
    for tab in TABS:
        if any(p == path for _, pages in tab[2] for _, p in pages):
            return tab
    raise ValueError(f"{path} is not in any tab's menu")


def render_tabs(current: str) -> str:
    links = []
    for name, home, _ in TABS:
        cls = ' class="tab current" aria-current="true"' if tab_for(current)[0] == name else ' class="tab"'
        links.append(f'<a{cls} href="{rel(out_path(current), out_path(home))}">{name}</a>')
    return "".join(links)


MD_EXTENSIONS = [
    "admonition", "attr_list", "md_in_html", "tables", "toc",
    "pymdownx.details", "pymdownx.keys", "pymdownx.inlinehilite",
    "pymdownx.highlight", "pymdownx.superfences", "pymdownx.tasklist",
]
MD_CONFIG = {
    "toc": {"permalink": "#"},
    "pymdownx.highlight": {"css_class": "highlight"},
    "pymdownx.superfences": {
        "custom_fences": [
            {"name": "mermaid", "class": "mermaid", "format": fence_div_format},
        ]
    },
    "pymdownx.tasklist": {"custom_checkbox": True},
}


def out_path(md_path: str) -> str:
    return re.sub(r"\.md$", ".html", md_path)


def rel(from_page: str, to_page: str) -> str:
    """Relative link from one output page to another."""
    start = os.path.dirname(from_page) or "."
    return os.path.relpath(to_page, start).replace(os.sep, "/")


def render_nav(current: str) -> str:
    parts = []
    for section, pages in tab_for(current)[2]:
        items = []
        for title, path in pages:
            href = rel(out_path(current), out_path(path))
            cls = ' class="current" aria-current="page"' if path == current else ""
            items.append(f'<li><a href="{href}"{cls}>{html.escape(title)}</a></li>')
        open_attr = " open" if any(p == current for _, p in pages) else ""
        parts.append(
            f'<details class="nav-section"{open_attr}><summary>{html.escape(section)}</summary>'
            f'<ul>{"".join(items)}</ul></details>'
        )
    return "\n".join(parts)


def render_pager(current: str) -> str:
    flat = [(t, p) for _, pages in tab_for(current)[2] for t, p in pages]
    i = next(i for i, (_, p) in enumerate(flat) if p == current)
    links = []
    if i > 0:
        t, p = flat[i - 1]
        links.append(f'<a class="pager-prev" href="{rel(out_path(current), out_path(p))}">'
                     f'<span>Previous</span>{html.escape(t)}</a>')
    else:
        links.append("<span></span>")
    if i < len(flat) - 1:
        t, p = flat[i + 1]
        links.append(f'<a class="pager-next" href="{rel(out_path(current), out_path(p))}">'
                     f'<span>Next</span>{html.escape(t)}</a>')
    return f'<nav class="pager" aria-label="Lesson navigation">{"".join(links)}</nav>'


def fix_links(body: str) -> str:
    """Point links at .html pages instead of .md source files."""
    return re.sub(r'href="(?!https?:)([^"#]*?)\.md(#[^"]*)?"',
                  lambda m: f'href="{m.group(1)}.html{m.group(2) or ""}"', body)


PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | {site_title}</title>
<link rel="icon" type="image/png" href="{root}assets/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Open+Sans:wght@400;600;700&display=swap">
<link rel="stylesheet" href="{root}assets/style.css">
<link rel="stylesheet" href="{root}assets/code.css">
<script>
// Apply the saved light/dark choice before the page draws, so it never flashes the wrong theme.
try {{
  var savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark" || savedTheme === "light") {{
    document.documentElement.setAttribute("data-theme", savedTheme);
  }}
}} catch (e) {{}}
</script>
{extra_head}
</head>
<body id="top" data-root="{root}">
<a class="skip-link" href="#content">Skip to content</a>
<header class="site-header">
  <div class="plaid" aria-hidden="true"></div>
  <div class="header-inner">
    <a class="brand" href="{root}index.html">
      <img class="brand-logo" src="{root}assets/robojacks-logo.png" alt="RoboJacks logo">
      <span class="brand-text">
        <span class="brand-title">{site_title}</span>
        <span class="brand-subtitle">{site_subtitle}</span>
      </span>
    </a>
    <div class="header-actions">
      <button class="search-open" type="button" aria-label="Search the course" title="Search (press /)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l6 6"/></svg>
        <span class="search-open-label">Search</span>
      </button>
      <a class="header-link" href="https://docs.wpilib.org/en/stable/">WPILib Docs</a>
      <button class="theme-toggle" type="button" role="switch" aria-checked="false" aria-label="Dark mode" title="Dark mode">
        <svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></svg>
        <span class="theme-track"><span class="theme-knob"></span></span>
        <svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>
      </button>
    </div>
  </div>
  <nav class="tabs" aria-label="Sections"><div class="tabs-inner">{tabs}</div></nav>
</header>
<div class="layout">
  <aside class="sidebar">
    <details class="sidebar-toggle" open>
      <summary>{tab_name} menu</summary>
      <nav aria-label="Course">{nav}</nav>
    </details>
  </aside>
  <main id="content" class="content">
    <article>
{body}
    </article>
    {pager}
  </main>
</div>
<div class="search-panel" hidden>
  <div class="search-box" role="dialog" aria-modal="true" aria-label="Search the course">
    <div class="search-row">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l6 6"/></svg>
      <input class="search-input" type="search" placeholder="Search lessons and labs" aria-label="Search words" autocomplete="off" spellcheck="false">
      <button class="search-close" type="button" aria-label="Close search">Esc</button>
    </div>
    <p class="search-status" aria-live="polite"></p>
    <ol class="search-results"></ol>
  </div>
</div>
<footer class="site-footer">
  <div class="plaid plaid-thin" aria-hidden="true"></div>
  <div class="footer-inner">
    <span>4674 RoboJacks</span>
    <span>Portions adapted from the <a href="https://docs.wpilib.org/en/stable/">WPILib documentation</a>, &copy; WPILib contributors, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. <a href="{root}reference/credits.html">Credits</a></span>
    <a href="#top">^ To Top</a>
  </div>
</footer>
<script>
if (window.matchMedia("(max-width: 860px)").matches) {{
  document.querySelector(".sidebar-toggle").removeAttribute("open");
}}

// Light/dark switch. With no saved choice, the site follows the device's setting.
(function () {{
  var root = document.documentElement;
  var toggle = document.querySelector(".theme-toggle");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  function isDark() {{
    var chosen = root.getAttribute("data-theme");
    return chosen ? chosen === "dark" : systemDark.matches;
  }}
  function show() {{
    toggle.setAttribute("aria-checked", isDark() ? "true" : "false");
  }}
  toggle.addEventListener("click", function () {{
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {{ localStorage.setItem("theme", next); }} catch (e) {{}}
    show();
    document.dispatchEvent(new CustomEvent("themechange"));
  }});
  systemDark.addEventListener("change", function () {{
    show();
    document.dispatchEvent(new CustomEvent("themechange"));
  }});
  show();
}})();
</script>
<script src="{root}assets/search.js" defer></script>
{mermaid}
</body>
</html>
"""

MERMAID = """<script type="module">
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
const diagrams = [...document.querySelectorAll(".mermaid")];
diagrams.forEach((d) => { d.dataset.source = d.textContent; });   // keep the source to redraw later
function isDark() {
  const chosen = document.documentElement.getAttribute("data-theme");
  return chosen ? chosen === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}
async function draw() {
  mermaid.initialize({ startOnLoad: false, theme: isDark() ? "dark" : "default" });
  diagrams.forEach((d) => { d.removeAttribute("data-processed"); d.textContent = d.dataset.source; });
  await mermaid.run({ nodes: diagrams });
}
draw();
document.addEventListener("themechange", draw);   // redraw diagrams when the light/dark switch flips
</script>"""


# WPILib's interactive PID tuning simulators. Loaded in <head> so the inline
# "new VerticalElevatorPIDF(...)" scripts on a page can use them right away.
SIM_HEAD = """<link rel="stylesheet" href="{root}assets/wpilib/pid-tune.css">
<script src="{root}assets/wpilib/pid-tune.js"></script>
<script src="{root}assets/wpilib/pid-tune-fixes.js"></script>"""


def search_entries(title: str, url: str, body: str) -> list:
    """Split one page into sections at its h2/h3 headings for the search box."""
    body = re.sub(r'<a class="headerlink"[^>]*>.*?</a>', "", body, flags=re.S)
    body = re.sub(r"<(script|style)\b.*?</\1>", " ", body, flags=re.S)
    parts = re.split(r'(<h[1-3][^>]*>.*?</h[1-3]>)', body, flags=re.S)
    entries = []
    heading, anchor, text = "", "", []

    def flush():
        words = html.unescape(re.sub(r"<[^>]+>", " ", " ".join(text)))
        words = re.sub(r"\s+", " ", words).strip()
        if words or heading:
            entries.append({"p": title, "h": heading, "u": url + (f"#{anchor}" if anchor else ""), "t": words})

    for part in parts:
        m = re.match(r'<h([1-3])([^>]*)>(.*?)</h\1>', part, flags=re.S)
        if m and m.group(1) in "23":
            flush()
            heading = html.unescape(re.sub(r"<[^>]+>", "", m.group(3))).strip()
            idm = re.search(r'id="([^"]+)"', m.group(2))
            anchor = idm.group(1) if idm else ""
            text = []
        elif not m:
            text.append(part)
    flush()
    return entries


def build():
    # GitHub Pages' custom domain lives in docs/CNAME. Keep it across rebuilds.
    cname = (OUT / "CNAME").read_text() if (OUT / "CNAME").exists() else None
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)
    if cname:
        (OUT / "CNAME").write_text(cname)
    for f in ("style.css", "robojacks-logo.png", "favicon.png"):
        shutil.copy(ASSETS / f, OUT / "assets" / f)
    # Diagrams, screenshots, and PID simulators adapted from the WPILib docs (CC BY 4.0)
    shutil.copytree(ASSETS / "wpilib", OUT / "assets" / "wpilib")
    shutil.copytree(ASSETS / "photos", OUT / "assets" / "photos")
    # Screenshots from the PathPlanner docs (MIT), with their license
    shutil.copytree(ASSETS / "pathplanner", OUT / "assets" / "pathplanner")
    # Unmodified screenshots from CTRE's Phoenix 6 docs (CC BY-NC-ND 4.0), with their license
    shutil.copytree(ASSETS / "ctre", OUT / "assets" / "ctre")
    # Code colors: light by default; dark when the switch says dark, or when the
    # device is in dark mode and the switch hasn't been set to light.
    light = HtmlFormatter(style="friendly").get_style_defs(".highlight")
    dark_auto = HtmlFormatter(style="monokai").get_style_defs(':root:not([data-theme="light"]) .highlight')
    dark_chosen = HtmlFormatter(style="monokai").get_style_defs(':root[data-theme="dark"] .highlight')
    (OUT / "assets" / "code.css").write_text(
        f"{light}\n@media (prefers-color-scheme: dark) {{\n{dark_auto}\n}}\n{dark_chosen}\n")
    (OUT / ".nojekyll").write_text("")  # tell GitHub Pages to serve files as-is

    shutil.copy(ASSETS / "search.js", OUT / "assets" / "search.js")
    search = []
    all_pages = [(t, p) for _, _, nav in TABS for _, pages in nav for t, p in pages]
    for title, path in all_pages:
        src = (SRC / path).read_text(encoding="utf-8")
        md = markdown.Markdown(extensions=MD_EXTENSIONS, extension_configs=MD_CONFIG)
        body = fix_links(md.convert(src))
        dest = OUT / out_path(path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        depth = out_path(path).count("/")
        dest.write_text(PAGE.format(
            title=html.escape(title),
            site_title=SITE_TITLE,
            site_subtitle=SITE_SUBTITLE,
            root="../" * depth,
            nav=render_nav(path),
            tabs=render_tabs(path),
            tab_name=tab_for(path)[0],
            body=body,
            pager=render_pager(path),
            mermaid=MERMAID if 'class="mermaid"' in body else "",
            extra_head=SIM_HEAD.format(root="../" * depth) if "viz-div" in body else "",
        ), encoding="utf-8")
        search.extend(search_entries(title, out_path(path), body))
        print("built", dest.relative_to(ROOT))
    # A .js file (not .json) so search also works when the pages are opened straight from disk.
    (OUT / "assets" / "search-index.js").write_text(
        "window.SEARCH_INDEX = " + json.dumps(search, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")


if __name__ == "__main__":
    build()
