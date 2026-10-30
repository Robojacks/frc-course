"""Builds the GitBook version of the course into book/.

The lessons in src/ use a few Markdown extras that GitBook doesn't understand
(the same extras build.py uses for the website). This script copies src/ into
book/ and converts them:

    !!! tip "Title"        ->  a GitBook hint block
    ??? question "Title"   ->  an expandable <details> block
    ++ctrl+shift+p++       ->  **Ctrl+Shift+P**
    ```mermaid             ->  a PNG diagram (needs the Mermaid CLI, mmdc)
    WPILib simulators      ->  a link to the simulator in the WPILib docs
                               (and on the course website, if --site-url is given)

It also writes book/SUMMARY.md (GitBook's table of contents) from the menus
in build.py, so the lesson order lives in one place.

    npm install -g @mermaid-js/mermaid-cli     # once, for the diagrams
    python build_gitbook.py --site-url https://YOUR-USERNAME.github.io/REPO-NAME

book/ is generated. Edit src/, then run this again.
"""

import argparse
import hashlib
import html
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from build import NAV, LABS_NAV

ROOT = Path(__file__).parent
SRC = ROOT / "src"
BOOK = ROOT / "book"
ASSETS = ROOT / "assets"

HINT_STYLE = {
    "tip": "success",
    "info": "info",
    "note": "info",
    "example": "info",
    "question": "info",
    "wpilib": "info",
    "warning": "warning",
    "danger": "danger",
}

KEY_NAMES = {
    "ctrl": "Ctrl", "shift": "Shift", "alt": "Alt", "cmd": "Cmd", "enter": "Enter",
    "space": "Space", "tab": "Tab", "esc": "Esc", "backspace": "Backspace",
    "up": "↑", "down": "↓", "left": "←", "right": "→",
}

BLOCK_START = re.compile(r'^(\s*)(!!!|\?\?\?\+?)\s+(\w+)(?:\s+"(.*)")?\s*$')
FENCE = re.compile(r"^\s*(```|~~~)")


def keys(text: str) -> str:
    """++ctrl+shift+p++ -> **Ctrl+Shift+P**"""
    def one(m):
        parts = m.group(1).split("+")
        return "**" + "+".join(KEY_NAMES.get(p.lower(), p.upper() if len(p) == 1 else p.title())
                               for p in parts) + "**"
    return re.sub(r"\+\+([\w+-]+?)\+\+", one, text)


def html_links_to_md(text: str) -> str:
    return re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', r"[\2](\1)", text)


def convert_blocks(lines: list[str]) -> list[str]:
    """Turn !!! and ??? blocks into GitBook hints and <details>, recursively."""
    out = []
    i = 0
    in_fence = False
    while i < len(lines):
        line = lines[i]
        if FENCE.match(line):
            in_fence = not in_fence
        m = None if in_fence else BLOCK_START.match(line)
        if not m:
            out.append(line)
            i += 1
            continue

        indent, marker, kind, title = m.group(1), m.group(2), m.group(3), m.group(4)
        body_indent = indent + "    "
        body = []
        i += 1
        while i < len(lines) and (lines[i].strip() == "" or lines[i].startswith(body_indent)):
            body.append(lines[i][len(body_indent):] if lines[i].strip() else "")
            i += 1
        while body and body[-1] == "":
            body.pop()
            i -= 1  # leave trailing blank lines outside the block
        body = convert_blocks(body)
        title = keys(title or kind.title())

        if marker == "!!!":
            block = [f'{{% hint style="{HINT_STYLE.get(kind, "info")}" %}}', f"**{title}**", ""]
            block += body + ["{% endhint %}"]
        else:
            block = ["<details>", f"<summary>{html.escape(title, quote=False)}</summary>", ""]
            block += body + ["", "</details>"]
        out += [indent + b if b else "" for b in block]
    return out


class Mermaid:
    """Renders ```mermaid blocks to PNGs under book/assets/diagrams/."""

    def __init__(self):
        self.out_dir = BOOK / "assets" / "diagrams"
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.mmdc = shutil.which("mmdc")
        if not self.mmdc:
            print("warning: mmdc not found, so Mermaid diagrams stay as code blocks")

    def __call__(self, text: str, page: Path) -> str:
        if not self.mmdc:
            return text
        depth = len(page.relative_to(BOOK).parts) - 1
        prefix = "../" * depth

        def render(m):
            source = m.group(1)
            name = f"{page.stem}-{hashlib.sha1(source.encode()).hexdigest()[:8]}.png"
            target = self.out_dir / name
            if not target.exists():
                with tempfile.TemporaryDirectory() as tmp:
                    src_file = Path(tmp) / "d.mmd"
                    src_file.write_text(source)
                    subprocess.run([self.mmdc, "-i", str(src_file), "-o", str(target),
                                    "-b", "white", "-s", "2", "-q"], check=True)
            return f"![Diagram]({prefix}assets/diagrams/{name})"

        return re.sub(r"^```mermaid\n(.*?)^```$", render, text, flags=re.S | re.M)


