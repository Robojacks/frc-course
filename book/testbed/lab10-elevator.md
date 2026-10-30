# Lab 10: Elevator Position Control

## Why it matters
Elevators are on almost every FRC robot: lifting game pieces to score high, reaching shelves, climbing. Every one needs the same thing: **go to an exact height, and stay there**.

In [Lab 9](lab9-pid-wheel.md) you used PID to turn a wheel exactly 10 times. An elevator adds one big new problem: **gravity**. The wheel stopped when the motor stopped. An elevator falls. In this lab you'll use PID to move the WCD's elevator between heights and hold it there, and you'll see exactly how each of P, I, and D handles gravity.

**Before you start:** finish [Lab 9](lab9-pid-wheel.md). You'll add to the **WestCoastDrive** project from Labs 2, 7, and 8. Lessons [4.1](../hardware/04b-motors.md) (the NEO) and [4.3](../hardware/04d-sensors.md) (the Through Bore Encoder) cover this lab's hardware.

## Read this
- [PID Control in WPILib](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/controllers/pidcontroller.html)
- [Introduction to PID](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/introduction-to-pid.html)
- [Tuning a Vertical Elevator with Motion Profiling](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-elevator.html)

## Walkthrough

{% hint style="danger" %}
**Elevator safety**

An elevator can pinch, crush, and drop. Before every test:

- **Hands, heads, and tools out** of the elevator and away from the carriage's path, above and below.
- Start every session with the elevator **all the way down**.
- One person's only job is the disable key (**Enter**).
- Keep `MaxVolts` low (4 V) while you set up and tune.
- The carriage can **drop when the robot is disabled**. Never reach under a raised carriage.
{% endhint %}

### Try it in the simulator first
WPILib's elevator simulator below runs **PID only**, exactly like this lab. Click a height along the elevator's vertical support to set a new target.

{% hint style="info" %}
**Interactive simulator**

The simulator for this section runs in a web page, not in GitBook. Use it in either place:

