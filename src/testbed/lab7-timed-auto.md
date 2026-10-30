# Lab 7: Timed Autonomous on the WCD

## Why it matters
The first 15 seconds of every FRC match are **autonomous**: the robot runs entirely on its own code, with no driver input. A robot that does something useful in auto starts every match ahead.

In this lab you'll make the West Coast Drive drive a pattern by itself, and let the drive team pick which pattern from a menu on the dashboard. You'll use only **time** to decide how far to go, and you'll find out why that's not good enough. That sets up [Lab 8](lab8-navx-gyro.md), where the robot uses a gyro to know how far it has really turned.

**Before you start:** finish [Lab 2](lab2-west-coast-drive.md). You'll add to the same **WestCoastDrive** project. [Lesson 11](../project/11-autonomous.md) covers autonomous in more depth.

## Read this
- [Command Compositions](https://docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html)
- [Choosing an Autonomous Program](https://docs.wpilib.org/en/stable/docs/software/dashboards/smartdashboard/choosing-an-autonomous-program-from-smartdashboard.html)

## Walkthrough

!!! danger "Autonomous safety"
    In auto, **nobody is steering**. The robot drives the moment it's enabled.

    - Clear a big space and keep everyone out of the robot's path.
    - One person's only job is the disable key (++enter++) and the emergency stop (++space++).
    - Test each new routine **on blocks first**.
    - Keep `MaxOutput` at 0.5 from Lab 2.

### How autonomous runs
You don't have to write any of this, but you should know it's there. In `Robot.java`, the template already does:

1. When auto starts, `autonomousInit()` asks `RobotContainer.getAutonomousCommand()` for a command and **schedules** it.
2. The scheduler runs it every 20 ms until it ends.
3. When teleop starts, `teleopInit()` **cancels** it, in case it's still running.

So your whole job is to make `getAutonomousCommand()` return the right command. While an auto command is using the drivetrain, the joystick default command pauses, then comes back when auto ends.

### Step 1: A command that drives for a set time
Open `DriveSubsystem.java` and add:

```java
  /** Drives each side at a fixed speed for a set time, then stops. */
  public Command driveForSecondsCommand(double leftSpeed, double rightSpeed, double seconds) {
    return run(() -> m_drive.tankDrive(leftSpeed, rightSpeed, false))  // false = don't square
        .withTimeout(seconds)
        .finallyDo(() -> m_drive.stopMotor())
        .withName("Drive " + seconds + " s");
  }
```

| Piece | Why |
|---|---|
| `tankDrive(left, right, false)` | The `false` turns off squaring, so 0.4 means 40%, not 16% |
| `withTimeout(seconds)` | Ends the command after that many seconds |
| `finallyDo(...)` | Runs when the command ends **for any reason** (finished, timed out, or canceled), so the motors always stop |

With this one command you can drive forward (both sides the same), backward (both negative), or spin in place (sides opposite). Remember the skid steer levers from Lab 2.

### Step 2: Build routines from pieces
Routines are just commands chained together. Add these methods to `RobotContainer.java`:

```java
  /** Drive straight forward for 2 seconds. */
  private Command driveForwardAuto() {
    return m_driveSubsystem.driveForSecondsCommand(0.4, 0.4, 2.0)
        .withName("Drive Forward");
  }

  /** One side of a square: drive forward, pause, spin left about 90 degrees, pause. */
  private Command squareSide() {
    return Commands.sequence(
        m_driveSubsystem.driveForSecondsCommand(0.4, 0.4, 1.0),    // forward
        m_driveSubsystem.driveForSecondsCommand(0.0, 0.0, 0.3),    // pause
        m_driveSubsystem.driveForSecondsCommand(-0.4, 0.4, 0.5),   // spin left (guess the time!)
        m_driveSubsystem.driveForSecondsCommand(0.0, 0.0, 0.3));   // pause
  }

  /** Try to drive a square and end where it started. */
  private Command squareAuto() {
    return Commands.sequence(squareSide(), squareSide(), squareSide(), squareSide())
        .withName("Square");
  }
```

Import `edu.wpi.first.wpilibj2.command.Commands`.

`Commands.sequence(a, b, c)` runs `a`, then `b`, then `c`.

!!! info "Why pause by driving at 0 instead of `Commands.waitSeconds`?"
    `DifferentialDrive` has a safety feature: if nothing sends it a speed for about a tenth of a second, it stops the motors and prints an "Output not updated often enough" warning. Driving at 0 for the pause keeps it fed, so the console stays quiet. Each `squareSide()` call builds a **new** set of commands, which matters: one command object can't be used twice in the same routine.

!!! info "The spin time is a guess"
    Nobody knows how long a 90° spin takes. Start with 0.5 seconds and adjust it until one turn looks like 90°. That guessing is the point of this lab.

### Step 3: Let the drive team pick
A `SendableChooser` puts a dropdown menu on the dashboard. Add a field to `RobotContainer`:

```java
  private final SendableChooser<Command> m_autoChooser = new SendableChooser<>();
```

In the constructor, after `configureBindings()`:

```java
    m_autoChooser.setDefaultOption("Do nothing", Commands.none());
    m_autoChooser.addOption("Drive forward", driveForwardAuto());
    m_autoChooser.addOption("Square", squareAuto());
    SmartDashboard.putData("Auto", m_autoChooser);
```

And make `getAutonomousCommand()` return the choice:

```java
  public Command getAutonomousCommand() {
    return m_autoChooser.getSelected();
  }
```

Import `SendableChooser` and `SmartDashboard` if needed.

!!! info "Choosers are the exception"
    A `SendableChooser` is a **Sendable**, so in 2026 it goes on the dashboard with `SmartDashboard.putData`. In WPILib 2027 it's replaced by `Selectable` and `Tunables.publish("Auto", chooser)` ([Lesson 6.1](../robot-code/06b-dashboards.md#moving-to-2027)).

!!! tip "Why \"Do nothing\" is the default"
    If the drive team forgets to pick, a robot that sits still is far better than one that runs a routine meant for a different starting spot and hits someone else's robot.

### Step 4: Run it
1. Deploy. In Elastic, find **Auto** in the **SmartDashboard** table, drag it onto your tab as a **ComboBox Chooser**, and pick **Drive forward**.
2. On blocks first: in the Driver Station, select **Autonomous**, say **"Enabling!"**, and enable. The wheels run for 2 seconds and stop.
3. On the floor: put tape on the floor at the robot's front edge, and run it again. Mark where it stops.
4. Run **Square** on blocks, then on the floor. Adjust the spin time in `squareSide()` until it looks close to a square.

### Step 5: How repeatable is it?
Run **Square** five times without changing anything. Each time, measure how far the robot ends up from where it started.

| Run | Distance from start | Ended facing which way? |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |

Then swap in a **less charged battery** and run it twice more.

**What you'll see:** The square doesn't close, and it's different every time. Turns that were 90° become 80° or 100°, and the errors add up corner by corner. A weaker battery makes every move shorter.

The problem is the same one from Lab 6's timed attempt: the robot doesn't **measure** how far it turned. It only knows how long it tried. In Lab 8 you'll add a gyro so it does.

### Step 6: Commit
```bash
git add .
git commit -m "Lab 7: timed autonomous"
```

## Try it
- [ ] Run **Drive forward** and **Square** from the chooser
- [ ] Tune the spin time until a single turn is close to 90°
- [ ] Fill in the repeatability table, including the less charged battery
- [ ] Add a **Drive backward** option to the chooser
- [ ] Write a "**there and back**" routine: forward 1.5 seconds, spin 180°, forward 1.5 seconds. Does it end where it started?
- [ ] Make the spin a gentle **curve** instead of turning in place (hint: both sides forward, one faster)

## Check yourself
??? question "What decides which command runs in autonomous?"
    Whatever `getAutonomousCommand()` returns. `Robot.java` schedules it when auto starts and cancels it when teleop starts.

??? question "What does `Commands.sequence(a, b, c)` do?"
    Runs `a`, then `b` after `a` ends, then `c` after `b` ends.

??? question "Why does `driveForSecondsCommand` use `finallyDo` to stop the motors?"
    So the motors stop however the command ends: timed out, finished, or canceled when teleop starts.

??? question "Why should \"Do nothing\" be the default auto?"
    If nobody picks one, the robot stays still instead of running a routine meant for a different starting spot.

??? question "Why doesn't the timed square end where it started?"
    Time isn't distance or angle. Battery charge, carpet, and wheel wear change how far each timed move goes, and the errors add up at every corner.