def convert_sims(text: str, rel: str, site_url: str | None) -> str:
    """Replace each interactive simulator (and its credit line) with links."""
    pattern = re.compile(
        r'<div class="viz-div".*?</script>\s*</div>\s*'
        r'<p class="credit">.*?<a href="([^"]+)">(.*?)</a>.*?</p>', re.S)

    def link(m):
        url, title = m.group(1), m.group(2)
        lines = ['{% hint style="info" %}', "**Interactive simulator**", "",
                 "The simulator for this section runs in a web page, not in GitBook. Use it in either place:", ""]
        if site_url:
            page = site_url.rstrip("/") + "/" + rel.replace(".md", ".html")
            lines.append(f"- [This page on the course website]({page})")
        lines.append(f"- [{title}]({url}) in the WPILib docs (CC BY 4.0)")
        lines.append("{% endhint %}")
        return "\n".join(lines)

    return pattern.sub(link, text)


def convert_html(text: str) -> str:
    # Image captions: <p class="credit">...</p> -> an italic line
    text = re.sub(r'<p class="credit">(.*?)</p>',
                  lambda m: "_" + html_links_to_md(m.group(1)).replace("_", r"\_") + "_", text, flags=re.S)
    # The home page's button
    text = re.sub(r'<a class="cta" href="([^"]+)\.html">(.*?)</a>',
                  lambda m: f"**[{m.group(2)}]({m.group(1)}.md)**", text)
    return text


def convert_page(src: Path, mermaid: Mermaid, site_url: str | None):
    rel = src.relative_to(SRC).as_posix()
    # GitBook's default home page is README.md, so the home page is renamed.
    dest = BOOK / ("README.md" if rel == "index.md" else rel)
    dest.parent.mkdir(parents=True, exist_ok=True)
    text = src.read_text()
    text = convert_sims(text, rel, site_url)
    text = convert_html(text)
    if "/" in rel:  # links from a lesson folder back to the home page
        text = re.sub(r"\]\(\.\./index\.md", "](../README.md", text)

    # Keys, outside code
    parts = re.split(r"(^```.*?^```$)", text, flags=re.S | re.M)
    parts = [p if p.startswith("```") else re.sub(r"(`[^`\n]*`)|([^`]+)",
             lambda m: m.group(1) or keys(m.group(2)), p) for p in parts]
    text = "".join(parts)

    text = "\n".join(convert_blocks(text.split("\n")))
    text = mermaid(text, dest)
    dest.write_text(text)


def summary() -> str:
    lines = ["# Table of contents", ""]
    for menus in (NAV, LABS_NAV):
        for section, pages in menus:
            if section != "Start":
                lines += ["", f"## {section}", ""]
            for title, path in pages:
                lines.append(f"* [{title}]({'README.md' if path == 'index.md' else path})")
    return "\n".join(lines) + "\n"


def build(site_url: str | None):
    if BOOK.exists():
        keep = BOOK / "assets" / "diagrams"
        cached = {p.name: p.read_bytes() for p in keep.glob("*.png")} if keep.exists() else {}
        shutil.rmtree(BOOK)
    else:
        cached = {}
    (BOOK / "assets").mkdir(parents=True)
    shutil.copytree(ASSETS / "wpilib", BOOK / "assets" / "wpilib",
                    ignore=shutil.ignore_patterns("*.js", "*.css"))
    shutil.copy(ASSETS / "robojacks-logo.png", BOOK / "assets")
    diagrams = BOOK / "assets" / "diagrams"
    diagrams.mkdir()
    for name, data in cached.items():
        (diagrams / name).write_bytes(data)

    mermaid = Mermaid()
    pages = {p for menus in (NAV, LABS_NAV) for _, ps in menus for _, p in ps}
    for path in sorted(pages):
        convert_page(SRC / path, mermaid, site_url)

    # Remove diagrams no page uses anymore
    used = "".join(p.read_text() for p in BOOK.rglob("*.md"))
    for png in diagrams.glob("*.png"):
        if png.name not in used:
            png.unlink()

    (BOOK / "SUMMARY.md").write_text(summary())
    print(f"Built {len(pages)} pages into {BOOK}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--site-url", help="The GitHub Pages address, for simulator links")
    build(parser.parse_args().site_url)
