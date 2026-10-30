# Lab 9: Turn the Wheel Exactly 10 Times with PID

## Why it matters
In [Lab 6](lab6-encoder.md) you tried to turn the wheel exactly 10 times. Timing missed by a different amount every run. Bang-bang was consistent, but always overshot, because the wheel was still moving fast when it reached 10.

What you needed was to **slow down as you get close**, and to **correct** if you miss. That's **feedback control**, and **PID** is how almost every robot does it. In this lab you'll add PID to the same `WheelSubsystem` one letter at a time, and watch each letter fix the previous attempt's problem.

It's the same problem as driving exactly 2 meters in auto, raising an elevator to a scoring height, or spinning a turret to a target. Get this right on the test bed and you're ready for the elevator in [Lab 10](lab10-elevator.md).

**Before you start:** finish [Lab 6](lab6-encoder.md) and keep its scorecard. Read [Lesson 12](../controls/12-pid.md) (PID) first.

## Read this
- [Introduction to PID](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/introduction-to-pid.html)
- [PID Control in WPILib](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/controllers/pidcontroller.html)

## Walkthrough

!!! danger "Safety"
    Same rules as Lab 6: keep clear of the wheel, never stall the 775pro, and keep someone ready to disable. A badly tuned PID can swing the wheel back and forth hard.

### The scorecard
Add three rows to your Lab 6 scorecard:

| Attempt | Run 1 | Run 2 | Run 3 | Worst error | Notes |
|---|---|---|---|---|---|
| 3. P only | | | | | |
| 4. P + D | | | | | |
| 5. P + I + D | | | | | |

### Step 1: Add the PID gains
```java
    // Add these inside kWheelConstants
    public static final double P = 1.0;              // volts per rotation of error
    public static final double I = 0.0;              // volts per (rotation × second) of error
    public static final double D = 0.0;              // volts per (rotation per second)
    public static final double IZone = 0.5;          // only build up I within 0.5 rotations
    public static final double ToleranceRot = 0.02;  // 0.02 rotations ≈ 7°
    public static final double ToleranceRps = 0.1;   // "nearly stopped"
```

### Step 2: Add a PID controller to the subsystem
Open `WheelSubsystem.java`. Add the imports:

```java
import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.PIDController;
```

Add the controller as a field, next to the encoder:

```java
    private final PIDController m_pid =
        new PIDController(kWheelConstants.P, kWheelConstants.I, kWheelConstants.D);
```

And at the end of the constructor:

```java
        m_pid.setTolerance(kWheelConstants.ToleranceRot, kWheelConstants.ToleranceRps);
        m_pid.setIZone(kWheelConstants.IZone);       // limits integral windup (Attempt 5)
        SmartDashboard.putData("Wheel/PID", m_pid);  // tune P, I, and D live from the dashboard
```

`SmartDashboard.putData("Wheel/PID", m_pid)` puts the gains on the dashboard, where you can **edit them while the robot runs**. No redeploying between tries.

### Warm up in the simulator
Before touching the real wheel, try the same idea in WPILib's turret simulator below. A turret is a lot like the test bed wheel: a motor turning something to an exact angle, with no gravity. It's running **PID only**.

Click a spot around the circle to set a new angle.

<div class="viz-div" id="lab9_turret_container">
<div>
<div class="col" id="lab9_turret_plotVals"></div>
<div class="col" id="lab9_turret_plotVolts"></div>
</div>
<div class="flex-grid">
<div class="col" id="lab9_turret_viz"></div>
<div id="lab9_turret_ctrls"></div>
</div>
<script>new TurretPIDF("lab9_turret", "feedback");</script>
</div>

<p class="credit">Interactive simulator from the WPILib docs, <a href="https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-turret.html">Tuning a Turret Position Controller</a> (CC BY 4.0).</p>

- [ ] With kP, kI, and kD at 0, click a new angle. Nothing happens. Why?
- [ ] Raise **kP** until the turret moves sharply to each new angle. If it oscillates, lower it.
- [ ] Raise **kD** until the overshoot settles down.

Now do the same thing on the real wheel.

### Attempt 3: P only (slow down as you get close)
**The idea:** "Push in proportion to how far away you are." Far away: push hard. Almost there: push gently. That's the **P** in PID.

```
volts = kP × error
```

With kP = 1.0, at 10 rotations away that's 10 V (clamped to 6 V). At 1 rotation away, 1 V. At 0.1 away, 0.1 V.

```java
public Command turnPid(double rotations) {
    return runOnce(() -> {
            setTargetFromHere(rotations);
            m_pid.reset();                       // clear old history
        })
        .andThen(run(() -> {
            double volts = m_pid.calculate(getRotations(), m_target);
            setVolts(MathUtil.clamp(volts, -kWheelConstants.MaxVolts, kWheelConstants.MaxVolts));
        }))
        .until(m_pid::atSetpoint)                // within tolerance AND nearly stopped
        .withTimeout(5.0)                        // give up if it never gets there
        .finallyDo(this::stop)
        .withName("Attempts 3-5: PID");
}
```

Bind it on the wheel controller:

```java
    m_wheelController.x().onTrue(m_wheel.turnPid(10));   // Attempts 3 to 5
```

1. Make sure **kI and kD are 0** on the dashboard (`Wheel/PID`).
2. Run `turnPid(10)` three times with kP = 1.0. Record the results.
3. Try kP = 0.3, then 3, then 10. For each, graph **Position** and **Target** together in Glass or AdvantageScope.

