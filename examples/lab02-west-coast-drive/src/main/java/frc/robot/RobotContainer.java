// RoboJacks 4674 FRC Programming Course: finished code for Lab 2.
// Built from the WPILib 2026 Command Robot template.

package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.Constants.OperatorConstants;
import frc.robot.subsystems.DriveSubsystem;

/**
 * This class is where the bulk of the robot should be declared: subsystems, controllers,
 * and the bindings between them.
 */
public class RobotContainer {
  // The robot's subsystems
  private final DriveSubsystem m_driveSubsystem = new DriveSubsystem();

  // The driver's Xbox controller, in Driver Station slot 0
  private final CommandXboxController m_controller =
      new CommandXboxController(OperatorConstants.kControllerPort);

  /** The container for the robot. Contains subsystems, OI devices, and commands. */
  public RobotContainer() {
    configureBindings();
  }

  private void configureBindings() {
    // Left stick drives the left side, right stick drives the right side,
    // whenever no other command is using the drivetrain
    m_driveSubsystem.setDefaultCommand(
        m_driveSubsystem.differentialDriveCommand(
            () -> -MathUtil.applyDeadband(m_controller.getLeftY(), OperatorConstants.kDeadband),
            () -> -MathUtil.applyDeadband(m_controller.getRightY(), OperatorConstants.kDeadband)));
  }

  public Command getAutonomousCommand() {
    return null;   // no autonomous yet
  }
}
