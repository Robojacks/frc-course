// RoboJacks 4674 FRC Programming Course: finished code for Lesson 10.2.
// Built from the WPILib 2026 XRP - Command Robot template.

package frc.robot.subsystems;

import edu.wpi.first.wpilibj.xrp.XRPServo;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants.ArmConstants;
import frc.robot.telemetry.Telemetry;
import frc.robot.telemetry.TelemetryTable;

public class Arm extends SubsystemBase {
  // The arm's servo: give it an angle from 0 to 180 degrees and it goes there
  private final XRPServo m_servo = new XRPServo(ArmConstants.kServoChannel);
  private final TelemetryTable m_telemetry = Telemetry.getTable("Arm");

  /** Moves the arm to an angle, then waits half a second for it to get there. */
  public Command setAngleCommand(double degrees) {
    return runOnce(() -> m_servo.setAngle(degrees))
        .andThen(Commands.waitSeconds(0.5))
        .withName("Arm to " + degrees + " deg");
  }

  @Override
  public void periodic() {
    m_telemetry.log("Angle (deg)", m_servo.getAngle());
  }
}
