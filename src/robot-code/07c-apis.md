# 7.2 Finding and Using APIs

## Why it matters
Your robot code talks to a lot of hardware: SPARK MAXes, TalonFXs, a NavX, a camera, an XRP. Every one of them has its **own library**, written by a different company, with its own class names and its own habits. Nobody memorizes all of them. Good robot programmers are just good at **looking things up**.

An **API** (Application Programming Interface) is the set of classes and methods a library lets you use. `SparkMax`, `set(0.5)`, and `getEncoder()` are part of REVLib's API. This lesson shows you where every API in this course is documented, how to read that documentation, and a recipe for getting any new device working.

## Read this
- [3rd Party Libraries (WPILib)](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/3rd-party-libraries.html): how vendordeps work and how to install them
- [WPILib Java API reference](https://github.wpilib.org/allwpilib/docs/release/java/index.html): every WPILib class and method

## Walkthrough

### Two kinds of library
| | **WPILib** | **Vendor libraries** |
|---|---|---|
| Who writes it | The WPILib team, for FIRST | The company that makes the hardware |
| What it covers | The roboRIO's own ports (PWM, DIO, analog), controllers, commands, math (PID, kinematics, units), simulation | That company's devices: motor controllers, sensors, cameras |
| How you get it | Already in every new project | Installed as a **vendordep**, one per vendor |
| Package names start with | `edu.wpi.first` | The company's name: `com.revrobotics`, `com.ctre`, `com.studica`... |

The package name in an `import` tells you which library a class comes from, and so **which documentation to open**. `import com.revrobotics.spark.SparkMax;` means REV's docs; `import edu.wpi.first.wpilibj.Timer;` means WPILib's.

### Where every API in this course lives
Each library has three kinds of documentation. You'll use all three.

| Kind | What it's for | When to open it |
|---|---|---|
| **Guide** (the docs site) | Explains ideas and walks through setup, in order | Starting with a new device or feature |
| **API reference** (Javadoc) | Lists every class and method: parameters, return values, units | "What methods does this class have?" "What does this method return?" |
| **Examples** | Complete, working projects | "Just show me code that works" |

| Library | Used for | Guide | API reference (Java) | Examples |
|---|---|---|---|---|
| **WPILib** | Everything not made by a vendor | [docs.wpilib.org](https://docs.wpilib.org/en/stable/) | [WPILib Javadoc](https://github.wpilib.org/allwpilib/docs/release/java/index.html) | Built in: ++ctrl+shift+p++ → **WPILib: Create a new project** → **Example** |
| **REVLib** | SPARK MAX, SPARK Flex, NEO, Through Bore | [REVLib docs](https://docs.revrobotics.com/revlib/) | [REVLib Javadoc](https://codedocs.revrobotics.com/java/com/revrobotics/package-summary.html) | [REVLib-Examples](https://github.com/REVrobotics/REVLib-Examples) |
| **Phoenix 6** (CTRE) | TalonFX (Kraken, Falcon), CANcoder, Pigeon 2 | [Phoenix 6 docs](https://v6.docs.ctr-electronics.com/en/stable/) | [Phoenix 6 Javadoc](https://api.ctr-electronics.com/phoenix6/stable/java/) | [Phoenix6-Examples](https://github.com/CrossTheRoadElec/Phoenix6-Examples) |
| **Studica** | NavX gyro ([Lab 8](../testbed/lab8-navx-gyro.md)) | [Studica docs](https://docs.studica.com/) | Linked from their docs | In their docs |
| **PathPlannerLib** | Autonomous paths ([Lesson 19](../going-further/19-pathplanner.md)) | [pathplanner.dev](https://pathplanner.dev/home.html) | [PathPlannerLib Javadoc](https://pathplanner.dev/api/java/) | In the guide |
| **PhotonLib** | PhotonVision cameras ([Lesson 18](../going-further/18-vision.md)) | [PhotonVision docs](https://docs.photonvision.org/) | [PhotonLib Javadoc](https://javadocs.photonvision.org/release/) | [In the PhotonVision repo](https://github.com/PhotonVision/photonvision/tree/main/photonlib-java-examples) |
| **XRP** | The XRP robot ([Lesson 10](../project/10-xrp.md)) | [XRP in the WPILib docs](https://docs.wpilib.org/en/stable/docs/xrp-robot/index.html) | In the WPILib Javadoc, package `edu.wpi.first.wpilibj.xrp` | Built in: **Example** → XRP |

!!! tip "Bookmark this table"
    Make a browser bookmark folder called **FRC APIs** with the guide and Javadoc link for each library your robot uses. You'll open them every build season.

### Vendordeps: getting a vendor library into your project
You installed REVLib in [Lab 0](../testbed/lab0-first-project.md): **WPILib** icon in the sidebar → **Vendor Dependencies** → **Install**. That put a file like `REVLib.json` into your project's `vendordeps/` folder. Open it and you'll see what a vendordep really is: a short description that tells Gradle which library to download, and which version.

```json
{
    "fileName": "REVLib.json",
    "name": "REVLib",
    "version": "2026.0.5",
    "frcYear": "2026",
    "jsonUrl": "https://software-metadata.revrobotics.com/REVLib-2026.json",
    ...
}
```

| Field | Meaning |
|---|---|
| `version` | The library version this project builds with. Everyone on the team gets the same one, because the file is committed to git. |
| `frcYear` | The season it's for. It **must** match your WPILib year. |
| `jsonUrl` | Where to check for a newer version. |

| Situation | What to do |
|---|---|
| The library is in the Vendor Dependencies list | Click **Install**. |
| It isn't in the list | ++ctrl+shift+p++ → **WPILib: Manage Vendor Libraries** → **Install new library (online)**, and paste the vendordep URL from the vendor's install page. |
| A newer version is out | Vendor Dependencies shows an **Update** button. Update between events, test, and commit the new `.json`. Never update the morning of a match. |
| No internet (at competition) | Vendors publish **offline installers** you can run at home ahead of time. Gradle also keeps a copy once you've built with internet. |

!!! warning "`package com.revrobotics does not exist`"
    That error means the code imports a vendor library that **isn't installed in this project**. Check `vendordeps/` for its `.json` file. This happens a lot when you copy code from another project or from the internet.

### Reading a Javadoc page
Javadoc is the standard format for Java API references. WPILib, REV, CTRE, PathPlanner, and PhotonVision all use it, so once you can read one, you can read them all. Let's read WPILib's `Timer`.

Open the [WPILib Javadoc](https://github.wpilib.org/allwpilib/docs/release/java/index.html) and type `Timer` in the **Search** box at the top right. Pick `edu.wpi.first.wpilibj.Timer`. (There's more than one `Timer` in the world. The package name tells you which one.)

Every class page has the same parts, top to bottom:

| Part | What it tells you |
|---|---|
| **Package and class name** | What to `import`: `edu.wpi.first.wpilibj.Timer` |
| **Class hierarchy** ("extends", "implements") | What it's built on. Methods from a parent class work too. |
| **Description** | What the class is for, sometimes with an example |
| **Constructor Summary** | How to make one with `new`, and what you have to pass in: `Timer()` takes nothing |
| **Method Summary** | A table of every method: return type on the left, name and parameters on the right |
| **Methods inherited from...** | Methods that come from the parent class. Easy to miss. |
| **Method Details** | Each method in full: what it does, every parameter, the return value, and **the units** |

A row of the Method Summary reads like the first line of a method you'd write yourself:

| Javadoc says | It means |
|---|---|
| `void start()` | Call `m_timer.start();` It gives nothing back. |
| `double get()` | `double t = m_timer.get();` Method Details says: "Current time value for this timer **in seconds**." |
| `boolean hasElapsed(double seconds)` | Pass a number of seconds, get back `true` or `false`. |
| `static double getFPGATimestamp()` | **static**: call it on the class, `Timer.getFPGATimestamp()`, without making a `Timer`. |

Turned into code:

```java
  private final Timer m_timer = new Timer();   // Constructor Summary: Timer()

  public void startShot() {
    m_timer.restart();                          // void restart(): back to 0 and running
  }

  public boolean shotFinished() {
    return m_timer.hasElapsed(1.5);             // boolean hasElapsed(double seconds)
  }
```

!!! tip "Always find the units"
    The Method Details are where units hide. WPILib uses **meters, seconds, and radians** unless a name says otherwise. CTRE's Phoenix 6 uses **rotations** and rotations per second. REV's encoders report **rotations** and RPM unless you set a conversion factor ([Lesson 8](08-sensors.md)). When the docs don't say, test it: turn the shaft one full turn and watch the number.

!!! warning "Deprecated"
    A method or class marked **Deprecated** still works this year but is going away. VS Code draws it with a ~~strikethrough~~. The Javadoc says what to use instead. For example, WPILib's `PIDSubsystem` says *"Deprecated, for removal: Use a PIDController instead."* Don't write new code with deprecated APIs.

### The API is also inside VS Code
You don't always need the browser. VS Code reads the same Javadoc from the libraries in your project.

| Do this | You get |
|---|---|
| Type `m_motor.` and wait (or ++ctrl+space++) | A list of every method you can call on it, with its parameters |
| **Hover** over a class or method | Its Javadoc: description, parameters, return value |
| ++ctrl++ + click, or ++f12++, on a name | Jumps to where it's defined. For a library class, this opens its source code. |
| ++ctrl+period++ on a red-underlined class name | **Quick fix**: offers to add the missing `import` |
| Right-click → **Find All References** | Everywhere in your project that uses it |

Try it on [Lab 1](../testbed/lab1-spin-motor.md): hover over `startEnd` in `spinMotorCommand`, then ++ctrl++ + click it. You'll land in WPILib's `Subsystem` interface, reading the actual code that the command scheduler runs.

### Same job, different vendors
Each vendor does the same jobs in its own way. Once you know the pattern for one, the docs tell you the spelling for the next.

| Job | WPILib (PWM, XRP) | REVLib (SPARK MAX) | Phoenix 6 (TalonFX) |
|---|---|---|---|
| Make one | `new PWMSparkMax(0)` | `new SparkMax(1, MotorType.kBrushless)` | `new TalonFX(1)` |
| Run at a percent | `set(0.5)` | `set(0.5)` | `set(0.5)`, or `setControl(new DutyCycleOut(0.5))` |
| Configure it | Setter methods | Build a `SparkMaxConfig`, then `configure(config, ResetMode..., PersistMode...)` | Build a `TalonFXConfiguration`, then `getConfigurator().apply(config)` |
| Read position | `Encoder.getDistance()` | `getEncoder().getPosition()` (rotations) | `getPosition().getValueAsDouble()` (rotations) |
| Closed-loop control | `PIDController` on the roboRIO | `getClosedLoopController().setSetpoint(...)` | `setControl(new PositionVoltage(...))` |

Every vendor motor controller also implements WPILib's `MotorController`-style methods like `set()` and `setVoltage()`, which is why WPILib classes such as `DifferentialDrive` work with any of them.

### Old code is everywhere
Libraries change every season. Search results, Chief Delphi posts, other teams' GitHub repos, and AI chatbots are full of code for **older versions** that won't compile with 2026 libraries. Learn to spot it:

| If you see... | It's old. In 2026 use... |
|---|---|
| `CANSparkMax`, `burnFlash()`, `setSmartCurrentLimit(...)` called on the motor | `SparkMax`, with settings in a `SparkMaxConfig` passed to `configure(...)` (REVLib 2025+) |
| `setReference(...)` on a SPARK closed-loop controller | `setSetpoint(...)` (REVLib 2026) |
| `import com.ctre.phoenix.motorcontrol...`, `WPI_TalonFX`, `ControlMode.PercentOutput` | Phoenix 6: `com.ctre.phoenix6.hardware.TalonFX` with control requests |
| `PIDSubsystem`, `ProfiledPIDSubsystem` | A normal subsystem with a `PIDController` ([Lesson 12](../controls/12-pid.md)) |
| PhotonLib `getLatestResult()` | `getAllUnreadResults()` ([Lesson 18](../going-further/18-vision.md)) |
| PathPlanner `HolonomicPathFollowerConfig` | `RobotConfig.fromGUISettings()` and `PPHolonomicDriveController` ([Lesson 19](../going-further/19-pathplanner.md)) |

Check the **date** on anything you find, and check that the docs page shows the right version. Most docs sites have a version picker; `stable` or `2026` is what you want.

### Recipe: getting a new device working
Mechanical just bolted a sensor you've never seen onto the robot. Here's the order:

1. **Identify it.** Exact product name and who makes it. That tells you which library.
2. **Wire and configure it.** Find out how it connects (DIO? CAN? USB?) and, for CAN, set its ID with the vendor's tool (REV Hardware Client, Phoenix Tuner X).
3. **Install the vendordep**, if it needs one. Commit the new `.json`.
4. **Read the guide's getting-started page.** Usually short: how to create the object and read one value.
5. **Find an example** that uses it. Get that working first, unchanged if you can.
6. **Open the Javadoc** for the main class. Read the constructor and the methods you need, and **find the units**.
7. **Wrap it in a subsystem.** Name methods for what they mean (`hasGamePiece()`, `getArmAngleDegrees()`), convert to useful units, and log the values ([Lesson 6.1](06b-dashboards.md)).
8. **Check it on the dashboard** before any command uses it. Press it, turn it, block it, and make sure the numbers make sense.

### When the docs don't answer
- **Search the examples** for the method name. Seeing it used often answers the question.
- **Read the source:** ++ctrl++ + click into the library. The code is the final answer.
- **Search Chief Delphi**, the FRC forum. Check the post's date.
- **Ask a mentor or another team.** Bring what you tried and what happened.
- **AI chatbots** can help explain code, but they often mix up versions. Check every class and method they suggest against the current Javadoc before you trust it.

## Try it
- [ ] Make your **FRC APIs** bookmark folder with the guide and Javadoc for WPILib, REVLib, and Phoenix 6
- [ ] In the WPILib Javadoc, find `DigitalInput`. What does its constructor take? What does `get()` return?
- [ ] In the REVLib Javadoc, find `SparkMax` (or its parent, `SparkBase`). Find the method that returns the motor's current, and its units.
- [ ] In the Phoenix 6 Javadoc, find `TalonFX` and the method that reads its temperature. What type does it return?
- [ ] Open your Lab 1 project's `vendordeps/REVLib.json`. What version is it?
- [ ] In VS Code, hover over `setMotorSpeed` and `startEnd` in Lab 1, then ++ctrl++ + click each one
- [ ] Find the Motion Magic example in Phoenix6-Examples
- [ ] Challenge: this snippet is from 2024. Rewrite it for 2026 using the REVLib docs:
    ```java
    CANSparkMax motor = new CANSparkMax(3, MotorType.kBrushless);
    motor.setSmartCurrentLimit(40);
    motor.burnFlash();
    ```

## Check yourself
??? question "You see `import com.ctre.phoenix6.hardware.CANcoder;`. Which docs do you open?"
    CTRE's Phoenix 6 docs. The package name starts with `com.ctre`, so it's CTRE's library, and `phoenix6` says which version.

??? question "Your code says `package com.revrobotics does not exist`. What's wrong?"
    REVLib isn't installed in this project. Install it from Vendor Dependencies and check that its `.json` file is in `vendordeps/`.

??? question "What's the difference between the guide, the API reference, and the examples?"
    The guide explains ideas and setup in order. The API reference lists every class and method with parameters, return values, and units. The examples are complete working code.

??? question "The Javadoc shows `static double getFPGATimestamp()`. How do you call it?"
    On the class itself: `Timer.getFPGATimestamp()`. Static methods don't need an object made with `new`.

??? question "You found code online that uses `CANSparkMax`. Why won't it compile?"
    It's written for an older REVLib. Since 2025 the class is `SparkMax`, and settings go in a `SparkMaxConfig`.

??? question "Where in a Javadoc page do you find a method's units?"
    In its Method Details, usually in the description of the return value or parameter.

??? question "A vendordep's `frcYear` is 2025 and your WPILib is 2026. What happens?"
    It won't work with your project. Vendor libraries must match the WPILib season. Install the 2026 version.