- [This page on the course website](https://YOUR-USERNAME.github.io/frc-course/testbed/lab10-elevator.html)
- [Tuning a Vertical Elevator with Motion Profiling](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-elevator.html) in the WPILib docs (CC BY 4.0)
{% endhint %}

{% hint style="info" %}
**From the WPILib docs: Tuning an elevator with PID only**

1. Set kP, kI, and kD to zero.
2. Increase **kP** until the elevator responds to a sudden change in setpoint by moving sharply to the new position. If it oscillates too much, reduce kP until it stops.
3. Increase **kI** when the elevator gets "stuck" before reaching the setpoint.
4. Increase **kD** to help it track smoothly moving setpoints and further reduce oscillation.

Feedback-only control is **not a good control scheme** for vertical elevators, so don't be surprised if the simulator doesn't behave consistently, even with good gains. There's no perfect answer: gains around **kP = 10, kI = 2.5, kD = 0** work, but with overshoot and long settling times, and the elevator acts differently depending on the setpoint, overshooting near the top and undershooting near the bottom.

*Adapted from [Tuning a Vertical Elevator with Motion Profiling](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-elevator.html), CC BY 4.0.*
{% endhint %}

That's exactly what you'll see on the real elevator, and why: gravity pulls the same way no matter which direction the elevator is moving. Real robots usually add **feedforward** for gravity ([Lesson 13](../controls/13-feedforward.md)). This lab sticks to PID so you can see what each of P, I, and D does on its own.

- [ ] Find gains that reach a new height within a few seconds
- [ ] Notice how the elevator behaves going **up** vs. going **down**
- [ ] Write down your gains. Your real elevator will need different numbers, but the same steps.

### The hardware

| Part | Connected to | In code |
|---|---|---|
| NEO driving the elevator through a gearbox | SPARK MAX, **brushless** mode, on CAN | REVLib `SparkMax` |
| REV Through Bore Encoder on the elevator's drive shaft | The WCD roboRIO's DIO ports (channels A and B) | WPILib `Encoder` |
| A **second** Xbox controller (the operator) | Driver Station, slot **1** | `CommandXboxController(1)` |

The NEO is **brushless**, like Lab 1's, unlike the CIMs on the drivetrain. Check its CAN ID in the REV Hardware Client.

### The big idea: holding against gravity
The wheel in Lab 9 only needed voltage while it was **moving**. The elevator needs voltage just to **stand still**, because gravity is always pulling the carriage down.

That means the elevator's PID command can't end when it arrives, the way the wheel's did. If it ends, the motor stops pushing and the carriage falls. So this elevator works differently:

- A **hold** command runs **all the time** as the default command, pushing toward a **target height**.
- Buttons don't move the elevator directly. They just **change the target**. The hold command does the moving.

### Step 1: Constants
Add this class inside `Constants` in the WestCoastDrive project. Fill in your CAN ID and DIO ports. You'll measure the other numbers in Steps 4 and 5.

```java
  public static class kElevatorConstants {
    public static final int MotorCanId = 5;
    public static final boolean MotorInverted = false;

    public static final int EncoderChannelA = 0;
    public static final int EncoderChannelB = 1;
    public static final boolean EncoderInverted = false;
    public static final int EncoderCyclesPerRev = 2048;     // Through Bore: 2048 cycles (8192 counts)

    public static final double MetersPerRotation = 1.0;     // you'll measure this in Step 4
    public static final double MinHeightMeters = 0.0;       // bottom
    public static final double MaxHeightMeters = 0.5;       // you'll measure this in Step 5

    public static final int CurrentLimit = 40;              // amps
    public static final double MaxVolts = 4.0;              // gentle while tuning

    public static final double P = 10.0;                    // volts per meter of error
    public static final double I = 0.0;
    public static final double D = 0.0;
    public static final double IZoneMeters = 0.05;          // only build up I within 5 cm
    public static final double ToleranceMeters = 0.01;      // within 1 cm counts as "there"
  }
```

`MetersPerRotation` starts at **1.0** on purpose. Until you measure it, "height" on the dashboard will really be **encoder rotations**, which is exactly what you need for Step 4.

### Step 2: The elevator subsystem
Create `subsystems/ElevatorSubsystem.java`:

```java
package frc.robot.subsystems;

import com.revrobotics.PersistMode;
import com.revrobotics.ResetMode;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.config.SparkMaxConfig;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.wpilibj.CounterBase.EncodingType;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Encoder;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants.kElevatorConstants;

public class ElevatorSubsystem extends SubsystemBase {
  // The NEO is BRUSHLESS (the drivetrain CIMs are brushed)
  private final SparkMax m_motor =
      new SparkMax(kElevatorConstants.MotorCanId, MotorType.kBrushless);

  private final Encoder m_encoder = new Encoder(
      kElevatorConstants.EncoderChannelA,
      kElevatorConstants.EncoderChannelB,
      kElevatorConstants.EncoderInverted,
      EncodingType.k4X);

  private final PIDController m_pid = new PIDController(
      kElevatorConstants.P, kElevatorConstants.I, kElevatorConstants.D);

  private double m_targetMeters = 0.0;   // where the hold command is trying to be
  private double m_lastVolts = 0.0;      // for the dashboard

  public ElevatorSubsystem() {
    SparkMaxConfig config = new SparkMaxConfig();
    config.smartCurrentLimit(kElevatorConstants.CurrentLimit);
    config.idleMode(IdleMode.kBrake);    // resists falling when no voltage is applied
    config.inverted(kElevatorConstants.MotorInverted);
    m_motor.configure(config, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);

    // After this, getDistance() is in meters of elevator travel
    m_encoder.setDistancePerPulse(
        kElevatorConstants.MetersPerRotation / kElevatorConstants.EncoderCyclesPerRev);
    m_encoder.reset();   // the elevator MUST start at the bottom: this is height 0

    m_pid.setTolerance(kElevatorConstants.ToleranceMeters);
    m_pid.setIZone(kElevatorConstants.IZoneMeters);
    SmartDashboard.putData("Elevator/PID", m_pid);   // tune live
  }

  public double getHeightMeters() {
    return m_encoder.getDistance();
  }

  public boolean atTarget() {
    return m_pid.atSetpoint();
  }

  /** Every voltage goes through here, so the soft limits can't be skipped. */
  private void setVolts(double volts) {
    double height = getHeightMeters();
    if (height >= kElevatorConstants.MaxHeightMeters && volts > 0) {
      volts = 0;   // at the top: never push higher
    }
    if (height <= kElevatorConstants.MinHeightMeters && volts < 0) {
      volts = 0;   // at the bottom: never push lower
    }
    m_lastVolts = volts;
    m_motor.setVoltage(volts);
  }

  /** One step of PID toward the target. */
  private void driveTowardTarget() {
    double volts = m_pid.calculate(getHeightMeters(), m_targetMeters);
    setVolts(MathUtil.clamp(volts, -kElevatorConstants.MaxVolts, kElevatorConstants.MaxVolts));
  }

  // ---------------------------------------------------------------- Commands

  /** The default command: always push toward the target. Never ends. */
  public Command holdCommand() {
    return run(this::driveTowardTarget).withName("Hold");
  }

  /** Changes the target height. The hold command does the actual moving. */
  public Command setTargetCommand(double meters) {
    return runOnce(() -> {
      m_targetMeters = MathUtil.clamp(
          meters, kElevatorConstants.MinHeightMeters, kElevatorConstants.MaxHeightMeters);
      m_pid.reset();
    }).withName("Target " + meters + " m");
  }

  /** Manual control while held. When released, hold wherever the elevator is. */
  public Command manualCommand(double volts) {
    return runEnd(
        () -> setVolts(volts),
        () -> {
          m_targetMeters = getHeightMeters();   // hold here from now on
          m_pid.reset();
        }).withName("Manual " + volts + " V");
  }

  /** Call this height 0. Only use it when the elevator is all the way down. */
  public Command zeroCommand() {
    return runOnce(() -> {
      m_encoder.reset();
      m_targetMeters = 0.0;
    }).ignoringDisable(true).withName("Zero");
  }

  @Override
  public void periodic() {
    // While disabled, keep the target equal to the real height,
    // so enabling never makes the elevator suddenly jump.
    if (DriverStation.isDisabled()) {
      m_targetMeters = getHeightMeters();
      m_pid.reset();
    }

    SmartDashboard.putNumber("Elevator/Height (m)", getHeightMeters());
    SmartDashboard.putNumber("Elevator/Target (m)", m_targetMeters);
    SmartDashboard.putNumber("Elevator/Error (m)", m_targetMeters - getHeightMeters());
    SmartDashboard.putNumber("Elevator/Output (V)", m_lastVolts);
    SmartDashboard.putNumber("Elevator/Current (A)", m_motor.getOutputCurrent());
    SmartDashboard.putBoolean("Elevator/At Target", atTarget());
  }
}
```

Three safety features are built in:

| Feature | What it protects against |
|---|---|
| **Soft limits** in `setVolts` | Code that asks for a height above the top or below the bottom. The motor won't push past either end. |
| **Target clamping** in `setTargetCommand` | A typo like `setTargetCommand(5.0)` (5 meters!) just becomes "go to the top." |
| **Target follows height while disabled** | Enabling with the target somewhere else, which would make the elevator lurch the instant you enable |

### Step 3: Bind the operator controller
In `RobotContainer.java`, add the subsystem and a second controller:

```java
  private final ElevatorSubsystem m_elevator = new ElevatorSubsystem();
  private final CommandXboxController m_operator = new CommandXboxController(1);
```

In `configureBindings()`, keep the drive bindings and add:

```java
    // ---- Elevator (operator controller, slot 1) ----
    m_elevator.setDefaultCommand(m_elevator.holdCommand());

    m_operator.povUp().whileTrue(m_elevator.manualCommand(2.0));     // manual up
    m_operator.povDown().whileTrue(m_elevator.manualCommand(-1.0));  // manual down (gravity helps)
    m_operator.back().onTrue(m_elevator.zeroCommand());

    // Preset heights: you'll add these in Step 6
```

Manual down uses less voltage than manual up, because gravity is already pulling the carriage down.

### Step 4: Check directions and measure the scale
Deploy with the elevator **all the way down**. `MetersPerRotation` is still 1.0, so **Height** on the dashboard shows encoder rotations.

**Direction:**

1. Enable. **Hold D-pad up** for a moment, gently.
2. The carriage must go **up**, and **Height** must **increase**.

| What you see | Fix |
|---|---|
| Carriage doesn't move at 2 V | Gravity is stronger than 2 V. Try 3 V (stay at or under `MaxVolts`). |
| Carriage goes **down** on D-pad up | Set `MotorInverted = true` |
| Carriage goes up, but Height **decreases** | Set `EncoderInverted = true` |

Don't continue until both directions are right.

**Scale:**

1. Lower the elevator to the bottom and press **Back** (zero).
2. Use D-pad up to raise it partway. Disable.
3. Measure how far the carriage rose with a tape measure, in meters (or inches, then multiply by 0.0254).
4. Read **Height** on the dashboard. That's the number of rotations.
5. `MetersPerRotation = meters raised ÷ rotations`

**Example:** the carriage rose 0.42 m and the dashboard shows 3.0 rotations. `MetersPerRotation` = 0.42 ÷ 3.0 = **0.14**.

Put your number in `Constants`, deploy, and check: raise it again, and **Height** should now match the tape measure.

{% hint style="info" %}
**Why measure instead of calculate?**

You can calculate it from the sprocket or spool size (a 22-tooth sprocket on #25 chain moves 22 × 0.25 in = 5.5 in per turn), but cascade rigging, gearing between the encoder and the sprocket, and stretch all change the real answer. Measuring catches all of it at once.
{% endhint %}

### Step 5: Find the top
Use D-pad up to raise the elevator **slowly** toward the top. Stop a few centimeters before the hard stop and read **Height**. Set `MaxHeightMeters` to that number, minus 2 to 3 cm of safety margin. Deploy.

Now hold D-pad up near the top. The soft limit should stop the motor just below your max.

### Step 6: Preset heights
Pick three heights between 0 and your max. Add them to `kElevatorConstants`:

```java
    public static final double BottomMeters = 0.02;
    public static final double MiddleMeters = 0.25;   // use your own
    public static final double TopMeters = 0.45;      // just under MaxHeightMeters
```

Bind them:

```java
    m_operator.a().onTrue(m_elevator.setTargetCommand(kElevatorConstants.BottomMeters));
    m_operator.b().onTrue(m_elevator.setTargetCommand(kElevatorConstants.MiddleMeters));
    m_operator.y().onTrue(m_elevator.setTargetCommand(kElevatorConstants.TopMeters));
```

### Attempt 1: P only, and the sag
With **I and D at 0** and P = 10, press **B** (middle). Graph **Height** and **Target** together.

**What you'll see:** The elevator rises and settles **below** the target, and stays there. That gap is **sag**, and gravity causes it.

Here's why. To hold the carriage still, the motor needs some voltage, call it the **hold voltage**. P only makes voltage when there's error:

```
volts = P × error
```

So the elevator sinks until the error is just big enough to make the hold voltage:

```
sag = hold voltage ÷ P
```

**Measure it.** Fill in this table, waiting for the elevator to settle each time:

| P | Sag (Error, m) | Output (V) while holding | P × sag |
|---|---|---|---|
| 10 | | | |
| 20 | | | |
| 40 | | | |

The last column should come out about the **same** every time. That number is your elevator's hold voltage: what it costs to fight gravity.

{% hint style="info" %}
**Think about it**

Doubling P cuts the sag in half. Why can't you just make P huge to get rid of the sag?
{% endhint %}

### Attempt 2: Higher P, and the bounce
Keep raising P (change it on the dashboard, under `Elevator/PID`). Move between presets **A**, **B**, and **Y**.

**What you'll see:** The sag shrinks, but the elevator starts to **overshoot and bounce** at each preset, and with very high P it may oscillate. Notice that moving **down** usually overshoots more than moving **up**: on the way down, gravity is helping the motor.

Back P off to the highest value that doesn't bounce badly.

### Attempt 3: Add D to stop the bounce
Raise **D** in small steps (try 0.5, then 1.0, then 2.0) until the bounce settles. If the motor starts to buzz or jitter, D is too high.

With D tamping down the bounce, you can usually raise P a bit more, which shrinks the sag further. But the sag never completely goes away.

### Attempt 4: Add I to get rid of the sag
This is where **I** earns its place. While the elevator sits below the target, the integral keeps adding up that error, so the voltage keeps rising until it's exactly the hold voltage, and the error goes to **zero**.

1. Set I small, like 2. Press **B**.
2. Watch the graph: the elevator rises, settles a little low, then **creeps up** to the target over a second or two.
3. Watch **Output (V)** as it creeps. It climbs until it reaches about the hold voltage you measured in Attempt 1.
4. Raise I until the creep is quick but doesn't overshoot. Too much I makes the elevator slowly swing above and below the target.

{% hint style="warning" %}
**Why the IZone matters here**

During a long move from bottom to top, the error is big the whole time. Without a limit, I would pile up a huge total on the way and fling the carriage past the top preset. `setIZone(0.05)` only lets I build up within 5 cm of the target, where it's needed for the last bit.
{% endhint %}

### Attempt 5: Put it all together
With your best P, I, and D:

1. Move bottom → top → middle → bottom. Every preset should arrive quickly, without much bounce, and settle exactly on target.
2. Carefully set a light object (like a bag of small parts) on the carriage while it holds at the middle. Watch it dip, then watch I bring it back to the target. Remove it, and watch it recover the other way.
3. Copy your gains into `Constants` (dashboard edits are lost on reboot).

### Scorecard

| Gains | Arrives in (s) | Overshoot (m) | Error after settling (m) | Holds with weight? |
|---|---|---|---|---|
| P only | | | | |
| P + D | | | | |
| P + I + D | | | | |

### Commit
```bash
git add .
git commit -m "Lab 10: elevator position control"
```

### When it doesn't work

| Problem | Likely cause |
|---|---|
| Elevator runs away upward and stops at the soft limit | Motor and encoder directions disagree. Redo the direction check in Step 4. |
| Elevator doesn't move when you press a preset | The default hold command isn't set, or P is too small to overcome gravity |
| Elevator lurches the instant you enable | The disabled check in `periodic()` is missing |
| Heights are all wrong after a restart | The elevator wasn't at the bottom when the robot turned on. Lower it and press Back. |
| Slow swinging above and below the target | I is too high |
| Big overshoot on long moves only | IZone is too big, or missing |

## Try it
- [ ] Pass the direction check and measure `MetersPerRotation`
- [ ] Find the top and set a safe `MaxHeightMeters`
- [ ] Fill in the sag table for three values of P and find your hold voltage
- [ ] Tune P, then D, then I, and fill in the scorecard
- [ ] Do the weight test with P only, then with P + I + D. What's different?
- [ ] Add a fourth preset on the right bumper
- [ ] Make the WCD's **auto** raise the elevator to the middle, drive forward, then lower it. Use `m_elevator.setTargetCommand(...)` followed by `Commands.waitUntil(m_elevator::atTarget)`.
- [ ] Challenge: if the elevator has a bottom limit switch, make it re-zero the encoder automatically whenever it's pressed ([Lab 4](lab4-limit-switch.md))

## Check yourself
<details>
<summary>Why can't the elevator's PID command end when it arrives, like the wheel's did?</summary>

The elevator needs voltage just to hold still against gravity. If the command ended, the motor would stop pushing and the carriage would fall.

</details>

<details>
<summary>Why do the preset buttons only change the target instead of moving the elevator?</summary>

The hold command is always running as the default command and does all the moving. The buttons just tell it where to go, so there's only ever one thing controlling the motor.

</details>

<details>
<summary>With P only, why does the elevator settle below the target?</summary>

P only makes voltage when there's error. Holding the carriage up takes voltage, so the elevator sinks until the error is big enough to make it: sag = hold voltage ÷ P.

</details>

<details>
<summary>The hold voltage is 0.8 V and P = 20. How much does the elevator sag with P only?</summary>

0.8 ÷ 20 = **0.04 m** (4 cm)

</details>

<details>
<summary>Why does I remove the sag when P alone can't?</summary>

I keeps adding up the error for as long as it lasts, so its output keeps growing until it supplies the hold voltage by itself, and the error reaches zero.

</details>

<details>
<summary>Why does moving down tend to overshoot more than moving up?</summary>

Going down, gravity helps the motor, so the carriage speeds up more and carries more momentum into the target.

</details>

<details>
<summary>What are the soft limits in `setVolts` for?</summary>

They refuse to push past the top or below the bottom, no matter what any command asks for.

</details>
