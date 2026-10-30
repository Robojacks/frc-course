# Lab 1.1: Put It on the Dashboard

## Why it matters
In Lab 1 the motor spun, but you couldn't see how fast, or how much current it pulled. Every lab after this one depends on watching numbers change live: encoder positions, errors, PID outputs. And when you tune something, redeploying for every small change wastes a lot of robot time.

In this lab you'll:

- add a small helper class, `DashTable`, that sends values over **NetworkTables 4**
- send the motor's speed, current, and output to **Elastic**
- build an Elastic layout with graphs
- change the motor's speed **from the dashboard**, without redeploying

**Before you start:** finish [Lab 1](lab1-spin-motor.md). You'll add to the same **TestBed** project. Read [Lesson 6.1](../robot-code/06b-dashboards.md) first; it explains NetworkTables, Elastic, and why this course doesn't use `SmartDashboard.putNumber`.

## Read this
- [Publishing and Subscribing to a Topic](https://docs.wpilib.org/en/stable/docs/software/networktables/publish-and-subscribe.html)
- [Elastic](https://docs.wpilib.org/en/stable/docs/software/dashboards/elastic.html)
- [Elastic: Connecting to your robot](https://frc-elastic.gitbook.io/docs/getting-started/connecting-to-your-robot)

## Walkthrough

### Step 1: Add `DashTable`
1. In VS Code, right-click the `frc/robot` folder (the one with `Robot.java`), choose **New File**, and name it `DashTable.java`.
2. Type in this class. It's the same one from [Lesson 6.1](../robot-code/06b-dashboards.md#a-helper-dashtable).

```java
package frc.robot;

import java.util.HashMap;
import java.util.Map;
import java.util.function.DoubleSupplier;

import edu.wpi.first.networktables.BooleanPublisher;
import edu.wpi.first.networktables.DoubleEntry;
import edu.wpi.first.networktables.DoublePublisher;
import edu.wpi.first.networktables.NetworkTable;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.networktables.StringPublisher;

/**
 * One folder of values on the dashboard, sent with NetworkTables 4.
 * new DashTable("Wheel").log("Position (rot)", 3.4) shows up in Elastic as /Wheel/Position (rot).
 */
public class DashTable {
  private final NetworkTable m_table;
  private final Map<String, DoublePublisher> m_numbers = new HashMap<>();
  private final Map<String, BooleanPublisher> m_booleans = new HashMap<>();
  private final Map<String, StringPublisher> m_strings = new HashMap<>();
  private final Map<String, DoubleEntry> m_tunables = new HashMap<>();

  public DashTable(String tableName) {
    m_table = NetworkTableInstance.getDefault().getTable(tableName);
  }

  /** Sends a number. The first call makes the publisher; later calls reuse it. */
  public void log(String key, double value) {
    m_numbers.computeIfAbsent(key, k -> m_table.getDoubleTopic(k).publish()).set(value);
  }

  /** Sends true or false. */
  public void log(String key, boolean value) {
    m_booleans.computeIfAbsent(key, k -> m_table.getBooleanTopic(k).publish()).set(value);
  }

  /** Sends text. */
  public void log(String key, String value) {
    m_strings.computeIfAbsent(key, k -> m_table.getStringTopic(k).publish()).set(value);
  }

  /**
   * A number you can change from the dashboard while the robot runs.
   * It starts at defaultValue every time the robot code starts.
   */
  public DoubleSupplier tunable(String key, double defaultValue) {
    DoubleEntry entry = m_tunables.computeIfAbsent(key, k -> {
      DoubleEntry newEntry = m_table.getDoubleTopic(k).getEntry(defaultValue);
      newEntry.set(defaultValue);
      return newEntry;
    });
    return entry::get;
  }
}
```

!!! tip "You'll use this in every lab"
    `DashTable` is all you need for dashboards from now on. When the team moves to WPILib 2027, `DashTable` becomes the new `TelemetryTable`, and `tunable` becomes `Tunables.addDouble` ([Lesson 6.1](../robot-code/06b-dashboards.md#moving-to-2027)).

### Step 2: Send the motor's values
Open `SpinBrushlessMotorSubsystem.java`.

**1. Import `DashTable`** with the other imports:

```java
import frc.robot.DashTable;
```

**2. Add a field** below the motor:

```java
  // Everything this subsystem sends shows up under "Brushless" on the dashboard
  private final DashTable m_dash = new DashTable("Brushless");
```

**3. Add a `periodic()` method** at the bottom of the class, before the last `}`:

```java
  @Override
  public void periodic() {
    // Runs every 20 ms, enabled or not
    m_dash.log("Velocity (RPM)", m_brushlessMotor.getEncoder().getVelocity());
    m_dash.log("Current (A)", m_brushlessMotor.getOutputCurrent());
    m_dash.log("Applied Output", m_brushlessMotor.getAppliedOutput());
    m_dash.log("Temperature (C)", m_brushlessMotor.getMotorTemperature());

    Command running = getCurrentCommand();
    m_dash.log("Command", running == null ? "none" : running.getName());
  }
```

| Line | What it sends |
|---|---|
| `getEncoder().getVelocity()` | The NEO's built-in encoder speed, in RPM |
| `getOutputCurrent()` | How many amps the motor is pulling right now |
| `getAppliedOutput()` | The output the SPARK MAX is actually applying, from -1 to 1 |
| `getMotorTemperature()` | The NEO's temperature, in °C |
| `getCurrentCommand()` | The command that owns this subsystem right now, or `null` if none |

`running == null ? "none" : running.getName()` is a **ternary**: "if nothing is running, send `none`; otherwise send the command's name."

### Step 3: Open Elastic and connect
1. **Build** and **Deploy**. The robot can stay disabled.
2. Open the Driver Station and connect to the test bed (the Communications light is green).
3. In VS Code, press ++ctrl+shift+p++, run **WPILib: Start Tool**, and choose **Elastic**.
4. Click the **gear** and set the IP address mode to **Driver Station**.
5. Look at the bar at the bottom. It should turn green and show the roboRIO's address.

If it stays red ("Network Tables: Disconnected"), check that the Driver Station is connected and that your code deployed.

### Step 4: Build a layout
1. Make a new tab and name it **Test Bed**.
2. Open Elastic's list of topics and find the **Brushless** table.
3. Drag these onto the grid:

| Value | Show it as | Why |
|---|---|---|
| **Velocity (RPM)** | Graph | See it climb and level off |
| **Current (A)** | Graph | See the jump at startup |
| **Applied Output** | Number Bar | See the output at a glance |
| **Temperature (C)** | Text Display | Keep an eye on heat |
| **Command** | Text Display | See which command is running |

4. Resize the graphs so they're easy to read.

Now clear the area, say **"Enabling!"**, enable TeleOperated, and **hold A**:

| Value | What you'll see |
|---|---|
| Velocity (RPM) | Climbs quickly, then levels off at a steady speed |
| Current (A) | Jumps up as the motor starts, then drops once it's at speed |
| Applied Output | 0.5 while A is held, 0 when released |
| Command | `Spin Brushless` while A is held, `none` when released |

That jump in current at startup is why current limits matter: starting a motor takes much more current than keeping it spinning.

### Step 5: Change the speed from the dashboard
Right now the speed comes from `Constants`, so changing it means redeploying. Make it **tunable** instead.

**1. In the subsystem**, add a field below `m_dash`:

```java
  // A speed you can change in Elastic. It starts at the value in Constants.
  private final DoubleSupplier m_tunableSpeed =
      m_dash.tunable("Tunable Speed", Constants.kBrushlessConstants.BrushlessMotorSpeed);
```

And import it at the top:

```java
import java.util.function.DoubleSupplier;
```

**2. Add a command** below `spinMotorCommand`:

```java
  /** Spins the motor at whatever speed is on the dashboard, reading it every loop. */
  public Command spinAtTunableSpeedCommand() {
    return runEnd(
        () -> setMotorSpeed(m_tunableSpeed.getAsDouble()),   // every loop while it runs
        () -> setMotorSpeed(0.0)                              // once, when it ends
    ).withName("Spin Tunable");
  }
```

Notice this uses `runEnd`, not `startEnd`. `startEnd` sets the speed **once**, so a change on the dashboard wouldn't do anything until you pressed the button again. `runEnd` reads the dashboard **every loop**, so the motor follows your changes while you hold the button.

**3. Bind it to B** in `RobotContainer`'s `configureBindings()`:

```java
  // Spin at the dashboard's speed while B is held
  m_controller.b().whileTrue(m_spinBrushlessMotorSubsystem.spinAtTunableSpeedCommand());
```

**4. Try it.** Deploy. In Elastic, drag **Tunable Speed** onto your tab as a **Number Slider** (or a Text Display you can edit). Hold B, then change the speed. The motor follows right away.

!!! warning "Keep tunable speeds small"
    A tunable lets anyone at the laptop change how the robot moves while it's enabled. Keep the test bed clear, and don't go above 1.0 or below -1.0. In real robot code, clamp tunable values with `MathUtil.clamp(value, -1, 1)`.

**5. Restart the robot code** (Driver Station → **Restart Robot Code**). **Tunable Speed** goes back to 0.5. Dashboard changes are never saved: when you find a speed you like, copy it into `Constants.java`.

### Step 6: Save your layout and commit
1. Save the layout in Elastic, then export it from Elastic's file menu into your **TestBed** project folder.
2. Commit:

```bash
git add .
git commit -m "Lab 1.1: DashTable, Elastic layout, tunable speed"
```

Your layout file is now in Git, so a teammate can load the same dashboard.

### When it doesn't work

| Problem | Likely cause |
|---|---|
| Elastic stays red and says disconnected | The Driver Station isn't connected, or the IP mode isn't **Driver Station**. In simulation, use **localhost**. |
| Connected, but there's no **Brushless** table | The new code isn't deployed, or `periodic()` is missing `@Override` or has a typo in its name |
| Values show up but never change | `periodic()` isn't being called: check that the subsystem is created in `RobotContainer` |
| Changing **Tunable Speed** does nothing | The command uses `startEnd` instead of `runEnd`, or B isn't bound |
| Build error: cannot find symbol `DashTable` | `DashTable.java` is in the wrong folder, or its first line isn't `package frc.robot;` |

!!! example "Finished code"
    Stuck, or missed a lab? [**lab01b-dashboard**](https://github.com/Robojacks/frc-course/tree/main/examples/lab01b-dashboard) on GitHub is the complete project as it looks at the end of this lab. It's a full WPILib 2026 project you can open in VS Code, build, and deploy. Try to finish the lab yourself first.

## Try it
- [ ] Get all five **Brushless** values showing in Elastic
- [ ] Hold A and watch the startup current jump. What's the highest number you see?
- [ ] Add an **X** binding that spins at 1.0. Compare the startup current to 0.5.
- [ ] Use the B button and **Tunable Speed** to find the slowest speed where the motor still turns reliably
- [ ] Add `m_dash.log("At Speed", ...)` that's `true` when the velocity is above 2000 RPM. Show it as a **Boolean Box**.
- [ ] Run the code in **simulation**, connect Elastic with **localhost**, and find the same values. Which ones still change in simulation, and which don't?

## Check yourself
??? question "Where does `m_dash.log(\"Current (A)\", ...)` show up in Elastic?"
    In the **Brushless** table, as `/Brushless/Current (A)`.

??? question "Why does `spinAtTunableSpeedCommand` use `runEnd` instead of `startEnd`?"
    `runEnd` runs its first action every loop, so it reads the dashboard value 50 times a second. `startEnd` only sets the speed once, when the command starts.

??? question "You found a great speed with the slider, and then the robot rebooted. What happened, and what should you do?"
    Tunables start at their default every time the code starts, so the change was lost. Copy the number into `Constants.java` and deploy.

??? question "Why does the current jump when the motor starts?"
    A motor that isn't moving yet pulls much more current than one that's already spinning. The current limit keeps that jump from tripping the breaker or browning out the robot.

??? question "What will `DashTable` turn into when the team moves to WPILib 2027?"
    `Telemetry.getTable(...)` for logging values, and `Tunables.addDouble(...)` for tunable numbers.
