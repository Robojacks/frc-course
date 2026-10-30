// RoboJacks 4674 FRC Programming Course: finished code for Lab 10.
// Built from the WPILib 2026 Command Robot template.

package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;

import frc.robot.Constants.OperatorConstants;
import frc.robot.subsystems.DriveSubsystem;
import frc.robot.subsystems.ElevatorSubsystem;
import frc.robot.subsystems.ElevatorSubsystem.Preset;
import frc.robot.telemetry.Selectable;
import frc.robot.telemetry.Tunables;

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

  // The elevator, and the operator's controller (Driver Station slot 1)
  private final ElevatorSubsystem m_elevator = new ElevatorSubsystem();
  private final CommandXboxController m_operator = new CommandXboxController(1);

  // The autonomous menu in Elastic
  private final Selectable<Command> m_autoChooser = new Selectable<>();

  /** The container for the robot. Contains subsystems, OI devices, and commands. */
  public RobotContainer() {
    configureBindings();

    m_autoChooser.addDefault("Do nothing", Commands.none());
    m_autoChooser.add("Drive forward", driveForwardAuto());
    m_autoChooser.add("Square", squareAuto());
    Tunables.publish("Auto", m_autoChooser);   // shows up as /Tunables/Auto
  }

  private void configureBindings() {
    // Left stick drives the left side, right stick drives the right side,
    // whenever no other command is using the drivetrain
    m_driveSubsystem.setDefaultCommand(
        m_driveSubsystem.differentialDriveCommand(
            () -> -MathUtil.applyDeadband(m_controller.getLeftY(), OperatorConstants.kDeadband),
            () -> -MathUtil.applyDeadband(m_controller.getRightY(), OperatorConstants.kDeadband)));

    // ---- Gyro (Lab 8) ----
    m_controller.back().onTrue(m_driveSubsystem.zeroHeadingCommand());
    m_controller.x().onTrue(m_driveSubsystem.turnDegreesCommand(90, 0.4));    // turn left 90°
    m_controller.b().onTrue(m_driveSubsystem.turnDegreesCommand(-90, 0.4));   // turn right 90°
    m_controller.y().onTrue(m_driveSubsystem.twoSpeedTurnCommand(90));

    // ---- Elevator (operator controller, slot 1) ----
    m_elevator.setDefaultCommand(m_elevator.holdCommand());

    m_operator.povUp().whileTrue(m_elevator.manualCommand(2.0));     // manual up
    m_operator.povDown().whileTrue(m_elevator.manualCommand(-1.0));  // manual down (gravity helps)
    m_operator.back().onTrue(m_elevator.zeroCommand());
    m_operator.a().onTrue(m_elevator.goToPresetCommand(Preset.START));
    m_operator.b().onTrue(m_elevator.goToPresetCommand(Preset.L2));
    m_operator.y().onTrue(m_elevator.goToPresetCommand(Preset.L3));
  }

  public Command getAutonomousCommand() {
    return m_autoChooser.getSelected();
  }

  /** Drive straight forward for 2 seconds. */
  private Command driveForwardAuto() {
    return m_driveSubsystem.driveForSecondsCommand(0.4, 0.4, 2.0)
        .withName("Drive Forward");
  }

  /** One side of a square: drive forward, pause, turn left 90 degrees by the gyro, pause. */
  private Command squareSide() {
    return Commands.sequence(
        m_driveSubsystem.driveForSecondsCommand(0.4, 0.4, 1.0),   // forward (still timed)
        m_driveSubsystem.driveForSecondsCommand(0.0, 0.0, 0.3),   // pause
        m_driveSubsystem.twoSpeedTurnCommand(90),                 // turn left by the gyro
        m_driveSubsystem.driveForSecondsCommand(0.0, 0.0, 0.3));  // pause
  }

  /** Try to drive a square and end where it started. */
  private Command squareAuto() {
    return Commands.sequence(squareSide(), squareSide(), squareSide(), squareSide())
        .withName("Square");
  }
}
