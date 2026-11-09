# Lab 9: PID for Position and Velocity

## Why it matters
In [Lab 6](lab6-encoder.md) you tried to turn the wheel exactly 10 times. Timing missed by a different amount every run. Bang-bang was consistent, but always overshot, because the wheel was still moving fast when it reached 10.

What you needed was to **slow down as you get close**, and to **correct** if you miss. That's **feedback control**, and **PID** is how almost every robot does it. In this lab you'll add PID to the same `WheelSubsystem` one letter at a time, and watch each letter fix the previous attempt's problem.

It's the same problem as driving exactly 2 meters in auto, raising an elevator to a scoring height, or spinning a turret to a target.

Then, in **Part 2**, you'll use the same encoder and the same `PIDController` for a different job: holding the wheel at a steady **speed**, the way a shooter flywheel or an intake roller does. You'll find out why speed needs one more ingredient that position didn't.

| | Part 1: **position** PID | Part 2: **velocity** PID |
|---|---|---|
| Question | "Where should the wheel **stop**?" | "How **fast** should the wheel spin?" |
| Measurement | Rotations (`getRotations()`) | Rotations per second (`getRps()`) |
| When it ends | When the wheel arrives | When you tell it to stop |
| Real robot examples | Elevator, arm, turret, drive 2 meters | Shooter flywheel, intake, drive wheel speed |

Get both working on the test bed and you're ready for the elevator in [Lab 10](lab10-elevator.md).

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

And for Part 2 (velocity), a second scorecard:

| Attempt | Target (rot/s) | Speed after 2 s | Error | Notes |
|---|---|---|---|---|
| 6. P only, kP = ___ | | | | |
| 6. P only, kP = ___ | | | | |
| 7. kV + P | | | | |

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