**What you'll see:**

| kP | Behavior |
|---|---|
| Too low | Slow, and stops **short** of 10. Near the target the voltage gets so small it can't overcome the gearbox's friction, so the wheel stalls a little early. That leftover is **steady-state error**. |
| About right | Fast, and stops close to 10 |
| Too high | Shoots past 10, swings back, maybe oscillates |

Unlike bang-bang, if the wheel overshoots, P **pushes it back**. It corrects itself in both directions.

!!! info "Why a timeout?"
    If kP is too low, the wheel may stall just short of the tolerance and `atSetpoint()` never becomes true. The timeout ends the command anyway, so the motor doesn't sit there pushing forever.

### Attempt 4: P + D (stop the overshoot)
**The idea:** "Slow down when you're approaching fast." **D** looks at how fast the error is shrinking and pushes against that motion, like a shock absorber.

No new code: the same `turnPid` command uses whatever gains are in the controller.

1. Set kP high enough that it overshoots a little.
2. Raise **kD** in small steps (try 0.02, 0.05, 0.1) until the overshoot disappears.
3. If the output starts to buzz or jitter, kD is too high. Back it off.
4. Run three times with your best gains and record the results.

**What you'll see:** With good P and D, the wheel moves quickly and slows smoothly without overshooting. It may still stop a hair short of 10, for the same friction reason as Attempt 3.

### Attempt 5: P + I + D (fix the leftover error)
**The idea:** "If you've been a little short for a while, push a little harder." **I** adds up the error over time. While the wheel sits just short of 10, that total keeps growing, so the push keeps growing until it's enough to beat friction and finish the move.

Still no new code. Keep your P and D from Attempt 4.

1. Set **kI** small, like 0.1, and run `turnPid(10)`. Watch **Error** on the dashboard: after the wheel slows down, the last little bit should creep to 0.
2. Raise kI (try 0.3, then 0.5) until the leftover error goes away quickly.
3. Too much kI makes the wheel overshoot and slowly swing back and forth. Back it off.
4. Run three times with your best gains and record the results.
5. Copy all three gains into `Constants.java` (dashboard edits are lost on reboot).

!!! warning "Integral windup, and why there's an IZone"
    If I added up error the whole way from 0 to 10, it would build up a huge total during the move and fling the wheel past the target. That's **integral windup**.

    `setIZone(0.5)` in the constructor fixes it: the integral only builds up when the wheel is within 0.5 rotations of the target, and resets to zero outside that. Try setting the IZone to 20 on the dashboard and watch what happens to the overshoot.

**What you'll see:** With P, I, and D tuned, the wheel moves quickly, slows smoothly, and finishes within the tolerance of 10, run after run, even with the cloth on it.

### What you just learned
| Attempt | Uses the sensor? | Slows down near the target? | Corrects mistakes? |
|---|---|---|---|
| 1. Timed (Lab 6) | No | No | No |
| 2. Bang-bang (Lab 6) | Only to decide when to stop | No | No |
| 3. P only | Every loop | Yes | Yes, but may stop short |
| 4. P + D | Every loop | Yes, smoothly | Yes, but may stop a hair short |
| 5. P + I + D | Every loop | Yes, smoothly | Yes, all the way to the target |

Each term fixes the previous attempt's problem: **P** gets you close, **D** stops the overshoot, and **I** cleans up whatever is left.

### Commit
```bash
git add .
git commit -m "Lab 9: PID on the wheel"
```

## Try it
- [ ] Complete the scorecard: Attempts 3 to 5, three runs each
- [ ] Graph Position and Target for Attempts 2 through 5, and screenshot each
- [ ] Hold the cloth against the wheel during Attempts 4 and 5. Which one still reaches 10?
- [ ] Press X three times in a row, waiting for each to finish. Does the wheel end at 10, 20, and 30? Compare with bang-bang in Lab 6.
- [ ] Add `turnPid(-10)` on another button and make sure it comes back to where it started
- [ ] Challenge: use the test bed's 10-turn knob from [Lab 5](lab5-knob-speed.md) to set the target, so the wheel follows the knob turn for turn

## Check yourself
??? question "With kP = 2.0, the wheel is 0.5 rotations from the target. What voltage does P command?"
    2.0 × 0.5 = **1.0 V**

??? question "Why does a low kP stop short of 10?"
    Near the target, the error is tiny, so the voltage is tiny, and it's not enough to overcome friction in the gearbox. The wheel stalls a little early.

??? question "What does adding kD do, and what happens if it's too high?"
    D pushes against fast motion, so the wheel slows down before reaching the target instead of overshooting. Too much D makes the output buzz, because it reacts to small noisy changes in the encoder.

??? question "The wheel stops 0.05 rotations short every time. Which term fixes it, and how?"
    **I.** While the wheel sits short, the integral keeps adding up the error, so the output grows until it beats friction and the wheel finishes the move.

??? question "What is integral windup, and what does `setIZone` do about it?"
    Windup is the integral building up a huge total during a long move, then flinging the mechanism past the target. `setIZone` only lets the integral build up when the error is small, near the target.

??? question "Why does `turnPid` have a timeout?"
    If the wheel stalls just outside the tolerance, `atSetpoint()` never becomes true. The timeout ends the command so the motor doesn't keep pushing forever.
