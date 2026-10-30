# Lab 3: Buttons and Triggers

## Why it matters
In Lab 1 you made one button spin a motor while you held it. Real robots need more than that: tap a button to start something, tap another to stop it, flip a mode on and off, run something for exactly two seconds, or use a trigger as a gas pedal.

All of that comes down to **how a command is started and how it ends**. In this lab you'll wire up five different kinds of button on the same motor and watch exactly how each one behaves. Once you've felt the difference, you'll never mix up `whileTrue` and `onTrue` again.

**Before you start:** finish [Lab 1](lab1-spin-motor.md). You'll add to the same **TestBed** project and the same `SpinBrushlessMotorSubsystem`. [Lesson 7.1](../robot-code/07b-scheduler.md) explains what's happening underneath.

## Read this
- [Binding Commands to Triggers](https://docs.wpilib.org/en/stable/docs/software/commandbased/binding-commands-to-triggers.html)
- [Command Decorators](https://docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html)

## Walkthrough

### Two questions every command answers
Every command you bind to a button has to answer two questions:

1. **When does it start?** That's decided by the **binding**: `whileTrue`, `onTrue`, `toggleOnTrue`, and so on.
2. **When does it end?** That's decided by the binding **and** by the command itself: does it finish on its own, or run until something stops it?

Get either one wrong and the motor won't stop when you expect, or won't start at all.

### Step 1: Add more commands to the subsystem
Open `SpinBrushlessMotorSubsystem.java`. You already have `spinMotorCommand`. Add these three below it:

```java
  /** Stops the motor once, then ends immediately. */
  public Command stopCommand() {
    return runOnce(() -> setMotorSpeed(0.0)).withName("Stop");
  }

  /** Spins at a speed for a set number of seconds, then stops on its own. */
  public Command spinForSecondsCommand(double speed, double seconds) {
    return spinMotorCommand(speed).withTimeout(seconds).withName("Spin " + seconds + " s");
  }

  /** Spins at whatever speed the supplier gives, read fresh every 20 ms. */
  public Command spinWithSupplierCommand(DoubleSupplier speed) {
    return runEnd(
        () -> setMotorSpeed(speed.getAsDouble()),   // every loop: read the value, set the motor
        () -> setMotorSpeed(0.0)                     // when it ends: stop
    ).withName("Throttle");
  }
```

Add this import at the top:

```java
import java.util.function.DoubleSupplier;
```

| Command | Ends on its own? | How it ends |
|---|---|---|
| `spinMotorCommand` | **No** | Only when something cancels it. Then it stops the motor. |
| `stopCommand` | **Yes, instantly** | Sets the speed to 0 once and finishes |
| `spinForSecondsCommand` | **Yes** | After the time runs out. `withTimeout` cancels it, which stops the motor. |
| `spinWithSupplierCommand` | **No** | When canceled. Then it stops the motor. |

### Step 2: Bind five buttons
Open `RobotContainer.java`. Keep Lab 1's **A** binding and add the rest in `configureBindings()`:

```java
  private void configureBindings() {
    // A: spin WHILE held (Lab 1)
    m_controller.a().whileTrue(
        m_spinBrushlessMotorSubsystem.spinMotorCommand(
            Constants.kBrushlessConstants.BrushlessMotorSpeed));

    // B: tap to START spinning. Nothing in this binding stops it!
    m_controller.b().onTrue(
        m_spinBrushlessMotorSubsystem.spinMotorCommand(
            Constants.kBrushlessConstants.BrushlessMotorSpeed));

    // X: tap to STOP
    m_controller.x().onTrue(m_spinBrushlessMotorSubsystem.stopCommand());

    // Y: tap once to start, tap again to stop
    m_controller.y().toggleOnTrue(
        m_spinBrushlessMotorSubsystem.spinMotorCommand(
            Constants.kBrushlessConstants.BrushlessMotorSpeed));

    // Right bumper: tap to spin for exactly 2 seconds
    m_controller.rightBumper().onTrue(
        m_spinBrushlessMotorSubsystem.spinForSecondsCommand(
            Constants.kBrushlessConstants.BrushlessMotorSpeed, 2.0));

    // Right trigger: squeeze like a gas pedal. Harder = faster.
    m_controller.rightTrigger().whileTrue(
        m_spinBrushlessMotorSubsystem.spinWithSupplierCommand(
            () -> m_controller.getRightTriggerAxis() * 0.6));   // capped at 60%

    // Show which commands are running, live
    SmartDashboard.putData(CommandScheduler.getInstance());
  }
```

Add the imports `CommandScheduler` and `SmartDashboard` if VS Code underlines them (click the lightbulb).

!!! info "`rightTrigger()` vs. `getRightTriggerAxis()`"
    `rightTrigger()` is a **button**: it becomes true once you squeeze past halfway. `getRightTriggerAxis()` is a **number** from 0 to 1 that tells how far you're squeezing. The binding uses the button to start the command, and the command reads the number every loop.

### Step 3: Test each button and fill in the table
Deploy, open the dashboard, find the **Scheduler** widget, and enable. Test **one button at a time**. For each, write down what you observe:

| Button | Binding | What starts it? | What stops it? | Your notes |
|---|---|---|---|---|
| A | `whileTrue` | | | |
| B | `onTrue` | | | |
| X | `onTrue` (stop) | | | |
| Y | `toggleOnTrue` | | | |
| Right bumper | `onTrue` + timeout | | | |
| Right trigger | `whileTrue` + supplier | | | |

Watch the **Scheduler** widget while you test. You'll see each command's name appear when it starts and disappear when it ends.

### Step 4: The B button puzzle
Tap **B**. The motor spins and keeps spinning after you let go. Now try each of these and explain what happens:

1. Tap **B**, then tap **X**.
2. Tap **B**, then hold **A** and let go.
3. Tap **B**, then tap the **right bumper** and wait.

In every case the motor stops, but for the same reason: **only one command can use a subsystem at a time**. All of these commands belong to `SpinBrushlessMotorSubsystem`, so starting any of them **interrupts** whatever was running. The interrupted command's end action runs, and the new command takes over.

!!! warning "The classic beginner bug"
    `onTrue` with a command that never ends means "start this and never stop it." That's fine when another button stops it (like B and X here), but it's a bug when you meant "while held." If a motor won't stop when you let go, check whether it's bound with `onTrue`.

### Step 5: A default command
Right now, when no command is running, the SPARK MAX just keeps doing whatever it was last told. A **default command** runs whenever nothing else is using the subsystem, so you can make "stopped" the resting state.

In `RobotContainer`'s constructor, before `configureBindings()`:

```java
    m_spinBrushlessMotorSubsystem.setDefaultCommand(
        m_spinBrushlessMotorSubsystem.run(() -> m_spinBrushlessMotorSubsystem.setMotorSpeed(0.0))
            .withName("Idle"));
```

Deploy and watch the Scheduler widget. **Idle** shows whenever no button command is running. Press any button: Idle disappears, the button's command runs, and when it ends, Idle comes right back.

!!! question "Think about it"
    The default command uses `run`, not `runOnce`. Why? (Hint: what would happen if the default command finished instantly? See [Lesson 7.1](../robot-code/07b-scheduler.md).)

### Step 6: Commit
```bash
git add .
git commit -m "Lab 3: button bindings"
```

## Try it
- [ ] Fill in the whole table in Step 3
- [ ] Do the three B puzzles in Step 4 and explain each one in a sentence
- [ ] Change the right bumper's time from 2.0 to 0.5 seconds
- [ ] Add a **left bumper** binding with `onFalse`: the motor spins for 1 second when you **release** the bumper
- [ ] Make the right trigger spin the motor **backward** instead (hint: one minus sign)
- [ ] Bind the **left trigger** so it only works while **A** is also held, using `m_controller.leftTrigger().and(m_controller.a())`. What happens when you press only one of them?

## Check yourself
??? question "What's the difference between `whileTrue` and `onTrue`?"
    `whileTrue` starts the command when the button is pressed and cancels it when released. `onTrue` starts it when pressed and then lets it run until it ends on its own or something interrupts it.

??? question "Why does tapping X stop the motor that B started?"
    Both commands use the same subsystem, and only one command can use a subsystem at a time. Starting X's command interrupts B's command, which runs its end action and stops the motor.

??? question "How does `withTimeout(2.0)` make a never-ending command end?"
    It cancels the command after 2 seconds. Canceling runs the command's end action, which stops the motor.

??? question "Why does the throttle command use a `DoubleSupplier` instead of a plain number?"
    So it reads the trigger every loop. A plain number would be read once when the robot starts, and the speed would never change.

??? question "What does a default command do?"
    It runs whenever no other command is using that subsystem, so the subsystem always has a known resting behavior.
