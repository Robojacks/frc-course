// RoboJacks 4674 FRC Programming Course: finished code for Lesson 21.1.
// Built from REV Robotics' MAXSwerve Java Template (BSD 3-Clause, see REV-LICENSE.txt) and the team's copy.

package frc.robot.subsystems;

import com.ctre.phoenix6.hardware.Pigeon2;
import com.pathplanner.lib.auto.AutoBuilder;
import com.pathplanner.lib.config.PIDConstants;
import com.pathplanner.lib.config.RobotConfig;
import com.pathplanner.lib.controllers.PPHolonomicDriveController;

import edu.wpi.first.math.Matrix;
import edu.wpi.first.math.estimator.SwerveDrivePoseEstimator;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveDriveKinematics;
import edu.wpi.first.math.kinematics.SwerveModulePosition;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.math.numbers.N1;
import edu.wpi.first.math.numbers.N3;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants.AutoConstants;
import frc.robot.Constants.DriveConstants;
import frc.robot.telemetry.Telemetry;
import frc.robot.telemetry.TelemetryTable;

public class DriveSubsystem extends SubsystemBase {
  // The four MAXSwerve modules. Order everywhere: front left, front right, rear left, rear right.
  private final MAXSwerveModule m_frontLeft = new MAXSwerveModule(
      DriveConstants.kFrontLeftDrivingCanId,
      DriveConstants.kFrontLeftTurningCanId,
      DriveConstants.kFrontLeftChassisAngularOffset);
  private final MAXSwerveModule m_frontRight = new MAXSwerveModule(
      DriveConstants.kFrontRightDrivingCanId,
      DriveConstants.kFrontRightTurningCanId,
      DriveConstants.kFrontRightChassisAngularOffset);
  private final MAXSwerveModule m_rearLeft = new MAXSwerveModule(
      DriveConstants.kRearLeftDrivingCanId,
      DriveConstants.kRearLeftTurningCanId,
      DriveConstants.kBackLeftChassisAngularOffset);
  private final MAXSwerveModule m_rearRight = new MAXSwerveModule(
      DriveConstants.kRearRightDrivingCanId,
      DriveConstants.kRearRightTurningCanId,
      DriveConstants.kBackRightChassisAngularOffset);

  // The Pigeon 2 gyro. getRotation2d() is counterclockwise-positive, like WPILib.
  private final Pigeon2 m_gyro = new Pigeon2(DriveConstants.kPigeonCanId);

  // Odometry that can also take vision measurements (Lesson 18)
  private final SwerveDrivePoseEstimator m_poseEstimator;

  private final TelemetryTable m_telemetry = Telemetry.getTable("Drive");
  private final Field2d m_field = new Field2d();

  public DriveSubsystem() {
    m_poseEstimator = new SwerveDrivePoseEstimator(
        DriveConstants.kDriveKinematics,
        m_gyro.getRotation2d(),
        getModulePositions(),
        Pose2d.kZero);
    SmartDashboard.putData("Field", m_field);
    configurePathPlanner();
  }

  /** Lets PathPlanner drive this subsystem (Lesson 19). */
  private void configurePathPlanner() {
    RobotConfig config;
    try {
      config = RobotConfig.fromGUISettings();   // the PathPlanner app's Robot Config
    } catch (Exception e) {
      DriverStation.reportError("PathPlanner settings didn't load; using backup config", e.getStackTrace());
      config = AutoConstants.kBackupPPConfig;
    }
    AutoBuilder.configure(
        this::getPose,
        this::resetPose,
        this::getRobotRelativeSpeeds,
        (speeds, feedforwards) -> driveRobotRelative(speeds),
        new PPHolonomicDriveController(
            new PIDConstants(AutoConstants.kPPTranslationP, 0.0, 0.0),
            new PIDConstants(AutoConstants.kPPRotationP, 0.0, 0.0)),
        config,
        DriveSubsystem::isRedAlliance,   // flip paths to the red side when we're red
        this);
  }

  @Override
  public void periodic() {
    m_poseEstimator.update(m_gyro.getRotation2d(), getModulePositions());

    Pose2d pose = getPose();
    m_field.setRobotPose(pose);
    m_telemetry.log("Pose", pose);
    m_telemetry.log("Heading (deg)", pose.getRotation().getDegrees());
    m_telemetry.log("Gyro (deg)", m_gyro.getRotation2d().getDegrees());
    m_telemetry.log("Measured States", getModuleStates(), SwerveModuleState.struct);
    m_telemetry.log("Desired States", getDesiredStates(), SwerveModuleState.struct);
    m_telemetry.log("Speeds", getRobotRelativeSpeeds());
  }

  // ---------------------------------------------------------------- pose

  /** Where the robot is on the field: odometry, corrected by vision. */
  public Pose2d getPose() {
    return m_poseEstimator.getEstimatedPosition();
  }

  /** Tells the pose estimator the robot is at this pose. PathPlanner calls this at the start of an auto. */
  public void resetPose(Pose2d pose) {
    m_poseEstimator.resetPosition(m_gyro.getRotation2d(), getModulePositions(), pose);
  }

