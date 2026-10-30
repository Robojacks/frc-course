# Lab 7: Timed Autonomous on the WCD

## Why it matters
The first 15 seconds of every FRC match are **autonomous**: the robot runs entirely on its own code, with no driver input. A robot that does something useful in auto starts every match ahead.

In this lab you'll make the West Coast Drive drive a pattern by itself, and let the drive team pick which pattern from a menu on the dashboard. You'll use only **time** to decide how far to go, and you'll find out why that's not good enough. That sets up [Lab 8](lab8-navx-gyro.md), where the robot uses a gyro to know how far it has really turned.

**Before you start:** finish [Lab 2](lab2-west-coast-drive.md). You'll add to the same **WestCoastDrive** project. [Lesson 11](../project/11-autonomous.md) covers autonomous in more depth.

## Read this
- [Command Compositions](https://docs.wpilib.org/en/stable/docs/software/commandbased/command-compositions.html)
- [Lesson 6.1: A dropdown menu with `DashChooser`](../robot-code/06b-dashboards.md#a-dropdown-menu-dashchooser)

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
A **`DashChooser`** puts a dropdown menu in Elastic, sent over NetworkTables like everything else ([Lesson 6.1](../robot-code/06b-dashboards.md#a-dropdown-menu-dashchooser)).

Create `DashChooser.java` in the `frc/robot` folder, next to `DashTable.java`, and type in this class:

```java
package frc.robot;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;

import edu.wpi.first.networktables.NetworkTable;
import edu.wpi.first.networktables.NetworkTableEvent;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.networktables.StringArrayPublisher;
import edu.wpi.first.networktables.StringPublisher;
import edu.wpi.first.networktables.StringSubscriber;

/**
 * A dropdown menu on the dashboard, sent with NetworkTables 4.
 * Elastic shows it as a ComboBox Chooser. It works like WPILib 2027's Selectable.
 */
public class DashChooser<T> {
  private final Map<String, T> m_options = new LinkedHashMap<>();
  private String m_defaultName = "";

  private final StringPublisher m_type;
  private final StringArrayPublisher m_optionNames;
  private final StringPublisher m_default;
  private final StringPublisher m_active;
  private final StringSubscriber m_selected;

  public DashChooser(String tableName) {
    NetworkTableInstance nt = NetworkTableInstance.getDefault();
    NetworkTable table = nt.getTable(tableName);

    // ".type" tells Elastic which widget to show
    m_type = table.getStringTopic(".type").publish();
    m_type.set("String Chooser");

    m_optionNames = table.getStringArrayTopic("options").publish();
    m_default = table.getStringTopic("default").publish();
    m_active = table.getStringTopic("active").publish();

    // The dashboard writes the drive team's pick to "selected". The robot only reads it.
    m_selected = table.getStringTopic("selected").subscribe("");

    // Whenever the pick changes, report back which option the robot will really use
    nt.addListener(m_selected, EnumSet.of(NetworkTableEvent.Kind.kValueAll),
        event -> m_active.set(selectedName()));
  }

  /** Adds an option and makes it the default: the one used if nobody picks. */
  public void addDefault(String name, T value) {
    m_defaultName = name;
    m_default.set(name);
    add(name, value);
  }

  /** Adds an option to the menu. */
  public void add(String name, T value) {
    m_options.put(name, value);
    m_optionNames.set(m_options.keySet().toArray(new String[0]));
    m_active.set(selectedName());
  }

  /** The value for the option picked on the dashboard, or the default if nothing valid is picked. */
  public T getSelected() {
    return m_options.get(selectedName());
  }

  private String selectedName() {
    String name = m_selected.get();
    return m_options.containsKey(name) ? name : m_defaultName;
  }
}
```

Then add a field to `RobotContainer`:

```java
  private final DashChooser<Command> m_autoChooser = new DashChooser<>("Auto");
```

In the constructor, after `configureBindings()`:

```java
    m_autoChooser.addDefault("Do nothing", Commands.none());
    m_autoChooser.add("Drive forward", driveForwardAuto());
    m_autoChooser.add("Square", squareAuto());
```

And make `getAutonomousCommand()` return the choice:

```java
  public Command getAutonomousCommand() {
    return m_autoChooser.getSelected();
  }
```

!!! info "Why not `SendableChooser`?"
    You'll see `SendableChooser` in older code and examples. It only reaches the dashboard through `SmartDashboard.putData`, which is going away in WPILib 2027. `DashChooser` uses the same method names as 2027's `Selectable` (`addDefault`, `add`, `getSelected`), so moving to 2027 is a rename ([Lesson 6.1](../robot-code/06b-dashboards.md#moving-to-2027)).

!!! tip "Why \"Do nothing\" is the default"
    If the drive team forgets to pick, a robot that sits still is far better than one that runs a routine meant for a different starting spot and hits someone else's robot.

### Step 4: Run it
1. Deploy. In Elastic, find the **Auto** table, drag it onto your tab (it shows up as a **ComboBox Chooser**), and pick **Drive forward**.
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
