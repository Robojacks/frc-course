# How to Contribute

This site is plain HTML. Lessons are written in Markdown in the `src/` folder, and a small Python script, `build.py`, turns them into the HTML pages in `docs/`. GitHub Pages serves `docs/` directly, so there's no server and nothing to deploy by hand.

A second script, `build_gitbook.py`, makes the GitBook version of the same lessons in `book/`. GitBook reads it straight from the repo.

## Quick edits
1. Edit the lesson's Markdown file in `src/`.
2. Run `python build.py` and `python build_gitbook.py --site-url https://robojacks.github.io/frc-course`.
3. Commit the `src/` change **and** the rebuilt `docs/` and `book/` files, and open a pull request.

!!! warning "Don't edit `docs/`, `book/`, or pages in GitBook directly"
    The build scripts regenerate everything in `docs/` and `book/` from `src/`, so hand edits there (including edits made in GitBook's editor) get overwritten the next time anyone builds.

## Working locally
```bash
git clone https://github.com/Robojacks/frc-course.git
cd frc-course
pip install -r requirements.txt
npm install -g @mermaid-js/mermaid-cli   # once, for the GitBook diagrams
python build.py
python build_gitbook.py --site-url https://robojacks.github.io/frc-course
```
Then open `docs/index.html` in your browser. Rebuild and refresh after each change.

## Adding a lesson
1. Copy the [lesson template](lesson-template.md) into the right folder under `src/`.
2. Add it to the `NAV` list near the top of `build.py`. That list controls the sidebar and the Previous / Next buttons.
3. Run `python build.py` and click through the new page.
4. Open a pull request ([Lesson 15](../workflow/15-team-process.md) explains how).

## Changing the look
Every color and font is set in the first block of `assets/style.css`. Change those values and rebuild. The rest of the stylesheet reads from them.

## Style rules
- Write for a freshman who just joined the team.
- **Link to WPILib for reference material.** Our job is the tutorial, not rewriting their docs.
- Every lesson has the five sections: *Why it matters, Read this, Walkthrough, Try it, Check yourself.*
- Code examples should run in simulation without vendor libraries when possible.
