# 14.1 Control on the Motor Controller

## Why it matters
In [Lessons 12–14](12-pid.md) the **roboRIO** did all the control math: it read the encoder, ran the PID controller, added feedforward, followed the motion profile, and sent a voltage to the motor, 50 times a second. That's how [Lab 9](../testbed/lab9-pid-wheel.md) and [Lab 10](../testbed/lab10-elevator.md) work, and it's the best way to learn what each piece does.

Modern motor controllers (the **TalonFX** inside every Kraken, and the **SPARK MAX / SPARK Flex**) can run the same math **themselves**, about **1000 times a second**, right next to the motor. Next year's robot runs on Krakens ([Lesson 21.2](../going-further/21c-swerve-ctre.md)), so you'll use this a lot.

This lesson shows how the ideas you already know map onto the motor controller, for both CTRE and REV.

## Read this
- [Closed-Loop Control (CTRE Phoenix 6)](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/device-specific/talonfx/closed-loop-requests.html) and [Motion Magic](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/device-specific/talonfx/motion-magic.html)
- [Improving Performance with Current Limits (CTRE)](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/talonfx/improving-performance-with-current-limits.html)
- [Closed Loop Control](https://docs.revrobotics.com/revlib/spark/closed-loop) and [Feed Forward Control (REV)](https://docs.revrobotics.com/revlib/spark/closed-loop/feed-forward-control)

!!! tip "Go deeper"
    FRC Team 3847 Spectrum's interactive [CTRE Control Modes](https://spectrum3847.org/training/ctre-control-modes/) course covers TalonFX control from duty cycle up to Motion Magic and FOC, built from their own robots.

## Walkthrough

### Same ideas, different place
| Idea | On the roboRIO (Lessons 12–14) | On a TalonFX (Phoenix 6) | On a SPARK (REVLib) |
|---|---|---|---|
| PID | `PIDController` | `kP`, `kI`, `kD` in a **slot** config | `closedLoop.pid(...)` |
| Friction (kS), velocity (kV), acceleration (kA) | `SimpleMotorFeedforward` | `kS`, `kV`, `kA` in the slot | `closedLoop.feedForward.kS / kV / kA` |
| Gravity, elevator (kG) | `ElevatorFeedforward` | `kG` with `GravityType = Elevator_Static` | `feedForward.kG` |
| Gravity, arm (kG·cos θ) | `ArmFeedforward` | `kG` with `GravityType = Arm_Cosine` | `feedForward.kCos` and `kCosRatio` |
| Motion profile | `ProfiledPIDController` / `TrapezoidProfile` | **Motion Magic** | **MAXMotion** |
| Gear ratio and units | Your own math, or `setDistancePerPulse` | `SensorToMechanismRatio` | Conversion factors |
| Loop rate | 50 Hz (every 20 ms) | about 1 kHz | about 1 kHz |

Your code stops running the loop. Instead it sends a **target** ("go to 0.8 m", "spin at 40 rotations per second") and the motor controller does the rest.

| | roboRIO control | Motor controller control |
|---|---|---|
| Speed | 50 Hz, plus CAN delay | About 1 kHz, no delay |
| CAN traffic | A new voltage every loop | Only when the target changes |
| Easy to see and debug | Everything is in your code and logs | Must read the controller's signals back to see them |
| Mixing sensors | Any sensor the roboRIO can read | The motor's own encoder, or a sensor wired or linked to it |
| Best for learning | Yes | Once you understand the pieces |

### Units: the number one bug
The controller does the math in **its** units, so the gains do too.

- **Phoenix 6** always uses **rotations** and **rotations per second**. Set `Feedback.SensorToMechanismRatio` to your gear ratio and they become **mechanism** rotations. A `kP` of 10 means "10 V per rotation of error."
- **REV** uses **motor rotations** and **RPM** by default. Set the encoder's `positionConversionFactor` and `velocityConversionFactor`, and the gains and targets use your units instead.

A gain tuned in one set of units is wrong by a huge factor in another. Write the units next to every constant.

### CTRE: configure once, then send control requests
A TalonFX is configured with a `TalonFXConfiguration` object, applied once at startup. Gains live in **slots** (Slot0, Slot1, Slot2) so one motor can switch between, say, an empty and a loaded elevator.

Here's the [Lab 10](../testbed/lab10-elevator.md) elevator, as it would look on a Kraken: Motion Magic for the profile, plus gravity feedforward. (It's adapted from CTRE's MotionMagic and CurrentLimits examples.)

```java
  private final TalonFX m_motor = new TalonFX(20, new CANBus("rio"));
  // A reusable request: "go to this position with Motion Magic, volts mode"
  private final MotionMagicVoltage m_positionRequest = new MotionMagicVoltage(0).withSlot(0);

  public ElevatorSubsystem() {
    TalonFXConfiguration config = new TalonFXConfiguration();

    // Units: motor rotations divided by this = drum rotations. Positions are then in drum rotations.
    config.Feedback.SensorToMechanismRatio = 12.0;

    // Gains (slot 0), in volts per rotation of error, volts per rotation/s, ...
    config.Slot0.GravityType = GravityTypeValue.Elevator_Static;
    config.Slot0.kG = 0.35;   // volts to hold the carriage still
    config.Slot0.kS = 0.10;   // volts to overcome friction
    config.Slot0.kV = 1.20;   // volts per rotation/s
    config.Slot0.kA = 0.05;   // volts per rotation/s²
    config.Slot0.kP = 20.0;   // volts per rotation of error
    config.Slot0.kD = 0.5;    // volts per rotation/s of error

    // The motion profile: cruise speed, acceleration, and jerk (how fast acceleration changes)
    config.MotionMagic.MotionMagicCruiseVelocity = 3.0;   // rotations per second
    config.MotionMagic.MotionMagicAcceleration = 6.0;     // rotations per second²
    config.MotionMagic.MotionMagicJerk = 60.0;            // rotations per second³

    // Current limits (see below)
    config.CurrentLimits.StatorCurrentLimit = 80;
    config.CurrentLimits.StatorCurrentLimitEnable = true;
    config.CurrentLimits.SupplyCurrentLimit = 40;
    config.CurrentLimits.SupplyCurrentLimitEnable = true;

    config.MotorOutput.NeutralMode = NeutralModeValue.Brake;
    m_motor.getConfigurator().apply(config);
  }

  /** Go to a height, in drum rotations. The TalonFX plans and follows the profile itself. */
  public Command goToCommand(double rotations) {
    return runOnce(() -> m_motor.setControl(m_positionRequest.withPosition(rotations)))
        .andThen(Commands.waitUntil(this::atTarget))
        .withName("Elevator to " + rotations);
  }

  private boolean atTarget() {
    return Math.abs(m_motor.getClosedLoopError().getValueAsDouble()) < 0.05;
  }
```

`setControl` is sent once. The TalonFX keeps following the profile and holding the position until it gets a different request. To convert meters to drum rotations, divide by the drum's circumference, exactly as Lab 10's constants do.

**The control requests you'll use:**

| Request | Means | Like |
|---|---|---|
| `DutyCycleOut` | A fraction of battery voltage, −1 to 1 | `set(0.5)` on a SPARK |
| `VoltageOut` | A voltage, −12 to 12 | `setVoltage(6)` |
| `PositionVoltage` | Go to a position with PID + feedforward | `PIDController` on position |
| `VelocityVoltage` | Hold a speed with PID + feedforward | Flywheel PID + kV |
| `MotionMagicVoltage` | Go to a position along a profile | `ProfiledPIDController` |
| `NeutralOut` | Stop (brake or coast, from the config) | `stopMotor()` |

**FOC.** Every request has `.withEnableFOC(true)`. FOC (field-oriented control) is a smarter way of driving the motor's coils that gives Krakens noticeably more power. It needs a **Phoenix Pro** license ([Lesson 21.3](../going-further/21d-phoenix-tuner.md#step-9-phoenix-pro-licenses)); without one, the request is rejected. The `...TorqueCurrentFOC` requests (commanding current instead of voltage) also need Pro.

**Seeing what it's doing.** The loop runs inside the motor, so log its signals to see it: `getClosedLoopReference()` (where the profile is right now), `getClosedLoopError()`, `getPosition()`, and `getMotorVoltage()`. Graph the reference and the position together, like Lab 10's goal and setpoint.

*Sources: [CTRE: Closed-Loop Control](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/device-specific/talonfx/closed-loop-requests.html); [CTRE MotionMagic and CurrentLimits examples](https://github.com/CrossTheRoadElec/Phoenix6-Examples/tree/main/java) (WPILib BSD license header). Explanations in our own words.*

### Current limits: stator vs. supply
Every course lab sets one current limit (`smartCurrentLimit`). CTRE motor controllers have **two kinds**, and they do different jobs:

| | Stator current | Supply current |
|---|---|---|
| What it is | Current through the **motor**. Proportional to **torque**. | Current drawn from the **battery** |
| Limit it to | Stop wheel slip, protect a mechanism hitting a hard stop, reduce motor heat | Prevent brownouts, keep breakers from tripping, go easy on the battery |
| Side effect | Caps torque, so it also slows acceleration. Don't set it too low on a drivetrain. | Mostly affects high-speed running |

At low speed, the motor can draw **much more stator current than supply current** (a stalled motor at half output might show 80 A stator but only 40 A supply), so a stator limit also keeps supply current down when starting from a stop. Set both. REV's `smartCurrentLimit` is a **stator-style** limit on motor current.

*Source: [CTRE: Improving Performance with Current Limits](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/talonfx/improving-performance-with-current-limits.html), in our own words.*

### REV: closed loop on a SPARK
The same elevator on a NEO and SPARK MAX, with MAXMotion for the profile. Gains go in the SPARK's config, alongside the conversion factors that set the units. Note one difference from CTRE: REV's **PID** output is a duty cycle (−1 to 1), while its **feedforward** terms are in **volts**.

```java
    SparkMaxConfig config = new SparkMaxConfig();
    // Units: with these factors, position is in meters and velocity in meters per second
    config.encoder
        .positionConversionFactor(kMetersPerMotorRotation)
        .velocityConversionFactor(kMetersPerMotorRotation / 60.0);
    config.closedLoop
        .feedbackSensor(FeedbackSensor.kPrimaryEncoder)
        .pid(4.0, 0.0, 0.1)            // duty cycle (-1 to 1) per meter of error
        .feedForward
            .kS(0.10)                  // volts
            .kV(3.0)                   // volts per m/s
            .kG(0.35);                 // volts to hold the carriage (use kCos for an arm)
    config.closedLoop.maxMotion
        .cruiseVelocity(1.0)           // m/s
        .maxAcceleration(2.0);         // m/s²
    m_spark.configure(config, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);

    // Then, to move: the SPARK plans the profile and adds kG
    m_spark.getClosedLoopController().setSetpoint(0.8, ControlType.kMAXMotionPositionControl);
```

| REV control type | Like |
|---|---|
| `kDutyCycle`, `kVoltage` | `set(...)`, `setVoltage(...)` |
| `kPosition` | `PIDController` on position (kG/kCos applied) |
| `kVelocity` | Velocity PID + kV |
| `kMAXMotionPositionControl` | `ProfiledPIDController` (kA and kG applied) |
| `kMAXMotionVelocityControl` | A velocity with limited acceleration |

For an **arm**, use `kCos` instead of `kG`, set `kCosRatio` to convert the sensor reading into arm rotations, and make the sensor read **0 when the arm is horizontal**. Use one of `kG` or `kCos`, never both.

*Sources: [REV: Feed Forward Control](https://docs.revrobotics.com/revlib/spark/closed-loop/feed-forward-control); [REVLib MAXMotion example](https://github.com/REVrobotics/REVLib-Examples/tree/main/Java/SPARK/MAXMotion).*

### Finding kG by hand
SysId ([Lesson 13.1](13b-sysid.md)) measures kG for you. Without it, here's a quick way that works for either brand:

1. With only `kG` set (everything else 0), slowly raise `kG` until the mechanism **just stops drifting down**. Write it down: that's kG − kS.
2. Keep raising until it **just starts to creep up**. That's kG + kS.
3. kG is halfway between the two, and kS is half the difference.

Then add kV (and kA) for smooth motion, and finally a small kP to fix what's left, the same order as [Lesson 13](13-feedforward.md#tuning-with-feedforward).

### When to use which
| Use the roboRIO when… | Use the motor controller when… |
|---|---|
| You're learning, or debugging what each term does | The mechanism needs fast, smooth, precise motion |
| The sensor is wired to the roboRIO | The motor's own encoder (or a linked CANcoder) is the sensor |
| You need unusual logic in the loop | It's a standard elevator, arm, flywheel, or drivetrain |

Most competition code does the **simple, standard** loops on the motor controller and keeps the roboRIO for deciding **what** each mechanism should do.

## Try it
- [ ] Fill in the "Same ideas, different place" table from memory
- [ ] Rewrite Lab 10's elevator constants for a TalonFX: what's `SensorToMechanismRatio`, and what's a 0.8 m height in drum rotations?
- [ ] Explain to a teammate why a drivetrain's stator limit shouldn't be too low
- [ ] Find kG on the test bed's elevator by hand, using the three steps above
- [ ] Challenge: port Lab 10's elevator to MAXMotion on the SPARK MAX, keeping the same presets

## Check yourself
??? question "What does 'Motion Magic' (or 'MAXMotion') replace from Lesson 14?"
    The `ProfiledPIDController`: the motor controller plans the trapezoid profile and follows it itself.

??? question "Why does `SensorToMechanismRatio` change your gains?"
    It changes the units of position and velocity from motor rotations to mechanism rotations, and the gains are in volts per unit.

??? question "Stator or supply limit: which one stops wheel slip?"
    Stator. It caps motor current, which caps torque. Supply current limits protect the battery and breakers.

??? question "Why isn't `kG` enough for an arm?"
    The torque gravity puts on an arm changes with its angle, strongest when horizontal. The arm term (`Arm_Cosine` on CTRE, `kCos` on REV) multiplies by the cosine of the angle.

??? question "Why log `getClosedLoopReference()` on a TalonFX?"
    The profile runs inside the motor, so your code doesn't know where it is unless you read it back. Graphing the reference next to the position shows how well it's tracking.

<p class="credit">Written for this course from CTRE's Phoenix 6 documentation (CC BY-NC-ND 4.0; linked, not copied) and REV's REVLib documentation. Code adapted from CTRE's Phoenix 6 examples (WPILib BSD license header) and REV's REVLib examples.</p>
