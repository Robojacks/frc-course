# Where to Go Next

Once you're comfortable with Lessons 0–16, these are the topics most teams tackle next. They're listed roughly in the order teams usually learn them, with the best place to start for each.

## Odometry and pose estimation
**Odometry** tracks where the robot is on the field by combining wheel encoders and the gyro. It's the foundation for path following and auto-aiming.

- Start: [Kinematics and Odometry](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/index.html)
- Then: add a `Field2d` to the dashboard to see the robot's estimated position move as it drives
- Next level: **pose estimation**, which corrects odometry drift with camera measurements of AprilTags. See [State-Space and Pose Estimators](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/state-space/index.html).

## Swerve drive
Most competitive teams now drive swerve: each wheel steers and drives independently, so the robot can move in any direction while turning.

- Start: the swerve kinematics and odometry pages in the WPILib kinematics section above
- Then: your swerve module vendor's docs, and their example code
- Many teams start from a generated template, such as CTRE's swerve project generator in Phoenix Tuner, rather than writing swerve from scratch

Everything from Lessons 10–14 still applies: a swerve module is a drive motor with velocity control and a steering motor with position control.

## Vision
Cameras let the robot see AprilTags (to know where it is) and game pieces (to aim or drive to them).

- [PhotonVision](https://docs.photonvision.org/)
- [Limelight](https://docs.limelightvision.io/)
- [AprilTag introduction (WPILib)](https://docs.wpilib.org/en/stable/docs/software/vision-processing/apriltag/apriltag-intro.html)

## Path following
Instead of "drive 2 meters, turn 90°," draw a smooth path on a field diagram and let the robot follow it.

- [PathPlanner](https://pathplanner.dev/): the most widely used tool, with a path editor, auto builder, and on-the-fly pathfinding
- [Choreo](https://choreo.autos/): generates time-optimal paths

## Characterization
- [System Identification (SysId)](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/introduction.html), covered in [Lesson 13.1](../controls/13b-sysid.md)
- [ReCalc](https://www.reca.lc/): estimate gear ratios, speeds, and feedforward gains before the mechanism is built

## Logging and replay
- [AdvantageKit](https://docs.advantagekit.org/): logs every input so you can replay a match and re-run your code against it
- [AdvantageScope](https://docs.advantagescope.org/): graphs, 3D field views, and log analysis

## Vendor libraries
Your team's motors run through vendor libraries. Read the docs for whichever you use:

- [CTRE Phoenix 6](https://v6.docs.ctr-electronics.com/) (TalonFX, Kraken, CANcoder, Pigeon 2)
- [REVLib](https://docs.revrobotics.com/revlib) (SPARK MAX, SPARK Flex, NEO)

{% hint style="success" %}
**Learn from other teams**

Many top teams publish their robot code on GitHub, and some write up their software design each season. Reading a championship robot's code after finishing this course is one of the best ways to level up. Pick one mechanism and figure out how they did it.
{% endhint %}
