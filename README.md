# RoboJacks 4674 FRC Programming Course

A tutorial-style course for FRC Java, from installing WPILib to PID, feedforward, SysId, and motion profiles. It builds on the [WPILib documentation](https://docs.wpilib.org/en/stable/).

## Layout

| Folder / file | What it is |
|---|---|
| `src/` | Lessons, written in Markdown. **Edit these.** |
| `assets/style.css` | The site theme. Colors and fonts are at the top. |
| `build.py` | Turns `src/` into HTML, and holds the lesson order (`NAV`) |
| `build_gitbook.py` | Turns `src/` into the GitBook version |
| `docs/` | The finished HTML site that GitHub Pages serves. Generated, so don't edit by hand. |
| `book/` | The GitBook version, with its table of contents in `book/SUMMARY.md`. Generated, so don't edit by hand. |
| `.gitbook.yaml` | Tells GitBook to read from `book/` |
| `testbed-code/` | Early drafts of the test bed wheel code |

The course is published two ways from the same lessons:

- **GitHub Pages** (`docs/`): the full site, with the RoboJacks theme and the interactive PID simulators.
- **GitBook** (`book/`): the same lessons in GitBook. The simulators can't run inside GitBook, so those spots link to the website and to the WPILib docs instead.

## Publish on GitHub Pages
1. This repo is [Robojacks/frc-course](https://github.com/Robojacks/frc-course).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch **main**, folder **/docs**.
4. Wait a minute, and the site appears at `https://robojacks.github.io/frc-course/`.

## Publish on GitBook
1. Push this repo to GitHub first (GitBook imports from it).
2. Sign in at [gitbook.com](https://www.gitbook.com/) and create a new **space**.
3. In the space header, click **Set up** next to **Git Sync**, then choose **GitHub Sync**.
4. Connect your GitHub account and let GitBook access this repo.
5. Under **Source repository**, pick this repo and the **main** branch.
6. Set the sync direction to **GitHub → GitBook** (use **Swap direction** if it shows the other way). This makes the repo the source of truth.
7. Leave **Project directory** empty. GitBook finds `.gitbook.yaml` at the top of the repo, which points it at `book/`.
8. Click **Sync**, then publish the space to the web. GitBook gives it a `….gitbook.io` address.

> **Don't edit in GitBook.** GitBook can push edits back to the repo, but they would land in `book/`, which `build_gitbook.py` overwrites. Make every change in `src/` and push it; GitBook updates itself from the repo.

## Update the site and the book
```bash
pip install -r requirements.txt
npm install -g @mermaid-js/mermaid-cli   # once, for the diagrams in the GitBook version
python build.py
python build_gitbook.py --site-url https://robojacks.github.io/frc-course
git add .
git commit -m "Describe the change"
git push
```
