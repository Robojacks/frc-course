# Lab 1.1: Put It on the Dashboard

## Why it matters
In Lab 1 the motor spun, but you couldn't see how fast, or how much current it pulled. Every lab after this one depends on watching numbers change live: encoder positions, errors, PID outputs. And when you tune something, redeploying for every small change wastes a lot of robot time.

In this lab you'll:

- add the course's **telemetry library**, which sends values over **NetworkTables 4** using WPILib 2027's API
- send the motor's speed, current, and output to **Elastic**
- build an Elastic layout with graphs
- change the motor's speed **from the dashboard**, without redeploying

**Before you start:** finish [Lab 1](lab1-spin-motor.md). You'll add to the same **TestBed** project. Read [Lesson 6.1](../robot-code/06b-dashboards.md) first; it explains NetworkTables, Elastic, and why this course doesn't use `SmartDashboard.putNumber`.

## Read this
- [Publishing and Subscribing to a Topic](https://docs.wpilib.org/en/stable/docs/software/networktables/publish-and-subscribe.html)
- [Elastic](https://docs.wpilib.org/en/stable/docs/software/dashboards/elastic.html)
- [Elastic: Connecting to your robot](https://frc-elastic.gitbook.io/docs/getting-started/connecting-to-your-robot)

## Walkthrough

### Step 1: Add the telemetry library
The course has a small library for dashboards, in a folder called `telemetry`. It's a 2026 copy of the **Telemetry** and **Tunables** APIs that WPILib adds in 2027, with the same names, so everything you write in these labs already works the 2027 way ([Lesson 6.1](../robot-code/06b-dashboards.md#the-courses-telemetry-library-2027s-api-today)).

| File | What it's for |
|---|---|
| `Telemetry.java` | Where you start: `Telemetry.getTable("Brushless")` |
| `TelemetryTable.java` | One folder of values: `table.log("Current (A)", amps)` |
| `Tunables.java` | Numbers you change from the dashboard: `Tunables.addDouble(...)` |
| `TunableDouble.java` | One tunable number: `speed.get()` |
| `Selectable.java` | A dropdown menu (you'll use it in Lab 7) |

You don't type these in. Copy them:

1. In VS Code, right-click the `frc/robot` folder (the one with `Robot.java`), choose **New Folder**, and name it `telemetry`.
2. Open the [**telemetry** folder on GitHub](https://github.com/Robojacks/frc-course/tree/main/library/telemetry).
3. For each of the five files: click it, click the **Copy raw file** button, then in VS Code right-click your `telemetry` folder → **New File**, give it the **same name**, and paste.
4. Check that each file's first line is `package frc.robot.telemetry;`.

Then open `TelemetryTable.java` and read it. Every line is commented, and it uses exactly the publishers from [Lesson 6.1](../robot-code/06b-dashboards.md#publishing-a-value).

### Step 2: Send the motor's values
Open `SpinBrushlessMotorSubsystem.java`.

**1. Import the library** with the other imports:

```java
import frc.robot.telemetry.Telemetry;
import frc.robot.telemetry.TelemetryTable;
```

**2. Add a field** below the motor:

```java
  // Everything this subsystem sends shows up in /Telemetry/Brushless on the dashboard
  private final TelemetryTable m_telemetry = Telemetry.getTable("Brushless");
```

`Telemetry.getTable("Brushless")` gets the **Brushless** folder inside **Telemetry** on the dashboard. You keep it in a field, `m_telemetry`, so every method in the subsystem can log into it. `TelemetryTable` is the field's type: one folder of dashboard values.

**3. Add a `periodic()` method** at the bottom of the class, before the last `}`:

```java
  @Override
  public void periodic() {
    // Runs every 20 ms, enabled or not
    m_telemetry.log("Velocity (RPM)", m_brushlessMotor.getEncoder().getVelocity());
    m_telemetry.log("Current (A)", m_brushlessMotor.getOutputCurrent());
    m_telemetry.log("Applied Output", m_brushlessMotor.getAppliedOutput());
    m_telemetry.log("Temperature (C)", m_brushlessMotor.getMotorTemperature());

    Command running = getCurrentCommand();
    m_telemetry.log("Command", running == null ? "none" : running.getName());
  }
```

| Line | What it sends |
|---|---|
| `getEncoder().getVelocity()` | The NEO's built-in encoder speed, in RPM |
| `getOutputCurrent()` | How many amps the motor is pulling right now |
| `getAppliedOutput()` | The output the SPARK MAX is actually applying, from -1 to 1 |
| `getMotorTemperature()` | The NEO's temperature, in °C |
| `getCurrentCommand()` | The command that owns this subsystem right now, or `null` if none |

- **`@Override`** means this replaces the empty `periodic()` that every subsystem already has. If you misspell the name, `@Override` makes the build fail instead of silently never running.
- **`m_telemetry.log(name, value)`** sends one value. The first time a name is logged, it appears on the dashboard; after that, it just updates.
- **`Command running = getCurrentCommand();`** asks the subsystem which command is using it right now, and saves the answer in a local variable.

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
2. Open Elastic's list of topics, then **Telemetry → Brushless**.
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

**1. In the subsystem**, add a field below `m_telemetry`:

```java
  // A speed you can change in Elastic. It starts at the value in Constants.
  private final TunableDouble m_tunableSpeed =
      Tunables.addDouble("Brushless/Tunable Speed", Constants.kBrushlessConstants.BrushlessMotorSpeed);
```

And import it at the top:

```java
import frc.robot.telemetry.TunableDouble;
import frc.robot.telemetry.Tunables;
```

| Part | What it means |
|---|---|
| `TunableDouble` | A number the dashboard can change while the robot runs |
| `Tunables.addDouble(name, start)` | Makes the tunable number and puts it on the dashboard at `/Tunables/Brushless/Tunable Speed` |
| `Constants.kBrushlessConstants.BrushlessMotorSpeed` | The starting value, 0.5. Every time the robot code starts, it goes back to this. |
| A **field**, not inside a method | It's created **once**, when the subsystem is created, and kept for the whole match |

**2. Add a command** below `spinMotorCommand`:

```java
  /** Spins the motor at whatever speed is on the dashboard, reading it every loop. */
  public Command spinAtTunableSpeedCommand() {
    return runEnd(
        () -> setMotorSpeed(m_tunableSpeed.get()),   // every loop while it runs
        () -> setMotorSpeed(0.0)                      // once, when it ends
    ).withName("Spin Tunable");
  }
```

Notice this uses `runEnd`, not `startEnd`. `startEnd` sets the speed **once**, so a change on the dashboard wouldn't do anything until you pressed the button again. `runEnd` reads the dashboard **every loop**, so the motor follows your changes while you hold the button.

**3. Bind it to B** in `RobotContainer`'s `configureBindings()`:

```java
  // Spin at the dashboard's speed while B is held
  m_controller.b().whileTrue(m_spinBrushlessMotorSubsystem.spinAtTunableSpeedCommand());
```

**4. Try it.** Deploy. In Elastic, drag **Tunable Speed** (in **Tunables → Brushless**) onto your tab as a **Number Slider** (or a Text Display you can edit). Hold B, then change the speed. The motor follows right away.

!!! warning "Keep tunable speeds small"
    A tunable lets anyone at the laptop change how the robot moves while it's enabled. Keep the test bed clear, and don't go above 1.0 or below -1.0. In real robot code, clamp tunable values with `MathUtil.clamp(value, -1, 1)`.

**5. Restart the robot code** (Driver Station → **Restart Robot Code**). **Tunable Speed** goes back to 0.5. Dashboard changes are never saved: when you find a speed you like, copy it into `Constants.java`.

### Step 6: Save your layout and commit
1. Save the layout in Elastic, then export it from Elastic's file menu into your **TestBed** project folder.
2. Commit:

```bash
git add .
git commit -m "Lab 1.1: telemetry library, Elastic layout, tunable speed"
```

Your layout file is now in Git, so a teammate can load the same dashboard.

### When it doesn't work

| Problem | Likely cause |
|---|---|
| Elastic stays red and says disconnected | The Driver Station isn't connected, or the IP mode isn't **Driver Station**. In simulation, use **localhost**. |
| Connected, but there's no **Telemetry → Brushless** folder | The new code isn't deployed, or `periodic()` is missing `@Override` or has a typo in its name |
| Values show up but never change | `periodic()` isn't being called: check that the subsystem is created in `RobotContainer` |
| Changing **Tunable Speed** does nothing | The command uses `startEnd` instead of `runEnd`, or B isn't bound |
| Build error: cannot find symbol `Telemetry` | The `telemetry` folder isn't inside `frc/robot`, a file is missing, or the import is missing |

!!! example "Finished code"
    Stuck, or missed a lab? [**lab01b-dashboard**](https://github.com/Robojacks/frc-course/tree/main/examples/lab01b-dashboard) on GitHub is the complete project as it looks at the end of this lab. It's a full WPILib 2026 project you can open in VS Code, build, and deploy. Try to finish the lab yourself first.

## Try it
- [ ] Get all five **Brushless** values showing in Elastic
- [ ] Hold A and watch the startup current jump. What's the highest number you see?
- [ ] Add an **X** binding that spins at 1.0. Compare the startup current to 0.5.
- [ ] Use the B button and **Tunable Speed** to find the slowest speed where the motor still turns reliably
- [ ] Add `m_telemetry.log("At Speed", ...)` that's `true` when the velocity is above 2000 RPM. Show it as a **Boolean Box**.
- [ ] Run the code in **simulation**, connect Elastic with **localhost**, and find the same values. Which ones still change in simulation, and which don't?

## Check yourself
??? question "Where does `m_telemetry.log(\"Current (A)\", ...)` show up in Elastic?"
    In **Telemetry → Brushless**, as `/Telemetry/Brushless/Current (A)`.

??? question "Why does `spinAtTunableSpeedCommand` use `runEnd` instead of `startEnd`?"
    `runEnd` runs its first action every loop, so it reads the dashboard value 50 times a second. `startEnd` only sets the speed once, when the command starts.

??? question "You found a great speed with the slider, and then the robot rebooted. What happened, and what should you do?"
    Tunables start at their default every time the code starts, so the change was lost. Copy the number into `Constants.java` and deploy.

??? question "Why does the current jump when the motor starts?"
    A motor that isn't moving yet pulls much more current than one that's already spinning. The current limit keeps that jump from tripping the breaker or browning out the robot.

??? question "What changes in this lab's code when the team moves to WPILib 2027?"
    Only the imports. Delete the `telemetry` folder and import WPILib's `Telemetry`, `TelemetryTable`, `Tunables`, and `TunableDouble` instead. The rest stays the same.
