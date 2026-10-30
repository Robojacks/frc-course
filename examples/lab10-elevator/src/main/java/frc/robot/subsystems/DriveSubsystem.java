// RoboJacks 4674 FRC Programming Course: finished code for Lab 10.
// Built from the WPILib 2026 Command Robot template.

package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import com.revrobotics.PersistMode;
import com.revrobotics.ResetMode;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.config.SparkMaxConfig;
import com.studica.frc.AHRS;
import com.studica.frc.AHRS.NavXComType;

import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.drive.DifferentialDrive;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants.kDriveConstants;
import frc.robot.telemetry.Telemetry;
import frc.robot.telemetry.TelemetryTable;

public class DriveSubsystem extends SubsystemBase {
  // Four SPARK MAXes, all BRUSHED, because CIMs are brushed motors.
  private final SparkMax m_leftLeader =
      new SparkMax(kDriveConstants.LeftLeaderCanId, MotorType.kBrushed);
  private final SparkMax m_leftFollower =
      new SparkMax(kDriveConstants.LeftFollowerCanId, MotorType.kBrushed);
  private final SparkMax m_rightLeader =
      new SparkMax(kDriveConstants.RightLeaderCanId, MotorType.kBrushed);
  private final SparkMax m_rightFollower =
      new SparkMax(kDriveConstants.RightFollowerCanId, MotorType.kBrushed);

  // DifferentialDrive is WPILib's class for any drivetrain with a left side and a right side.
  // We only hand it the two leaders. The followers copy them.
  private final DifferentialDrive m_drive =
      new DifferentialDrive(m_leftLeader::set, m_rightLeader::set);

  // Everything this subsystem sends shows up under "Drive" in Elastic
  private final TelemetryTable m_telemetry = Telemetry.getTable("Drive");

  // NavX2 on the roboRIO's MXP port, talking over SPI
  private final AHRS m_gyro = new AHRS(NavXComType.kMXP_SPI);

  private double m_turnTarget = 0.0;   // where the current turn is trying to end

  public DriveSubsystem() {
    // Left leader: normal direction
    SparkMaxConfig leftLeaderConfig = baseConfig();

    // Left follower: copy the left leader
    SparkMaxConfig leftFollowerConfig = baseConfig();
    leftFollowerConfig.follow(kDriveConstants.LeftLeaderCanId);

    // Right leader: inverted, because the right gearbox faces the other way
    SparkMaxConfig rightLeaderConfig = baseConfig();
    rightLeaderConfig.inverted(true);

    // Right follower: copy the right leader
    SparkMaxConfig rightFollowerConfig = baseConfig();
    rightFollowerConfig.follow(kDriveConstants.RightLeaderCanId);

    m_leftLeader.configure(leftLeaderConfig, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
    m_leftFollower.configure(leftFollowerConfig, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
    m_rightLeader.configure(rightLeaderConfig, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
    m_rightFollower.configure(rightFollowerConfig, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);

    // Cap the top speed while we're learning. Raise this in Constants later.
    m_drive.setMaxOutput(kDriveConstants.MaxOutput);
  }

  /** Settings every drive motor shares. */
  private static SparkMaxConfig baseConfig() {
    SparkMaxConfig config = new SparkMaxConfig();
    config.smartCurrentLimit(kDriveConstants.CurrentLimit);  // protects motors and breakers
    config.idleMode(IdleMode.kBrake);                        // stop quickly when sticks are released
    return config;
  }

  /**
   * Differential drive with two sticks: one value for the left side, one for the right.
   * Suppliers are read every loop, so the robot follows the sticks as they move.
   */
  public Command differentialDriveCommand(DoubleSupplier leftSpeed, DoubleSupplier rightSpeed) {
    return run(() -> m_drive.tankDrive(leftSpeed.getAsDouble(), rightSpeed.getAsDouble()))
        .withName("Differential Drive");
  }

  /** Drives each side at a fixed speed for a set time, then stops. */
  public Command driveForSecondsCommand(double leftSpeed, double rightSpeed, double seconds) {
    return run(() -> m_drive.tankDrive(leftSpeed, rightSpeed, false))  // false = don't square
        .withTimeout(seconds)
        .finallyDo(() -> m_drive.stopMotor())
        .withName("Drive " + seconds + " s");
  }

  /** Robot heading in degrees. Turning left (counterclockwise) makes it go up. */
  public double getHeadingDegrees() {
    return m_gyro.getRotation2d().getDegrees();
  }

  /** Makes the current direction the new 0°. Works while disabled. */
  public Command zeroHeadingCommand() {
    return runOnce(m_gyro::reset).ignoringDisable(true).withName("Zero Heading");
  }

  /**
   * Spins in place until the heading has changed by the given degrees.
   * Positive = turn left, negative = turn right.
   */
  public Command turnDegreesCommand(double degrees, double speed) {
    double direction = Math.signum(degrees);   // +1 for left, -1 for right
    return runOnce(() -> m_turnTarget = getHeadingDegrees() + degrees)
        .andThen(run(() -> m_drive.tankDrive(-direction * speed, direction * speed, false)))
        .until(() -> direction > 0
            ? getHeadingDegrees() >= m_turnTarget     // turning left: wait until we pass the target
            : getHeadingDegrees() <= m_turnTarget)    // turning right: wait until we pass it going down
        .withTimeout(3.0)                             // safety: give up if the gyro never gets there
        .finallyDo(() -> m_drive.stopMotor())
        .withName("Turn " + degrees + " deg");
  }

  /** Fast until 20 degrees from the target, then slow. */
  public Command twoSpeedTurnCommand(double degrees) {
    double direction = Math.signum(degrees);
    return runOnce(() -> m_turnTarget = getHeadingDegrees() + degrees)
        .andThen(run(() -> {
            double remaining = Math.abs(m_turnTarget - getHeadingDegrees());
            double speed = (remaining > 20.0) ? 0.6 : 0.25;   // fast far away, slow up close
            m_drive.tankDrive(-direction * speed, direction * speed, false);
        }))
        .until(() -> direction > 0
            ? getHeadingDegrees() >= m_turnTarget
            : getHeadingDegrees() <= m_turnTarget)
        .withTimeout(3.0)
        .finallyDo(() -> m_drive.stopMotor())
        .withName("Two-Speed Turn " + degrees);
  }

  @Override
  public void periodic() {
    m_telemetry.log("Left Output", m_leftLeader.getAppliedOutput());
    m_telemetry.log("Right Output", m_rightLeader.getAppliedOutput());
    m_telemetry.log("Left Leader Current (A)", m_leftLeader.getOutputCurrent());
    m_telemetry.log("Left Follower Current (A)", m_leftFollower.getOutputCurrent());
    m_telemetry.log("Right Leader Current (A)", m_rightLeader.getOutputCurrent());
    m_telemetry.log("Right Follower Current (A)", m_rightFollower.getOutputCurrent());
    m_telemetry.log("Battery (V)", RobotController.getBatteryVoltage());

    m_telemetry.log("Gyro/Heading (deg)", getHeadingDegrees());
    m_telemetry.log("Gyro/Connected", m_gyro.isConnected());
    m_telemetry.log("Gyro/Calibrating", m_gyro.isCalibrating());
    m_telemetry.log("Gyro/Turn Target (deg)", m_turnTarget);
    m_telemetry.log("Gyro/Turn Error (deg)", m_turnTarget - getHeadingDegrees());
  }
}
