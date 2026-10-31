// RoboJacks 4674 FRC Programming Course: finished code for Lesson 21.1.
// Built from REV Robotics' MAXSwerve Java Template (BSD 3-Clause, see REV-LICENSE.txt) and the team's copy.

package frc.robot;

import com.pathplanner.lib.auto.AutoBuilder;
import com.pathplanner.lib.auto.NamedCommands;
import com.pathplanner.lib.commands.PathPlannerAuto;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;

import frc.robot.Constants.OIConstants;
import frc.robot.subsystems.DriveSubsystem;
import frc.robot.subsystems.VisionSubsystem;
import frc.robot.telemetry.Selectable;
import frc.robot.telemetry.Tunables;

public class RobotContainer {
  // The robot's subsystems
  private final DriveSubsystem m_robotDrive = new DriveSubsystem();
  private final VisionSubsystem m_vision = new VisionSubsystem(m_robotDrive);

  // The driver's Xbox controller
  private final CommandXboxController m_driverController =
      new CommandXboxController(OIConstants.kDriverControllerPort);

  // The autonomous menu in Elastic (Lesson 19, Step 7)
  private final Selectable<Command> m_autoChooser = new Selectable<>();

  public RobotContainer() {
    // Named commands first: autos look them up when they're built (Lesson 19, Step 6)
    NamedCommands.registerCommand("X-Lock", m_robotDrive.setXCommand().withTimeout(0.5));

    configureBindings();

    m_autoChooser.addDefault("Do nothing", Commands.none());
    for (String name : AutoBuilder.getAllAutoNames()) {
      m_autoChooser.add(name, new PathPlannerAuto(name));
    }
    Tunables.publish("Auto", m_autoChooser);
  }

  private void configureBindings() {
    // Left stick drives (field-relative); right stick X turns.
    // Every axis is negated: pushing a stick forward or left reads negative on an Xbox controller.
    m_robotDrive.setDefaultCommand(m_robotDrive.driveCommand(
        () -> -MathUtil.applyDeadband(m_driverController.getLeftY(), OIConstants.kDriveDeadband),
        () -> -MathUtil.applyDeadband(m_driverController.getLeftX(), OIConstants.kDriveDeadband),
        () -> -MathUtil.applyDeadband(m_driverController.getRightX(), OIConstants.kDriveDeadband)));

    // Right bumper: X-lock while held
    m_driverController.rightBumper().whileTrue(m_robotDrive.setXCommand());
    // Start: the robot now faces away from the driver
    m_driverController.start().onTrue(m_robotDrive.zeroHeadingCommand());
  }

  public Command getAutonomousCommand() {
    return m_autoChooser.getSelected();
  }
}