!!! info "Where these starting numbers come from"
    They come from the rules in [Lesson 12](../controls/12-pid.md#picking-starting-gains), so you're not guessing:

    - **P = 1.0:** the most voltage this lab allows is 6 V (`MaxVolts`). If the wheel should start slowing down about **6 rotations** from the target, kP = 6 V ÷ 6 rotations = **1.0 V per rotation**.
    - **D starts at 0.** When you need it, try kP × 0.05 s = **0.05** first.
    - **I starts at 0.** When you need it, try kP ÷ 5 s = **0.2** first.

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

`PIDController` is WPILib's PID class. You give it the three gains: **kP**, **kI**, and **kD**. It doesn't know anything about motors or encoders. You hand it numbers, and it hands back a number.

And at the end of the constructor:

```java
        m_pid.setTolerance(kWheelConstants.ToleranceRot, kWheelConstants.ToleranceRps);
        m_pid.setIZone(kWheelConstants.IZone);       // limits integral windup (Attempt 5)
```

| Line | What it does |
|---|---|
| `setTolerance(0.02, 0.1)` | How close counts as "there": within **0.02 rotations** of the target **and** slower than **0.1 rotations per second**. Both have to be true, so it doesn't count as arrived while still swinging past. |
| `setIZone(0.5)` | Only let the I term build up when within 0.5 rotations of the target. You'll see why in Attempt 5. |

### Step 3: Make the gains tunable
You'll try a lot of gains in this lab. Redeploying for every one would take forever, so make them **tunable** from Elastic ([Lab 1.1](lab1b-dashboard.md#step-5-change-the-speed-from-the-dashboard)).

Add these fields to the subsystem, below the others:

```java
    // Gains you can change in Elastic. They start at the values in Constants.
    private final TunableDouble m_kP = Tunables.addDouble("Wheel/kP", kWheelConstants.P);
    private final TunableDouble m_kI = Tunables.addDouble("Wheel/kI", kWheelConstants.I);
    private final TunableDouble m_kD = Tunables.addDouble("Wheel/kD", kWheelConstants.D);
    private final TunableDouble m_iZone = Tunables.addDouble("Wheel/IZone", kWheelConstants.IZone);
```

Import `frc.robot.telemetry.TunableDouble` and `frc.robot.telemetry.Tunables`. Then, at the top of `periodic()`, copy the dashboard's numbers into the controller every loop:

```java
        // Use whatever gains are on the dashboard right now
        m_pid.setPID(m_kP.get(), m_kI.get(), m_kD.get());
        m_pid.setIZone(m_iZone.get());
```

`setPID` replaces all three gains at once. Doing it every loop means a change in Elastic takes effect within 20 ms, even in the middle of a move.

In Elastic, add **kP**, **kI**, **kD**, and **IZone** from **Tunables → Wheel** as **Text Display** widgets, so you can type new values. Add a **Graph** with **Position (rot)** and **Target (rot)** from **Telemetry → Wheel** together.

!!! info "In WPILib 2027"
    This is already the 2027 API: in WPILib 2027, the same lines work with WPILib's own `Tunables` ([Lesson 6.1](../robot-code/06b-dashboards.md#moving-to-2027)).

### Warm up in the simulator
Before touching the real wheel, try the same thing in the **PID Lab** below. It simulates this exact test bed wheel: a 775pro, a gearbox with friction, a 6 V limit, and a move of 10 rotations. The numbers won't match your real wheel exactly, but the behavior will.

Drag a knob up or down (or type a number), and the step response redraws instantly. The faint line is your previous try.

<div class="pidlab" data-mech="wheel" data-terms="P,I,D"></div>

- [ ] With kP, kI, and kD at 0, nothing happens. Why?
- [ ] Raise **kP** until the wheel gets to 10 quickly. At low kP, watch **Final error**: it stops short.
- [ ] Raise **kD** until the overshoot settles down.
- [ ] Add **kI**. Set **IZone** to 0 for a moment and watch the overshoot: that's Attempt 5's windup.
- [ ] Check off all three challenges, then try **Hold the cloth** in the Live view.

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

Piece by piece:

**First, once:**

```java
return runOnce(() -> {
        setTargetFromHere(rotations);
        m_pid.reset();                       // clear old history
    })
```

Pick the target, 10 rotations from here (like Lab 6). Then `m_pid.reset()` clears what the controller remembers from the last move: the I term's running total, and the last error the D term compares against. Without it, an old move could kick this one.

The lambda has curly braces `{ }` because it does two things. Each line inside ends with `;`.

**Then, every loop:**

```java
.andThen(run(() -> {
    double volts = m_pid.calculate(getRotations(), m_target);
    setVolts(MathUtil.clamp(volts, -kWheelConstants.MaxVolts, kWheelConstants.MaxVolts));
}))
```

| Line | What it does |
|---|---|
| `m_pid.calculate(measurement, setpoint)` | The PID math: give it where the wheel **is** and where it **should be**, and it returns how many volts to apply. With P only, that's kP × (target − position). |
| `MathUtil.clamp(volts, -6, 6)` | Never send more than 6 V either way, however big the error is. Far from the target, PID would ask for 10 V; this keeps the test gentle. |
| `setVolts(...)` | Sends it to the motor (and remembers it for the dashboard) |

**Until it arrives, or gives up:**

```java
.until(m_pid::atSetpoint)
.withTimeout(5.0)
.finallyDo(this::stop)
```

| Line | What it does |
|---|---|
| `.until(m_pid::atSetpoint)` | End when the controller says it's within the tolerance you set in Step 2: close enough **and** slow enough |
| `.withTimeout(5.0)` | Give up after 5 seconds, in case it never quite gets there |
| `.finallyDo(this::stop)` | However it ends, stop the motor |

Bind it on the wheel controller:

```java
    m_wheelController.x().onTrue(m_wheel.turnPid(10));   // Attempts 3 to 5
```

1. Make sure **kI** and **kD** are 0 in Elastic (**Tunables → Wheel**).
2. Run `turnPid(10)` three times with kP = 1.0. Record the results.
3. Try kP = 0.3, then 3, then 10. For each, watch **Position** and **Target** on your Elastic graph.

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
2. Raise **kD** in small steps (try 0.02, 0.05, 0.1) until the overshoot disappears. (0.05 is kP × 0.05 seconds of look-ahead, the starting rule from Lesson 12.)
3. If the output starts to buzz or jitter, kD is too high. Back it off.
4. Run three times with your best gains and record the results.

**What you'll see:** With good P and D, the wheel moves quickly and slows smoothly without overshooting. It may still stop a hair short of 10, for the same friction reason as Attempt 3.

### Attempt 5: P + I + D (fix the leftover error)
**The idea:** "If you've been a little short for a while, push a little harder." **I** adds up the error over time. While the wheel sits just short of 10, that total keeps growing, so the push keeps growing until it's enough to beat friction and finish the move.

Still no new code. Keep your P and D from Attempt 4.

1. Set **kI** small, like 0.1, and run `turnPid(10)`. (The Lesson 12 starting rule, kP ÷ 5 seconds, gives 0.2, so 0.1 is a gentle first step.) Watch **Error** on the dashboard: after the wheel slows down, the last little bit should creep to 0.
2. Raise kI (try 0.3, then 0.5) until the leftover error goes away quickly.
3. Too much kI makes the wheel overshoot and slowly swing back and forth. Back it off.
4. Run three times with your best gains and record the results.
5. Copy all three gains into `Constants.java` (dashboard edits are lost on reboot).

!!! warning "Integral windup, and why there's an IZone"
    If I added up error the whole way from 0 to 10, it would build up a huge total during the move and fling the wheel past the target. That's **integral windup**.

    `setIZone(0.5)` in the constructor fixes it: the integral only builds up when the wheel is within 0.5 rotations of the target, and resets to zero outside that. Try setting **IZone** to 20 in Elastic and watch what happens to the overshoot.

**What you'll see:** With P, I, and D tuned, the wheel moves quickly, slows smoothly, and finishes within the tolerance of 10, run after run, even with the cloth on it.

### What you just learned: position
| Attempt | Uses the sensor? | Slows down near the target? | Corrects mistakes? |
|---|---|---|---|
| 1. Timed (Lab 6) | No | No | No |
| 2. Bang-bang (Lab 6) | Only to decide when to stop | No | No |
| 3. P only | Every loop | Yes | Yes, but may stop short |
| 4. P + D | Every loop | Yes, smoothly | Yes, but may stop a hair short |
| 5. P + I + D | Every loop | Yes, smoothly | Yes, all the way to the target |

Each term fixes the previous attempt's problem: **P** gets you close, **D** stops the overshoot, and **I** cleans up whatever is left.

## Part 2: Hold a speed (velocity PID)

### The hardware check
Velocity PID uses the **same** encoder as Part 1: the Through Bore Encoder on the wheel, wired to roboRIO **DIO 0 and 1** with its Dupont cable ([Lab 6](lab6-encoder.md#wiring-the-encoder)). The roboRIO measures speed from the time between encoder pulses, and `getRps()` already reports it in wheel rotations per second.

!!! warning "Encoder plugged into the SPARK MAX?"
    If your test bed's Through Bore Encoder is plugged into the SPARK MAX's data port (through an encoder adapter board), the roboRIO can't see it. Unplug the encoder's JST plug from the adapter and use the cable that came with the encoder: the white 6-pin JST plug goes into the encoder, and the **blue** and **yellow** Dupont plugs go to DIO 0 and DIO 1, black on ⏚ ([Lab 6](lab6-encoder.md#wiring-the-encoder)). Watch **Velocity (rot per s)** on the dashboard while you spin the wheel by hand: it should change, and go negative the other way.

### Step 4: Measure the wheel's speed at 4 volts
You need one number from the real wheel before choosing gains: how fast it spins at a known voltage.

1. Add **Velocity (rot per s)** from **Telemetry → Wheel** to an Elastic **Graph**.
2. Press **A** on the wheel controller (Attempt 1: 4 V for 2 seconds).
3. The graph rises quickly and then goes **flat**. Read the flat part. Do it three times and average.

**Speed at 4 V** = ______ rot/s

That number tells you two things:

- **How fast to aim.** A target a little under that speed needs about 4 V to hold, comfortably under this lab's 6 V limit.
- **How many volts each rot/s needs.** That's called **kV**, and you'll use it in Attempt 7: kV = 4 V ÷ speed at 4 V.

**Worked example:** if the wheel runs at 5.0 rot/s at 4 V, then kV = 4 ÷ 5.0 = **0.8 V per rot/s**, and a good target is **4.0 rot/s**.

### Step 5: Velocity constants
Add these inside `kWheelConstants` too, below the Part 1 gains. Use your own measured speed.

```java
    // Lab 9, Part 2: velocity PID
    public static final double TargetRps = 4.0;      // a bit under your speed at 4 V
    public static final double VelocityP = 1.5;      // volts per (rot per s) of speed error
    public static final double kV = 0.0;             // volts per (rot per s) of target speed (Attempt 7)
    public static final double VelocityToleranceRps = 0.25;  // "at speed" when this close
    public static final int EncoderSamplesToAverage = 4;     // smooths the speed reading
```

!!! info "Where these starting numbers come from"
    - **VelocityP = 1.5:** the Lesson 12 rule, kP = max output ÷ the error that should get full output. If the wheel is stopped, the error is the whole 4 rot/s target, and full output is 6 V: 6 ÷ 4 = **1.5**. Use your own target.
    - **kV starts at 0**, so Attempt 6 is pure feedback. You'll fill it in from Step 4 for Attempt 7.
    - **No kI or kD.** Most velocity loops don't use them. D reacts to changes in speed, which is mostly encoder noise, and I gets replaced by something better in Attempt 7.

### Step 6: Add a velocity controller
Velocity gets its **own** `PIDController`, because its gains mean something different (volts per rot/s, not volts per rotation). Add it as a field, below `m_pid`:

```java
    private final PIDController m_velocityPid = new PIDController(kWheelConstants.VelocityP, 0.0, 0.0);

    private double m_targetRps = 0.0;   // the speed Part 2 is holding, for the dashboard
```

Make its gains and target tunable, below the other tunables:

```java
    private final TunableDouble m_velocityKP = Tunables.addDouble("Wheel/Velocity kP", kWheelConstants.VelocityP);
    private final TunableDouble m_kV = Tunables.addDouble("Wheel/kV", kWheelConstants.kV);
    private final TunableDouble m_targetSpeed = Tunables.addDouble("Wheel/Target Speed (rot per s)", kWheelConstants.TargetRps);
```

At the end of the constructor, smooth the speed reading:

```java
        // Speed is measured from the time between pulses. Averaging a few makes it steadier.
        m_encoder.setSamplesToAverage(kWheelConstants.EncoderSamplesToAverage);
```

With 4x decoding, the edges of channels A and B aren't perfectly evenly spaced, so the time between any two of them jitters a little. Averaging the last 4 smooths that out, which matters a lot here: velocity PID reacts to every wiggle in the speed reading.

Add the command, below `turnPid`:

```java
public Command holdSpeed() {
    return runOnce(m_velocityPid::reset)                 // clear old history
        .andThen(run(() -> {
            m_targetRps = m_targetSpeed.get();           // read the dashboard every loop
            double feedforward = m_kV.get() * m_targetRps;                 // Attempt 7
            double feedback = m_velocityPid.calculate(getRps(), m_targetRps);
            double volts = feedforward + feedback;
            setVolts(MathUtil.clamp(volts, -kWheelConstants.MaxVolts, kWheelConstants.MaxVolts));
        }))
        .finallyDo(() -> {
            m_targetRps = 0.0;
            stop();
        })
        .withName("Attempts 6-7: Hold Speed");
}
```

| Part | What it does |
|---|---|
| `m_velocityPid.calculate(getRps(), m_targetRps)` | The same PID math as Part 1, but on **speed**: kP × (target speed − measured speed) |
| `feedforward = kV × target` | A guess at the voltage this speed needs, worked out **before** looking at the encoder. It's 0 until Attempt 7. |
| `volts = feedforward + feedback` | The guess does most of the work; PID corrects whatever the guess gets wrong |
| No `.until(...)` | A position move ends when it arrives. A speed is something you **hold**, so this runs until you cancel it. |
| `.finallyDo(...)` | However it ends, stop the motor and clear the target |

In `periodic()`, keep the velocity gain up to date, next to `m_pid.setPID(...)`:

```java
        m_velocityPid.setP(m_velocityKP.get());
```

And log the speed target and error, with the other telemetry:

```java
        m_telemetry.log("Target Speed (rot per s)", m_targetRps);
        m_telemetry.log("Speed Error (rot per s)", m_targetRps - getRps());
        m_telemetry.log("At Speed", m_targetRps != 0.0
            && Math.abs(m_targetRps - getRps()) < kWheelConstants.VelocityToleranceRps);
```

**At Speed** is what a real shooter waits for before feeding a game piece.

Bind it on the wheel controller, in `configureBindings()`:

```java
    m_wheelController.y().toggleOnTrue(m_wheel.holdSpeed());   // Attempts 6 and 7: tap to start, tap to stop
```

In Elastic, add **Velocity kP**, **kV**, and **Target Speed** from **Tunables → Wheel**, and put **Velocity (rot per s)** and **Target Speed (rot per s)** on one graph. Add **At Speed** as a **Boolean Box**.

### Warm up in the simulator
This is the PID Lab again, now holding the same test bed wheel at a **speed** (4 rot/s), just like Part 2. It has **kV** and **kS** (feedforward) and **kP** (feedback).

<div class="pidlab" data-mech="wheelspeed" data-terms="P" data-ff="kS,kV"></div>

- [ ] Leave kV and kS at 0 and raise **kP**. Does it ever reach 4 rot/s? Read the note under the graph.
- [ ] Set kP back to 0. Set **kV to 0.8** and **kS to 0.25**. Does the wheel get to 4 rot/s on its own?
- [ ] Now add a little kP on top, and press **Hold the cloth** in the Live view. Turn on the **P** chip and watch P push the voltage up.
- [ ] Set **Noise** to 1% and raise kP a lot. What happens to the voltage?

### Attempt 6: P only (feedback alone)
1. Make sure **kV** is 0 in Elastic.
2. Tap **Y**. Watch **Velocity** and **Target Speed** on your graph for 3 or 4 seconds, then tap **Y** again to stop.
3. Record the speed it settles at.
4. Double **Velocity kP** and try again. Then double it again.

**What you'll see:**

| Velocity kP | Behavior |
|---|---|
| Low | Spins up, but settles well **below** the target and stays there |
| Higher | Closer to the target, but still below it |
| Too high | The speed and the voltage start to buzz and jitter, and it **still** doesn't quite reach the target |

**Why it can never get there:** to keep spinning at 4 rot/s, the wheel needs about 3 or 4 volts, all the time, just to fight friction. But P only pushes when there's **error**. If the wheel ever reached the target, the error would be 0, P would ask for 0 V, and the wheel would slow down. So it settles at the speed where kP × error equals the voltage it needs. Raising kP shrinks that gap but never closes it, and soon the noise in the speed reading makes the output jitter.

This is the big difference from position: a wheel sitting **still** at its target needs 0 V, but a wheel **spinning** at its target needs voltage the whole time.

### Attempt 7: kV + P (feedforward does the work)
**The idea:** don't wait for an error. You already know about how many volts this speed needs, because you measured it in Step 4. Apply that from the start, and let P fix whatever is left.

```
volts = kV × target speed  +  kP × speed error
         (feedforward)        (feedback)
```

1. Work out **kV = 4 V ÷ your speed at 4 V** and type it into **kV** in Elastic.
2. Set **Velocity kP** back to your Step 5 value.
3. Tap **Y**. The wheel should go almost straight to the target and stay there, and **At Speed** should light up.
4. Change **Target Speed** in Elastic while it's running. It should follow each new speed quickly.
5. Gently drag the cloth against the wheel. The speed dips a little, and P pushes the voltage up to bring it back. (Don't stop the wheel: the 775pro must never stall.)
6. Copy your kV and Velocity kP into `Constants.java`.

**What you'll see:** with kV doing most of the work, kP can be **smaller** than in Attempt 6 and the wheel still holds speed better, with less jitter. Feedforward handles what you can predict; feedback handles what you can't.

!!! info "Why not use I instead?"
    I can fix the gap in Attempt 6 too: it adds up the error until the voltage is enough. But it's slow to build up, overshoots when the target changes, and has to build up all over again at every new speed. A feedforward is right immediately, at every speed. That's why teams use feedforward for velocity. [Lesson 13](../controls/13-feedforward.md) covers it fully, including **kS** for friction and how **SysId** measures kV for you.

### What you just learned: velocity
| Attempt | Reaches the target speed? | Why |
|---|---|---|
| 6. P only | No, always a little slow | P only pushes when there's error, but spinning needs voltage all the time |
| 7. kV + P | Yes | kV supplies the voltage the speed needs; P corrects the rest |

| | Position (Part 1) | Velocity (Part 2) |
|---|---|---|
| Volts needed **at** the target | 0, the wheel is sitting still | Some, all the time, to keep it spinning |
| P alone | Gets close; friction leaves a small gap | Always short |
| What closes the gap | I (with an IZone) | Feedforward (kV) |
| D | Useful, stops overshoot | Usually 0, it mostly amplifies noise |

### Commit
```bash
git add .
git commit -m "Lab 9: position and velocity PID on the wheel"
```

!!! example "Finished code"
    Stuck, or missed a lab? [**lab09-pid-wheel**](https://github.com/Robojacks/frc-course/tree/main/examples/lab09-pid-wheel) on GitHub is the complete project as it looks at the end of this lab. It's a full WPILib 2026 project you can open in VS Code, build, and deploy. Try to finish the lab yourself first.

## Try it
- [ ] Complete the scorecard: Attempts 3 to 5, three runs each
- [ ] Graph Position and Target for Attempts 2 through 5, and screenshot each
- [ ] Hold the cloth against the wheel during Attempts 4 and 5. Which one still reaches 10?
- [ ] Press X three times in a row, waiting for each to finish. Does the wheel end at 10, 20, and 30? Compare with bang-bang in Lab 6.
- [ ] Add `turnPid(-10)` on another button and make sure it comes back to where it started
- [ ] Challenge: use the test bed's 10-turn knob from [Lab 5](lab5-knob-speed.md) to set the target, so the wheel follows the knob turn for turn
- [ ] Complete the velocity scorecard: Attempt 6 at two kP values, and Attempt 7
- [ ] Velocity: set kV to 0, Velocity kP to 0, and add kI to the velocity controller instead. How long does it take to reach speed? What happens when you change Target Speed?
- [ ] Velocity: make kV 20% too big on purpose. Does the wheel go too fast? Does P fix it?
- [ ] Challenge: use the knob to set **Target Speed**, so the knob controls the wheel's speed with velocity PID instead of raw power like Lab 5

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

??? question "Why can't P alone hold the wheel at its target speed?"
    Spinning at a speed takes voltage all the time. P only gives voltage when there's error, so the wheel settles at whatever speed makes kP × error equal to the voltage it needs, which is always a little below the target.

??? question "Your wheel spins at 6.0 rot/s at 4 V. What's kV, and what feedforward voltage does a 5.0 rot/s target get?"
    kV = 4 ÷ 6.0 ≈ **0.67 V per rot/s**. Feedforward = 0.67 × 5.0 ≈ **3.3 V**.

??? question "Why does `holdSpeed` have no `.until(...)`, when `turnPid` does?"
    A position move is finished once the wheel arrives. A speed is something you keep holding, so the command runs until it's cancelled (by tapping Y again).

??? question "Why does the velocity controller use its own `PIDController` instead of sharing `m_pid`?"
    The gains mean different things: position kP is volts per rotation of error, velocity kP is volts per rot/s of error. They also need separate history (the last error the D term and I term remember).
