# 21. Swerve Drive

## Why it matters
The West Coast Drive can go forward, backward, and turn. To move sideways it has to turn, drive, and turn back. A defender who knows that can pin it against a wall.

A **swerve drive** has four wheels that each **steer** on their own. Point all four wheels sideways and the robot slides sideways. Point them in a circle and it spins in place. Do both at once and it can drive across the field in a straight line **while** spinning to face a goal. Most competitive FRC robots now drive swerve.

You won't write swerve from scratch: teams start from a vendor template. This lesson explains what the template is doing, using everything from Lessons 12–19, so you can read it, tune it, and fix it.

## Read this
- [Swerve Drive Kinematics (WPILib)](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/swerve-drive-kinematics.html)
- [Swerve Drive Odometry (WPILib)](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/swerve-drive-odometry.html)
- Your module's template: [CTRE Tuner X Swerve Generator](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/tuner-swerve/index.html) (Kraken/Falcon + CANcoder), [REV MAXSwerve template](https://github.com/REVrobotics/MAXSwerve-Java-Template) (NEO/Vortex), or [YAGSL](https://github.com/BroncBotz3481/YAGSL) (many combinations)

## Walkthrough

### What's in a swerve module
Each corner of the robot is a **module** with:

| Part | Job | Control |
|---|---|---|
| **Drive motor** | Spins the wheel | **Velocity** control: feedforward + PID ([Lessons 12–13](../controls/12-pid.md)) |
| **Steer motor** (azimuth) | Turns the wheel to point a direction | **Position** control: PID |
| **Absolute encoder** (CANcoder, or a Through Bore in absolute mode) | Knows which way the wheel points, even right after power-on | Read by the steer controller |

So a swerve drive is just **four velocity controllers and four position controllers**, working together. Every idea in it is one you've already used.

### Holonomic driving
A tank drive takes two numbers: left and right. A swerve drive takes three, as a `ChassisSpeeds` (from [Lesson 19](19-pathplanner.md)):

| Number | Meaning | Tank drive? |
|---|---|---|
| `vx` | Forward speed (m/s) | Yes |
| `vy` | Sideways speed, left is positive (m/s) | **Always 0** |
| `omega` | Turning speed, counterclockwise is positive (rad/s) | Yes |

A drivetrain that can do all three independently is called **holonomic**.

### Kinematics: robot speed → four wheel states
`SwerveDriveKinematics` needs to know where each module is, measured from the **center** of the robot (+X forward, +Y left):

```java
  // Module positions from the center of the robot, in meters. Order: FL, FR, BL, BR.
  private final SwerveDriveKinematics m_kinematics = new SwerveDriveKinematics(
      new Translation2d(0.28, 0.28),     // front left
      new Translation2d(0.28, -0.28),    // front right
      new Translation2d(-0.28, 0.28),    // back left
      new Translation2d(-0.28, -0.28));  // back right
```

Give it a `ChassisSpeeds` and it returns four `SwerveModuleState`s: a speed and an angle for each wheel.

```java
  /** Drives the robot. x and y in m/s, turn in rad/s. */
  public void drive(double xSpeed, double ySpeed, double turnSpeed, boolean fieldRelative) {
    ChassisSpeeds speeds = new ChassisSpeeds(xSpeed, ySpeed, turnSpeed);
    if (fieldRelative) {
      // Joystick "forward" means "away from the driver", whichever way the robot faces
      speeds = ChassisSpeeds.fromFieldRelativeSpeeds(speeds, getHeading());
    }
    // Correct for the robot turning during the 20 ms step, so it doesn't drift sideways while spinning
    speeds = ChassisSpeeds.discretize(speeds, 0.02);

    SwerveModuleState[] states = m_kinematics.toSwerveModuleStates(speeds);
    // If any wheel would have to go faster than it can, slow all four down by the same ratio
    SwerveDriveKinematics.desaturateWheelSpeeds(states, kMaxSpeedMetersPerSecond);

    for (int i = 0; i < 4; i++) {
      m_modules[i].setDesiredState(states[i]);
    }
  }
```

The order **FL, FR, BL, BR** must be the same everywhere: in the kinematics, the module array, and the odometry. Swap two and the robot drives confidently in the wrong direction.

### Field-relative driving
**Robot-relative:** pushing the stick forward drives toward the robot's front. Hard to drive once the robot has turned around.

**Field-relative:** pushing the stick forward drives **away from the driver**, no matter which way the robot faces. `fromFieldRelativeSpeeds` uses the gyro heading to rotate the joystick's direction into the robot's frame. Almost every team drives field-relative.

!!! warning "Red alliance"
    WPILib's field +X points away from the **blue** wall. On red, "away from the driver" is −X, so field-relative driving must add 180° to the heading (or flip the joystick) when the alliance is red. Templates handle this; check it on yours before a red match.

