# 8. Sensors & Units

## Why it matters
To control something, you have to **measure** it. You can't hold an arm at 90° if you don't know where the arm is, drive 2 meters if you don't know how far you've gone, or stop the intake when it's full if nothing can see the game piece.

Sensors turn the physical world into numbers your code can use. Getting those numbers into the **right units** is half the job, and getting it wrong is one of the most common sources of robot bugs.

## Read this
- [Encoders – Software](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/sensors/encoders-software.html)
- [Gyroscopes – Software](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/sensors/gyros-software.html)
- [Digital Inputs (limit switches)](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/sensors/digital-inputs-software.html)
- [Java Units Library](https://docs.wpilib.org/en/stable/docs/software/basic-programming/java-units.html)

## Walkthrough

### Common FRC sensors

| Sensor | Measures | Output | Typical use |
|---|---|---|---|
| **Encoder** | Rotation of a shaft | Position and velocity | Drive distance, arm angle, flywheel speed |
| **Absolute encoder** | The shaft's angle, even right after power-on | Angle | Arm angle, swerve module direction |
| **Gyro / IMU** | Robot rotation | Heading (yaw), sometimes pitch and roll | Driving straight, field-relative swerve |
| **Limit switch** | Pressed or not | `true` / `false` | Hard stops, homing an elevator |
| **Beam break** | Something blocks a light beam | `true` / `false` | "Do we have a game piece?" |
| **Distance sensor** (time-of-flight, ultrasonic) | Distance to an object | Distance | Detecting game pieces, measuring to a wall |
| **Camera** | Images, AprilTags, game pieces | Targets and poses | Aiming, pose estimation (later lessons) |

### Digital sensors: limit switches and beam breaks
These are the simplest: `true` or `false`, read from a **DIO** port.

```java
private final DigitalInput armDownSwitch = new DigitalInput(1);

public boolean isArmDown() {
    return !armDownSwitch.get();
}
```

{% hint style="warning" %}
**Which way is pressed?**

Many switches are wired so that `get()` returns `true` when **not** pressed and `false` when pressed. That's why the example uses `!`. Don't guess: press the switch and watch the value on the dashboard, then write the method so the name tells the truth.
{% endhint %}

Name methods for what they **mean** (`isArmDown()`, `hasGamePiece()`), not for the hardware (`getSwitch1()`). Everywhere else in the code reads more clearly.

### Encoders: relative vs. absolute

| | Relative (incremental) encoder | Absolute encoder |
|---|---|---|
| What it reports | How far it has turned **since power-on or the last reset** | The **actual angle** of the shaft, always |
| After power-on | Reads 0, wherever the mechanism is | Reads the real angle |
| Good for | Wheels, flywheels, elevators with a homing switch | Arms, wrists, swerve module steering |
| Examples | Motor built-in encoders, quadrature encoders | Through Bore Encoder (absolute mode), CANcoder |

{% hint style="danger" %}
**Relative encoders and arms**

If an arm uses a relative encoder, it reads 0 at power-on **wherever the arm happens to be**. Turn the robot on with the arm halfway up, and your code thinks halfway up is 0°. Either start the robot with the mechanism in a known position every time, home it against a limit switch, or use an absolute encoder.
{% endhint %}

Most modern motors (Kraken, Falcon, NEO) have an encoder built in, read through the vendor library. Separate encoders can be wired to DIO ports or the CAN bus.

### Encoders count rotations: conversion factors
An encoder reports how far a shaft turned, usually in **rotations** of the motor. To get something useful (meters, degrees), multiply by a **conversion factor** that accounts for gearing and wheel size.

**Example 1: drivetrain wheel**

- Gear ratio: 8:1 (the motor turns 8 times for every 1 turn of the wheel)
- Wheel diameter: 4 in = 0.1016 m
- Circumference: π × 0.1016 ≈ 0.319 m

```
wheel rotations   = motor rotations / 8
meters traveled   = wheel rotations × 0.319
meters per motor rotation = 0.319 / 8 ≈ 0.0399
```

So if the motor encoder reads 50 rotations, the robot has driven about 50 × 0.0399 ≈ **2.0 m**.

**Example 2: arm**

- Gear ratio: 60:1 from motor to arm
- One arm rotation = 360°

```
degrees per motor rotation = 360 / 60 = 6°
```

If the motor encoder reads 15 rotations, the arm has moved 15 × 6 = **90°**.

{% hint style="success" %}
**Gear ratios multiply**

A 5:1 gearbox followed by a 3:1 chain reduction is 5 × 3 = **15:1** total. Ask the mechanical team for every stage.
{% endhint %}

**Velocity** uses the same factor. Motor encoders often report rotations per **minute** or per **second**, so check the vendor docs and convert to per second:

```
wheel speed (m/s) = motor RPM / 60 × meters per motor rotation
```

### Write the math once, in Constants
Never scatter magic numbers through your code. Put each one in `Constants.java` with its unit in the name:

```java
public final class Constants {
    public static final class DriveConstants {
        public static final double GEAR_RATIO = 8.0;
        public static final double WHEEL_DIAMETER_METERS = 0.1016;
        public static final double METERS_PER_MOTOR_ROTATION =
            (Math.PI * WHEEL_DIAMETER_METERS) / GEAR_RATIO;
    }

    public static final class ArmConstants {
        public static final double GEAR_RATIO = 60.0;
        public static final double DEGREES_PER_MOTOR_ROTATION = 360.0 / GEAR_RATIO;
    }
}
```

Then write subsystem methods that return real units, so nothing else in the code ever sees raw encoder values:

```java
public double getDistanceMeters() {
    return motorEncoderRotations() * DriveConstants.METERS_PER_MOTOR_ROTATION;
}
```

### A WPILib encoder example
WPILib's `Encoder` class reads a quadrature encoder on two DIO ports. You set the conversion once with `setDistancePerPulse`, and then `getDistance()` returns real units:

```java
private final Encoder armEncoder = new Encoder(2, 3);  // DIO 2 and 3

public Arm() {
    // A 2048-pulse encoder on the arm shaft: 360° / 2048 pulses
    armEncoder.setDistancePerPulse(360.0 / 2048.0);
}

public double getAngleDegrees() {
    return armEncoder.getDistance();
}

public double getVelocityDegPerSec() {
    return armEncoder.getRate();
}
```

Vendor motor encoders work the same way. Look up your controller's method for setting the conversion factor (for example, CTRE's `SensorToMechanismRatio` or REV's `positionConversionFactor`).

### Gyros
A gyro measures how much the robot has **rotated**. The value you'll use most is **yaw**, the robot's heading.

```java
public Rotation2d getHeading() {
    return gyro.getRotation2d();   // most WPILib-compatible gyros offer this
}
```

{% hint style="warning" %}
**Sign conventions**

WPILib's math assumes **counterclockwise is positive** when looking down at the robot. Some gyros report clockwise as positive. If turning left makes the heading go down, your code needs to flip the sign, or your odometry will be mirrored.
{% endhint %}

Gyros drift a little over time and are zeroed at power-on. Many teams add a driver button that resets the heading to 0 when the robot is facing away from the driver.

### Units: pick a system and stick to it
WPILib's math classes (kinematics, odometry, controllers, feedforward) assume **SI units**:

| Quantity | Use | Not |
|---|---|---|
| Distance | meters | inches, feet |
| Angle | radians (for math) | degrees (fine for display) |
| Time | seconds | milliseconds |
| Velocity | meters per second, radians per second | RPM, feet per second |

{% hint style="danger" %}
**Common mistake: mixing units**

The code runs fine, but every number is off. Inches passed where meters are expected are off by about 39×; degrees passed where radians are expected are off by about 57×. The robot drives or moves to completely wrong places with no error message.
{% endhint %}

Two habits prevent most unit bugs:

1. **Put the unit in the name:** `WHEEL_DIAMETER_METERS`, `getAngleRadians()`, `targetRpm`.
2. **Convert at the edges:** convert from vendor units as soon as you read a sensor, and to vendor units only when you set a motor. Everything in between uses SI.

WPILib also has helpers for conversions:

```java
Units.inchesToMeters(4.0);       // 0.1016
Units.degreesToRadians(90);      // 1.5708
Units.rotationsPerMinuteToRadiansPerSecond(6000);
```

WPILib's [Java Units Library](https://docs.wpilib.org/en/stable/docs/software/basic-programming/java-units.html) goes further, with types like `Distance` and `Angle` that make it a compile error to mix them up. Some vendor libraries use it directly.

### Check sensors before you trust them
Before writing any code that depends on a sensor, put it on the dashboard and check it by hand:

```java
@Override
public void periodic() {
    SmartDashboard.putNumber("Arm/Angle (deg)", getAngleDegrees());
    SmartDashboard.putBoolean("Arm/Down Switch", isArmDown());
}
```

- Move the mechanism by hand (robot disabled). Does the number change in the right **direction**?
- Move it a known amount, like exactly one rotation or 90°. Is the number **right**?
- Press the switch. Does the boolean change, and is it the value the method name promises?

## Try it
{% hint style="success" %}
**Have the test bed?**

Labs [4](../testbed/lab4-limit-switch.md) (limit switch), [5](../testbed/lab5-knob-speed.md) (potentiometer), [6](../testbed/lab6-encoder.md) (encoder), and [8](../testbed/lab8-navx-gyro.md) (gyro) put each sensor in this lesson on real hardware.
{% endhint %}

- [ ] For your team's drivetrain, get the gear ratio and wheel diameter, and calculate meters per motor rotation
- [ ] For your team's arm or elevator, calculate degrees (or meters) per motor rotation, including every gear stage
- [ ] Add both to `Constants.java` with units in the names
- [ ] Add a limit switch to a subsystem with a method named for what it means. In the Sim GUI, toggle its DIO and watch your boolean on the dashboard.
- [ ] On a real robot (with a mentor), put an encoder value on the dashboard, move the mechanism by hand, and check the direction and scale

## Check yourself
<details>
<summary>Why use a conversion factor instead of raw encoder counts?</summary>

Raw counts depend on the encoder and gearing. Converting gives real units (meters, degrees) you can reason about and use with WPILib's math.

</details>

<details>
<summary>A drivetrain has a 10:1 gear ratio and 6-inch wheels. How far does the robot move per motor rotation?</summary>

Circumference = π × 6 in ≈ 18.85 in ≈ 0.479 m. Divide by 10: about **0.0479 m** (4.8 cm) per motor rotation.

</details>

<details>
<summary>Why is a relative encoder risky on an arm?</summary>

It reads 0 at power-on wherever the arm is, so if the arm isn't in the expected starting position, every angle is wrong.

</details>

<details>
<summary>Why is mixing inches and meters dangerous?</summary>

The code runs without errors, but every number is off by about 39×, so the robot moves to completely wrong places.

</details>

<details>
<summary>Your gyro heading goes down when the robot turns left. What's wrong?</summary>

The gyro reports clockwise as positive, but WPILib expects counterclockwise positive. Flip the sign.

</details>
