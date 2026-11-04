// RoboJacks 4674 FRC Programming Course: finished code for Lesson 10.1.
// Built from the WPILib 2026 XRP - Command Robot template.

package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj.xrp.XRPOnBoardIO;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.Trigger;

import frc.robot.Constants.OIConstants;
import frc.robot.subsystems.XRPDrivetrain;

public class RobotContainer {
  // The robot's subsystems and the XRP's USER button and LED
  private final XRPDrivetrain m_drivetrain = new XRPDrivetrain();
  private final XRPOnBoardIO m_onboardIO = new XRPOnBoardIO();

  // An Xbox controller, or the Sim GUI's keyboard, in Joystick 0
  private final CommandXboxController m_driver =
      new CommandXboxController(OIConstants.kDriverControllerPort);

  public RobotContainer() {
    configureBindings();
  }

  private void configureBindings() {
    // One-stick arcade: left stick up/down drives, left/right turns.
    // Both are negated: pushing a stick forward or left reads negative.
    m_drivetrain.setDefaultCommand(m_drivetrain.arcadeDriveCommand(
        () -> -processAxis(m_driver.getLeftY()) * speedScale(),
        () -> -processAxis(m_driver.getLeftX()) * speedScale()));

    // The XRP's USER button puts the robot back at the start of the field map
    new Trigger(m_onboardIO::getUserButtonPressed).onTrue(m_drivetrain.resetPoseCommand());
  }

  /** Deadband: treat a stick that's almost centered as exactly centered. */
  private static double processAxis(double raw) {
    return MathUtil.applyDeadband(raw, OIConstants.kDeadband);
  }

  /** Slow mode: hold the right bumper for fine control. */
  private double speedScale() {
    return m_driver.rightBumper().getAsBoolean() ? OIConstants.kSlowModeScale : 1.0;
  }

  public Command getAutonomousCommand() {
    return Commands.none();   // Lesson 10.2
  }
}
