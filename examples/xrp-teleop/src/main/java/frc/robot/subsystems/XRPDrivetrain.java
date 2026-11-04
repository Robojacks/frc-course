// RoboJacks 4674 FRC Programming Course: finished code for Lesson 10.1.
// Built from the WPILib 2026 XRP - Command Robot template.

package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import edu.wpi.first.hal.SimDouble;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.DifferentialDriveOdometry;
import edu.wpi.first.wpilibj.Encoder;
import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.drive.DifferentialDrive;
import edu.wpi.first.wpilibj.simulation.EncoderSim;
import edu.wpi.first.wpilibj.simulation.SimDeviceSim;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj.xrp.XRPGyro;
import edu.wpi.first.wpilibj.xrp.XRPMotor;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants.DriveConstants;
import frc.robot.telemetry.Telemetry;
import frc.robot.telemetry.TelemetryTable;

public class XRPDrivetrain extends SubsystemBase {
  // The two drive motors. XRP motors use XRPMotor, not PWMSparkMax.
  private final XRPMotor m_leftMotor = new XRPMotor(DriveConstants.kLeftMotorChannel);
  private final XRPMotor m_rightMotor = new XRPMotor(DriveConstants.kRightMotorChannel);

  // DifferentialDrive turns "forward and turn" into left and right outputs
  private final DifferentialDrive m_drive = new DifferentialDrive(m_leftMotor::set, m_rightMotor::set);

  // The encoders on each drive motor, and the XRP's gyro
  private final Encoder m_leftEncoder =
      new Encoder(DriveConstants.kLeftEncoderA, DriveConstants.kLeftEncoderB);
  private final Encoder m_rightEncoder =
      new Encoder(DriveConstants.kRightEncoderA, DriveConstants.kRightEncoderB);
  private final XRPGyro m_gyro = new XRPGyro();

  // Where the robot is, from the encoders and gyro (Lesson 17 explains odometry)
  private final DifferentialDriveOdometry m_odometry;
  private final Field2d m_field = new Field2d();

  private final TelemetryTable m_telemetry = Telemetry.getTable("Drive");

  public XRPDrivetrain() {
    // The right motor spins backward for positive output, so invert it
    m_rightMotor.setInverted(true);

    // After this, getDistance() is in meters
    m_leftEncoder.setDistancePerPulse(DriveConstants.kMetersPerCount);
    m_rightEncoder.setDistancePerPulse(DriveConstants.kMetersPerCount);

    m_odometry = new DifferentialDriveOdometry(m_gyro.getRotation2d(), getLeftMeters(), getRightMeters());
    SmartDashboard.putData("Field", m_field);
  }

  /** Arcade drive: one value for forward/back, one for turning (counterclockwise is positive). */
  public Command arcadeDriveCommand(DoubleSupplier forward, DoubleSupplier rotation) {
    return run(() -> m_drive.arcadeDrive(forward.getAsDouble(), rotation.getAsDouble()))
        .withName("Arcade Drive");
  }

  /** Drives without squaring the inputs, for autonomous (Lesson 10.2). */
  public void arcadeDriveRaw(double forward, double rotation) {
    m_drive.arcadeDrive(forward, rotation, false);
  }

  public void stop() {
    m_drive.stopMotor();
  }

  public double getLeftMeters() {
    return m_leftEncoder.getDistance();
  }

  public double getRightMeters() {
    return m_rightEncoder.getDistance();
  }

  /** How far the robot has driven: the average of both sides, in meters. */
  public double getAverageMeters() {
    return (getLeftMeters() + getRightMeters()) / 2.0;
  }

  /** Heading in degrees. Turning left (counterclockwise) makes it go up. */
  public double getHeadingDegrees() {
    return m_gyro.getRotation2d().getDegrees();
  }

  public Pose2d getPose() {
    return m_odometry.getPoseMeters();
  }

  /** Puts the robot back at (0, 0) facing 0° on the field map. Works while disabled. */
  public Command resetPoseCommand() {
    return runOnce(() -> m_odometry.resetPosition(
            m_gyro.getRotation2d(), getLeftMeters(), getRightMeters(), Pose2d.kZero))
        .ignoringDisable(true)
        .withName("Reset Pose");
  }

  @Override
  public void periodic() {
    m_odometry.update(m_gyro.getRotation2d(), getLeftMeters(), getRightMeters());
    m_field.setRobotPose(getPose());

    m_telemetry.log("Left Output", m_leftMotor.get());
    // The inverted right motor reports its real spin direction; flip it so forward is + on both sides
    m_telemetry.log("Right Output", -m_rightMotor.get());
    m_telemetry.log("Left (m)", getLeftMeters());
    m_telemetry.log("Right (m)", getRightMeters());
    m_telemetry.log("Heading (deg)", getHeadingDegrees());
    m_telemetry.log("Pose", getPose());
  }

  // ------------------------------------------------------------------ simulation (Step 6)

  // True when the XRP Client is running, meaning a real XRP is sending real sensor readings
  private static final boolean kRealXRP = isXRPClientRunning();

  private final EncoderSim m_leftEncoderSim = new EncoderSim(m_leftEncoder);
  private final EncoderSim m_rightEncoderSim = new EncoderSim(m_rightEncoder);
  private final SimDouble m_gyroAngleSim = new SimDeviceSim("Gyro:XRPGyro").getDouble("angle_z");
  private double m_simHeadingDegrees = 0.0;

  /** Without a real XRP, pretend the wheels move as fast as the motors are told to go. */
  @Override
  public void simulationPeriodic() {
    if (kRealXRP) {
      return;   // the real XRP is sending its real encoders and gyro: don't overwrite them
    }
    double dt = TimedRobot.kDefaultPeriod;   // 0.02 s
    // get() reports each motor's physical direction, so the inverted right motor reads backward
    double leftSpeed = m_leftMotor.get() * DriveConstants.kMaxSpeedMetersPerSecond;
    double rightSpeed = -m_rightMotor.get() * DriveConstants.kMaxSpeedMetersPerSecond;

    m_leftEncoderSim.setDistance(m_leftEncoderSim.getDistance() + leftSpeed * dt);
    m_rightEncoderSim.setDistance(m_rightEncoderSim.getDistance() + rightSpeed * dt);

    // Turning: the difference between the sides, divided by the track width, is radians per second
    m_simHeadingDegrees +=
        Math.toDegrees((rightSpeed - leftSpeed) / DriveConstants.kTrackWidthMeters * dt);
    m_gyroAngleSim.set(m_simHeadingDegrees);
  }

  /** WPILib lists the simulation extensions you chose in HALSIM_EXTENSIONS. */
  private static boolean isXRPClientRunning() {
    String extensions = System.getenv("HALSIM_EXTENSIONS");
    return extensions != null && extensions.contains("halsim_xrp");
  }
}
