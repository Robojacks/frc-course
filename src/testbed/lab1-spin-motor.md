# Lab 1: Spin a Brushless Motor

## Why it matters
This is the moment every new programmer waits for: you press a button, and something you wrote makes a real motor spin.

In this lab you'll write your first **subsystem** and your first **command**, bind it to a controller button, and spin the test bed's brushless motor. It's the same pattern every mechanism on a real robot uses, from intakes to shooters, so you'll use it again and again.

**Before you start:** finish [Lab 0](lab0-first-project.md). You'll add to the same **TestBed** project. [Lesson 7](../robot-code/07-command-based.md) explains subsystems and commands in depth; you can do this lab first and read it after. New to the NEO or the SPARK MAX? Read Lessons [4.1](../hardware/04b-motors.md) and [4.2](../hardware/04c-spark-max.md). You should also have finished an interactive Java course through classes and objects ([see the checklist](../foundations/03-java.md#learn-java-first)); keep the [Java Reference](../foundations/03-java.md) open while you work.

## Read this
- [Subsystems](https://docs.wpilib.org/en/stable/docs/software/commandbased/subsystems.html)
- [Binding Commands to Triggers](https://docs.wpilib.org/en/stable/docs/software/commandbased/binding-commands-to-triggers.html)
- [REVLib: SPARK MAX vs. SPARK Flex](https://docs.revrobotics.com/revlib/spark/max-vs-flex)

## Walkthrough

### The hardware

| Part | Details |
|---|---|
| Motor | A **brushless** motor (like a REV NEO) |
| Motor controller | SPARK MAX, CAN ID **8**, connected to the roboRIO over CAN |
| Controller | An Xbox controller plugged into the Driver Station laptop |

!!! danger "Brushless means brushless"
    In code, a brushless motor like a NEO must be set up as `MotorType.kBrushless`. Running a brushless motor in brushed mode can damage the motor and the SPARK MAX. Double-check this line every time.

### Step 1: Check the SPARK MAX
Before writing code, make sure the hardware is what the code will expect.

1. Power the test bed and connect the SPARK MAX to your laptop with a **USB-C** cable.
2. Open the **REV Hardware Client**. The SPARK MAX should appear.
3. Check that its **CAN ID is 8**. If the code and the controller disagree on the ID, nothing spins and there's no error.
4. If the Hardware Client says a **firmware update** is available, ask a mentor before updating.

### Step 2: Constants
Never put numbers like CAN IDs and speeds directly in your code. Put them in `Constants.java`, so there's one place to change them.

Open `Constants.java` and add a new class inside `Constants`:

```java
public final class Constants {
  public static class OperatorConstants {
    public static final int kControllerPort = 0;
  }

  public static class kBrushlessConstants {
    public static final int BrushlessMotorCanId = 8;         // must match the REV Hardware Client
    public static final double BrushlessMotorSpeed = 0.5;    // 50% power
    public static final int BrushlessMotorCurrentLimit = 40; // amps
  }
}
```

!!! info "Why a current limit of 40 amps?"
    The test bed's power distribution has **40 A breakers**. A limit above 40 A can trip the breaker if the motor gets stuck. If your motor is a small **NEO 550**, use about **20 A** instead, because it can overheat quickly at 40.

### Step 3: Create the subsystem
A **subsystem** is a class that owns a piece of hardware and offers actions for it. Ours owns one motor.

1. In VS Code, right-click the `subsystems` folder.
2. Choose **Create a new class/command**, then **Subsystem (New)**.
3. Name it `SpinBrushlessMotorSubsystem`.

Replace what's in the file with this. Read every comment.

```java
package frc.robot.subsystems;

import com.revrobotics.PersistMode;
import com.revrobotics.ResetMode;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.config.SparkMaxConfig;

import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants;

public class SpinBrushlessMotorSubsystem extends SubsystemBase {
  // Create the motor controller: CAN ID 8, brushless motor.
  // private final = only this class can use it, and it can't be swapped for another.
  private final SparkMax m_brushlessMotor = new SparkMax(
      Constants.kBrushlessConstants.BrushlessMotorCanId, MotorType.kBrushless);

  public SpinBrushlessMotorSubsystem() {
    // Collect the settings we want in a config object
    SparkMaxConfig brushlessMotorConfig = new SparkMaxConfig();

    // Limit how much current the motor can pull, to protect the motor and the breaker
    brushlessMotorConfig.smartCurrentLimit(Constants.kBrushlessConstants.BrushlessMotorCurrentLimit);

    // Brake mode: when we stop, the motor actively stops instead of coasting
    brushlessMotorConfig.idleMode(IdleMode.kBrake);

    // Send the settings to the SPARK MAX.
    // kResetSafeParameters: start from known defaults, then apply ours.
    // kPersistParameters: save them, so they survive if the SPARK MAX loses power mid-match.
    m_brushlessMotor.configure(
        brushlessMotorConfig, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
  }

  /** Sets the motor's power, from -1.0 (full reverse) to 1.0 (full forward). */
  public void setMotorSpeed(double speed) {
    m_brushlessMotor.set(speed);
  }

  /**
   * A command that spins the motor at a speed while it runs,
   * and stops the motor when it ends.
   */
  public Command spinMotorCommand(double speed) {
    return startEnd(
        () -> setMotorSpeed(speed),   // runs once, when the command starts
        () -> setMotorSpeed(0.0)      // runs once, when the command ends
    ).withName("Spin Brushless");
  }

  @Override
  public void periodic() {
    // Runs every 20 ms. Send live values to the dashboard so you can see what the motor is doing.
    SmartDashboard.putNumber("Brushless/Velocity (RPM)", m_brushlessMotor.getEncoder().getVelocity());
    SmartDashboard.putNumber("Brushless/Current (A)", m_brushlessMotor.getOutputCurrent());
    SmartDashboard.putNumber("Brushless/Applied Output", m_brushlessMotor.getAppliedOutput());
  }
}
```

Three ideas in this file are worth slowing down for:

| Code | What it means |
|---|---|
| `new SparkMax(8, MotorType.kBrushless)` | "Talk to the SPARK MAX at CAN ID 8, which drives a brushless motor." |
| `SparkMaxConfig` and `configure(...)` | Settings like current limit and brake mode are collected first, then sent to the controller all at once. |
| `startEnd(start, end)` | Builds a **command**: run `start` when it begins, run `end` when it stops. Because it comes from the subsystem, the command automatically "owns" the motor while it runs. |

!!! tip "Where does `startEnd` come from?"
    Your class `extends SubsystemBase`, so it gets WPILib's command-building methods for free: `startEnd`, `run`, `runOnce`, and more ([Lesson 7](../robot-code/07-command-based.md)).

### Step 4: Bind it to a button
Open `RobotContainer.java`. Make three changes.

**1. Import the subsystem** at the top, with the other imports:

```java
import frc.robot.subsystems.SpinBrushlessMotorSubsystem;
```

**2. Create the subsystem**, next to the example one:

```java
private final ExampleSubsystem m_exampleSubsystem = new ExampleSubsystem();
private final SpinBrushlessMotorSubsystem m_spinBrushlessMotorSubsystem =
    new SpinBrushlessMotorSubsystem();
```

**3. Bind the A button** in `configureBindings()`:

```java
private void configureBindings() {
  // Spin the brushless motor while A is held
  m_controller.a().whileTrue(
      m_spinBrushlessMotorSubsystem.spinMotorCommand(
          Constants.kBrushlessConstants.BrushlessMotorSpeed));
}
```

Read it out loud: *"While A is held, spin the brushless motor at the speed from Constants."*

`whileTrue` starts the command when you press A and **cancels** it when you let go. Canceling runs the command's end action, `setMotorSpeed(0.0)`, which stops the motor.

### Step 5: Build, deploy, and spin
1. **Build** (++ctrl+shift+p++ → **WPILib: Build Robot Code**) and fix any errors.
2. Power the test bed, connect, and **Deploy**.
3. Plug the Xbox controller into the Driver Station laptop. On the Driver Station's **USB** tab (the icon that looks like a USB plug), make sure it's in slot **0** and the bar moves when you press buttons.
4. Clear the area, say **"Enabling!"**, and enable **TeleOperated**.
5. **Hold A.** The motor spins.
6. **Let go.** The motor stops.

🎉 That's your code moving real hardware.

### Step 6: Watch it on the dashboard
Open **Glass** or **Elastic** (from the WPILib tools), connect to team 4674, and find the **Brushless** values. Hold A and watch:

| Value | What you'll see |
|---|---|
| Velocity (RPM) | Climbs quickly, then levels off at a steady speed |
| Current (A) | Jumps up as the motor starts, then drops once it's at speed |
| Applied Output | 0.5 while A is held, 0 when released |

That jump in current at startup is why current limits matter: starting a motor takes much more current than keeping it spinning.

### Step 7: Commit
```bash
git add .
git commit -m "Lab 1: spin brushless motor on A"
```

### When it doesn't work

| Problem | Likely cause |
|---|---|
| Nothing happens when you hold A | Robot not enabled, or the controller isn't in slot 0 on the Driver Station USB tab |
| Still nothing, and the console mentions CAN or SPARK MAX errors | The CAN ID in `Constants` doesn't match the REV Hardware Client, or a CAN wire is loose |
| Motor keeps spinning after you let go | The command doesn't stop the motor when it ends. Check that you used `startEnd` with `setMotorSpeed(0.0)` as the end action. |
| Motor spins the wrong way | Add `brushlessMotorConfig.inverted(true);` in the constructor |
| Build error: cannot find symbol `SparkMax` | REVLib isn't installed. Go back to Lab 0, Part 4. |

## Try it
- [ ] Spin the motor with A, and stop it by letting go
- [ ] Change `BrushlessMotorSpeed` to 0.25, then 0.75. Deploy each time and watch the RPM on the dashboard.
- [ ] Add a **B** button that spins the motor **backward** at the same speed (hint: a negative speed)
- [ ] Add an **X** button that spins it at full speed, 1.0. Watch the current. How high does it jump at the start?
- [ ] Change `IdleMode.kBrake` to `IdleMode.kCoast`. How is stopping different? Change it back.
- [ ] **Break it on purpose:** change `spinMotorCommand` to use `runOnce(() -> setMotorSpeed(speed))` instead of `startEnd`. Hold A, then let go. What happens, and why? (Disable the robot to stop it.) Then change it back.

## Check yourself
??? question "What does `MotorType.kBrushless` tell the SPARK MAX, and why does it matter?"
    That it's driving a brushless motor like a NEO. Brushed and brushless motors are driven completely differently, and the wrong setting can damage the hardware.

??? question "Why are the CAN ID, speed, and current limit in `Constants` instead of in the subsystem?"
    So there's one place to find and change them, and the code says what each number means.

??? question "What does `startEnd` do?"
    It builds a command that runs one action when it starts (spin the motor) and another when it ends (stop the motor).

??? question "Why does the motor stop when you let go of A?"
    `whileTrue` cancels the command when the button is released, and canceling runs the command's end action, which sets the speed to 0.

??? question "In the 'break it on purpose' exercise, why did the motor keep spinning?"
    `runOnce` sets the speed once and then **finishes immediately**. When you release A, there's nothing left to cancel, so nothing sets the speed back to 0. The SPARK MAX keeps doing what it was last told until the robot is disabled.

??? question "Why does the current jump when the motor starts?"
    A motor that isn't moving yet pulls much more current than one that's already spinning. The current limit keeps that jump from tripping the breaker or browning out the robot.
