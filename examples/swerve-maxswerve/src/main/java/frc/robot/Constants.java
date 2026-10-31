// RoboJacks 4674 FRC Programming Course: finished code for Lesson 21.1.
// Built from REV Robotics' MAXSwerve Java Template (BSD 3-Clause, see REV-LICENSE.txt) and the team's copy.

package frc.robot;

import com.pathplanner.lib.config.ModuleConfig;
import com.pathplanner.lib.config.RobotConfig;

import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.util.Units;

public final class Constants {
  public static final class DriveConstants {
    // The fastest the code will ever ASK the robot to go. Not the robot's true top speed.
    public static final double kMaxSpeedMetersPerSecond = 4.8;
    public static final double kMaxAngularSpeed = 2 * Math.PI; // radians per second

    // Chassis: wheel centers, left-to-right (track width) and front-to-back (wheel base)
    public static final double kTrackWidth = Units.inchesToMeters(25);
    public static final double kWheelBase = Units.inchesToMeters(28);

    // Where each module is from the robot's center. Order: FL, FR, RL, RR. +X forward, +Y left.
    public static final SwerveDriveKinematics kDriveKinematics = new SwerveDriveKinematics(
        new Translation2d(kWheelBase / 2, kTrackWidth / 2),
        new Translation2d(kWheelBase / 2, -kTrackWidth / 2),
        new Translation2d(-kWheelBase / 2, kTrackWidth / 2),
        new Translation2d(-kWheelBase / 2, -kTrackWidth / 2));

    // How each module is turned when mounted, compared with how it was zeroed (radians)
    public static final double kFrontLeftChassisAngularOffset = -Math.PI / 2;
    public static final double kFrontRightChassisAngularOffset = 0;
    public static final double kBackLeftChassisAngularOffset = Math.PI;
    public static final double kBackRightChassisAngularOffset = Math.PI / 2;

    // Driving motors: SPARK Flex CAN IDs
    public static final int kFrontLeftDrivingCanId = 1;
    public static final int kRearLeftDrivingCanId = 3;
    public static final int kFrontRightDrivingCanId = 5;
    public static final int kRearRightDrivingCanId = 7;

    // Turning motors: SPARK MAX CAN IDs
    public static final int kFrontLeftTurningCanId = 2;
    public static final int kRearLeftTurningCanId = 4;
    public static final int kFrontRightTurningCanId = 6;
    public static final int kRearRightTurningCanId = 8;

    public static final int kPigeonCanId = 9;   // CHANGED: named instead of a bare 9 in DriveSubsystem
  }

  public static final class ModuleConstants {
    // The MAXSwerve pinion: 12T, 13T, or 14T. More teeth = faster robot.
    public static final int kDrivingMotorPinionTeeth = 14;

    // Free speed of the DRIVE motor, turns per second
    public static final double kDrivingMotorFreeSpeedRps = MotorConstants.kDrivingFreeSpeedRpm / 60;
    public static final double kWheelDiameterMeters = Units.inchesToMeters(3);
    public static final double kWheelCircumferenceMeters = kWheelDiameterMeters * Math.PI;
    // 45 teeth on the wheel's bevel gear, 22 on the first-stage spur gear, 15 on the bevel pinion
    public static final double kDrivingMotorReduction = (45.0 * 22) / (kDrivingMotorPinionTeeth * 15);
    // The wheel's free speed, in meters per second of travel
    public static final double kDriveWheelFreeSpeedRps =
        (kDrivingMotorFreeSpeedRps * kWheelCircumferenceMeters) / kDrivingMotorReduction;
  }

  public static final class OIConstants {
    public static final int kDriverControllerPort = 0;
    public static final double kDriveDeadband = 0.05;
  }

  public static final class AutoConstants {
    // PathPlanner's path-following PID: meters of error -> m/s, and radians of error -> rad/s
    public static final double kPPTranslationP = 1.0;
    public static final double kPPRotationP = 1.0;

    // A backup robot config, used only if the PathPlanner app's settings can't be read.
    // CHANGED: real motor and a mass you must measure. Keep these matching the app's Robot Config.
    public static final double kRobotMassKg = Units.lbsToKilograms(125);   // CHANGED: WEIGH THE ROBOT
    public static final double kRobotMOI = 6.883;
    public static final double kWheelCOF = 1.2;
    public static final double kDriveCurrentLimitAmps = 50.0;   // matches Configs.drivingConfig

    public static final RobotConfig kBackupPPConfig = new RobotConfig(
        kRobotMassKg,
        kRobotMOI,
        new ModuleConfig(
            ModuleConstants.kWheelDiameterMeters / 2.0,
            DriveConstants.kMaxSpeedMetersPerSecond,
            kWheelCOF,
            DCMotor.getNeoVortex(1).withReduction(ModuleConstants.kDrivingMotorReduction),   // CHANGED
            kDriveCurrentLimitAmps,
            1),
        new Translation2d(DriveConstants.kWheelBase / 2, DriveConstants.kTrackWidth / 2),
        new Translation2d(DriveConstants.kWheelBase / 2, -DriveConstants.kTrackWidth / 2),
        new Translation2d(-DriveConstants.kWheelBase / 2, DriveConstants.kTrackWidth / 2),
        new Translation2d(-DriveConstants.kWheelBase / 2, -DriveConstants.kTrackWidth / 2));
  }

  public static final class MotorConstants {
    // CHANGED: the drive motors are NEO Vortexes (6784 RPM). A plain NEO is 5676 RPM.
    public static final double kDrivingFreeSpeedRpm = 6784;
  }
}
