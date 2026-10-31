# Lab 11: Track the Robot on the Field (Odometry)

## Why it matters
In [Lab 8](lab8-navx-gyro.md), the robot learned two things: how far each side has rolled (the encoders) and which way it's facing (the NavX2). Each answer is useful on its own. Put together, they answer a much bigger question: **where is the robot on the field?**

That's **odometry**. Every 20 ms, the robot asks "how far did I just roll, and which way was I facing?" and adds that small step to its position. Do that 50 times a second and you get a running estimate of the robot's **pose**: its X and Y position in meters, and its heading.

In this lab you'll add odometry to the West Coast Drive, watch a little robot move on a field map in Elastic as you drive, and calibrate it until the map matches the floor. Path following ([Lesson 19](../going-further/19-pathplanner.md)) and vision ([Lesson 18](../going-further/18-vision.md)) both start from the pose you build here.

**Before you start:** finish [Lab 8](lab8-navx-gyro.md), including the encoders (Steps 8–12). Read [Lesson 17](../going-further/17-odometry.md) first. You'll add to the same **WestCoastDrive** project.

## Read this
- [Lesson 17: Where Is the Robot?](../going-further/17-odometry.md)
- [Differential Drive Odometry (WPILib)](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-odometry.html)
- [Field2d Widget (WPILib)](https://docs.wpilib.org/en/stable/docs/software/dashboards/glass/field2d-widget.html)

## Walkthrough

### What you'll build
| Piece | What it does |
|---|---|
| `DifferentialDriveOdometry` | WPILib's class that turns encoder distances and gyro heading into a pose |
| `getPose()` | Returns where the robot thinks it is |
| `resetPoseCommand()` | Puts the robot back at (0, 0), facing 0° |
| `Field2d` | A field map in Elastic with the robot drawn on it |

The robot starts at **(0, 0) facing 0°**, wherever you set it down. Driving forward makes X go up. Driving to the robot's left makes Y go up. Turning left makes the heading go up, the same as the gyro in Lab 8.

### Step 1: Measure the track width
Odometry needs one new measurement: the **track width**, the distance between the left wheels and the right wheels, measured **center of wheel to center of wheel**, in meters.

Lab 8 already has a placeholder for it in `Constants.java`:

```java
public static final double TrackWidthMeters = 0.6;
```

Measure your chassis with a tape measure and put the real number in. You'll fine-tune it in Step 9.

!!! info "Why does odometry need the track width if heading comes from the gyro?"
    `DifferentialDriveOdometry` takes its heading from the gyro, not the encoders, so the track width doesn't change its answer. You'll still need the measured number for path following in [Lesson 19](../going-further/19-pathplanner.md), and Step 9 uses it to check the encoders. Measuring it now means it's right when you need it.

### Step 2: Add the odometry and the field
Open `DriveSubsystem.java`. Add these imports at the top with the others:

```java
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.DifferentialDriveOdometry;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
```

Then add two fields below the encoders:

```java
  // Odometry: adds up encoder distances and gyro headings into a position on the field (Lab 11)
  private final DifferentialDriveOdometry m_odometry;

  // A field map for Elastic, with the robot drawn where odometry thinks it is
  private final Field2d m_field = new Field2d();
```

`m_odometry` is `final` but not set yet. Java lets you set a `final` field once, in the constructor. You'll do that next, because odometry needs the encoders to be set up first.

### Step 3: Create the odometry in the constructor
At the **end** of the constructor, after the two `setDistancePerPulse` lines, add:

```java
    // Start odometry at (0, 0) facing 0°, using the sensors' current readings as the starting point
    m_odometry = new DifferentialDriveOdometry(
        m_gyro.getRotation2d(),
        getLeftMeters(),
        getRightMeters());

    // Show the field map in Elastic (it appears under SmartDashboard/Field)
    SmartDashboard.putData("Field", m_field);
```

Odometry remembers these first readings. From then on, it only cares how much they **change**. That's why it doesn't matter whether the encoders read 0 or 3.7 at startup.

!!! note "Why `SmartDashboard.putData`?"
    A `Field2d` is a **Sendable**, not a single number, so it still goes through `SmartDashboard.putData` in 2026. [Lesson 6.1](../robot-code/06b-dashboards.md) explains why. It's sent over NetworkTables 4 like everything else.

### Step 4: Update it every loop
In `periodic()`, add these lines at the **top**, before the telemetry lines:

```java
    // Odometry: add this loop's small step to the robot's position
    m_odometry.update(m_gyro.getRotation2d(), getLeftMeters(), getRightMeters());
    m_field.setRobotPose(getPose());
```

And at the bottom of `periodic()`, with the other telemetry:

```java
    Pose2d pose = getPose();
    m_telemetry.log("Odometry/X (m)", pose.getX());
    m_telemetry.log("Odometry/Y (m)", pose.getY());
    m_telemetry.log("Odometry/Heading (deg)", pose.getRotation().getDegrees());
    m_telemetry.log("Odometry/Pose", pose);   // the whole pose, for AdvantageScope
```

`periodic()` runs every 20 ms whether or not a command is running, so odometry never misses a step.

### Step 5: Read and reset the pose
Add these two methods above `periodic()`:

```java
  /** Where odometry thinks the robot is: X and Y in meters, and heading. */
  public Pose2d getPose() {
    return m_odometry.getPoseMeters();
  }

  /**
   * Tells odometry the robot is at (0, 0) facing 0°, right where it is now.
   * The encoders and gyro aren't touched. Works while disabled.
   */
  public Command resetPoseCommand() {
    return runOnce(() -> m_odometry.resetPosition(
        m_gyro.getRotation2d(), getLeftMeters(), getRightMeters(), Pose2d.kZero))
        .ignoringDisable(true)
        .withName("Reset Pose");
  }
```

`resetPosition` needs the sensors' **current** readings so it knows the new starting point. `Pose2d.kZero` is (0, 0) facing 0°.

### Step 6: Change the reset buttons
In Lab 8, **Back** zeroed the gyro and **Start** reset the encoders. Both of those now cause trouble: if a sensor reading suddenly jumps to 0, odometry thinks the robot just moved or spun, and the robot on the field map jumps.

`resetPoseCommand()` doesn't touch the sensors, so use it instead. In `RobotContainer.java`, find these two lines in `configureBindings()`:

```java
    m_controller.back().onTrue(m_driveSubsystem.zeroHeadingCommand());
```

```java
    m_controller.start().onTrue(m_driveSubsystem.resetEncodersCommand());
```

Delete both and put this one in their place:

```java
    // Start: "the robot is at (0, 0) facing 0°" (Lab 11)
    m_controller.start().onTrue(m_driveSubsystem.resetPoseCommand());
```

The turn and distance commands from Lab 8 still work. They measure from wherever the sensors are when they start, so they never needed the sensors at 0.

### Step 7: Put the field in Elastic
Deploy, then open Elastic.

1. Right-click an empty spot → **Add Widget**, or open the widget list.
2. Find **SmartDashboard → Field** and drag it onto the layout. Elastic shows it as a **Field** widget: a picture of this year's field with a robot on it.
3. Make the widget big. Turn on the robot outline if it's off.

Also add **Telemetry → Drive → Odometry → X (m)**, **Y (m)**, and **Heading (deg)** as text displays, so you can see the numbers.

With the robot **disabled**, push it by hand. The robot on the map should move the same way. Press **Start** and it jumps back to the corner.

!!! info "Why is the robot in the corner?"
    (0, 0) on the field map is the bottom-left corner, on the blue alliance wall. Your robot is really in the shop, so it starts in that corner. In [Lesson 18](../going-further/18-vision.md), cameras tell the robot where it really is on the field.

### Step 8: Check the directions
Enable and drive gently. Check each one:

| Do this | X | Y | Heading | On the map |
|---|---|---|---|---|
| Drive forward 1 m | goes **up** about 1.0 | stays near 0 | stays near 0 | moves right (away from the blue wall) |
| Turn left 90° (press **X**) | stays | stays | goes **up** to about 90 | turns to face the top of the map |
| Then drive forward 1 m | stays | goes **up** about 1.0 | stays near 90 | moves up |

If something goes the wrong way:

| Problem | Fix |
|---|---|
| Driving forward makes X go **down** | Both encoders count backward. Flip `LeftEncoderInverted` and `RightEncoderInverted` in Constants. |
| Driving straight makes the robot curve on the map | One encoder counts backward. Check each one alone (Lab 8, Step 9) and flip that one. |
| Turning left makes the heading go **down** | You're using `getAngle()` somewhere. Use `getRotation2d()` everywhere, as in Lab 8. |
| The map doesn't move at all | Check `m_odometry.update(...)` is in `periodic()`, and that the field widget is **SmartDashboard/Field**. |

### Step 9: Calibrate
Odometry is only as good as its numbers. Two quick tests find most problems.

**Wheel diameter (straight line).** Put tape on the floor, line the robot up on it, and press **Start**. Drive straight for about 3 m and stop. Measure how far the robot really went with a tape measure.

| Real distance (m) | Odometry X (m) | Ratio (real ÷ X) |
|---|---|---|
| | | |

If the ratio isn't close to 1.00, multiply `WheelDiameterMeters` by it. A 6 in wheel squishes under a heavy robot, so the "real" diameter is often a little smaller than 6 in. Run the test again until odometry is within about 2 cm of the tape.

**Track width (spin in place).** This checks `TrackWidthMeters` against the gyro, which you trust for turns. Press **Start**, then spin the robot in place to the left exactly **5 full turns** (watch the gyro heading reach about 1800°). Read **Encoders/Left (m)** and **Encoders/Right (m)** from Lab 8 before and after.

**effective track width = (Δ right − Δ left) ÷ (turns × 2π)**

For 5 turns, divide by 5 × 2π ≈ **31.42**.

| Δ Left (m) | Δ Right (m) | Effective track width (m) | Tape-measured track width (m) |
|---|---|---|---|
| | | | |

On a skid-steer like the WCD, the effective number usually comes out **bigger** than the tape measure, because the wheels slide sideways while turning (you saw this in Lab 8, Step 11). Path following works better with the effective number, so write both down. You'll use the effective one in [Lesson 19](../going-further/19-pathplanner.md).

### Step 10: Drive the sensor square
Select **Square** in the **Auto** dropdown (since Lab 8 it drives by the encoders and gyro), set the robot on a tape mark, press **Start**, and run autonomous.

When it finishes, the robot should be back near (0, 0) on the map. Fill in:

| Run | Final X (m) | Final Y (m) | Final heading (°) | Real distance from the tape mark (cm) |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

Compare the map with the floor. If odometry says (0.02, 0.01) but the robot is 15 cm from the mark, odometry has drifted: the wheels slipped, and the encoders counted rolling that didn't move the robot.

### Step 11: Commit
```
git add .
git commit -m "Lab 11: odometry and field map"
```

### When it doesn't work
| Symptom | Likely cause |
|---|---|
| Robot on the map jumps when you press Back | You still have the old zero-heading binding. Step 6. |
| Pose slowly spins while the robot sits still | The NavX was moved while calibrating. Power-cycle with the robot still (Lab 8, Step 1). |
| X is about twice (or half) the real distance | `EncoderCyclesPerRev` is wrong. It's 2048 for the Through Bore Encoder. |
| Pose drifts sideways after hard turns | Normal for skid-steer wheels sliding. Calibrate (Step 9), and drive turns gently. Vision fixes this for real in [Lesson 18](../going-further/18-vision.md). |
| `variable m_odometry might not have been initialized` | The `m_odometry = new ...` line from Step 3 isn't in the constructor. |

## Piece by piece

```java
private final DifferentialDriveOdometry m_odometry;
```
The odometry object. It's declared here but built in the constructor, after the encoders know their distance per pulse.

```java
m_odometry = new DifferentialDriveOdometry(
    m_gyro.getRotation2d(),
    getLeftMeters(),
    getRightMeters());
```
Gives odometry its starting readings. It starts at the pose `(0, 0, 0°)` unless you pass a fourth argument with a different starting pose.

```java
m_odometry.update(m_gyro.getRotation2d(), getLeftMeters(), getRightMeters());
```
The heart of odometry. It compares these readings with last loop's. The change in the **average** encoder distance says how far the robot rolled; the **gyro** says which way it was facing. It adds that step to the pose.

```java
m_field.setRobotPose(getPose());
```
Moves the robot on Elastic's field map to match.

```java
m_telemetry.log("Odometry/Pose", pose);
```
Sends the whole `Pose2d` as one value. Elastic can't graph it, but AdvantageScope can draw it on a 2D or 3D field. See [Lesson 20](../going-further/20-logging.md).

```java
m_odometry.resetPosition(
    m_gyro.getRotation2d(), getLeftMeters(), getRightMeters(), Pose2d.kZero)
```
"Whatever the sensors read right now, call this spot (0, 0) facing 0°." Odometry stores the readings as the new starting point.

## Try it
- [ ] Watch the robot on the field map while pushing the robot by hand
- [ ] Check all three rows of the direction table in Step 8
- [ ] Calibrate the wheel diameter until a 3 m drive is within 2 cm
- [ ] Measure the effective track width and compare it with the tape-measure number
- [ ] Run the sensor square 3 times and fill in the table
- [ ] Drive a figure eight in teleop and come back to the start mark. How far off is odometry?
- [ ] Challenge: add `resetPoseCommand(Pose2d pose)` that sets any pose, and start the robot at (2, 4) facing 180°
- [ ] Challenge: write `driveToXCommand(double x)` that drives until the pose's X reaches a value

## Check yourself
??? question "What three numbers make up a pose?"
    X and Y position (meters) and the heading (which way the robot faces).

??? question "Why does differential drive odometry take its heading from the gyro instead of the encoders?"
    The wheels slide sideways when a skid-steer turns, so the encoders say it turned more than it really did. The gyro measures the real rotation.

??? question "Why does pressing the old Back button (zero gyro) make the robot jump on the map?"
    Odometry compares each reading with the last one. A gyro that suddenly reads 0 looks like the robot spun instantly, so the pose spins too.

??? question "Why must `m_odometry.update(...)` be in `periodic()`?"
    Odometry adds up small steps. `periodic()` runs every loop, even when no command is running. Skipping loops means missing steps.

??? question "Odometry says the robot is back at the start, but it's 15 cm away. Why?"
    Odometry drifts. Wheel slip, a slightly wrong wheel diameter, and bumps all add small errors, and nothing corrects them. Vision is what corrects drift.

<p class="credit">Parts of this lab are adapted from the Odometry and Pose Estimation Calibration lessons of <a href="https://github.com/itkan-robotics/mantik">Mantik</a> by Itkan Robotics (CC BY 4.0), rewritten for the RoboJacks West Coast Drive.</p>
