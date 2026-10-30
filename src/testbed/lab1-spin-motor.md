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

!!! warning "Rename the template's controller first"
    The WPILib template names the controller `m_driverController`, and its port `kDriverControllerPort`. This course calls them **`m_controller`** and **`kControllerPort`**. In VS Code, click on `m_driverController`, press ++f2++ (**Rename Symbol**), and type `m_controller`. Do the same for `kDriverControllerPort` → `kControllerPort`. ++f2++ renames every use at once, so nothing breaks.

Then open `Constants.java` and add a new class inside `Constants`:

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

| Part | What it means |
|---|---|
| `public static class kBrushlessConstants` | A group of constants for the brushless motor, inside `Constants`. You'll use it as `Constants.kBrushlessConstants.BrushlessMotorSpeed`. |
| `public` | Any file can read it |
| `static` | It belongs to the class itself, so you don't need to create a `Constants` object to use it |
| `final` | It can never change while the robot runs. That's what makes it a constant. |
| `int` / `double` | A whole number (CAN IDs, amps) / a number with a decimal point (speeds) |

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
}
```

### The subsystem, piece by piece
That's a lot of new code at once. Here it is again, one piece at a time.

#### 1. The package and the imports
```java
package frc.robot.subsystems;

import com.revrobotics.spark.SparkMax;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants;
// ...and the others
```

- **`package frc.robot.subsystems;`** says which folder this file lives in. It must match the folder, or the build fails.
- Each **`import`** lets this file use a class from somewhere else, by its short name. `com.revrobotics...` classes come from **REVLib** (Lab 0, Part 4). `edu.wpi.first...` classes come from **WPILib**. `frc.robot.Constants` is your own file.
- You rarely type imports yourself. When VS Code underlines a class name in red, click it and use the lightbulb (or ++ctrl+period++) to add the import.

#### 2. The class line
```java
public class SpinBrushlessMotorSubsystem extends SubsystemBase {
```

- **`public class SpinBrushlessMotorSubsystem`** creates a new class. The class name must match the file name exactly.
- **`extends SubsystemBase`** makes it a **subsystem**: WPILib's name for one mechanism and its hardware. Because of `extends`, this class gets everything `SubsystemBase` already has for free, including command builders like `startEnd`, and a `periodic()` method the robot calls every 20 ms.

#### 3. The motor controller
```java
private final SparkMax m_brushlessMotor = new SparkMax(
    Constants.kBrushlessConstants.BrushlessMotorCanId, MotorType.kBrushless);
```

| Part | What it means |
|---|---|
| `private` | Only code inside this class can touch the motor. Everything else has to go through the subsystem's methods. |
| `final` | This variable will always point at this same motor controller. It can't be swapped out by accident. |
| `SparkMax` | The type: a REV SPARK MAX motor controller |
| `m_brushlessMotor` | The variable's name. The `m_` means "member": it belongs to the object, not to one method. |
| `new SparkMax(8, MotorType.kBrushless)` | Creates the object that talks to the SPARK MAX with **CAN ID 8**, which is driving a **brushless** motor |

The CAN ID comes from `Constants`, so if the wiring ever changes, you only change one number in one file.

#### 4. The constructor: setting up the motor
```java
public SpinBrushlessMotorSubsystem() {
  SparkMaxConfig brushlessMotorConfig = new SparkMaxConfig();
  brushlessMotorConfig.smartCurrentLimit(Constants.kBrushlessConstants.BrushlessMotorCurrentLimit);
  brushlessMotorConfig.idleMode(IdleMode.kBrake);
  m_brushlessMotor.configure(
      brushlessMotorConfig, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
}
```

A **constructor** is the method with the same name as the class and no return type. It runs **once**, when `RobotContainer` creates the subsystem with `new SpinBrushlessMotorSubsystem()`.

| Line | What it does |
|---|---|
| `new SparkMaxConfig()` | Makes an empty list of settings. Nothing is sent to the motor controller yet. |
| `smartCurrentLimit(40)` | Adds a setting: never pull more than 40 amps, to protect the motor and the breaker |
| `idleMode(IdleMode.kBrake)` | Adds a setting: when the motor is told 0, actively stop instead of coasting |
| `configure(config, ...)` | Sends all the settings to the SPARK MAX in one go |
| `ResetMode.kResetSafeParameters` | First reset the SPARK MAX to known defaults, so old settings from someone else's code don't linger |
| `PersistMode.kPersistParameters` | Save the settings inside the SPARK MAX, so they survive a power blip during a match |

#### 5. A method that sets the speed
```java
public void setMotorSpeed(double speed) {
  m_brushlessMotor.set(speed);
}
```

- **`public`**: other classes (like `RobotContainer`) can call it.
- **`void`**: it doesn't return anything. It just does something.
- **`double speed`**: it takes one number. `set()` expects **-1.0** (full reverse) to **1.0** (full forward); 0.5 is half power.

#### 6. The command
```java
public Command spinMotorCommand(double speed) {
  return startEnd(
      () -> setMotorSpeed(speed),   // runs once, when the command starts
      () -> setMotorSpeed(0.0)      // runs once, when the command ends
  ).withName("Spin Brushless");
}
```

This method doesn't spin the motor. It **builds and returns a command** that knows how to spin it. The command runs later, when a button starts it.

| Part | What it means |
|---|---|
| `public Command` | The method hands back a `Command` object |
| `startEnd(start, end)` | A WPILib command builder: run `start` once when the command begins, and `end` once when it stops |
| `() -> setMotorSpeed(speed)` | A **lambda**: a little piece of code saved to run later. `()` means it takes no inputs; `->` points at what it does. |
| `.withName("Spin Brushless")` | Gives the command a name, which shows up on the dashboard and in error messages |

Because `startEnd` comes from the subsystem, the command automatically **requires** the subsystem: while it runs, no other command can use this motor at the same time.

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

### Step 6: Commit
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

!!! example "Finished code"
    Stuck, or missed a lab? [**lab01-spin-motor**](https://github.com/Robojacks/frc-course/tree/main/examples/lab01-spin-motor) on GitHub is the complete project as it looks at the end of this lab. It's a full WPILib 2026 project you can open in VS Code, build, and deploy. Try to finish the lab yourself first.

## Try it
- [ ] Spin the motor with A, and stop it by letting go
- [ ] Change `BrushlessMotorSpeed` to 0.25, then 0.75. Deploy each time. Can you hear the difference?
- [ ] Add a **B** button that spins the motor **backward** at the same speed (hint: a negative speed)
- [ ] Add an **X** button that spins it at full speed, 1.0
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

## Next
In [Lab 1.1](lab1b-dashboard.md), you'll put the motor's speed and current on a dashboard and change its speed without redeploying.
