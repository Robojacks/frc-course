# RoboJacks 4674 FRC Programming Course

A tutorial-style course for FRC Java, from installing WPILib to PID, feedforward, SysId, and motion profiles. It builds on the [WPILib documentation](https://docs.wpilib.org/en/stable/).

## Layout

| Folder / file | What it is |
|---|---|
| `src/` | Lessons, written in Markdown. **Edit these.** |
| `assets/style.css` | The site theme. Colors and fonts are at the top. |
| `build.py` | Turns `src/` into HTML, and holds the lesson order (`NAV`) |
| `docs/` | The finished HTML site that GitHub Pages serves. Generated, so don't edit by hand. |
| `library/telemetry/` | The course's **telemetry library**: a 2026 copy of WPILib 2027's Telemetry and Tunables APIs. Students copy it into their projects. |
| `examples/` | **Finished code for every lab**: one complete WPILib 2026 project per lab. Generated, so don't edit by hand. |
| `tools/make_examples.py` | Builds `examples/` from the code in the lab pages, so the two always match |

## Publish on GitHub Pages
1. This repo is [Robojacks/frc-course](https://github.com/Robojacks/frc-course).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch **main**, folder **/docs**.
4. Wait a minute, and the site appears at `https://robojacks.github.io/frc-course/`.

## Update the site
```bash
pip install -r requirements.txt
python build.py
python tools/make_examples.py   # only if you changed code in a lab page
git add .
git commit -m "Describe the change"
git push
```
