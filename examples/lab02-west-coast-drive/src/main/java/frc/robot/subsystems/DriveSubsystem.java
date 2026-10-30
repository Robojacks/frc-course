// RoboJacks 4674 FRC Programming Course: finished code for Lab 2.
// Built from the WPILib 2026 Command Robot template.

package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import com.revrobotics.PersistMode;
import com.revrobotics.ResetMode;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.config.SparkMaxConfig;

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

  @Override
  public void periodic() {
    m_telemetry.log("Left Output", m_leftLeader.getAppliedOutput());
    m_telemetry.log("Right Output", m_rightLeader.getAppliedOutput());
    m_telemetry.log("Left Leader Current (A)", m_leftLeader.getOutputCurrent());
    m_telemetry.log("Left Follower Current (A)", m_leftFollower.getOutputCurrent());
    m_telemetry.log("Right Leader Current (A)", m_rightLeader.getOutputCurrent());
    m_telemetry.log("Right Follower Current (A)", m_rightFollower.getOutputCurrent());
    m_telemetry.log("Battery (V)", RobotController.getBatteryVoltage());
  }
}
