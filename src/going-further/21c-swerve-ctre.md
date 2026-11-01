# 21.2 Next Year's Swerve: SDS MK5i with the CTRE Generator

## Why it matters
Next season the team switches to **SDS MK5i** modules with CTRE motors and sensors. That changes almost all of the drivetrain code, because instead of starting from REV's template ([Lesson 21.1](21b-swerve-maxswerve.md)), you'll **generate** the drivetrain with CTRE's **Tuner X Swerve Project Generator**.

The swerve ideas from [Lesson 21](21-swerve.md) are exactly the same. What changes is who writes the code: the generator writes the hardware setup for you, measures the encoder offsets, and hands you a working drivetrain. Your job is to set it up correctly, check it, and add PathPlanner, vision, and the auto menu.

## Read this
- [Lesson 21.3: Using Phoenix Tuner X](21d-phoenix-tuner.md)
- [Tuner X Swerve Project Generator (CTRE)](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/tuner-swerve/index.html)
- [Swerve API (CTRE)](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/mechanisms/swerve/swerve-overview.html)
- [CTRE's SwerveWithPathPlanner example](https://github.com/CrossTheRoadElec/Phoenix6-Examples/tree/main/java/SwerveWithPathPlanner)
- [SDS MK5i](https://www.swervedrivespecialties.com/) product page, for your module's drive ratio

!!! info "Licenses"
    Code the generator writes, and CTRE's example projects, carry WPILib's BSD license header. Phoenix 6 itself is CTRE's closed-source library, free to use on FRC robots; some features need a paid **Phoenix Pro** license (noted below). CTRE's **documentation** is © CTR Electronics under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) (no derivatives), so the generator steps below are written for this course in our own words, with a link to each CTRE page they come from.

## Walkthrough

### What's on the robot
| Part | Each module | Notes |
|---|---|---|
| **Module** | SDS **MK5i** | Steering ratio **26:1**; three drive ratios to pick from when you order |
| **Drive motor** | **Kraken X60** (a TalonFX built in) | |
| **Steer motor** | **Kraken X44** (also a TalonFX) | What SDS's ready-to-run kits use. A Kraken X60 also fits. |
| **Steer encoder** | **CANcoder** on top of the module | Absolute, on CAN |
| **Gyro** | One **Pigeon 2** for the robot | |
| **CAN bus** | A **CANivore** is strongly recommended | CAN FD: faster and much less crowded than the roboRIO's bus |

How each sensor works, how it's wired, and what its LEDs mean: [Lesson 4.3](../hardware/04d-sensors.md#encoders-inside-motors). Reading them in code: [Lesson 8](../robot-code/08-sensors.md#sensors-on-can).

!!! note "Check the order before you write code"
    Confirm the exact motors and drive ratio the team orders. The generator asks for them, and they change the gear ratios and top speed.

That's 13 CAN devices on the drivetrain alone. Plan the IDs before anything is wired, and label every device:

| Module | Drive (X60) | Steer (X44) | CANcoder |
|---|---|---|---|
| Front left | 1 | 2 | 3 |
| Front right | 4 | 5 | 6 |
| Back left | 7 | 8 | 9 |
| Back right | 10 | 11 | 12 |
| Pigeon 2 | 13 | | |

CTRE devices can share an ID number with other **types** (a TalonFX 1 and a CANcoder 1 are different devices), but unique numbers make wiring mistakes much easier to find.

### How it differs from MAXSwerve
| | MAXSwerve (Lesson 21.1) | MK5i + CTRE |
|---|---|---|
| Where the code comes from | REV's template, edited by hand | **Generated** by Tuner X |
| Motor controllers | SPARK Flex / SPARK MAX | TalonFX built into each Kraken |
| Steer sensor | Through Bore Encoder on the SPARK MAX | **CANcoder** on CAN |
| Encoder offsets | Zeroed in REV Hardware Client, plus chassis offsets in code | **Measured by the generator** and written into `TunerConstants` |
| Setup tool | REV Hardware Client | **Phoenix Tuner X** ([Lesson 21.3](21d-phoenix-tuner.md)) |
| Odometry | Every 20 ms in `periodic()` | A separate fast thread: **250 Hz** on a CANivore |
| How you drive it | `drive(x, y, rot, fieldRelative)` | **Swerve requests**: `FieldCentric`, `RobotCentric`, `SwerveDriveBrake`, … |
| Red-alliance driving | You add it (Lesson 21.1, problem 5) | Built in ("operator perspective") |
| Pose estimator | You add it | Built in: `addVisionMeasurement` is already there |
| SysId | You add it | Built in, bound to buttons |

### Step 1: Before the generator
Do the bring-up in [Lesson 21.3: Using Phoenix Tuner X](21d-phoenix-tuner.md) first: every device found, IDs and names set from your table, firmware on **26.x**, the CANivore named, and all swerve devices on the **same** bus. Then check the generator's own requirements:

| Requirement | |
|---|---|
| 8 TalonFX (4 drive, 4 steer), 4 CANcoders, 1 Pigeon 2 | Required |
| Every device shows up in Tuner X | Required |
| All on the same CAN bus | Required |
| Firmware matches the season (26.x for 2026) | Required |
| A 2026 diagnostic server is running (robot code, or **Run Temporary Diagnostic Server**) | Required |
| Devices renamed (like "FL Steer") | Recommended |
| On a CANivore | Recommended |
| Pro-licensed | Recommended |

The generator's **Pre-Check** box shows whether the robot meets them. Click its refresh button after fixing something.

*Source: [CTRE: Swerve Requirements](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/tuner-swerve/swerve-system-requirements.html)*

### Step 2: The Swerve Project Generator
In Tuner X, open **Mechanisms → Swerve Project Generator**.

**1. Create the project.** Fill in:

| Field | MK5i robot |
|---|---|
| Wheel Radius (inches) | Measure the wheel's diameter and halve it |
| FL to FR distance (inches) | Center of front-left module to center of front-right |
| FL to BL distance (inches) | Center of front-left module to center of back-left |
| Module Type | **MK5i** if it's in the list. If not, **Custom**, and enter the steer ratio **26:1** yourself. |
| Drive Ratio | The MK5i ratio the team ordered |

Then **New Project**.

**2. Configure each module.** For each corner, pick its **CANcoder**, **steer** TalonFX, and **drive** TalonFX (use **Blink** to be sure which is which), then click **Encoder Calibration**. Point the wheel straight forward, held with a straightedge or locking pin, with its **bevel gear facing toward the center of the robot**, exactly as CTRE's instructions say. The generator saves that CANcoder's offset. When all four are done, click **Configuration Completed!**

!!! warning "The generator factory-defaults the devices"
    To make its tests accurate, the generator resets every swerve device's configs. Back up any Tuner X configs you care about first.

**3. Validate the drivetrain.** With the robot **on blocks** and the Driver Station **enabled**:

- **Verify Steer:** every module turns; seen from above, they should turn **counterclockwise**.
- **Verify Drive:** the wheels point forward and spin at about 10%. Answer whether the robot would have moved **forward**. Looking at the robot's **right** side, forward is the wheels turning **clockwise**; on the left side, **counterclockwise**.

If one side spins the wrong way, go back and redo that side's **encoder calibration** (bevel gears toward the center). If both sides are wrong, answer **No** and the generator flips them.

**4. Generate.** Click **Generate Project**, enter team **4674**, and pick **Java**.

!!! tip "Save the generator settings"
    Use the **export** button (top right) to save the generator settings into the robot project folder, and commit them. Later, **Import Project** reloads them, so after changing a module or re-zeroing the encoders you can change one thing and use **Generate only TunerConstants** instead of starting over.

*Sources: [CTRE: Creating your Project](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/tuner-swerve/creating-your-project.html), [Configuring Modules](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/tuner-swerve/configuring-your-modules.html), [Validating the Drivetrain](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/tuner-swerve/validating-drivetrain.html), [Generating the Project](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/tuner-swerve/generating-running-project.html)*

### What the generator writes
| File | What it is | Edit it? |
|---|---|---|
| `generated/TunerConstants.java` | Every hardware number: CAN IDs, gear ratios, offsets, gains, module positions | **No.** Change the generator and regenerate. |
| `subsystems/CommandSwerveDrivetrain.java` | The drivetrain subsystem: CTRE's `SwerveDrivetrain` plus command support and SysId | Yes: add PathPlanner here (Step 4) |
| `RobotContainer.java` | Controller bindings using swerve requests | Yes |
| `Telemetry.java` | Publishes the drive state to NetworkTables and CTRE's signal log | Optional |

!!! warning "Two classes named Telemetry"
    The generator's `frc.robot.Telemetry` is not the course library's `frc.robot.telemetry.Telemetry` (lowercase package). They can both live in the project. Just check your imports.

`TunerConstants` has a few numbers you **do** tune, by changing them in the generator settings and regenerating:

| Constant | Meaning |
|---|---|
| `steerGains`, `driveGains` | PID and feedforward for the steer and drive motors. The generated values are starting points. |
| `kSpeedAt12Volts` | The robot's real top speed at 12 V. **Measure it**; don't trust the estimate. |
| `kSlipCurrent` | The current where the wheels start to slip on carpet. Tune it on the floor. |
| `kCoupleRatio` | How much steering turns the drive wheel. Set by the MK5i preset. |

### Step 3: Driving with swerve requests
CTRE drivetrains don't have a `drive(...)` method. You build a **request** that describes how to drive, and apply it every loop:

```java
  // Field-centric driving with a 10% deadband, open-loop on the drive motors
  private final SwerveRequest.FieldCentric m_drive = new SwerveRequest.FieldCentric()
      .withDeadband(kMaxSpeed * 0.1)
      .withRotationalDeadband(kMaxAngularRate * 0.1)
      .withDriveRequestType(DriveRequestType.OpenLoopVoltage);

  m_drivetrain.setDefaultCommand(m_drivetrain.applyRequest(() ->
      m_drive.withVelocityX(-m_controller.getLeftY() * kMaxSpeed)       // forward
             .withVelocityY(-m_controller.getLeftX() * kMaxSpeed)       // left
             .withRotationalRate(-m_controller.getRightX() * kMaxAngularRate)));   // counterclockwise
```

| Request | Does |
|---|---|
| `FieldCentric` | Normal driving: forward is away from the driver |
| `RobotCentric` | Forward is the robot's front. Good for lining up with a game piece. |
| `FieldCentricFacingAngle` | Drive field-centric while the robot turns to face a heading you give it |
| `SwerveDriveBrake` | X-lock |
| `PointWheelsAt` | Point all wheels one way without driving (great for checking offsets) |
| `ApplyRobotSpeeds` | Drive at a `ChassisSpeeds`; PathPlanner uses this |
| `Idle` | Do nothing |

`seedFieldCentric()` makes "the way the robot faces now" the forward direction, like Lesson 21.1's `zeroHeadingCommand()`. The generated `periodic()` sets the **operator perspective** from the alliance color, so red-alliance driving is already correct.

### Step 4: Add PathPlanner
The generator doesn't set up PathPlanner. Add this method to `CommandSwerveDrivetrain`, and call `configureAutoBuilder();` at the end of each constructor. It's from CTRE's SwerveWithPathPlanner example.

```java
    /** Swerve request to apply during robot-centric path following */
    private final SwerveRequest.ApplyRobotSpeeds m_pathApplyRobotSpeeds = new SwerveRequest.ApplyRobotSpeeds();

    private void configureAutoBuilder() {
        try {
            var config = RobotConfig.fromGUISettings();
            AutoBuilder.configure(
                () -> getState().Pose,   // Supplier of current robot pose
                this::resetPose,         // Consumer for seeding pose against auto
                () -> getState().Speeds, // Supplier of current robot speeds
                // Consumer of ChassisSpeeds and feedforwards to drive the robot
                (speeds, feedforwards) -> setControl(
                    m_pathApplyRobotSpeeds.withSpeeds(ChassisSpeeds.discretize(speeds, 0.020))
                        .withWheelForceFeedforwardsX(feedforwards.robotRelativeForcesXNewtons())
                        .withWheelForceFeedforwardsY(feedforwards.robotRelativeForcesYNewtons())
                ),
                new PPHolonomicDriveController(
                    // PID constants for translation
                    new PIDConstants(10, 0, 0),
                    // PID constants for rotation
                    new PIDConstants(7, 0, 0)
                ),
                config,
                // Assume the path needs to be flipped for Red vs Blue, this is normally the case
                () -> DriverStation.getAlliance().orElse(Alliance.Blue) == Alliance.Red,
                this // Subsystem for requirements
            );
        } catch (Exception ex) {
            DriverStation.reportError("Failed to load PathPlanner config and configure AutoBuilder", ex.getStackTrace());
        }
    }
```

Compared with MAXSwerve, this passes PathPlanner's **wheel force feedforwards** to the motors, which makes paths track noticeably better.

Then fill in the PathPlanner app's **Robot Config** ([Lesson 19.1](19b-pathplanner-app.md#step-2-settings-for-a-tank-drive)), **Holonomic Mode on**, from `TunerConstants`:

| PathPlanner field | From `TunerConstants` |
|---|---|
| Wheel Radius | `kWheelRadius` (in inches there: convert to meters) |
| Drive Gearing | `kDriveGearRatio` |
| True Max Drive Speed | `kSpeedAt12Volts`, once you've measured it |
| Drive Motor | **Kraken X60**, or **Kraken X60 FOC** with Phoenix Pro |
| Drive Current Limit | Close to `kSlipCurrent` |
| Module X / Y | `kFrontLeftXPos`, `kFrontLeftYPos`, … (inches: convert to meters) |
| Mass, MOI, Wheel COF | Measure, as in Lesson 21.1 |

### Step 5: RobotContainer, the course way
The generated `RobotContainer` uses a `SendableChooser` and no named commands. Here's the course version: the generated bindings, plus the `Selectable` auto menu ([Lesson 19](19-pathplanner.md#step-7-pick-an-auto-in-elastic)) and vision.

```java
package frc.robot;

import static edu.wpi.first.units.Units.MetersPerSecond;
import static edu.wpi.first.units.Units.RadiansPerSecond;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.swerve.SwerveModule.DriveRequestType;
import com.ctre.phoenix6.swerve.SwerveRequest;
import com.pathplanner.lib.auto.AutoBuilder;
import com.pathplanner.lib.auto.NamedCommands;
import com.pathplanner.lib.commands.FollowPathCommand;
import com.pathplanner.lib.commands.PathPlannerAuto;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import edu.wpi.first.wpilibj2.command.sysid.SysIdRoutine.Direction;

import frc.robot.generated.TunerConstants;
import frc.robot.subsystems.CommandSwerveDrivetrain;
import frc.robot.subsystems.VisionSubsystem;
import frc.robot.telemetry.Selectable;
import frc.robot.telemetry.Tunables;

public class RobotContainer {
  // Top speeds the driver's full stick asks for
  private final double kMaxSpeed = TunerConstants.kSpeedAt12Volts.in(MetersPerSecond);
  private final double kMaxAngularRate = RotationsPerSecond.of(0.75).in(RadiansPerSecond);

  // How the drivetrain should drive (Step 3)
  private final SwerveRequest.FieldCentric m_drive = new SwerveRequest.FieldCentric()
      .withDeadband(kMaxSpeed * 0.1)
      .withRotationalDeadband(kMaxAngularRate * 0.1)
      .withDriveRequestType(DriveRequestType.OpenLoopVoltage);
  private final SwerveRequest.SwerveDriveBrake m_brake = new SwerveRequest.SwerveDriveBrake();
  private final SwerveRequest.RobotCentric m_robotCentric = new SwerveRequest.RobotCentric()
      .withDriveRequestType(DriveRequestType.OpenLoopVoltage);

  private final CommandXboxController m_controller = new CommandXboxController(0);

  // The drivetrain, built from the generated constants
  public final CommandSwerveDrivetrain m_drivetrain = TunerConstants.createDrivetrain();
  // Lesson 18's PhotonVision subsystem, with its m_drive field changed to CommandSwerveDrivetrain
  private final VisionSubsystem m_vision = new VisionSubsystem(m_drivetrain);

  // The generator's NetworkTables and signal-log publisher
  private final Telemetry m_logger = new Telemetry(kMaxSpeed);

  // The autonomous menu in Elastic
  private final Selectable<Command> m_autoChooser = new Selectable<>();

  public RobotContainer() {
    // Named commands first: autos look them up when they're built
    NamedCommands.registerCommand("X-Lock", m_drivetrain.applyRequest(() -> m_brake).withTimeout(0.5));

    configureBindings();

    m_autoChooser.addDefault("Do nothing", Commands.none());
    for (String name : AutoBuilder.getAllAutoNames()) {
      m_autoChooser.add(name, new PathPlannerAuto(name));
    }
    Tunables.publish("Auto", m_autoChooser);

    // Load PathPlanner's code now so the first path doesn't stutter
    CommandScheduler.getInstance().schedule(FollowPathCommand.warmupCommand());
  }

  private void configureBindings() {
    // Left stick drives field-centric, right stick X turns
    m_drivetrain.setDefaultCommand(m_drivetrain.applyRequest(() ->
        m_drive.withVelocityX(-m_controller.getLeftY() * kMaxSpeed)
               .withVelocityY(-m_controller.getLeftX() * kMaxSpeed)
               .withRotationalRate(-m_controller.getRightX() * kMaxAngularRate)));

    // While disabled, apply Idle so the motors' neutral mode (brake or coast) is used
    final var idle = new SwerveRequest.Idle();
    RobotModeTriggers.disabled().whileTrue(m_drivetrain.applyRequest(() -> idle).ignoringDisable(true));

    // Right bumper: X-lock while held
    m_controller.rightBumper().whileTrue(m_drivetrain.applyRequest(() -> m_brake));
    // Left bumper: robot-centric creep, for lining up
    m_controller.leftBumper().whileTrue(m_drivetrain.applyRequest(() ->
        m_robotCentric.withVelocityX(-m_controller.getLeftY() * 1.0)
                      .withVelocityY(-m_controller.getLeftX() * 1.0)));
    // Start: the robot now faces away from the driver
    m_controller.start().onTrue(m_drivetrain.runOnce(m_drivetrain::seedFieldCentric));

    // SysId: hold Back plus a face button. Run each test once per log.
    m_controller.back().and(m_controller.y()).whileTrue(m_drivetrain.sysIdDynamic(Direction.kForward));
    m_controller.back().and(m_controller.x()).whileTrue(m_drivetrain.sysIdDynamic(Direction.kReverse));
    m_controller.back().and(m_controller.b()).whileTrue(m_drivetrain.sysIdQuasistatic(Direction.kForward));
    m_controller.back().and(m_controller.a()).whileTrue(m_drivetrain.sysIdQuasistatic(Direction.kReverse));

    m_drivetrain.registerTelemetry(m_logger::telemeterize);
  }

  public Command getAutonomousCommand() {
    return m_autoChooser.getSelected();
  }
}
```

!!! info "Changed from the generated bindings"
    CTRE's generated code runs SysId with **Start + Y/X** and seeds field-centric with the **left bumper**. The course version moves all four SysId tests to **Back** + a face button, so **Start** can seed field-centric, the same button as on the MAXSwerve robot. Before competition, consider moving SysId to a second controller so nobody starts a test by accident.

### Step 6: Vision
Lesson 18's `VisionSubsystem` works with one change: make its `m_drive` field and constructor take a `CommandSwerveDrivetrain` instead of `DriveSubsystem`. The generated drivetrain already has `addVisionMeasurement(pose, timestamp, stdDevs)`, and it converts PhotonVision's roboRIO timestamps to CTRE's clock for you (`Utils.fpgaToCurrentTime`), so pass `result.getTimestampSeconds()` unchanged.

Read the pose with `m_drivetrain.getState().Pose`.

### Step 7: Check it on blocks
1. In Tuner X, check every device shows up with the right name and firmware.
2. Deploy. With the robot on blocks, watch the wheels while pushing the left stick gently: all four should point the same way. (CTRE's generated bindings put `PointWheelsAt` on **B**, which is handy for this check before you swap in the course's `RobotContainer`.)
3. Push forward: all wheels point forward and spin forward. Left: all point left. Turn: they form a circle.
4. On the floor: drive field-centric, spin the robot, check forward stays forward. Then measure `kSpeedAt12Volts`: full stick in a straight line, read the speed from the drive state.
5. Run SysId on a long, clear floor, then put the gains into the generator settings and regenerate `TunerConstants`.

### Phoenix Pro
Some features need a **Phoenix Pro** license on each device (or on the CANivore):

| Feature | Without Pro | With Pro |
|---|---|---|
| Steer feedback (`kSteerFeedbackType`) | `RemoteCANcoder` | `FusedCANcoder`: combines CANcoder and motor encoder for smoother steering |
| FOC on the Krakens | Not available | About 15% more peak power |
| Time-synced odometry | Normal | `SyncCANcoder` and timestamp alignment |

The generator writes `FusedCANcoder` by default; **without Pro it automatically falls back** to `RemoteCANcoder`, so the code works either way.

## Try it
- [ ] Plan and label every CAN ID for the MK5i drivetrain
- [ ] Run the Swerve Project Generator on a practice chassis, including encoder offsets and validation
- [ ] Save the generator settings into the project and commit them
- [ ] Add `configureAutoBuilder()` and fill in PathPlanner's Robot Config from `TunerConstants`
- [ ] Swap the generated auto chooser for `Selectable`
- [ ] Measure `kSpeedAt12Volts` and regenerate `TunerConstants`
- [ ] Compare a PathPlanner auto on MAXSwerve and on the MK5i robot in AdvantageScope

## Check yourself
??? question "Why shouldn't you edit TunerConstants.java by hand?"
    It's generated. The next time anyone regenerates it, hand edits are lost. Change the generator settings instead.

??? question "How are encoder offsets set on the MK5i robot?"
    In the generator's Encoder Calibration, with each wheel pointing straight forward and its bevel gear facing the center of the robot. The generator reads the CANcoder and saves the offset.

??? question "Why does the CTRE drivetrain run odometry faster than 50 times a second?"
    It runs on its own thread, 250 Hz on a CANivore. More samples means less error when the robot moves and turns fast.

??? question "What's a swerve request?"
    An object describing how to drive (field-centric, robot-centric, X-lock…), applied every loop with `applyRequest`.

??? question "What happens to FusedCANcoder without a Phoenix Pro license?"
    It falls back to RemoteCANcoder automatically. The robot still drives.

<p class="credit">Code in Steps 3–5 is adapted from CTRE's <a href="https://github.com/CrossTheRoadElec/Phoenix6-Examples/tree/main/java/SwerveWithPathPlanner">SwerveWithPathPlanner</a> example (2026, WPILib BSD license header). It hasn't been compiled for this course, because Phoenix 6 isn't available in the course's build environment; build it in your generated project.</p>
