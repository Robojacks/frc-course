// RoboJacks 4674 FRC Programming Course: finished code for Lab 9.
// Built from the WPILib 2026 Command Robot template.

package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj.AnalogPotentiometer;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.Trigger;

import frc.robot.Constants.OperatorConstants;
import frc.robot.commands.Autos;
import frc.robot.subsystems.ExampleSubsystem;
import frc.robot.subsystems.SpinBrushlessMotorSubsystem;
import frc.robot.subsystems.WheelSubsystem;

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

  // The 775pro wheel, and a second controller (Driver Station slot 1) for it
  private final WheelSubsystem m_wheel = new WheelSubsystem();
  private final CommandXboxController m_wheelController = new CommandXboxController(1);

  private final AnalogPotentiometer m_knob = new AnalogPotentiometer(
      Constants.kSensorConstants.KnobAnalogPort,
      Constants.kSensorConstants.KnobTurns,
      0.0);   // offset: added to every reading

  private final DashTable m_knobDash = new DashTable("Knob");

  /** The container for the robot. Contains subsystems, OI devices, and commands. */
  public RobotContainer() {
    // Configure the trigger bindings
    configureBindings();
  }

  /** Use this method to define your trigger->command mappings. */
  private void configureBindings() {
    // A: spin WHILE held (Lab 1)
    m_controller.a().whileTrue(
        m_spinBrushlessMotorSubsystem.spinMotorCommand(
            Constants.kBrushlessConstants.BrushlessMotorSpeed));

    // B: tap to START spinning. Nothing in this binding stops it!
    m_controller.b().onTrue(
        m_spinBrushlessMotorSubsystem.spinMotorCommand(
            Constants.kBrushlessConstants.BrushlessMotorSpeed));

    // X: tap to STOP
    m_controller.x().onTrue(m_spinBrushlessMotorSubsystem.stopCommand());

    // Y: tap once to start, tap again to stop
    m_controller.y().toggleOnTrue(
        m_spinBrushlessMotorSubsystem.spinMotorCommand(
            Constants.kBrushlessConstants.BrushlessMotorSpeed));

    // Right bumper: tap to spin for exactly 2 seconds
    m_controller.rightBumper().onTrue(
        m_spinBrushlessMotorSubsystem.spinForSecondsCommand(
            Constants.kBrushlessConstants.BrushlessMotorSpeed, 2.0));

    // Right trigger: squeeze like a gas pedal. Harder = faster.
    m_controller.rightTrigger().whileTrue(
        m_spinBrushlessMotorSubsystem.spinWithSupplierCommand(
            () -> m_controller.getRightTriggerAxis() * 0.6));   // capped at 60%

    // When nothing else is using the motor, keep it stopped
    m_spinBrushlessMotorSubsystem.setDefaultCommand(
        m_spinBrushlessMotorSubsystem.run(() -> m_spinBrushlessMotorSubsystem.setMotorSpeed(0.0))
            .withName("Idle"));

    // D-pad up: spin until the limit switch is pressed
    m_controller.povUp().onTrue(
        m_spinBrushlessMotorSubsystem.spinUntilLimitCommand(
            Constants.kBrushlessConstants.BrushlessMotorSpeed));

    // Whenever the limit switch becomes pressed, print a message
    new Trigger(m_spinBrushlessMotorSubsystem::isLimitPressed)
        .onTrue(Commands.print("Limit switch hit!"));

    // D-pad right: tap to let the knob control the motor, tap again to stop
    m_controller.povRight().toggleOnTrue(
        m_spinBrushlessMotorSubsystem.spinWithSupplierCommand(this::knobToSpeed));

    // ---- Wheel (controller 1) ----
    m_wheel.setDefaultCommand(m_wheel.idle());
    m_wheelController.back().onTrue(m_wheel.zero());
    m_wheelController.a().onTrue(m_wheel.turnTimed(4.0, 2.0));    // Attempt 1
    m_wheelController.b().onTrue(m_wheel.turnBangBang(10, 4.0));  // Attempt 2
    m_wheelController.x().onTrue(m_wheel.turnPid(10));   // Attempts 3 to 5

    // Show which commands are running, live
    SmartDashboard.putData(CommandScheduler.getInstance());
  }

  /** Called every loop from Robot.robotPeriodic(). */
  public void updateDashboard() {
    m_knobDash.log("Turns", m_knob.get());
    m_knobDash.log("Speed", knobToSpeed());
  }

  /** Turns the knob position into a motor speed from -1 to 1. */
  private double knobToSpeed() {
    double min = Constants.kSensorConstants.KnobMin;
    double max = Constants.kSensorConstants.KnobMax;
    double center = (min + max) / 2.0;
    double halfRange = (max - min) / 2.0;

    double speed = (m_knob.get() - center) / halfRange;

    speed = MathUtil.clamp(speed, -1.0, 1.0);      // never go past full speed
    speed = MathUtil.applyDeadband(speed, 0.05);   // a small dead zone in the middle
    return speed * 0.5;                            // cap at 50% while learning
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
