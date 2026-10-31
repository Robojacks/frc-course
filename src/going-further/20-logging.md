# 20. Logs, AdvantageScope, and AdvantageKit

## Why it matters
Something went wrong in a match. The elevator stopped short, or the auto drove into a wall. The robot is already back in the pit, and nobody saw exactly what happened.

If the robot was **logging**, you can find out. A log records every value the robot published, every loop, for the whole match. **AdvantageScope** opens that log and lets you scrub through the match like a video, with graphs of every value and the robot drawn on the field.

[Lesson 9](../robot-code/09-debugging.md) introduced logging. This lesson shows how to use the logs well, and what **AdvantageKit** adds when your team is ready for it.

## Read this
- [On-Robot Telemetry Recording (WPILib DataLogManager)](https://docs.wpilib.org/en/stable/docs/software/telemetry/datalog.html)
- [AdvantageScope documentation](https://docs.advantagescope.org/)
- [AdvantageKit documentation](https://docs.advantagekit.org/)

## Walkthrough

### Step 1: Turn on logging
In `Robot.java`'s constructor, before anything else:

```java
    // Record everything published to NetworkTables into a .wpilog file
    DataLogManager.start();
    // Also record the Driver Station: enabled/disabled, match time, and every joystick
    DriverStation.startDataLog(DataLogManager.getLog());
```

That's all. Everything the course's telemetry library sends (`/Telemetry/...`), every tunable (`/Tunables/...`), the field map, and the joysticks now go into a log file.

| Where the log goes | When |
|---|---|
| A USB stick in the roboRIO, folder `logs` | If a stick is plugged in. **Do this at competition.** |
| `/home/lvuser/logs` on the roboRIO | If there's no stick. The roboRIO deletes old logs when it runs low on space. |
| A `logs` folder in your project | In simulation |

The log file is named for the date and, at an event, the match number, like `FRC_20260321_143507_MIC_Q12.wpilog`.

### Step 2: Get the log
- **AdvantageScope:** **File → Download Logs**, connect to the robot, pick the file. Easiest.
- **USB stick:** pull it out after the match and copy the file.

AdvantageScope comes with the WPILib installer. Look for it in the WPILib tools folder or start menu.

### Step 3: Read a log in AdvantageScope
**File → Open Log**. The left side lists every value in the log as a tree, built from the slashes in the names: `Telemetry/Drive/Encoders/Left (m)` sits under **Telemetry → Drive → Encoders**.

The tabs across the top are different views. The ones you'll use most:

| Tab | Use it for |
|---|---|
| **Line Graph** | Drag values onto it to graph them over time. Put a target and its measurement on the same graph. |
| **2D Field** / **3D Field** | Drag a `Pose2d` onto it to draw the robot on the field. Watch odometry, vision poses, and paths. |
| **Table** | Every value at one moment |
| **Console** | Everything printed, errors included, lined up with the graphs |
| **Joysticks** | What the driver was pressing |

Click anywhere on the timeline to jump to that moment; every tab follows.

!!! tip "Live, too"
    **File → Connect to Robot** shows the same views live, over NetworkTables, while the robot runs. Great for tuning.

### The habit that makes logs useful: target next to measured
Most debugging questions are "did it do what we told it to?" You can only answer that if both halves are in the log. The labs already do this:

| Lab | Target | Measured |
|---|---|---|
| Lab 9 | `Wheel/Target (rot)` | `Wheel/Position (rot)` |
| Lab 10 | `Elevator/Goal (m)` and `Elevator/Setpoint (m)` | `Elevator/Height (m)` |
| Lab 8 | `Drive/Gyro/Turn Target (deg)` | `Drive/Gyro/Heading (deg)` |
| Lesson 19 | `/PathPlanner/targetPose` | `Drive/Odometry/Pose` |

Drag a pair onto one Line Graph. Overshoot, lag, a stall, or a target that never changed are all obvious once they're drawn together.

### Seeing the pose
Lab 11 logs `Drive/Odometry/Pose` as a whole `Pose2d` (a **struct**). In AdvantageScope:

1. Open the **2D Field** tab and pick this year's field.
2. Drag `Telemetry/Drive/Odometry/Pose` onto it. It appears as a robot.
3. Drag `/PathPlanner/activePath` on too, as a **Trajectory**, during an auto. Now you can see exactly where the robot left the path.

With vision ([Lesson 18](18-vision.md)), log the camera's pose too (`m_telemetry.log("Vision/Pose", estimate.pose)`) and drag it on as a **Ghost**. You'll see the camera's guess and the fused pose side by side.

### Name things so you can find them
A value nobody can find during a match might as well not exist.

- Start every name with the subsystem: `Elevator/...`, `Drive/...`. The library's `Telemetry.getTable("Elevator")` does this for you.
- Put the **units** in the name: `Height (m)`, `Heading (deg)`.
- Log **why**, not only **what**: a boolean like `Vision/Used`, or the name of the current preset, explains the jumps in the graphs.

### Which code was on the robot?
When a log shows something strange, the first question is "what code was running?" WPILib can stamp the code version into every log. Add the **gversion** plugin to the `plugins` block of `build.gradle`; on every build it writes the git commit into a generated `BuildConstants.java`. Then log it once at startup:

```java
    // Once, in the Robot constructor, after DataLogManager.start()
    Telemetry.log("Metadata/Git SHA", BuildConstants.GIT_SHA);
    Telemetry.log("Metadata/Git Dirty", BuildConstants.DIRTY == 1);   // true = uncommitted changes
```

See the [gversion section of the WPILib docs](https://docs.wpilib.org/en/stable/docs/software/advanced-gradlerio/deploy-git-data.html) (Including Git Data in Deploy) for the exact Gradle lines. Even without it, **commit before every competition deploy** ([Lesson 15](../workflow/15-team-process.md)), so the code on the robot matches a commit.

### AdvantageKit: logging that can replay your code
Everything above logs **outputs**: values your code chose to publish. **AdvantageKit**, from Team 6328, goes further. It logs every **input** to your code (every sensor reading, every joystick value) in a way that lets you **replay** a match in simulation. Your real robot code runs again on a laptop, fed the exact sensor values from the match, so you can add new logging or test a fix against what really happened.

To make replay possible, AdvantageKit asks you to structure every subsystem around an **IO layer**: an interface that hides the hardware.

```java
/** Everything the elevator reads from hardware. AdvantageKit logs all of it, every loop. */
@AutoLog
public class ElevatorIOInputs {
  public double heightMeters = 0.0;
  public double velocityMetersPerSec = 0.0;
  public double appliedVolts = 0.0;
  public double currentAmps = 0.0;
}

/** The hardware, hidden behind an interface. */
public interface ElevatorIO {
  default void updateInputs(ElevatorIOInputs inputs) {}
  default void setVoltage(double volts) {}
}
```

Then there are several versions of the hardware:

| Class | Used when | Reads from |
|---|---|---|
| `ElevatorIOSparkMax` | On the real robot | The SPARK MAX and encoder |
| `ElevatorIOSim` | In simulation | A WPILib `ElevatorSim` physics model |
| *(none: the empty interface)* | In replay | The log file: AdvantageKit fills the inputs in |

The subsystem never touches hardware directly:

```java
  @Override
  public void periodic() {
    m_io.updateInputs(m_inputs);                  // read the hardware (or the log, in replay)
    Logger.processInputs("Elevator", m_inputs);   // log it, or replace it with logged values
    // ...use m_inputs.heightMeters instead of m_encoder.getDistance()...
  }
```

The rules that make replay work:

| Rule | Why |
|---|---|
| Read hardware **only** inside `updateInputs` | Anything read elsewhere isn't logged, so replay can't feed it back |
| Inputs go in `@AutoLog` classes; computed values go to `Logger.recordOutput(...)` | Inputs are fed back during replay; outputs are just recorded |
| No randomness or wall-clock time in your logic | Replay must make the same choices the robot did |
| The robot class extends `LoggedRobot` instead of `TimedRobot` | AdvantageKit controls the loop timing so replay can run faster than real time |

!!! info "When should a team switch?"
    AdvantageKit is an architecture, not an add-on. Every subsystem changes shape, and you start from AdvantageKit's template projects rather than the WPILib ones. It pays off when your team has a working robot and wants to debug matches seriously. Learn the WPILib way first (this course), then try AdvantageKit on an off-season robot. The [AdvantageKit docs](https://docs.advantagekit.org/) have template projects and a full walkthrough.

## Try it
- [ ] Add `DataLogManager.start()` and `DriverStation.startDataLog(...)` to the WestCoastDrive project
- [ ] Drive for two minutes, download the log, and open it in AdvantageScope
- [ ] Graph Lab 8's turn target and heading on one Line Graph during a turn
- [ ] Drag the odometry pose onto the 2D Field and replay your drive
- [ ] Find the moment you pressed a button in the **Joysticks** tab, and see what the robot did next
- [ ] Challenge: sketch an `ElevatorIO` interface for the Lab 10 elevator. Which values belong in the inputs?

## Check yourself
??? question "Where should the log go at competition, and why?"
    On a USB stick in the roboRIO. The roboRIO's own storage is small and deletes old logs; a stick holds a whole event and can be pulled out after a match.

??? question "Why log a target next to its measurement?"
    Most problems are "it didn't do what we told it." Graphed together, overshoot, lag, and stalls are obvious.

??? question "What's the difference between an input and an output in AdvantageKit?"
    An input is read from hardware and is fed back during replay. An output is something your code computed; it's recorded but not fed back.

??? question "Why must AdvantageKit code read hardware only in `updateInputs`?"
    Only inputs are logged and replayed. A sensor read anywhere else would have no value during replay, and the replay wouldn't match the match.

<p class="credit">Parts of this lesson are adapted from the AdvantageScope, AdvantageKit, and Hardware Abstraction with IO Layers lessons of <a href="https://github.com/itkan-robotics/mantik">Mantik</a> by Itkan Robotics (CC BY 4.0).</p>