### Inside one module
Each module turns its desired state into two motor commands:

```java
  /** Point the wheel and spin it at the requested state. */
  public void setDesiredState(SwerveModuleState desired) {
    Rotation2d current = getSteerAngle();

    // Never turn the wheel more than 90°: spinning the wheel backward is the same as turning it 180°
    desired.optimize(current);
    // Slow the wheel down while it's still turning toward the right direction
    desired.cosineScale(current);

    // Drive motor: velocity control (feedforward + PID), like Lesson 19's tank drive
    double driveVolts = m_driveFeedforward.calculate(desired.speedMetersPerSecond)
        + m_drivePID.calculate(getDriveVelocity(), desired.speedMetersPerSecond);
    // Steer motor: position control. Continuous input makes -179° and +179° neighbors.
    double steerVolts = m_steerPID.calculate(current.getRadians(), desired.angle.getRadians());

    m_driveMotor.setVoltage(driveVolts);
    m_steerMotor.setVoltage(steerVolts);
  }
```

| Line | Why |
|---|---|
| `optimize` | If the wheel points at 0° and you ask for 170°, it's faster to point it at −10° and spin backward. The wheel never has to turn more than 90°. |
| `cosineScale` | While the wheel is still 60° from where it should point, driving it at full speed would push the robot the wrong way. Scaling by the cosine of the error makes it wait. |
| Continuous input | `m_steerPID.enableContinuousInput(-Math.PI, Math.PI)` tells the PID that the angle wraps around, so it goes the short way from 179° to −179° (2°), not the long way (358°). |

Real templates usually run both loops **on the motor controller** (Phoenix 6 or REVLib closed-loop control) instead of on the roboRIO, because it's faster. The ideas are the same.

### Absolute encoder offsets
Every steer encoder reads some angle when the wheel points straight ahead, and it's different for every module. That reading is the module's **offset**. Get it wrong and that wheel points the wrong way, and the robot fights itself.

Templates have a procedure for this: point all four wheels straight ahead (bevel gears all facing the same side), then read and save the offsets. CTRE's Tuner X generator does it for you. Redo it any time a module is taken apart or swapped.

### Odometry and the rest
Swerve odometry works like the WCD's ([Lesson 17](17-odometry.md)), with one difference: each module reports how far it rolled **and** which way it pointed, as a `SwerveModulePosition`. `SwerveDrivePoseEstimator` replaces `DifferentialDrivePoseEstimator` for vision ([Lesson 18](18-vision.md)). For PathPlanner ([Lesson 19](19-pathplanner.md)), set **Holonomic** mode in the app and use `PPHolonomicDriveController` instead of `PPLTVController`. Holonomic paths can turn the robot independently of the direction it's driving.

In AdvantageScope's **Swerve** tab ([Lesson 20](20-logging.md)), log the desired and measured `SwerveModuleState[]` and you'll see four arrows: what each module was told to do and what it actually did.

### Getting started on a real swerve
1. **Pick the template** for your modules (see "Read this").
2. **Enter the hardware:** CAN IDs, gear ratios, wheel diameter, module positions.
3. **Set the encoder offsets** with the wheels pointing straight.
4. **Check with the robot on blocks:** push forward on the stick, and all four wheels should point forward and spin forward. Then left, then rotate. Fix one thing at a time.
5. **Tune** the steer PID first (snappy, no wobble), then the drive feedforward (SysId) and PID.
6. **Measure** the real max speed and put it in the template and in PathPlanner's robot config.

## Try it
- [ ] On paper: the robot drives forward at 1 m/s with no turning. What angle and speed does each module get?
- [ ] On paper: the robot spins in place counterclockwise. Which way does each wheel point?
- [ ] Open a swerve template for your team's modules and find the kinematics, `optimize`, and the encoder offsets
- [ ] Run a template in simulation and drive it field-relative with an Xbox controller

## Check yourself
??? question "What does 'holonomic' mean?"
    The robot can move forward, sideways, and turn, all independently and at the same time.

??? question "Why does `optimize` never turn a wheel more than 90°?"
    Pointing the wheel 180° the other way and spinning it backward moves the robot the same way. So any turn over 90° can be replaced by a smaller turn plus reversing the wheel.

??? question "What's the difference between robot-relative and field-relative driving?"
    Robot-relative: the stick's forward is the robot's front. Field-relative: the stick's forward is away from the driver, whichever way the robot faces. Field-relative needs the gyro.

??? question "One wheel always points 30° off from the others. What's the first thing to check?"
    That module's absolute encoder offset.

??? question "A swerve module is two motors. What kind of control does each use?"
    The drive motor uses velocity control; the steer motor uses position control.

<p class="credit">Parts of this lesson are adapted from the Swerve Drive Example and Odometry lessons of <a href="https://github.com/itkan-robotics/mantik">Mantik</a> by Itkan Robotics (CC BY 4.0).</p>
