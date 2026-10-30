# 10. Drivetrain Project: Teleop

## Why it matters
This is where everything so far comes together. Over the next two lessons you'll build a complete drivetrain in simulation:

- a `Drivetrain` subsystem with motors and encoders
- driver controls with deadband, curved response, and slow mode
- autonomous routines, first timed and then by distance (Lesson 11)

The drivetrain is the most important mechanism on the robot. If the robot can't drive well, nothing else matters.

## Read this
- [Using the WPILib Drive Classes](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/motors/wpi-drive-classes.html)
- [Joysticks](https://docs.wpilib.org/en/stable/docs/software/basic-programming/joystick.html)
- [Using Motor Controllers in Code](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/motors/using-motor-controllers.html)

## Walkthrough

### Drivetrain types
| Type | How it moves | Notes |
|---|---|---|
| **Tank / differential** | Left and right sides, like a tank. Turns by driving the sides at different speeds. | Simple, strong, cheap. Can't move sideways. This lesson uses it. |
| **Swerve** | Each wheel steers and drives independently | Moves in any direction while turning. Most competitive teams use it now, but it's much more complex. See [Where to Go Next](../reference/next-steps.md). |
| **Mecanum** | Special rollers on each wheel allow sideways motion | Easier than swerve, but easy to push around |

Learn tank drive first. The ideas (subsystem structure, joystick processing, default commands) carry straight over to swerve.

### Arcade vs. tank controls
There are two common ways to drive a differential drivetrain with a controller:

| Style | Controls | Feels like |
|---|---|---|
| **Arcade** | One stick forward/back, the other stick (or the same one) turns | A video game. Most drivers prefer it. |
| **Tank** | Left stick drives the left side, right stick drives the right side | Steering a tank. Precise, but takes practice. |

This lesson uses arcade. Try both and ask your drivers what they like.

### Step 1: Constants
Put every port and number in `Constants.java` first:

```java
public final class Constants {
    public static final class DriveConstants {
        public static final int LEFT_MOTOR_PORT = 0;
        public static final int RIGHT_MOTOR_PORT = 1;
        public static final int[] LEFT_ENCODER_PORTS = {0, 1};
        public static final int[] RIGHT_ENCODER_PORTS = {2, 3};

        public static final double WHEEL_DIAMETER_METERS = 0.1524;  // 6 in
        public static final double ENCODER_PULSES_PER_REV = 2048;
        public static final double METERS_PER_PULSE =
            Math.PI * WHEEL_DIAMETER_METERS / ENCODER_PULSES_PER_REV;
    }

    public static final class OIConstants {
        public static final int DRIVER_PORT = 0;
        public static final double DEADBAND = 0.08;
        public static final double SLOW_MODE_SCALE = 0.4;
    }
}
```

This example puts the encoders on the wheel shafts, so there's no gear ratio in the conversion.

### Step 2: The Drivetrain subsystem
```java
package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import edu.wpi.first.wpilibj.Encoder;
import edu.wpi.first.wpilibj.drive.DifferentialDrive;
import edu.wpi.first.wpilibj.motorcontrol.PWMSparkMax;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.DriveConstants;

public class Drivetrain extends SubsystemBase {
    private final PWMSparkMax left = new PWMSparkMax(DriveConstants.LEFT_MOTOR_PORT);
    private final PWMSparkMax right = new PWMSparkMax(DriveConstants.RIGHT_MOTOR_PORT);
    private final DifferentialDrive drive = new DifferentialDrive(left, right);

    private final Encoder leftEncoder = new Encoder(
        DriveConstants.LEFT_ENCODER_PORTS[0], DriveConstants.LEFT_ENCODER_PORTS[1]);
    private final Encoder rightEncoder = new Encoder(
        DriveConstants.RIGHT_ENCODER_PORTS[0], DriveConstants.RIGHT_ENCODER_PORTS[1]);

    public Drivetrain() {
        // The two sides face opposite directions, so one must be inverted
        // for "forward" to mean forward on both.
        right.setInverted(true);

        leftEncoder.setDistancePerPulse(DriveConstants.METERS_PER_PULSE);
        rightEncoder.setDistancePerPulse(DriveConstants.METERS_PER_PULSE);
        rightEncoder.setReverseDirection(true);
    }

    /** Average distance driven by both sides, in meters. */
    public double getDistanceMeters() {
        return (leftEncoder.getDistance() + rightEncoder.getDistance()) / 2.0;
    }

    public void resetEncoders() {
        leftEncoder.reset();
        rightEncoder.reset();
    }

    /** Arcade drive: one value for forward/back, one for turning. */
    public Command arcadeDrive(DoubleSupplier forward, DoubleSupplier rotation) {
        return run(() -> drive.arcadeDrive(forward.getAsDouble(), rotation.getAsDouble()))
            .withName("Arcade Drive");
    }

    @Override
    public void periodic() {
        SmartDashboard.putNumber("Drive/Left (m)", leftEncoder.getDistance());
        SmartDashboard.putNumber("Drive/Right (m)", rightEncoder.getDistance());
        SmartDashboard.putNumber("Drive/Left Output", left.get());
        SmartDashboard.putNumber("Drive/Right Output", right.get());
    }
}
```

!!! question "Why `DoubleSupplier` instead of `double`?"
    A `double` would be read **once**, when the command is created at robot startup, and the robot would drive at that one value forever. A `DoubleSupplier` is a lambda that reads the joystick **every loop**. This is the lambda idea from [Lesson 3](../foundations/03-java.md) paying off.

### What `DifferentialDrive` does for you
`arcadeDrive(forward, rotation)` turns two inputs into left and right motor outputs. Roughly:

```
left  = forward − rotation
right = forward + rotation
```

A positive rotation is counterclockwise (turning left), so it slows the left side and speeds up the right.

…then scales them so neither goes past ±1. It also includes **motor safety**: if your code stops calling it (because something blocked the loop), it stops the motors after a short timeout instead of driving off at the last speed.

By default, `arcadeDrive` also **squares the inputs**, which gives finer control at low speed. More on that below.

### Step 3: Make it the default command
In `RobotContainer.java`:

```java
private final Drivetrain drivetrain = new Drivetrain();
private final CommandXboxController driver =
    new CommandXboxController(OIConstants.DRIVER_PORT);

public RobotContainer() {
    drivetrain.setDefaultCommand(
        drivetrain.arcadeDrive(
            () -> -driver.getLeftY(),    // forward is negative Y on Xbox sticks
            () -> -driver.getRightX()    // positive rotation = counterclockwise = left
        )
    );
    configureBindings();
}
```

A **default command** runs whenever nothing else is using the subsystem, so the robot always responds to the sticks. When an autonomous command or an "auto-align" button takes over the drivetrain, the default command pauses, then comes back when that command ends. ([Lesson 7.1](../robot-code/07b-scheduler.md) explains how.)

!!! info "Why the minus signs?"
    Xbox controllers report pushing a stick **forward** as **negative** Y, and pushing it **right** as positive X. WPILib's convention is forward-positive and counterclockwise (left)-positive. Negating both makes forward drive forward and left turn left.

### Step 4: Clean up the joystick input
Raw joystick values have two problems drivers notice right away.

**Problem 1: stick drift.** A stick resting in the middle rarely reads exactly 0. It reads something like 0.03, and the robot creeps. The fix is a **deadband**: treat anything close to 0 as 0.

```java
MathUtil.applyDeadband(0.03, 0.08);   // 0.0  (inside the deadband)
MathUtil.applyDeadband(0.50, 0.08);   // about 0.46 (rescaled so it still reaches 1.0)
```

**Problem 2: too twitchy at low speed.** With a straight-line response, small stick movements produce big speed changes, which makes lining up hard. **Squaring** the input (keeping its sign) gives fine control near the middle and full speed at the edge:

| Stick | Linear output | Squared output |
|---|---|---|
| 0.2 | 0.20 | 0.04 |
| 0.5 | 0.50 | 0.25 |
| 0.8 | 0.80 | 0.64 |
| 1.0 | 1.00 | 1.00 |

`DifferentialDrive.arcadeDrive` squares inputs by default, so with it you only need the deadband. If you process inputs yourself, square them with `Math.copySign(x * x, x)`.

Put the processing in one helper so both axes get the same treatment:

```java
private static double processAxis(double raw) {
    return MathUtil.applyDeadband(raw, OIConstants.DEADBAND);
}
```

```java
drivetrain.setDefaultCommand(
    drivetrain.arcadeDrive(
        () -> -processAxis(driver.getLeftY()),
        () -> -processAxis(driver.getRightX())
    )
);
```

### Step 5: Slow mode
Drivers want precise control when lining up to score. A common pattern: hold a button to scale everything down.

```java
private double speedScale() {
    return driver.rightBumper().getAsBoolean() ? OIConstants.SLOW_MODE_SCALE : 1.0;
}
```

```java
drivetrain.setDefaultCommand(
    drivetrain.arcadeDrive(
        () -> -processAxis(driver.getLeftY()) * speedScale(),
        () -> -processAxis(driver.getRightX()) * speedScale()
    )
);
```

Because the suppliers run every loop, slow mode switches on and off the instant the bumper changes. No extra command needed.

### Step 6: Simulate it
Out of the box, the encoders won't move in simulation. To see the robot drive on a field, add a `DifferentialDrivetrainSim` and `Field2d`. The WPILib **SimpleDifferentialDriveSimulation** example has a full working version to copy. For now, check in the Sim GUI that:

- pushing the left stick forward moves both **PWM** outputs (the right one may show the opposite sign because it's inverted, which is correct: it's the same physical direction)
- pushing the right stick right makes left go up and right go down
- releasing the sticks returns both to exactly 0

### Testing on a real robot
!!! danger "Put it on blocks first"
    The first time new drive code runs, put the robot **on blocks** so the wheels are off the ground. Check that:

    1. Forward on the stick spins every wheel forward.
    2. Turning left spins the left side backward and the right side forward.
    3. Letting go stops everything.

    Only then put it on the floor, in open space, at low speed.

If one side spins backward, fix the motor **inversion**, not the joystick sign.

## Try it
!!! tip "Have the West Coast Drive?"
    [Lab 2: Drive a West Coast Drive](../testbed/lab2-west-coast-drive.md) builds this same drivetrain on a real robot with SPARK MAXes.

- [ ] Build the `Drivetrain` subsystem and make `arcadeDrive` its default command
- [ ] Drive in Sim GUI with a controller or keyboard, and check the outputs against the list in Step 6
- [ ] Add the deadband. Release the sticks and confirm the outputs are exactly 0.
- [ ] Add slow mode on the right bumper
- [ ] Add a `tankDrive` command and a `toggleOnTrue` button that switches between arcade and tank. Ask a driver which they prefer.
- [ ] Challenge: open the **SimpleDifferentialDriveSimulation** example and drive the simulated robot around a field

## Check yourself
??? question "Why is one side's motor inverted?"
    The motors on each side face opposite directions. Without inverting one, "forward" on both sides would spin the robot in place.

??? question "Why negate `getLeftY()`?"
    Xbox controllers report pushing the stick forward as **negative** Y, and WPILib expects forward to be positive.

??? question "What does a deadband fix?"
    Sticks rarely read exactly 0 at rest. The deadband treats small values as 0, so the robot doesn't creep.

??? question "Why does squaring the input help drivers?"
    It makes small stick movements produce even smaller outputs, giving fine control at low speed while still reaching full speed at full stick.

??? question "Why does `arcadeDrive` take `DoubleSupplier`s instead of `double`s?"
    A `double` is read once when the command is created. A supplier is called every loop, so the robot follows the joystick as it moves.

??? question "What happens to the default drive command when an autonomous command uses the drivetrain?"
    It's interrupted while the autonomous command runs, then restarted automatically when that command ends.
