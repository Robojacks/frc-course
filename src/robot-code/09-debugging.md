# 9. Testing, Debugging & Simulation

## Why it matters
Robot time is scarce. Mechanical always needs the robot "for just one more hour," and at competition you get a few minutes between matches. Good programmers find most of their bugs **before** the robot is available, and fix the rest quickly when it is.

This lesson covers three skills:

1. **Seeing what your code is doing** with dashboards and logs
2. **Finding bugs** with a step-by-step process instead of guessing
3. **Simulating** mechanisms so you can test without a robot

## Read this
- [Robot Simulation Introduction](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/introduction.html)
- [Simulation GUI](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/simulation-gui.html)
- [Physics Simulation with WPILib](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/physics-sim.html)
- [Glass](https://docs.wpilib.org/en/stable/docs/software/dashboards/glass/index.html), [Elastic](https://frc-elastic.gitbook.io/docs), and [AdvantageScope](https://docs.advantagescope.org/)
- [On-Robot Telemetry Recording (DataLog)](https://docs.wpilib.org/en/stable/docs/software/telemetry/datalog.html)

## Walkthrough

### Seeing what your code is doing
Your robot runs 50 loops a second, so you need a way to watch values change live.

**Don't use `System.out.println` for live values.** Fifty lines a second floods the console, and you can't read any of them.

**Send values over NetworkTables.** Each value updates in place on the dashboard. With the `DashTable` helper from [Lesson 6.1](06b-dashboards.md):

```java
private final DashTable dash = new DashTable("Arm");

@Override
public void periodic() {
    dash.log("Angle (deg)", getAngleDegrees());
    dash.log("Target (deg)", targetDegrees);
    dash.log("Output (V)", lastVoltage);
    dash.log("At Target", atTarget());
}
```

A subsystem's `periodic()` runs every loop, which makes it the right place for telemetry.

!!! tip "Name values like folders"
    A `DashTable` named `"Arm"` groups every arm value under **Arm** on the dashboard, and `"Angle (deg)"`, and the unit in parentheses means nobody has to guess.

**What to publish for any mechanism:**

| Value | Why |
|---|---|
| The sensor reading (position, velocity) | Is the sensor working and pointing the right way? |
| The target (setpoint) | Is the code asking for what you think? |
| The output (percent or volts) | Is the code actually commanding the motor? |
| Any state booleans (at target, has piece, at limit) | Do your conditions flip when they should? |

With those four, you can usually tell in seconds whether a problem is the sensor, the logic, or the hardware.

### Dashboards
All of these read the same NetworkTables data, so you can switch freely:

| Tool | Best for |
|---|---|
| **Sim GUI** | Quick checks during simulation |
| **Glass** | Plotting values live, viewing field and mechanism widgets |
| **Elastic** | The driver dashboard, and this course's everyday dashboard ([Lesson 6.1](06b-dashboards.md)) |
| **AdvantageScope** | Graphs, 3D robot views, and replaying log files after a match |

SmartDashboard and Shuffleboard are removed in WPILib 2027, so this course doesn't use them.

**Seeing commands on the dashboard** (Sendables still use `SmartDashboard.putData` in 2026):
```java
SmartDashboard.putData(CommandScheduler.getInstance()); // what's running right now
SmartDashboard.putData(intake);                         // which command owns the intake
```

### Logging: what happened during the match?
NetworkTables shows what's happening **now**. Logs record **everything**, so you can look back after a match:

```java
// In Robot's constructor:
DataLogManager.start();                          // record NetworkTables and console output
DriverStation.startDataLog(DataLogManager.getLog()); // also record joystick and mode data
```

Logs are saved on the roboRIO (or a USB stick plugged into it). Download them with **DataLogTool** and open them in **AdvantageScope** to scrub through a match like a video, with every value graphed.

!!! info "When the robot did something weird in a match"
    Don't guess. Pull the log, find the moment, and look at the target, the sensor, and the output side by side. The log also shows battery voltage and brownouts.

### A debugging process
When something doesn't work, resist changing code at random. Work through the layers in order, from the most basic to the most specific:

1. **Is the code running?** Check the Driver Station: does it show robot code (green "Robot Code" light)? Any errors in the console?
2. **Is the robot enabled, in the mode you think?**
3. **Is the command scheduled?** Check the scheduler on the dashboard. Did the button binding fire?
4. **Is the code commanding output?** Is the "Output" value on the dashboard what you expect?
5. **Is the output reaching the motor?** Check the motor controller's status light and its vendor tool.
6. **Is it electrical?** CAN IDs, breakers, unplugged wires ([Lesson 4](../hardware/04-electronics.md)).
7. **Is it mechanical?** Jammed, inverted, belt slipping, a set screw loose.

The first layer where something looks wrong is where the bug is.

!!! tip "Change one thing at a time"
    If you change three things and it starts working, you don't know which one fixed it, and the other two might have caused a new bug you won't see until competition.

**Other habits that help:**

- **Reproduce it first.** If you can't make the bug happen on purpose, you can't confirm you fixed it.
- **Read the whole error.** The first line of a stack trace says what happened; the first line in `frc.robot` says where ([Lesson 3](../foundations/03-java.md)).
- **Explain it out loud.** Walk a teammate (or a rubber duck) through what the code does, line by line. You'll often spot the bug mid-sentence.
- **Check Git.** If it worked yesterday, `git diff` or `git log` shows exactly what changed since then.

### Common bugs by symptom

| Symptom | Check first |
|---|---|
| Nothing works at all | Robot code light on the Driver Station, console errors |
| One mechanism doesn't move | Is its command running? Is the output nonzero? CAN ID and breaker. |
| Mechanism moves the wrong way | Motor inversion, or sensor direction |
| Mechanism moves the right way, then runs away | Sensor direction doesn't match motor direction, so feedback pushes the wrong way |
| Works in sim, not on the robot | Wrong ports or CAN IDs, unset vendor config, inversion |
| Works sometimes | Loose wire, low battery, or a race between two commands |
| Robot stutters | Loop overruns (Lesson 6) or brownouts (Lesson 4) |

### Simulation: testing without a robot
WPILib's simulation runs your real robot code on your laptop. By default, motors and sensors are fake but **don't move**: setting a motor to 0.5 shows 0.5 in the Sim GUI, but the encoder stays at 0.

**Physics simulation** fixes that. WPILib includes models of common mechanisms that calculate how they'd move:

| Class | Simulates |
|---|---|
| `DCMotorSim` | A motor spinning a load: flywheels, rollers |
| `FlywheelSim` | A flywheel |
| `ElevatorSim` | An elevator, with gravity |
| `SingleJointedArmSim` | An arm on one pivot, with gravity |
| `DifferentialDrivetrainSim` | A tank drivetrain |

You feed the model the motor's voltage, step it forward 20 ms, and write its position back into the simulated encoder:

```java
private final SingleJointedArmSim armSim = new SingleJointedArmSim(
    DCMotor.getNEO(1),           // one NEO motor
    60.0,                        // gear ratio
    SingleJointedArmSim.estimateMOI(0.6, 4.0), // arm length (m), mass (kg)
    0.6,                         // arm length (m)
    Units.degreesToRadians(-90), // min angle
    Units.degreesToRadians(90),  // max angle
    true,                        // simulate gravity
    Units.degreesToRadians(-90)  // starting angle
);
private final EncoderSim encoderSim = new EncoderSim(armEncoder);

@Override
public void simulationPeriodic() {
    armSim.setInputVoltage(motor.get() * RobotController.getBatteryVoltage());
    armSim.update(0.020);                                      // step 20 ms
    encoderSim.setDistance(Units.radiansToDegrees(armSim.getAngleRads()));
}
```

`simulationPeriodic()` runs every loop, but only in simulation. It never runs on the real robot.

!!! tip "Start from an example"
    ++ctrl+shift+p++ → **WPILib: Create a new project → Example**, then pick **ArmSimulation**, **ElevatorSimulation**, or **DriveDistanceOffboard**. They're complete, working simulations to learn from and copy.

!!! warning "Simulation isn't the real robot"
    Sim models are idealized: no friction you didn't model, no loose belts, perfect sensors. Use sim to catch logic bugs and get gains roughly right, then confirm on the real robot.

### Visualizing mechanisms
`Mechanism2d` draws a simple stick-figure of your arm or elevator on the dashboard, so you can see it move in simulation:

```java
private final Mechanism2d mech = new Mechanism2d(3, 3);
private final MechanismLigament2d armLigament =
    mech.getRoot("pivot", 1.5, 1.5).append(new MechanismLigament2d("arm", 1.0, 0));

public Arm() {
    SmartDashboard.putData("Arm/Mechanism", mech);
}

@Override
public void periodic() {
    armLigament.setAngle(getAngleDegrees());
}
```

## Try it
- [ ] Add the four standard values (sensor, target, output, state) for a subsystem with `DashTable`, and watch them in Elastic (IP mode **localhost** in simulation)
- [ ] Add `SmartDashboard.putData(CommandScheduler.getInstance())` and watch commands start and stop as you press buttons
- [ ] Open the **ArmSimulation** example, run it, and move the arm with the joystick. Find its `simulationPeriodic()`.
- [ ] Add `DataLogManager.start()`, run in sim for a minute, then open the log in AdvantageScope
- [ ] Break your intake on purpose (wrong PWM port), then walk the debugging process to find it. Which layer revealed it?

## Check yourself
??? question "Why send values over NetworkTables instead of using `println`?"
    It updates one value in place instead of printing 50 lines per second.

??? question "What four values should you publish for any mechanism?"
    The sensor reading, the target, the motor output, and any state booleans like "at target."

??? question "The dashboard shows a target of 90°, an output of 0 V, and the arm sitting still. Where's the bug?"
    In the code between the target and the output: the command or controller isn't producing output. The sensor and hardware may be fine.

??? question "What's the difference between NetworkTables and a log file?"
    NetworkTables shows live values right now. A log records everything over time, so you can review a match afterward.

??? question "What does `simulationPeriodic()` do, and when does it run?"
    It updates physics models so simulated sensors respond to simulated motors. It runs every loop, only in simulation.
