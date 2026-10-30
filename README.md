# RoboJacks 4674 FRC Programming Course

A tutorial-style course for FRC Java, from installing WPILib to PID, feedforward, SysId, and motion profiles. It builds on the [WPILib documentation](https://docs.wpilib.org/en/stable/).

## Layout

| Folder / file | What it is |
|---|---|
| `src/` | Lessons, written in Markdown. **Edit these.** |
| `assets/style.css` | The site theme. Colors and fonts are at the top. |
| `build.py` | Turns `src/` into HTML, and holds the lesson order (`NAV`) |
| `docs/` | The finished HTML site that GitHub Pages serves. Generated, so don't edit by hand. |
| `testbed-code/` | Early drafts of the test bed wheel code |

## Publish on GitHub Pages
1. This repo is [Robojacks/frc-course](https://github.com/Robojacks/frc-course).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch **main**, folder **/docs**.
4. Wait a minute, and the site appears at `https://robojacks.github.io/frc-course/`.

## Update the site
```bash
pip install -r requirements.txt
python build.py
git add .
git commit -m "Describe the change"
git push
```
