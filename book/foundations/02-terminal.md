# 2. The Terminal

## Why it matters
The **terminal** (also called the command line, shell, or console) is a text window where you type commands instead of clicking buttons. It can look old-fashioned, but FRC programmers use it constantly:

- **Git** is a terminal program. The VS Code buttons just run terminal commands for you.
- **Building and deploying** with Gradle works from the terminal, and the terminal shows errors more clearly than the buttons do.
- At competition, when the VS Code buttons misbehave and the queue is calling your team, typing `./gradlew deploy` is the fastest way to get code on the robot.

## Read this
- [Introduction to GradleRIO](https://docs.wpilib.org/en/stable/docs/software/advanced-gradlerio/gradlew-tasks.html)
- [Building and Deploying Robot Code](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/deploying-robot-code.html)

## Walkthrough

### Opening a terminal
The easiest way is inside VS Code: **Terminal → New Terminal**, or **Ctrl+Grave** (the key left of 1). It opens at the bottom of the window, already inside your project folder.

Which terminal you get depends on your computer:

| Computer | Default terminal | Notes |
|---|---|---|
| Windows | PowerShell | Most commands below work. Use `gradlew.bat` instead of `./gradlew` if `./gradlew` fails. |
| Mac | zsh | Everything below works as written |
| Linux | bash | Everything below works as written |

### Reading the prompt
Before the blinking cursor, the terminal shows a **prompt**. It tells you where you are:

```
PS C:\Users\kedrick\robotics\my-first-robot>        ← Windows PowerShell
kedrick@laptop my-first-robot %                      ← Mac
```

The folder you're "in" is the **current directory**. Commands act on files there unless you say otherwise.

### Moving around

| Command | What it does | Example |
|---|---|---|
| `pwd` | Print the folder you're in | `pwd` |
| `ls` | List files and folders here | `ls` |
| `cd FOLDER` | Move into a folder | `cd src` |
| `cd ..` | Go up one level | `cd ..` |
| `cd ~` | Go to your home folder | `cd ~` |
| `mkdir NAME` | Make a new folder | `mkdir robotics` |
| `code .` | Open the current folder in VS Code | `code .` |

{% hint style="success" %}
**Two habits that save you time**

**Tab completion:** type the first few letters of a file or folder, then press **Tab**, and the terminal finishes the name. Press it twice to see options.

**History:** press **Arrow-Up** to bring back the last command. Keep pressing to go further back.
{% endhint %}

### Paths
A **path** is the address of a file.

- A **relative path** starts from where you are: `src/main/java`
- An **absolute path** starts from the top of the drive: `C:\Users\kedrick\robotics` or `/Users/kedrick/robotics`
- `.` means "this folder" and `..` means "the folder above"

{% hint style="warning" %}
**Spaces in names**

A folder called `My Robot` must be typed in quotes: `cd "My Robot"`. Name your project folders without spaces to avoid this.
{% endhint %}

### Gradle: building from the terminal
Every WPILib project includes a **Gradle wrapper**, `gradlew`, in the project's top folder. Run these from that folder:

| Command | What it does |
|---|---|
| `./gradlew build` | Compile the code and run the unit tests (Lesson 16) |
| `./gradlew deploy` | Build, then copy the code to the roboRIO and restart it |
| `./gradlew simulateJava` | Build and start the simulator |
| `./gradlew test` | Run only the unit tests |
| `./gradlew clean` | Delete old build output. Try this when a build acts strangely. |

On Windows, if `./gradlew` gives an error, use `.\gradlew.bat build` or `gradlew build`.

{% hint style="info" %}
**Deploying needs a connection to the robot**

Your laptop must be connected to the robot's network (Wi-Fi or USB/Ethernet) for `deploy` to find the roboRIO. With team number 4674 set, Gradle finds it automatically.
{% endhint %}

### Reading a build error
A failed build prints a lot. Here's what to look for:

```
> Task :compileJava FAILED
/home/kedrick/my-first-robot/src/main/java/frc/robot/subsystems/Intake.java:14: error: ';' expected
        motor.set(0.75)
                       ^
1 error

FAILURE: Build failed with an exception.
...
BUILD FAILED in 3s
```

1. **Scroll up to the first line that says `error:`.** The bottom is just a summary.
2. It names the **file** (`Intake.java`) and **line** (`14`).
3. It says **what's wrong** (`';' expected`).
4. The `^` points at the exact spot.

Fix the **first** error and build again. One mistake often causes a pile of later errors that disappear once the first is fixed.

### Common errors and what they mean
| Error message | Usual meaning |
|---|---|
| `';' expected` | Missing semicolon at the end of a line |
| `cannot find symbol` | A typo in a name, or a missing `import` |
| `incompatible types` | Passing the wrong type, like a `double` where a `Command` is expected |
| `class X is public, should be declared in a file named X.java` | The class name and file name don't match |
| `Could not find roboRIO` | The laptop isn't connected to the robot, or the team number is wrong |

{% hint style="success" %}
**Let VS Code help**

Red squiggly lines show many errors before you build. Hover over one to see the message, and use the lightbulb icon to add a missing `import`.
{% endhint %}

## Try it
- [ ] Open a terminal in VS Code and run `pwd` and `ls`
- [ ] Use `cd` to walk into `src/main/java/frc/robot`, then `cd ..` back out to the project folder
- [ ] Run `./gradlew build` and get `BUILD SUCCESSFUL`
- [ ] Delete a `;` in `RobotContainer.java`, build, and find the file and line number in the error. Put the `;` back.
- [ ] Run `./gradlew simulateJava` to start the simulator from the terminal

## Check yourself
<details>
<summary>How do you get to the folder above the one you're in?</summary>

`cd ..`

</details>

<details>
<summary>What's the difference between a relative and an absolute path?</summary>

A relative path starts from your current folder (`src/main`). An absolute path starts from the top of the drive (`C:\Users\...` or `/Users/...`) and works from anywhere.

</details>

<details>
<summary>Where in the output is the real cause of a build failure?</summary>

At the **first** `error:` line, which names the file and line number. The lines at the bottom are just a summary.

</details>

<details>
<summary>What does `./gradlew deploy` do?</summary>

It builds the code, copies it to the roboRIO over the robot's network, and restarts the robot program.

</details>
