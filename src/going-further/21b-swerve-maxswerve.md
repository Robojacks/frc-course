# 21.1 Our Swerve Today: REV MAXSwerve

## Why it matters
[Lesson 21](21-swerve.md) explained how any swerve drive works. This lesson is about **ours**: the REV MAXSwerve drivetrain, running the team's copy of REV's MAXSwerve template with PathPlanner added.

You'll read the code file by file, see what the team changed from REV's template, fix a few problems hiding in it, and add the course's pieces: the `Selectable` auto menu, telemetry for AdvantageScope, and PhotonVision.

Next year's drivetrain is different: SDS MK5i modules set up with CTRE's generator. That's [Lesson 21.2](21c-swerve-ctre.md). The ideas carry over; the code doesn't.

## Read this
- [REV MAXSwerve Java Template](https://github.com/REVrobotics/MAXSwerve-Java-Template) and its README
- The team's copy: [kedrickjohnson/MAXSwerve-Java-Template-main](https://github.com/kedrickjohnson/MAXSwerve-Java-Template-main)
- [MAXSwerve module documentation (REV)](https://docs.revrobotics.com/brushless/maxswerve)

!!! info "Licenses"
    REV's MAXSwerve template is © REV Robotics under a BSD 3-Clause license, and built on WPILib's BSD-licensed template. The finished code for this lesson, in [`examples/swerve-maxswerve`](https://github.com/Robojacks/frc-course/tree/main/examples/swerve-maxswerve), keeps REV's files and license notice.

## Walkthrough

### What's on the robot
| Part | Each module | Notes |
|---|---|---|
| **Drive motor** | NEO **Vortex** on a **SPARK Flex** | REV's template uses a NEO on a SPARK MAX; ours uses SPARK Flex |
| **Turning motor** | NEO 550 on a SPARK MAX | |
| **Turning encoder** | REV Through Bore Encoder, plugged into the turning SPARK MAX | Absolute: knows the wheel's angle at power-on |
| **Gyro** | One **Pigeon 2** for the robot, CAN ID 9 | REV's template uses an ADIS16470 |

How each sensor works, how it's wired, and what its LEDs mean: [Lesson 4.3](../hardware/04d-sensors.md#encoders-inside-motors). Reading them in code: [Lesson 8](../robot-code/08-sensors.md#sensors-on-can).

| Module | Drive CAN ID | Turn CAN ID |
|---|---|---|
| Front left | 1 | 2 |
| Rear left | 3 | 4 |
| Front right | 5 | 6 |
| Rear right | 7 | 8 |

### The files
| File | Job | Changed in this lesson? |
|---|---|---|
| `Constants.java` | Chassis size, CAN IDs, gear ratio, max speeds | Yes: motor free speed, robot config |
| `Configs.java` | SPARK settings: conversion factors, PID, current limits | No |
| `subsystems/MAXSwerveModule.java` | One module: point the wheel, spin it | No |
| `subsystems/DriveSubsystem.java` | Four modules, the gyro, odometry, PathPlanner | Yes |
| `RobotContainer.java` | Controller bindings and the auto menu | Yes |
| `Robot.java` | Logging and PathPlanner warmup | Yes (small) |
| `subsystems/VisionSubsystem.java` | PhotonVision, from [Lesson 18](18-vision.md) | New |

The module code is REV's, and it works. Leave it alone. Almost everything you'll change is in `Constants`, `DriveSubsystem`, and `RobotContainer`.

### How one module works (`MAXSwerveModule`)
Everything from [Lesson 21](21-swerve.md#inside-one-module) is here, but the PID loops run **on the SPARKs**, not the roboRIO:

```java
    // Command driving and turning SPARKS towards their respective setpoints.
    m_drivingClosedLoopController.setSetpoint(correctedDesiredState.speedMetersPerSecond, ControlType.kVelocity);
    m_turningClosedLoopController.setSetpoint(correctedDesiredState.angle.getRadians(), ControlType.kPosition);
```

| Idea | Where in the template |
|---|---|
| Drive velocity control | `ControlType.kVelocity`, with PID and a kV feedforward set in `Configs.drivingConfig.closedLoop` |
| Steer position control | `ControlType.kPosition` on the **absolute** encoder, set in `Configs.turningConfig.closedLoop` |
| Continuous input (179° and −179° are neighbors) | `positionWrappingEnabled(true)` in `Configs` |
| `optimize` (never turn more than 90°) | `correctedDesiredState.optimize(...)` in `setDesiredState` |
| Units | `Configs` sets conversion factors so the drive encoder reads **meters** and **m/s**, and the turn encoder reads **radians** |

### Encoder offsets: the "chassis angular offsets"
MAXSwerve modules are zeroed **before** they go on the robot. With REV's alignment tool in the module, open **REV Hardware Client**, select the turning SPARK MAX, and use the **Absolute Encoder** utility to set the zero offset. Every module is zeroed the same way.

Then the four modules are bolted on facing different directions, so the template adds one angle per corner in `Constants`:

```java
    public static final double kFrontLeftChassisAngularOffset = -Math.PI / 2;
    public static final double kFrontRightChassisAngularOffset = 0;
    public static final double kBackLeftChassisAngularOffset = Math.PI;
    public static final double kBackRightChassisAngularOffset = Math.PI / 2;
```

These match the mounting in REV's instructions. If a wheel points sideways when it should point forward, the module was zeroed or mounted differently from the instructions. Re-zero it before you change these numbers.

### Problems hiding in our copy
The template drives, but a few things don't match the robot. Each one makes autos or driving a little wrong in a way that's hard to track down later.

| # | Problem | Why it matters | Fix |
|---|---|---|---|
| 1 | The drive motors are **Vortexes** (SPARK Flex), but `Constants` uses the **NEO's** free speed, 5676 RPM | The drive kV feedforward and the max speed are calculated from it. The Vortex is about 6784 RPM, so every speed is planned wrong. | `kFreeSpeedRpm = 6784` for a Vortex |
| 2 | PathPlanner's robot config in `Constants` says `DCMotor.getNEO(1)` and a mass of **40 lb** | PathPlanner uses these to plan acceleration. A real robot with bumpers and battery is around 110–150 lb. | `DCMotor.getNeoVortex(1)` and the real mass. Better: read the app's config (fix 3). |
| 3 | The PathPlanner **app's** `settings.json` still has the app's **defaults**: Kraken X60, 5.143 gearing, 0.048 m wheels, 5.45 m/s, 0.273 m module offsets | The app plans paths for a robot we don't have, while the code uses a different config | Fill in the app's Robot Config with the real numbers (table below), and use `RobotConfig.fromGUISettings()` so both agree |
| 4 | `zeroHeading()` resets the Pigeon, but not odometry | The pose's heading jumps, so PathPlanner and vision think the robot spun | Reset the **pose's** heading instead, and drive field-relative from the pose |
| 5 | Field-relative driving ignores the alliance | On red, "forward" on the stick drives **toward** the driver | Flip by 180° on red, like CTRE's generated code does |
| 6 | The auto menu is a `SendableChooser` | The course uses `Selectable` ([Lesson 6.1](../robot-code/06b-dashboards.md#a-dropdown-menu-selectable)) | `Selectable` with every PathPlanner auto |
| 7 | X-lock uses `PS4Controller.Button.kR1` on an Xbox controller | Works only because both happen to be button 6 | `CommandXboxController.rightBumper()` |
| 8 | Plain odometry, no warmup, no logging | No place for vision; the first path can stutter; nothing to debug with | `SwerveDrivePoseEstimator`, PathPlanner warmup, `DataLogManager`, telemetry |

!!! warning "Check problem 1 on the robot"
    The team's code creates the drive motors as `SparkFlex`, and a SPARK Flex almost always means a **NEO Vortex**. Look at the motors. If they're plain NEOs on a SPARK Flex dock, keep 5676 RPM and `DCMotor.getNEO(1)`.

### Step 1: Constants
Here's the course version of `Constants.java`. The changes from the team's copy are marked `// CHANGED`.

```java
package frc.robot;

import com.pathplanner.lib.config.ModuleConfig;
import com.pathplanner.lib.config.RobotConfig;

import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.util.Units;

public final class Constants {
  public static final class DriveConstants {
    // The fastest the code will ever ASK the robot to go. Not the robot's true top speed.
    public static final double kMaxSpeedMetersPerSecond = 4.8;
    public static final double kMaxAngularSpeed = 2 * Math.PI; // radians per second

    // Chassis: wheel centers, left-to-right (track width) and front-to-back (wheel base)
    public static final double kTrackWidth = Units.inchesToMeters(25);
    public static final double kWheelBase = Units.inchesToMeters(28);

    // Where each module is from the robot's center. Order: FL, FR, RL, RR. +X forward, +Y left.
    public static final SwerveDriveKinematics kDriveKinematics = new SwerveDriveKinematics(
        new Translation2d(kWheelBase / 2, kTrackWidth / 2),
        new Translation2d(kWheelBase / 2, -kTrackWidth / 2),
        new Translation2d(-kWheelBase / 2, kTrackWidth / 2),
        new Translation2d(-kWheelBase / 2, -kTrackWidth / 2));

    // How each module is turned when mounted, compared with how it was zeroed (radians)
    public static final double kFrontLeftChassisAngularOffset = -Math.PI / 2;
    public static final double kFrontRightChassisAngularOffset = 0;
    public static final double kBackLeftChassisAngularOffset = Math.PI;
    public static final double kBackRightChassisAngularOffset = Math.PI / 2;

    // Driving motors: SPARK Flex CAN IDs
    public static final int kFrontLeftDrivingCanId = 1;
    public static final int kRearLeftDrivingCanId = 3;
    public static final int kFrontRightDrivingCanId = 5;
    public static final int kRearRightDrivingCanId = 7;

    // Turning motors: SPARK MAX CAN IDs
    public static final int kFrontLeftTurningCanId = 2;
    public static final int kRearLeftTurningCanId = 4;
    public static final int kFrontRightTurningCanId = 6;
    public static final int kRearRightTurningCanId = 8;

    public static final int kPigeonCanId = 9;   // CHANGED: named instead of a bare 9 in DriveSubsystem
  }

  public static final class ModuleConstants {
    // The MAXSwerve pinion: 12T, 13T, or 14T. More teeth = faster robot.
    public static final int kDrivingMotorPinionTeeth = 14;

    // Free speed of the DRIVE motor, turns per second
    public static final double kDrivingMotorFreeSpeedRps = MotorConstants.kDrivingFreeSpeedRpm / 60;
    public static final double kWheelDiameterMeters = Units.inchesToMeters(3);
    public static final double kWheelCircumferenceMeters = kWheelDiameterMeters * Math.PI;
    // 45 teeth on the wheel's bevel gear, 22 on the first-stage spur gear, 15 on the bevel pinion
    public static final double kDrivingMotorReduction = (45.0 * 22) / (kDrivingMotorPinionTeeth * 15);
    // The wheel's free speed, in meters per second of travel
    public static final double kDriveWheelFreeSpeedRps =
        (kDrivingMotorFreeSpeedRps * kWheelCircumferenceMeters) / kDrivingMotorReduction;
  }

  public static final class OIConstants {
    public static final int kDriverControllerPort = 0;
    public static final double kDriveDeadband = 0.05;
  }

  public static final class AutoConstants {
    // PathPlanner's path-following PID: meters of error -> m/s, and radians of error -> rad/s
    public static final double kPPTranslationP = 1.0;
    public static final double kPPRotationP = 1.0;

    // A backup robot config, used only if the PathPlanner app's settings can't be read.
    // CHANGED: real motor and a mass you must measure. Keep these matching the app's Robot Config.
    public static final double kRobotMassKg = Units.lbsToKilograms(125);   // CHANGED: WEIGH THE ROBOT
    public static final double kRobotMOI = 6.883;
    public static final double kWheelCOF = 1.2;
    public static final double kDriveCurrentLimitAmps = 50.0;   // matches Configs.drivingConfig

    public static final RobotConfig kBackupPPConfig = new RobotConfig(
        kRobotMassKg,
        kRobotMOI,
        new ModuleConfig(
            ModuleConstants.kWheelDiameterMeters / 2.0,
            DriveConstants.kMaxSpeedMetersPerSecond,
            kWheelCOF,
            DCMotor.getNeoVortex(1).withReduction(ModuleConstants.kDrivingMotorReduction),   // CHANGED
            kDriveCurrentLimitAmps,
            1),
        new Translation2d(DriveConstants.kWheelBase / 2, DriveConstants.kTrackWidth / 2),
        new Translation2d(DriveConstants.kWheelBase / 2, -DriveConstants.kTrackWidth / 2),
        new Translation2d(-DriveConstants.kWheelBase / 2, DriveConstants.kTrackWidth / 2),
        new Translation2d(-DriveConstants.kWheelBase / 2, -DriveConstants.kTrackWidth / 2));
  }

  public static final class MotorConstants {
    // CHANGED: the drive motors are NEO Vortexes (6784 RPM). A plain NEO is 5676 RPM.
    public static final double kDrivingFreeSpeedRpm = 6784;
  }
}
```

!!! info "Two files to rename in"
    REV's `Configs.java` and `Constants` used `NeoMotorConstants.kFreeSpeedRpm`. The course version renames it `MotorConstants.kDrivingFreeSpeedRpm`, because it's the **drive** motor's free speed and the drive motor isn't a NEO. `Configs.java` only uses `ModuleConstants.kDriveWheelFreeSpeedRps`, so it doesn't change.

With a Vortex, the wheel's free speed is 6784 ÷ 60 × 0.2394 m ÷ 4.714 ≈ **5.74 m/s**. `kMaxSpeedMetersPerSecond` stays 4.8: that's how fast the **driver's** full stick goes, which leaves headroom for the velocity loop.

### Step 2: PathPlanner's Robot Config
Open the PathPlanner app ([Lesson 19.1](19b-pathplanner-app.md#step-2-settings-for-a-tank-drive)) on this project, leave **Holonomic Mode on**, and set Robot Config to the real robot:

| Field | Value | From |
|---|---|---|
| Robot Mass | Weigh it (kg) | Scale, with bumpers and battery |
| Robot MOI | 6.883 for now | Better: from SysId (PathPlanner docs) |
| Wheel Radius | **0.0381** | 3 in wheel |
| Drive Gearing | **4.714** | 14T pinion: (45 × 22) ÷ (14 × 15) |
| True Max Drive Speed | Measure; about 5.2 to start | ~90% of the 5.74 m/s free speed |
| Wheel COF | 1.2 | |
| Drive Motor | **NEO Vortex** | |
| Drive Current Limit | **50** | `Configs.drivingConfig` |
| Front Left X / Y | **0.3556 / 0.3175** | Half of 28 in / half of 25 in |
| Front Right X / Y | 0.3556 / −0.3175 | |
| Back Left X / Y | −0.3556 / 0.3175 | |
| Back Right X / Y | −0.3556 / −0.3175 | |

### Step 3: The drive subsystem
The course version of `DriveSubsystem.java`. Compared with the team's copy, it: uses a pose estimator (for vision), reads PathPlanner's config from the app, resets the heading through the pose, drives field-relative for either alliance, and logs everything.

```java
package frc.robot.subsystems;

import com.ctre.phoenix6.hardware.Pigeon2;
import com.pathplanner.lib.auto.AutoBuilder;
import com.pathplanner.lib.config.PIDConstants;
import com.pathplanner.lib.config.RobotConfig;
import com.pathplanner.lib.controllers.PPHolonomicDriveController;

import edu.wpi.first.math.Matrix;
import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.math.numbers.N1;
import edu.wpi.first.math.numbers.N3;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants.AutoConstants;
import frc.robot.Constants.DriveConstants;
import frc.robot.telemetry.Telemetry;
import frc.robot.telemetry.TelemetryTable;

public class DriveSubsystem extends SubsystemBase {
  // The four MAXSwerve modules. Order everywhere: front left, front right, rear left, rear right.
  private final MAXSwerveModule m_frontLeft = new MAXSwerveModule(
      DriveConstants.kFrontLeftDrivingCanId,
      DriveConstants.kFrontLeftTurningCanId,
      DriveConstants.kFrontLeftChassisAngularOffset);
  private final MAXSwerveModule m_frontRight = new MAXSwerveModule(
      DriveConstants.kFrontRightDrivingCanId,
      DriveConstants.kFrontRightTurningCanId,
      DriveConstants.kFrontRightChassisAngularOffset);
  private final MAXSwerveModule m_rearLeft = new MAXSwerveModule(
      DriveConstants.kRearLeftDrivingCanId,
      DriveConstants.kRearLeftTurningCanId,
      DriveConstants.kBackLeftChassisAngularOffset);
  private final MAXSwerveModule m_rearRight = new MAXSwerveModule(
      DriveConstants.kRearRightDrivingCanId,
      DriveConstants.kRearRightTurningCanId,
      DriveConstants.kBackRightChassisAngularOffset);

  // The Pigeon 2 gyro. getRotation2d() is counterclockwise-positive, like WPILib.
  private final Pigeon2 m_gyro = new Pigeon2(DriveConstants.kPigeonCanId);

  // Odometry that can also take vision measurements (Lesson 18)
  private final SwerveDrivePoseEstimator m_poseEstimator;

  private final TelemetryTable m_telemetry = Telemetry.getTable("Drive");
  private final Field2d m_field = new Field2d();

  public DriveSubsystem() {
    m_poseEstimator = new SwerveDrivePoseEstimator(
        DriveConstants.kDriveKinematics,
        m_gyro.getRotation2d(),
        getModulePositions(),
        Pose2d.kZero);
    SmartDashboard.putData("Field", m_field);
    configurePathPlanner();
  }

  /** Lets PathPlanner drive this subsystem (Lesson 19). */
  private void configurePathPlanner() {
    RobotConfig config;
    try {
      config = RobotConfig.fromGUISettings();   // the PathPlanner app's Robot Config
    } catch (Exception e) {
      DriverStation.reportError("PathPlanner settings didn't load; using backup config", e.getStackTrace());
      config = AutoConstants.kBackupPPConfig;
    }
    AutoBuilder.configure(
        this::getPose,
        this::resetPose,
        this::getRobotRelativeSpeeds,
        (speeds, feedforwards) -> driveRobotRelative(speeds),
        new PPHolonomicDriveController(
            new PIDConstants(AutoConstants.kPPTranslationP, 0.0, 0.0),
            new PIDConstants(AutoConstants.kPPRotationP, 0.0, 0.0)),
        config,
        DriveSubsystem::isRedAlliance,   // flip paths to the red side when we're red
        this);
  }

  @Override
  public void periodic() {
    m_poseEstimator.update(m_gyro.getRotation2d(), getModulePositions());

    Pose2d pose = getPose();
    m_field.setRobotPose(pose);
    m_telemetry.log("Pose", pose);
    m_telemetry.log("Heading (deg)", pose.getRotation().getDegrees());
    m_telemetry.log("Gyro (deg)", m_gyro.getRotation2d().getDegrees());
    m_telemetry.log("Measured States", getModuleStates(), SwerveModuleState.struct);
    m_telemetry.log("Desired States", getDesiredStates(), SwerveModuleState.struct);
    m_telemetry.log("Speeds", getRobotRelativeSpeeds());
  }

  // ---------------------------------------------------------------- pose

  /** Where the robot is on the field: odometry, corrected by vision. */
  public Pose2d getPose() {
    return m_poseEstimator.getEstimatedPosition();
  }

  /** Tells the pose estimator the robot is at this pose. PathPlanner calls this at the start of an auto. */
  public void resetPose(Pose2d pose) {
    m_poseEstimator.resetPosition(m_gyro.getRotation2d(), getModulePositions(), pose);
  }

  /** Hands a camera's pose to the estimator (Lesson 18). stdDevs: x m, y m, heading rad. */
  public void addVisionMeasurement(Pose2d visionPose, double timestampSeconds, Matrix<N3, N1> stdDevs) {
    m_poseEstimator.addVisionMeasurement(visionPose, timestampSeconds, stdDevs);
  }

  /**
   * Makes the direction the robot faces right now "away from the driver."
   * Changes the pose's heading only; the Pigeon isn't reset, so odometry doesn't jump.
   */
  public Command zeroHeadingCommand() {
    return runOnce(() -> resetPose(new Pose2d(getPose().getTranslation(),
            isRedAlliance() ? Rotation2d.k180deg : Rotation2d.kZero)))
        .ignoringDisable(true)
        .withName("Zero Heading");
  }

  // ---------------------------------------------------------------- driving

  /**
   * Drives from joystick values, each -1 to 1.
   *
   * @param xSpeed forward (+) / backward (-)
   * @param ySpeed left (+) / right (-)
   * @param rot counterclockwise (+) / clockwise (-)
   * @param fieldRelative true: forward means away from the driver
   */
  public void drive(double xSpeed, double ySpeed, double rot, boolean fieldRelative) {
    drive(new ChassisSpeeds(
            xSpeed * DriveConstants.kMaxSpeedMetersPerSecond,
            ySpeed * DriveConstants.kMaxSpeedMetersPerSecond,
            rot * DriveConstants.kMaxAngularSpeed),
        fieldRelative);
  }

  /** The default teleop command: field-relative driving from three joystick axes. */
  public Command driveCommand(
      java.util.function.DoubleSupplier xSpeed,
      java.util.function.DoubleSupplier ySpeed,
      java.util.function.DoubleSupplier rot) {
    return run(() -> drive(xSpeed.getAsDouble(), ySpeed.getAsDouble(), rot.getAsDouble(), true))
        .withName("Field-Relative Drive");
  }

  /** Points the wheels in an X so the robot is hard to push. Runs while held. */
  public Command setXCommand() {
    return run(this::setX).withName("X-Lock");
  }

  private void driveRobotRelative(ChassisSpeeds speeds) {
    drive(speeds, false);
  }

  private void drive(ChassisSpeeds speeds, boolean fieldRelative) {
    if (fieldRelative) {
      // The driver's "forward": +X on blue, -X on red (the field origin is always on the blue side)
      Rotation2d driverForward = isRedAlliance()
          ? getPose().getRotation().plus(Rotation2d.k180deg)
          : getPose().getRotation();
      speeds = ChassisSpeeds.fromFieldRelativeSpeeds(speeds, driverForward);
    }
    speeds = ChassisSpeeds.discretize(speeds, TimedRobot.kDefaultPeriod);
    SwerveModuleState[] states = DriveConstants.kDriveKinematics.toSwerveModuleStates(speeds);
    setModuleStates(states);
  }

  /** Sends one state to each module, slowing all four together if any is too fast. */
  public void setModuleStates(SwerveModuleState[] desiredStates) {
    SwerveDriveKinematics.desaturateWheelSpeeds(desiredStates, DriveConstants.kMaxSpeedMetersPerSecond);
    m_frontLeft.setDesiredState(desiredStates[0]);
    m_frontRight.setDesiredState(desiredStates[1]);
    m_rearLeft.setDesiredState(desiredStates[2]);
    m_rearRight.setDesiredState(desiredStates[3]);
  }

  /** Sets the wheels into an X formation to prevent movement. */
  public void setX() {
    m_frontLeft.setDesiredState(new SwerveModuleState(0, Rotation2d.fromDegrees(45)));
    m_frontRight.setDesiredState(new SwerveModuleState(0, Rotation2d.fromDegrees(-45)));
    m_rearLeft.setDesiredState(new SwerveModuleState(0, Rotation2d.fromDegrees(-45)));
    m_rearRight.setDesiredState(new SwerveModuleState(0, Rotation2d.fromDegrees(45)));
  }

  // ---------------------------------------------------------------- readings

  public ChassisSpeeds getRobotRelativeSpeeds() {
    return DriveConstants.kDriveKinematics.toChassisSpeeds(getModuleStates());
  }

  private SwerveModuleState[] getModuleStates() {
    return new SwerveModuleState[] {
        m_frontLeft.getState(), m_frontRight.getState(), m_rearLeft.getState(), m_rearRight.getState()};
  }

  private SwerveModuleState[] getDesiredStates() {
    return new SwerveModuleState[] {
        m_frontLeft.getDesiredState(), m_frontRight.getDesiredState(),
        m_rearLeft.getDesiredState(), m_rearRight.getDesiredState()};
  }

  private SwerveModulePosition[] getModulePositions() {
    return new SwerveModulePosition[] {
        m_frontLeft.getPosition(), m_frontRight.getPosition(),
        m_rearLeft.getPosition(), m_rearRight.getPosition()};
  }

  private static boolean isRedAlliance() {
    return DriverStation.getAlliance().orElse(Alliance.Blue) == Alliance.Red;
  }
}
```

`getDesiredStates()` needs one small getter in `MAXSwerveModule` (REV's code stores the state but doesn't share it):

```java
  /** The state this module was last told to reach (before the chassis offset), for logging. */
  public SwerveModuleState getDesiredState() {
    return m_desiredState;
  }
```

### Piece by piece
```java
private final SwerveDrivePoseEstimator m_poseEstimator;
```
Replaces the template's `SwerveDriveOdometry`. It does the same odometry every loop, and can also take camera measurements, exactly like the WCD in [Lesson 18](18-vision.md#step-1-a-pose-estimator-in-the-drive-subsystem).

```java
config = RobotConfig.fromGUISettings();
```
Reads the robot config you entered in the PathPlanner app (Step 2), so the app and the robot plan with the **same** numbers. The template built a separate config in `Constants`, which had drifted away from the app's.

```java
resetPose(new Pose2d(getPose().getTranslation(), isRedAlliance() ? Rotation2d.k180deg : Rotation2d.kZero))
```
"The robot now faces away from the driver." On blue that's 0°; on red it's 180°, because WPILib's field always has its origin on the blue side. Only the pose changes; the Pigeon keeps counting, so nothing jumps.

```java
Rotation2d driverForward = isRedAlliance() ? getPose().getRotation().plus(Rotation2d.k180deg) : getPose().getRotation();
speeds = ChassisSpeeds.fromFieldRelativeSpeeds(speeds, driverForward);
```
Field-relative driving uses the **pose's** heading, so a vision correction also corrects driving. On red, the driver's forward is the field's −X, so the heading is turned 180°.

```java
m_telemetry.log("Measured States", getModuleStates(), SwerveModuleState.struct);
m_telemetry.log("Desired States", getDesiredStates(), SwerveModuleState.struct);
```
Four arrows each: what the modules were told and what they did. Drag both onto AdvantageScope's **Swerve** tab ([Lesson 20](20-logging.md)). A module whose arrow doesn't match is the broken one.

### Step 4: RobotContainer
```java
package frc.robot;

import com.pathplanner.lib.auto.AutoBuilder;
import com.pathplanner.lib.auto.NamedCommands;
import com.pathplanner.lib.commands.PathPlannerAuto;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;

import frc.robot.Constants.OIConstants;
import frc.robot.subsystems.DriveSubsystem;
import frc.robot.subsystems.VisionSubsystem;
import frc.robot.telemetry.Selectable;
import frc.robot.telemetry.Tunables;

public class RobotContainer {
  // The robot's subsystems
  private final DriveSubsystem m_robotDrive = new DriveSubsystem();
  private final VisionSubsystem m_vision = new VisionSubsystem(m_robotDrive);

  // The driver's Xbox controller
  private final CommandXboxController m_driverController =
      new CommandXboxController(OIConstants.kDriverControllerPort);

  // The autonomous menu in Elastic (Lesson 19, Step 7)
  private final Selectable<Command> m_autoChooser = new Selectable<>();

  public RobotContainer() {
    // Named commands first: autos look them up when they're built (Lesson 19, Step 6)
    NamedCommands.registerCommand("X-Lock", m_robotDrive.setXCommand().withTimeout(0.5));

    configureBindings();

    m_autoChooser.addDefault("Do nothing", Commands.none());
    for (String name : AutoBuilder.getAllAutoNames()) {
      m_autoChooser.add(name, new PathPlannerAuto(name));
    }
    Tunables.publish("Auto", m_autoChooser);
  }

  private void configureBindings() {
    // Left stick drives (field-relative); right stick X turns.
    // Every axis is negated: pushing a stick forward or left reads negative on an Xbox controller.
    m_robotDrive.setDefaultCommand(m_robotDrive.driveCommand(
        () -> -MathUtil.applyDeadband(m_driverController.getLeftY(), OIConstants.kDriveDeadband),
        () -> -MathUtil.applyDeadband(m_driverController.getLeftX(), OIConstants.kDriveDeadband),
        () -> -MathUtil.applyDeadband(m_driverController.getRightX(), OIConstants.kDriveDeadband)));

    // Right bumper: X-lock while held
    m_driverController.rightBumper().whileTrue(m_robotDrive.setXCommand());
    // Start: the robot now faces away from the driver
    m_driverController.start().onTrue(m_robotDrive.zeroHeadingCommand());
  }

  public Command getAutonomousCommand() {
    return m_autoChooser.getSelected();
  }
}
```

### Step 5: Robot.java
Two lines in `robotInit()`, before `new RobotContainer()`, and one after:

```java
    // Record everything published to NetworkTables, plus the Driver Station (Lesson 20)
    DataLogManager.start();
    DriverStation.startDataLog(DataLogManager.getLog());

    m_robotContainer = new RobotContainer();

    // Load PathPlanner's code now so the first auto path doesn't stutter (Lesson 19)
    CommandScheduler.getInstance().schedule(FollowPathCommand.warmupCommand());
```

### Step 6: Vision
Lesson 18's `VisionSubsystem` works on swerve with one change: its `m_drive` field and constructor take this `DriveSubsystem` (the swerve one) instead of the WCD's. It only calls `addVisionMeasurement`, which both have. The `aimAtTagCommand` from Lesson 18 is for a tank drive; on swerve, aim by giving `drive(...)` a rotation from the PID instead.

Swerve rotates on its own, so vision's heading is useful here: start with the code-camp rule `VecBuilder.fill(stdDev, stdDev, stdDev)`.

### Step 7: Check it on blocks
With the robot on blocks and the wheels free, enable and check one thing at a time:

| Do | Expect | If not |
|---|---|---|
| Disabled, look at the wheels after power-on | Nothing moves | |
| Enable, sticks centered | All four wheels hold their angle, no buzzing | Turning PID too high, or an encoder unplugged |
| Push left stick forward | All four wheels point **forward** and spin forward | A wheel pointing sideways: that module's zero or chassis offset. Spinning backward: drive direction. |
| Push left stick left | All four point **left** | Check the module order in `kDriveKinematics` |
| Right stick left | Wheels form a circle; the robot would turn **counterclockwise** | Rotation sign |
| Right bumper | X pattern | |
| AdvantageScope **Swerve** tab | Desired and measured arrows match | That module's PID or wiring |

Then on the floor: drive field-relative, turn the robot around, and check "forward" still means away from you. Press **Start** facing away, and check again on a **red** practice setting in the Driver Station.

## Try it
- [ ] Look at the drive motors and fix `kDrivingFreeSpeedRpm` if they aren't Vortexes
- [ ] Weigh the robot and enter the real numbers in PathPlanner's Robot Config
- [ ] Run the on-blocks checklist
- [ ] Drag the module states onto AdvantageScope's Swerve tab while driving
- [ ] Run the team's `autotest` auto from the Elastic menu
- [ ] Challenge: add a button that drives robot-relative while held, for lining up with a game piece

## Check yourself
??? question "Where do the drive and turn PID loops run on a MAXSwerve module?"
    On the SPARKs, not the roboRIO. `setSetpoint(..., ControlType.kVelocity)` and `kPosition` send targets to the motor controllers.

??? question "Why does the template need four 'chassis angular offsets'?"
    Every module is zeroed the same way before mounting, then bolted on facing a different direction. The offset turns each module's zero into the robot's forward.

??? question "Why use the Vortex's free speed instead of the NEO's?"
    The drive feedforward and the max speed are calculated from the drive motor's free speed. Using the wrong motor makes every speed command wrong.

??? question "Why reset the pose's heading instead of the Pigeon?"
    Resetting the Pigeon makes its reading jump, so odometry (and PathPlanner and vision) think the robot spun. Changing the pose's heading changes only what "forward" means.

??? question "Why add 180° to the heading for field-relative driving on red?"
    The field's +X points away from the blue wall. A red driver's "forward" is toward the blue wall, which is the field's −X.

<p class="credit">Code adapted from REV Robotics' <a href="https://github.com/REVrobotics/MAXSwerve-Java-Template">MAXSwerve Java Template</a> (© REV Robotics, BSD 3-Clause) and the team's copy with PathPlanner added.</p>
