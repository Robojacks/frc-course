// RoboJacks 4674 FRC Programming Course: finished code for Lab 1.
// Built from the WPILib 2026 Command Robot template.

package frc.robot.subsystems;

import com.revrobotics.PersistMode;
import com.revrobotics.ResetMode;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.config.SparkMaxConfig;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants;

public class SpinBrushlessMotorSubsystem extends SubsystemBase {
  // Create the motor controller: CAN ID 8, brushless motor.
  // private final = only this class can use it, and it can't be swapped for another.
  private final SparkMax m_brushlessMotor = new SparkMax(
      Constants.kBrushlessConstants.BrushlessMotorCanId, MotorType.kBrushless);

  public SpinBrushlessMotorSubsystem() {
    // Collect the settings we want in a config object
    SparkMaxConfig brushlessMotorConfig = new SparkMaxConfig();

    // Limit how much current the motor can pull, to protect the motor and the breaker
    brushlessMotorConfig.smartCurrentLimit(Constants.kBrushlessConstants.BrushlessMotorCurrentLimit);

    // Brake mode: when we stop, the motor actively stops instead of coasting
    brushlessMotorConfig.idleMode(IdleMode.kBrake);

    // Send the settings to the SPARK MAX.
    // kResetSafeParameters: start from known defaults, then apply ours.
    // kPersistParameters: save them, so they survive if the SPARK MAX loses power mid-match.
    m_brushlessMotor.configure(
        brushlessMotorConfig, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
  }

  /** Sets the motor's power, from -1.0 (full reverse) to 1.0 (full forward). */
  public void setMotorSpeed(double speed) {
    m_brushlessMotor.set(speed);
  }

  /**
   * A command that spins the motor at a speed while it runs,
   * and stops the motor when it ends.
   */
  public Command spinMotorCommand(double speed) {
    return startEnd(
        () -> setMotorSpeed(speed),   // runs once, when the command starts
        () -> setMotorSpeed(0.0)      // runs once, when the command ends
    ).withName("Spin Brushless");
  }
}
