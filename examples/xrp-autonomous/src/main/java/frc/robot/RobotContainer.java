// RoboJacks 4674 FRC Programming Course: finished code for Lesson 10.2.
// Built from the WPILib 2026 XRP - Command Robot template.

package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj.xrp.XRPOnBoardIO;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.Trigger;

import frc.robot.Constants.OIConstants;
import frc.robot.subsystems.Arm;
import frc.robot.subsystems.XRPDrivetrain;
import frc.robot.telemetry.Selectable;
import frc.robot.telemetry.Tunables;

public class RobotContainer {
  // The robot's subsystems and the XRP's USER button and LED
  private final XRPDrivetrain m_drivetrain = new XRPDrivetrain();
  private final Arm m_arm = new Arm();
  private final XRPOnBoardIO m_onboardIO = new XRPOnBoardIO();

  // An Xbox controller, or the Sim GUI's keyboard, in Joystick 0
  private final CommandXboxController m_driver =
      new CommandXboxController(OIConstants.kDriverControllerPort);

  // The autonomous menu in Elastic
  private final Selectable<Command> m_autoChooser = new Selectable<>();

  public RobotContainer() {
    configureBindings();

    m_autoChooser.addDefault("Do nothing", Commands.none());
    m_autoChooser.add("Drive 2 s (timed)", m_drivetrain.driveForSecondsCommand(0.6, 2.0));
    m_autoChooser.add("Drive 0.5 m", m_drivetrain.driveDistanceCommand(0.5, 0.6));
    m_autoChooser.add("Deliver", deliverAuto());
    m_autoChooser.add("Square", squareAuto());
    m_autoChooser.add("Drive and raise", driveAndRaiseAuto());
    Tunables.publish("Auto", m_autoChooser);   // shows up as /Tunables/Auto
  }

  private void configureBindings() {
    // One-stick arcade: left stick up/down drives, left/right turns
    m_drivetrain.setDefaultCommand(m_drivetrain.arcadeDriveCommand(
        () -> -processAxis(m_driver.getLeftY()) * speedScale(),
        () -> -processAxis(m_driver.getLeftX()) * speedScale()));

    // A and B move the arm
    m_driver.a().onTrue(m_arm.setAngleCommand(0));
    m_driver.b().onTrue(m_arm.setAngleCommand(90));

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

  /** Drive forward 0.5 m, raise the arm, back up. */
  private Command deliverAuto() {
    return Commands.sequence(
        m_arm.setAngleCommand(0),
        m_drivetrain.driveDistanceCommand(0.5, 0.6),
        m_arm.setAngleCommand(90),
        m_drivetrain.driveDistanceCommand(-0.5, 0.6)
    ).withName("Deliver");
  }

  /** One side of a square: drive 0.4 m, then turn left 90 degrees. */
  private Command squareSide() {
    return m_drivetrain.driveDistanceCommand(0.4, 0.6)
        .andThen(m_drivetrain.turnDegreesCommand(90, 0.5));
  }

  /** Four sides: the robot should end where it started. */
  private Command squareAuto() {
    return Commands.sequence(squareSide(), squareSide(), squareSide(), squareSide())
        .withName("Square");
  }

  /** Raise the arm while driving: the drive is the deadline. */
  private Command driveAndRaiseAuto() {
    return Commands.deadline(
        m_drivetrain.driveDistanceCommand(0.5, 0.5),
        m_arm.setAngleCommand(90)
    ).withName("Drive and Raise");
  }

  public Command getAutonomousCommand() {
    return m_autoChooser.getSelected();
  }
}
