# Credits

## The WPILib documentation
This course is built on top of the [WPILib documentation](https://docs.wpilib.org/en/stable/), the official FRC programming reference, written by the WPILib contributors.

Parts of this course are **adapted from** the WPILib documentation, which is licensed under the [Creative Commons Attribution 4.0 International License (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). Source: [wpilibsuite/frc-docs](https://github.com/wpilibsuite/frc-docs) (the `stable` branch, for the 2026 season).

Everything adapted from the WPILib docs is marked where it appears:

- Boxes titled **"From the WPILib docs"** contain text adapted from the docs, with a link to the original page.
- Diagrams and screenshots from the docs have a caption naming the source page.
- The interactive PID tuning simulators are WPILib's, with a caption naming the source page.

**Changes made:** text was shortened, reworded for beginners, and combined with this course's own explanations; some terms were changed to match this course (for example, "measurement" instead of "output"). Diagrams and screenshots are unchanged. The simulator scripts are combined into one file, the same way the WPILib docs build them, and are otherwise unchanged.

### Adapted material, by page

| In this course | Adapted from (WPILib docs) |
|---|---|
| [Lesson 0: Setup](../foundations/00-setup.md) | [Creating a Robot Program](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/creating-robot-program.html); [Simulation Specific User Interface Elements](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/simulation-gui.html) |
| [Lesson 4: Electronics](../hardware/04-electronics.md) | [roboRIO Brownout and Understanding Current Draw](https://docs.wpilib.org/en/stable/docs/software/roborio-info/roborio-brownouts.html); [CAN Wiring Basics](https://docs.wpilib.org/en/stable/docs/hardware/hardware-basics/can-wiring-basics.html) |
| [Lesson 4.3: Sensors](../hardware/04d-sensors.md) | [Digital Inputs - Hardware](https://docs.wpilib.org/en/stable/docs/hardware/sensors/digital-inputs-hardware.html); [Analog Potentiometers - Hardware](https://docs.wpilib.org/en/stable/docs/hardware/sensors/analog-potentiometers-hardware.html); [Encoders - Software](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/sensors/encoders-software.html); [Gyroscopes - Hardware](https://docs.wpilib.org/en/stable/docs/hardware/sensors/gyros-hardware.html) |
| [Lesson 7: Command-Based Programming](../robot-code/07-command-based.md) | [What Is "Command-Based" Programming?](https://docs.wpilib.org/en/stable/docs/software/commandbased/what-is-command-based.html) |
| [Lesson 7.1: The Command Scheduler](../robot-code/07b-scheduler.md) | [The Command Scheduler](https://docs.wpilib.org/en/stable/docs/software/commandbased/command-scheduler.html); diagrams [scheduler-run-sequence](https://github.com/wpilibsuite/frc-docs/blob/stable/source/docs/software/commandbased/diagrams/scheduler-run-sequence.drawio.svg) and [scheduler](https://github.com/wpilibsuite/frc-docs/blob/stable/source/docs/software/commandbased/diagrams/scheduler.drawio.svg) from the docs source |
| [Lesson 11: Autonomous](../project/11-autonomous.md) | Diagram [concurrent-commands](https://github.com/wpilibsuite/frc-docs/blob/stable/source/docs/software/commandbased/diagrams/concurrent-commands.drawio.svg) from the docs source |
| [Lesson 12: PID Feedback](../controls/12-pid.md) | [Introduction to PID](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/introduction-to-pid.html); [Control System Basics](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/control-system-basics.html); turret simulator from [Tuning a Turret Position Controller](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-turret.html) |
| [Lesson 13: Feedforward](../controls/13-feedforward.md) | Arm simulator from [Tuning a Vertical Arm Position Controller](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-vertical-arm.html) |
| [Lesson 13.1: SysId](../controls/13b-sysid.md) | Screenshot from [Viewing Diagnostics](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/viewing-diagnostics.html) |
| [Lab 0](../testbed/lab0-first-project.md) | Screenshots from [Creating a Robot Program](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/creating-robot-program.html), [3rd Party Libraries](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/3rd-party-libraries.html), [Building and Deploying Robot Code](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/deploying-robot-code.html), and [Viewing Console Output](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/viewing-console-output.html) |
| [Lab 4](../testbed/lab4-limit-switch.md), [Lab 5](../testbed/lab5-knob-speed.md), [Lab 6](../testbed/lab6-encoder.md), [Lab 8](../testbed/lab8-navx-gyro.md) | Wiring and sensor diagrams from the hardware and sensor pages listed above |
| [Lab 9](../testbed/lab9-pid-wheel.md) | Turret simulator from [Tuning a Turret Position Controller](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-turret.html) |
| [Lab 10](../testbed/lab10-elevator.md) | Elevator simulator and tuning steps from [Tuning a Vertical Elevator with Motion Profiling](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-elevator.html) |

The simulators also load a small script of our own, `pid-tune-fixes.js`, which makes their graphs keep drawing when the simulator is taller than the screen (on phones). It doesn't change how the simulations behave.

## Mantik, by Itkan Robotics
Lessons 17–21 and Lab 11 are partly **adapted from** [Mantik](https://github.com/itkan-robotics/mantik), an FRC programming course by Itkan Robotics. Mantik's lesson text is licensed under the [Creative Commons Attribution 4.0 International License (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/); its code is BSD-3-Clause.

**Changes made:** the lessons were rewritten for beginners in this course's format, and the examples were rewritten for the RoboJacks West Coast Drive (Through Bore Encoders on the roboRIO, NavX2, CIMs), WPILib 2026, and the course's telemetry library. Some sections were added (calibration steps for the WCD, differential-drive PathPlanner setup, red-alliance notes); a few statements were corrected against vendor documentation. Each adapted page ends with a credit line.

| In this course | Adapted from (Mantik) |
|---|---|
| [Lesson 17: Poses and Odometry](../going-further/17-odometry.md) | Introduction to Pose Estimation; Odometry |
| [Lesson 18: Vision](../going-further/18-vision.md) | Fused Pose Estimation; Pose Estimation Calibration (rewritten for PhotonVision) |
| [Lesson 19: PathPlanner](../going-further/19-pathplanner.md) | PathPlanner: Visual Autonomous Routines |
| [Lesson 20: Logs, AdvantageScope & AdvantageKit](../going-further/20-logging.md) | AdvantageScope; AdvantageKit; Hardware Abstraction with IO Layers |
| [Lesson 21: Swerve Drive](../going-further/21-swerve.md) | Swerve Drive Example; Odometry |
| [Lab 11: Odometry](../testbed/lab11-odometry.md) | Odometry; Pose Estimation Calibration |

The site's search box was inspired by Mantik's site search; it's written for this course and doesn't use Mantik's code.

## Other sources
- Motor specifications: [REV Robotics NEO V1.1](https://docs.revrobotics.com/brushless/neo/v1.1); CIM and 775pro figures from [RobotPy's motor configurations](https://robotpy.readthedocs.io/projects/websim/en/latest/motor-configurations.html).
- NavX2 API details: Studica's AHRS Java documentation.
- The course's [telemetry library](https://github.com/Robojacks/frc-course/tree/main/library/telemetry) copies the class and method names of WPILib 2027's Telemetry and Tunables APIs, from their design documents. The code is written for this course.
- Lesson 6.1's 2027 comparison is based on WPILib's Telemetry and Tunables design documents in [wpilibsuite/allwpilib](https://github.com/wpilibsuite/allwpilib) and the [Removed features](https://docs.wpilib.org/en/latest/docs/yearly-overview/removed-features.html) page. The 2027 APIs were still in preview when this was written.
- PathPlannerLib API details: the [PathPlanner](https://github.com/mjansen4857/pathplanner) source and documentation (2026 release). PhotonLib API details: the [PhotonVision](https://github.com/PhotonVision/photonvision) source (v2026.3.4).
- Lesson 18's vision subsystem follows [PhotonVisionSubsystem.java](https://github.com/ironmosquitos5653/nmrc-codecamp-level2-rev-2026/blob/main/src/main/java/frc/robot/subsystems/PhotonVisionSubsystem.java) from the NMRC code camp (level 2, 2026), adapted for a differential drive.
- Elastic connection modes and widget behavior: the [Elastic documentation](https://frc-elastic.gitbook.io/docs), by Team 353.

## Trademarks
*FIRST*®, FIRST® Robotics Competition, and FRC® are trademarks of *FIRST*. REV, SPARK MAX, NEO, and Through Bore Encoder are trademarks of REV Robotics. NavX is a trademark of Kauai Labs / Studica. This course is made by FRC Team 4674 RoboJacks and isn't affiliated with or endorsed by any of them.
