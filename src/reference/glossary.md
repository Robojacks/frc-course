# Glossary

| Term | Meaning | Lesson |
|---|---|---|
| **Absolute encoder** | An encoder that reports the shaft's true angle, even right after power-on | 8 |
| **Autonomous (auto)** | The first 15 seconds of a match, with no driver input | 11 |
| **Branch** | A separate line of work in Git | 15 |
| **Brownout** | Battery voltage drops so low the roboRIO disables motor outputs | 4 |
| **CAN** | The two-wire bus most motor controllers use to talk to the roboRIO | 4 |
| **CI** | Continuous integration: automatically building and testing every change | 16 |
| **Clone** | Download a full copy of a Git repository | 1 |
| **Closed loop** | Control that measures and corrects (feedback) | 12 |
| **Command** | An action that uses one or more subsystems | 7 |
| **Command scheduler** | The part of WPILib that runs commands and checks triggers every loop | 7.1 |
| **Commit** | A saved snapshot of your code in Git | 1 |
| **Composition** | A command built from other commands, like a sequence or parallel group | 11 |
| **Constraints** | A motion profile's max velocity and max acceleration | 14 |
| **Current limit** | A cap on how many amps a motor can draw, set in code | 4 |
| **Deadband** | A small range around zero that's treated as exactly zero | 10 |
| **Default command** | The command a subsystem runs when nothing else is using it | 7, 7.1 |
| **Elastic** | The drag-and-drop driver dashboard that comes with WPILib | 6.1 |
| **Encoder** | A sensor that measures shaft rotation | 8 |
| **Error** | Setpoint minus measurement | 12 |
| **Feedforward** | Predicting the needed output from a model of the mechanism | 13 |
| **Gain** | A tuning constant (kP, kV, etc.) | 12 |
| **Goal** | Where a motion profile finally ends up | 14 |
| **Gradle** | The build tool WPILib projects use (`./gradlew`) | 2 |
| **Gyro / IMU** | A sensor that measures the robot's rotation and heading | 8 |
| **Integral windup** | The I term building up too much while stuck, then causing overshoot | 12 |
| **kS, kV, kA, kG** | Feedforward gains for friction, velocity, acceleration, and gravity | 13 |
| **Lambda** | A small piece of code passed around to run later: `() -> ...` | 3 |
| **Loop overrun** | The robot's code took longer than its 20 ms loop | 6 |
| **Measurement** | The value a sensor reports right now | 12 |
| **Merge conflict** | Two changes to the same lines that Git can't combine automatically | 1 |
| **Motion profile** | A planned smooth path of position and velocity over time | 14 |
| **NetworkTables** | The system that sends values between the robot and dashboards | 6.1, 9 |
| **Open loop** | Control without checking a sensor | 12 |
| **Publisher** | A NetworkTables object that sends values on one topic | 6.1 |
| **Pull request (PR)** | A request to merge a branch, with review | 15 |
| **Requirement** | A command declaring that it uses a subsystem | 7.1 |
| **roboRIO** | The robot's main computer, which runs your code | 4 |
| **Sendable** | A WPILib object (like a chooser or the scheduler) that describes itself to a dashboard | 6.1 |
| **Setpoint** | The value you want right now (target angle, target speed) | 12, 14 |
| **Simulation** | Running robot code on your laptop with fake hardware | 0, 9 |
| **Solenoid** | An electrically controlled air valve | 5 |
| **Steady-state error** | A small error that's left over after the mechanism settles | 12 |
| **Subsystem** | A class representing one robot mechanism and its hardware | 7 |
| **SysId** | WPILib tool that measures feedforward constants from real tests | 13.1 |
| **Teleop** | The driver-controlled part of a match | 10 |
| **Topic** | One named value in NetworkTables, like `/Wheel/Position (rot)` | 6.1 |
| **Trigger** | A condition (like a button) that starts or stops a command | 7, 7.1 |
| **Tunable** | A number you can change from the dashboard while the robot runs | 6.1 |
| **Unit test** | Code that automatically checks other code | 16 |
