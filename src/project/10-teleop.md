# 10.1 Teleop on the XRP

## Why it matters
This is where everything so far comes together. Over this lesson and the next you'll build a complete drivetrain on your own XRP ([Lesson 10](10-xrp.md)):

- an `XRPDrivetrain` subsystem with motors, encoders, and the gyro, in real units
- driver controls with a deadband, smooth low-speed response, and slow mode
- a simulation, so you can test it without the robot
- autonomous routines, first timed and then by distance and angle ([Lesson 10.2](11-autonomous.md))

The drivetrain is the most important mechanism on any robot. If the robot can't drive well, nothing else matters. And every idea here (subsystem structure, joystick processing, default commands) works exactly the same on a full-size robot.

## Read this
- [Using the WPILib Drive Classes](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/motors/wpi-drive-classes.html)
- [Joysticks](https://docs.wpilib.org/en/stable/docs/software/basic-programming/joystick.html)
- [Programming the XRP (WPILib)](https://docs.wpilib.org/en/stable/docs/xrp-robot/programming-xrp.html)

## Walkthrough

### Drivetrain types
| Type | How it moves | Notes |
|---|---|---|
| **Tank / differential** | Left and right sides, like a tank. Turns by driving the sides at different speeds. | Simple, strong, cheap. Can't move sideways. The XRP and the team's West Coast Drive are both this kind. |
| **Swerve** | Each wheel steers and drives independently | Moves in any direction while turning. Most competitive teams use it. See [Lesson 21](../going-further/21-swerve.md). |
| **Mecanum** | Special rollers on each wheel allow sideways motion | Easier than swerve, but easy to push around |

Learn tank drive first. The ideas carry straight over to swerve.

### Arcade vs. tank controls
| Style | Controls | Feels like |
|---|---|---|
| **Arcade** | One stick forward/back, and a stick turns | A video game. Most drivers prefer it. |
| **Tank** | Left stick drives the left side, right stick the right side | Steering a tank. Precise, but takes practice. |

This lesson uses arcade on **one stick** (the left stick: up/down drives, left/right turns), because it works with both an Xbox controller and the keyboard in the Sim GUI. Try two-stick arcade and tank too, and ask your drivers.

### Step 1: Copy in the telemetry library
In the `XRPDrive` project from [Lesson 10](10-xrp.md#step-4-make-an-xrp-project), copy the course's five telemetry files into `src/main/java/frc/robot/telemetry/`, exactly as in [Lab 1.1](../testbed/lab1b-dashboard.md). They send values to Elastic and AdvantageScope.

### Step 2: Constants
Replace `Constants.java` with this. Every XRP number lives here, in **meters**:

```java
package frc.robot;

public final class Constants {
  public static final class DriveConstants {
    // The XRP's motor channels and encoder DIO pins are fixed on the board
    public static final int kLeftMotorChannel = 0;
    public static final int kRightMotorChannel = 1;
    public static final int kLeftEncoderA = 4;
    public static final int kLeftEncoderB = 5;
    public static final int kRightEncoderA = 6;
    public static final int kRightEncoderB = 7;

    // Gearbox and encoder: 12 counts per motor turn x 48.75:1 = 585 counts per wheel turn
    public static final double kGearRatio = (30.0 / 14.0) * (28.0 / 16.0) * (36.0 / 9.0) * (26.0 / 8.0);
    public static final double kCountsPerWheelRev = 12.0 * kGearRatio;

    // Wheels and chassis
    public static final double kWheelDiameterMeters = 0.060;   // 60 mm
    public static final double kTrackWidthMeters = 0.155;      // 155 mm between the wheels
    public static final double kMetersPerCount = Math.PI * kWheelDiameterMeters / kCountsPerWheelRev;

    // About how fast a wheel goes at full output (90 RPM, no load). Only the simulation uses it.
    public static final double kMaxSpeedMetersPerSecond = 90.0 / 60.0 * Math.PI * kWheelDiameterMeters;
  }

  public static final class ArmConstants {
    public static final int kServoChannel = 4;   // the XRP's Servo 1 port
  }

  public static final class OIConstants {
    public static final int kDriverControllerPort = 0;
    public static final double kDeadband = 0.08;
    public static final double kSlowModeScale = 0.5;
  }
}
```

`kMetersPerCount` works out to about **0.00032 m** (a third of a millimeter) per encoder count. The full-speed number is about **0.28 m/s**: the XRP is slow, which makes it a safe robot to learn on.

### Step 3: The drivetrain subsystem
The template came with `subsystems/XRPDrivetrain.java`. Replace it with this:

```java
package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import edu.wpi.first.hal.SimDouble;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.DifferentialDriveOdometry;
import edu.wpi.first.wpilibj.Encoder;
import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.drive.DifferentialDrive;
import edu.wpi.first.wpilibj.simulation.EncoderSim;
import edu.wpi.first.wpilibj.simulation.SimDeviceSim;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj.xrp.XRPGyro;
import edu.wpi.first.wpilibj.xrp.XRPMotor;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants.DriveConstants;
import frc.robot.telemetry.Telemetry;
import frc.robot.telemetry.TelemetryTable;

public class XRPDrivetrain extends SubsystemBase {
  // The two drive motors. XRP motors use XRPMotor, not PWMSparkMax.
  private final XRPMotor m_leftMotor = new XRPMotor(DriveConstants.kLeftMotorChannel);
  private final XRPMotor m_rightMotor = new XRPMotor(DriveConstants.kRightMotorChannel);

  // DifferentialDrive turns "forward and turn" into left and right outputs
  private final DifferentialDrive m_drive = new DifferentialDrive(m_leftMotor::set, m_rightMotor::set);

  // The encoders on each drive motor, and the XRP's gyro
  private final Encoder m_leftEncoder =
      new Encoder(DriveConstants.kLeftEncoderA, DriveConstants.kLeftEncoderB);
  private final Encoder m_rightEncoder =
      new Encoder(DriveConstants.kRightEncoderA, DriveConstants.kRightEncoderB);
  private final XRPGyro m_gyro = new XRPGyro();

  // Where the robot is, from the encoders and gyro (Lesson 17 explains odometry)
  private final DifferentialDriveOdometry m_odometry;
  private final Field2d m_field = new Field2d();

  private final TelemetryTable m_telemetry = Telemetry.getTable("Drive");

  public XRPDrivetrain() {
    // The right motor spins backward for positive output, so invert it
    m_rightMotor.setInverted(true);

    // After this, getDistance() is in meters
    m_leftEncoder.setDistancePerPulse(DriveConstants.kMetersPerCount);
    m_rightEncoder.setDistancePerPulse(DriveConstants.kMetersPerCount);

    m_odometry = new DifferentialDriveOdometry(m_gyro.getRotation2d(), getLeftMeters(), getRightMeters());
    SmartDashboard.putData("Field", m_field);
  }

  /** Arcade drive: one value for forward/back, one for turning (counterclockwise is positive). */
  public Command arcadeDriveCommand(DoubleSupplier forward, DoubleSupplier rotation) {
    return run(() -> m_drive.arcadeDrive(forward.getAsDouble(), rotation.getAsDouble()))
        .withName("Arcade Drive");
  }

  /** Drives without squaring the inputs, for autonomous (Lesson 10.2). */
  public void arcadeDriveRaw(double forward, double rotation) {
    m_drive.arcadeDrive(forward, rotation, false);
  }

  public void stop() {
    m_drive.stopMotor();
  }

  public double getLeftMeters() {
    return m_leftEncoder.getDistance();
  }

  public double getRightMeters() {
    return m_rightEncoder.getDistance();
  }

  /** How far the robot has driven: the average of both sides, in meters. */
  public double getAverageMeters() {
    return (getLeftMeters() + getRightMeters()) / 2.0;
  }

  /** Heading in degrees. Turning left (counterclockwise) makes it go up. */
  public double getHeadingDegrees() {
    return m_gyro.getRotation2d().getDegrees();
  }

  public Pose2d getPose() {
    return m_odometry.getPoseMeters();
  }

  /** Puts the robot back at (0, 0) facing 0° on the field map. Works while disabled. */
  public Command resetPoseCommand() {
    return runOnce(() -> m_odometry.resetPosition(
            m_gyro.getRotation2d(), getLeftMeters(), getRightMeters(), Pose2d.kZero))
        .ignoringDisable(true)
        .withName("Reset Pose");
  }

  @Override
  public void periodic() {
    m_odometry.update(m_gyro.getRotation2d(), getLeftMeters(), getRightMeters());
    m_field.setRobotPose(getPose());

    m_telemetry.log("Left Output", m_leftMotor.get());
    // The inverted right motor reports its real spin direction; flip it so forward is + on both sides
    m_telemetry.log("Right Output", -m_rightMotor.get());
    m_telemetry.log("Left (m)", getLeftMeters());
    m_telemetry.log("Right (m)", getRightMeters());
    m_telemetry.log("Heading (deg)", getHeadingDegrees());
    m_telemetry.log("Pose", getPose());
  }

  // ------------------------------------------------------------------ simulation (Step 6)

  // True when the XRP Client is running, meaning a real XRP is sending real sensor readings
  private static final boolean kRealXRP = isXRPClientRunning();

  private final EncoderSim m_leftEncoderSim = new EncoderSim(m_leftEncoder);
  private final EncoderSim m_rightEncoderSim = new EncoderSim(m_rightEncoder);
  private final SimDouble m_gyroAngleSim = new SimDeviceSim("Gyro:XRPGyro").getDouble("angle_z");
  private double m_simHeadingDegrees = 0.0;

  /** Without a real XRP, pretend the wheels move as fast as the motors are told to go. */
  @Override
  public void simulationPeriodic() {
    if (kRealXRP) {
      return;   // the real XRP is sending its real encoders and gyro: don't overwrite them
    }
    double dt = TimedRobot.kDefaultPeriod;   // 0.02 s
    // get() reports each motor's physical direction, so the inverted right motor reads backward
    double leftSpeed = m_leftMotor.get() * DriveConstants.kMaxSpeedMetersPerSecond;
    double rightSpeed = -m_rightMotor.get() * DriveConstants.kMaxSpeedMetersPerSecond;

    m_leftEncoderSim.setDistance(m_leftEncoderSim.getDistance() + leftSpeed * dt);
    m_rightEncoderSim.setDistance(m_rightEncoderSim.getDistance() + rightSpeed * dt);

    // Turning: the difference between the sides, divided by the track width, is radians per second
    m_simHeadingDegrees +=
        Math.toDegrees((rightSpeed - leftSpeed) / DriveConstants.kTrackWidthMeters * dt);
    m_gyroAngleSim.set(m_simHeadingDegrees);
  }

  /** WPILib lists the simulation extensions you chose in HALSIM_EXTENSIONS. */
  private static boolean isXRPClientRunning() {
    String extensions = System.getenv("HALSIM_EXTENSIONS");
    return extensions != null && extensions.contains("halsim_xrp");
  }
}
```

!!! question "Why `DoubleSupplier` instead of `double`?"
    A `double` would be read **once**, when the command is created at startup, and the robot would drive at that one value forever. A `DoubleSupplier` is a lambda that reads the joystick **every loop**. This is the lambda idea from [Lesson 3](../foundations/03-java.md) paying off.

### What `DifferentialDrive` does for you
`arcadeDrive(forward, rotation)` turns two inputs into left and right motor outputs. Roughly:

```
left  = forward − rotation
right = forward + rotation
```

A positive rotation is counterclockwise (turning left), so it slows the left side and speeds up the right. Then it scales them so neither goes past ±1.

It also includes **motor safety**: if your code stops calling it (because something blocked the loop), it stops the motors after a short timeout instead of driving off at the last speed. And by default it **squares the inputs**, for finer control at low speed (Step 5).

### Step 4: Make it the default command
Replace `RobotContainer.java` with this:

```java
package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj.xrp.XRPOnBoardIO;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.Trigger;

import frc.robot.Constants.OIConstants;
import frc.robot.subsystems.XRPDrivetrain;

public class RobotContainer {
  // The robot's subsystems and the XRP's USER button and LED
  private final XRPDrivetrain m_drivetrain = new XRPDrivetrain();
  private final XRPOnBoardIO m_onboardIO = new XRPOnBoardIO();

  // An Xbox controller, or the Sim GUI's keyboard, in Joystick 0
  private final CommandXboxController m_driver =
      new CommandXboxController(OIConstants.kDriverControllerPort);

  public RobotContainer() {
    configureBindings();
  }

  private void configureBindings() {
    // One-stick arcade: left stick up/down drives, left/right turns.
    // Both are negated: pushing a stick forward or left reads negative.
    m_drivetrain.setDefaultCommand(m_drivetrain.arcadeDriveCommand(
        () -> -processAxis(m_driver.getLeftY()) * speedScale(),
        () -> -processAxis(m_driver.getLeftX()) * speedScale()));

    // The XRP's USER button puts the robot back at the start of the field map
    new Trigger(m_onboardIO::getUserButtonPressed).onTrue(m_drivetrain.resetPoseCommand());
  }

  /** Deadband: treat a stick that's almost centered as exactly centered. */
  private static double processAxis(double raw) {
    return MathUtil.applyDeadband(raw, OIConstants.kDeadband);
  }

  /** Slow mode: hold the right bumper for fine control. */
  private double speedScale() {
    return m_driver.rightBumper().getAsBoolean() ? OIConstants.kSlowModeScale : 1.0;
  }

  public Command getAutonomousCommand() {
    return Commands.none();   // Lesson 10.2
  }
}
```

A **default command** runs whenever nothing else is using the subsystem, so the robot always responds to the stick. When an autonomous command takes over the drivetrain, the default command pauses, then comes back when that command ends. ([Lesson 7.1](../robot-code/07b-scheduler.md) explains how.)

!!! info "Why the minus signs?"
    Xbox controllers report pushing a stick **forward** as **negative** Y, and pushing it **left** as **negative** X. WPILib's convention is forward-positive and counterclockwise (left)-positive. Negating both makes forward drive forward and left turn left.

### Step 5: Clean up the joystick input
That `RobotContainer` already has two driver-friendly fixes. Here's why each is there.

**Stick drift.** A stick resting in the middle rarely reads exactly 0. It reads something like 0.03, and the robot creeps. The **deadband** treats anything close to 0 as 0:

```java
MathUtil.applyDeadband(0.03, 0.08);   // 0.0  (inside the deadband)
MathUtil.applyDeadband(0.50, 0.08);   // about 0.46 (rescaled so it still reaches 1.0)
```

**Too twitchy at low speed.** With a straight-line response, small stick movements make big speed changes. **Squaring** the input (keeping its sign) gives fine control near the middle and full speed at the edge:

| Stick | Linear output | Squared output |
|---|---|---|
| 0.2 | 0.20 | 0.04 |
| 0.5 | 0.50 | 0.25 |
| 0.8 | 0.80 | 0.64 |
| 1.0 | 1.00 | 1.00 |

`arcadeDrive` squares the inputs for you, so the code only adds the deadband.

**Slow mode.** Holding the right bumper halves everything. Because the suppliers run every loop, slow mode switches on and off the instant the bumper changes. No extra command needed.

### Step 6: Simulate it
Run it with the **XRP Client off** ([Lesson 10](10-xrp.md#step-5-simulate-with-no-xrp)). The bottom half of `XRPDrivetrain` (`simulationPeriodic`) runs only in simulation: when there's no real XRP, it moves the encoders and gyro as if the wheels turned at the speed the motors were told. It's a rough model (no acceleration, no slipping), but enough to test your code.

1. In the Sim GUI, set **Teleoperated** and drive with the keyboard (W/S and A/D).
2. Open **NetworkTables → SmartDashboard → Field** to see the robot move on a field map. (Or use Elastic's Field widget, with Elastic set to **localhost**.)
3. Check:

| Do | Expect |
|---|---|
| Push forward | **Left Output** and **Right Output** (under Telemetry → Drive) both go positive. Under **Other Devices**, `motorR` shows negative: that's the real motor, spinning backward because it's inverted. The robot moves right on the field map. |
| Turn left | Left output goes down, right goes up; heading goes **up** |
| Let go | Both outputs return to exactly 0 |
| Hold the right bumper | Everything moves at half speed |

When the XRP Client is **on**, `simulationPeriodic` does nothing, so the real encoders and gyro aren't overwritten.

### Step 7: Drive the real XRP
!!! danger "Wheels off the table first"
    The first time new drive code runs, hold the XRP or set it on a block so the wheels are off the table. Check that:

    1. Forward on the stick spins both wheels forward.
    2. Turning left spins the left wheel backward and the right wheel forward.
    3. Letting go stops everything.

    Only then put it on the floor, in open space.

Run with the **XRP Client on**. Then on the floor, check the sensors against reality:

| Do | Expect | If not |
|---|---|---|
| Drive forward | **Left (m)** and **Right (m)** both go up | Encoder counting backward: `setReverseDirection(true)` on that encoder |
| Push the robot exactly 0.5 m along a ruler | Both read about 0.50 | Check `kMetersPerCount` |
| Turn the robot left by hand | **Heading** goes up | Gyro sign is flipped: negate it in `getHeadingDegrees()` and the odometry |
| A wheel spins the wrong way | | Fix the motor **inversion**, not the joystick sign |

## Try it
!!! tip "Have the West Coast Drive?"
    [Lab 2](../testbed/lab2-west-coast-drive.md) builds the same kind of drivetrain on the full-size robot with SPARK MAXes and CIMs.

- [ ] Build `XRPDrivetrain` and make arcade drive its default command
- [ ] Drive in simulation with the keyboard and check the table in Step 6
- [ ] Drive the real XRP with the wheels off the table, then on the floor
- [ ] Check the encoders against a ruler and the heading against a hand turn
- [ ] Add a `tankDriveCommand` and a button that switches between arcade and tank. Ask a driver which they prefer.
- [ ] Challenge: two-stick arcade, turning with the right stick. (With the keyboard, map an extra axis in the Sim GUI's keyboard settings.)
- [ ] Challenge: turn the XRP's green LED on when the robot is enabled (`m_onboardIO.setLed(...)` and `RobotModeTriggers.teleop()`)

## Check yourself
??? question "Why is the right motor inverted?"
    The two motors face opposite directions. Without inverting one, "forward" on both would spin the robot in place.

??? question "Why negate `getLeftY()`?"
    Xbox controllers report pushing the stick forward as **negative** Y, and WPILib expects forward to be positive.

??? question "What does a deadband fix?"
    Sticks rarely read exactly 0 at rest. The deadband treats small values as 0, so the robot doesn't creep.

??? question "Why does squaring the input help drivers?"
    Small stick movements produce even smaller outputs, giving fine control at low speed while still reaching full speed at full stick.

??? question "Why does `simulationPeriodic` check whether the XRP Client is running?"
    With a real XRP, the encoders and gyro come from the robot. The fake physics would overwrite them with made-up values.

??? question "What happens to the default drive command when an autonomous command uses the drivetrain?"
    It's interrupted while the autonomous command runs, then restarted automatically when that command ends.

<p class="credit">XRP channel numbers and gearing are from WPILib's XRP documentation (CC BY 4.0) and its XRP project template (WPILib BSD license).</p>