  /** Hands a camera's pose to the estimator (Lesson 18). stdDevs: x m, y m, heading rad. */
  public void addVisionMeasurement(Pose2d visionPose, double timestampSeconds, Matrix<N3, N1> stdDevs) {
    m_poseEstimator.addVisionMeasurement(visionPose, timestampSeconds, stdDevs);
  }

  /**
   * Makes the direction the robot faces right now "away from the driver."
   * Changes the pose's heading only; the Pigeon isn't reset, so odometry doesn't jump.
   */
  public Command zeroHeadingCommand() {
    return runOnce(() -> resetPose(new Pose2d(getPose().getTranslation(),
            isRedAlliance() ? Rotation2d.k180deg : Rotation2d.kZero)))
        .ignoringDisable(true)
        .withName("Zero Heading");
  }

  // ---------------------------------------------------------------- driving

  /**
   * Drives from joystick values, each -1 to 1.
   *
   * @param xSpeed forward (+) / backward (-)
   * @param ySpeed left (+) / right (-)
   * @param rot counterclockwise (+) / clockwise (-)
   * @param fieldRelative true: forward means away from the driver
   */
  public void drive(double xSpeed, double ySpeed, double rot, boolean fieldRelative) {
    drive(new ChassisSpeeds(
            xSpeed * DriveConstants.kMaxSpeedMetersPerSecond,
            ySpeed * DriveConstants.kMaxSpeedMetersPerSecond,
            rot * DriveConstants.kMaxAngularSpeed),
        fieldRelative);
  }

  /** The default teleop command: field-relative driving from three joystick axes. */
  public Command driveCommand(
      java.util.function.DoubleSupplier xSpeed,
      java.util.function.DoubleSupplier ySpeed,
      java.util.function.DoubleSupplier rot) {
    return run(() -> drive(xSpeed.getAsDouble(), ySpeed.getAsDouble(), rot.getAsDouble(), true))
        .withName("Field-Relative Drive");
  }

  /** Points the wheels in an X so the robot is hard to push. Runs while held. */
  public Command setXCommand() {
    return run(this::setX).withName("X-Lock");
  }

  private void driveRobotRelative(ChassisSpeeds speeds) {
    drive(speeds, false);
  }

  private void drive(ChassisSpeeds speeds, boolean fieldRelative) {
    if (fieldRelative) {
      // The driver's "forward": +X on blue, -X on red (the field origin is always on the blue side)
      Rotation2d driverForward = isRedAlliance()
          ? getPose().getRotation().plus(Rotation2d.k180deg)
          : getPose().getRotation();
      speeds = ChassisSpeeds.fromFieldRelativeSpeeds(speeds, driverForward);
    }
    speeds = ChassisSpeeds.discretize(speeds, TimedRobot.kDefaultPeriod);
    SwerveModuleState[] states = DriveConstants.kDriveKinematics.toSwerveModuleStates(speeds);
    setModuleStates(states);
  }

  /** Sends one state to each module, slowing all four together if any is too fast. */
  public void setModuleStates(SwerveModuleState[] desiredStates) {
    SwerveDriveKinematics.desaturateWheelSpeeds(desiredStates, DriveConstants.kMaxSpeedMetersPerSecond);
    m_frontLeft.setDesiredState(desiredStates[0]);
    m_frontRight.setDesiredState(desiredStates[1]);
    m_rearLeft.setDesiredState(desiredStates[2]);
    m_rearRight.setDesiredState(desiredStates[3]);
  }

  /** Sets the wheels into an X formation to prevent movement. */
  public void setX() {
    m_frontLeft.setDesiredState(new SwerveModuleState(0, Rotation2d.fromDegrees(45)));
    m_frontRight.setDesiredState(new SwerveModuleState(0, Rotation2d.fromDegrees(-45)));
    m_rearLeft.setDesiredState(new SwerveModuleState(0, Rotation2d.fromDegrees(-45)));
    m_rearRight.setDesiredState(new SwerveModuleState(0, Rotation2d.fromDegrees(45)));
  }

  // ---------------------------------------------------------------- readings

  public ChassisSpeeds getRobotRelativeSpeeds() {
    return DriveConstants.kDriveKinematics.toChassisSpeeds(getModuleStates());
  }

  private SwerveModuleState[] getModuleStates() {
    return new SwerveModuleState[] {
        m_frontLeft.getState(), m_frontRight.getState(), m_rearLeft.getState(), m_rearRight.getState()};
  }

  private SwerveModuleState[] getDesiredStates() {
    return new SwerveModuleState[] {
        m_frontLeft.getDesiredState(), m_frontRight.getDesiredState(),
        m_rearLeft.getDesiredState(), m_rearRight.getDesiredState()};
  }

  private SwerveModulePosition[] getModulePositions() {
    return new SwerveModulePosition[] {
        m_frontLeft.getPosition(), m_frontRight.getPosition(),
        m_rearLeft.getPosition(), m_rearRight.getPosition()};
  }

  private static boolean isRedAlliance() {
    return DriverStation.getAlliance().orElse(Alliance.Blue) == Alliance.Red;
  }
}
