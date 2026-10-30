// RoboJacks 4674 FRC Programming Course: finished code for Lab 1.1.
// Built from the WPILib 2026 Command Robot template.

package frc.robot;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;

import frc.robot.Constants.OperatorConstants;
import frc.robot.commands.Autos;
import frc.robot.subsystems.ExampleSubsystem;
import frc.robot.subsystems.SpinBrushlessMotorSubsystem;

/**
 * This class is where the bulk of the robot should be declared. Since Command-based is a
 * "declarative" paradigm, very little robot logic should actually be handled in the {@link Robot}
 * periodic methods (other than the scheduler calls). Instead, the structure of the robot (including
 * subsystems, commands, and trigger mappings) should be declared here.
 */
public class RobotContainer {
  // The robot's subsystems and commands are defined here...
  private final ExampleSubsystem m_exampleSubsystem = new ExampleSubsystem();

  private final SpinBrushlessMotorSubsystem m_spinBrushlessMotorSubsystem =
      new SpinBrushlessMotorSubsystem();

  // The driver's Xbox controller, in Driver Station slot 0
  private final CommandXboxController m_controller =
      new CommandXboxController(OperatorConstants.kControllerPort);

  /** The container for the robot. Contains subsystems, OI devices, and commands. */
  public RobotContainer() {
    // Configure the trigger bindings
    configureBindings();
  }

  /** Use this method to define your trigger->command mappings. */
  private void configureBindings() {
    // Spin the brushless motor while A is held
    m_controller.a().whileTrue(
        m_spinBrushlessMotorSubsystem.spinMotorCommand(
            Constants.kBrushlessConstants.BrushlessMotorSpeed));

    // Spin at the dashboard's speed while B is held
    m_controller.b().whileTrue(m_spinBrushlessMotorSubsystem.spinAtTunableSpeedCommand());
  }

  /**
   * Use this to pass the autonomous command to the main {@link Robot} class.
   *
   * @return the command to run in autonomous
   */
  public Command getAutonomousCommand() {
    // An example command will be run in autonomous
    return Autos.exampleAuto(m_exampleSubsystem);
  }
}
