package frc.robot.subsystems;

import java.util.function.DoubleSupplier;

import com.revrobotics.PersistMode;
import com.revrobotics.ResetMode;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.config.SparkMaxConfig;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.PIDController;
import edu.wpi.first.wpilibj.CounterBase.EncodingType;
import edu.wpi.first.wpilibj.Encoder;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;
import frc.robot.Constants.PidWheelConstants;

/**
 * LEVEL 2: Closed-loop position control with WPILib's PIDController.
 *
 * <p>Level 1 (SpinBrushlessMotorSubsystem) was open loop: "run at 50%" and hope.
 * Level 2 measures where the wheel actually is and corrects every 20 ms.
 *
 * <p>Hardware:
 * <ul>
 *   <li>775pro (brushed) motor on a SPARK MAX in BRUSHED mode, over CAN
 *   <li>Quadrature encoder wired straight to two roboRIO DIO ports (channels A and B)
 * </ul>
 *
 * <p>The sensor and the PID math both live on the roboRIO, using only WPILib.
 * REVLib is used for one job: telling the SPARK MAX what voltage to apply.
 *
 * <p>Units: wheel position in ROTATIONS, velocity in ROTATIONS PER SECOND, output in VOLTS.
 * So kP is "volts per rotation of error."
 */
public class PidWheelSubsystem extends SubsystemBase {
  // MotorType.kBrushed is required for a 775pro. Never run a brushed motor in brushless mode.
  private final SparkMax m_motor =
      new SparkMax(PidWheelConstants.kMotorCanId, MotorType.kBrushed);

  // Quadrature encoder on two roboRIO DIO ports. The FPGA counts every edge in hardware,
  // so no counts are missed even though our code only runs every 20 ms.
  private final Encoder m_encoder =
      new Encoder(
          PidWheelConstants.kEncoderChannelA,
          PidWheelConstants.kEncoderChannelB,
          PidWheelConstants.kEncoderInverted,
          EncodingType.k4X);

  private final PIDController m_pid =
      new PIDController(PidWheelConstants.kP, PidWheelConstants.kI, PidWheelConstants.kD);

  /** The last voltage we commanded, so it can be shown on the dashboard. */
  private double m_lastVolts = 0.0;

  public PidWheelSubsystem() {
    SparkMaxConfig config = new SparkMaxConfig();
    // A 775pro burns out quickly if it stalls at high current. Keep this limit low.
    config.smartCurrentLimit(PidWheelConstants.kCurrentLimitAmps);
    // Brake mode helps the wheel stop where PID leaves it.
    config.idleMode(IdleMode.kBrake);
    config.inverted(PidWheelConstants.kMotorInverted);
    // Persist so the settings survive if the SPARK MAX browns out and reboots mid-match.
    m_motor.configure(config, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);

    // Convert once, here, so getDistance() returns WHEEL ROTATIONS and getRate() returns
    // WHEEL ROTATIONS PER SECOND.
    //
    // Careful: WPILib's "pulse" is one full quadrature CYCLE, not one count.
    // A REV Through Bore Encoder is 2048 cycles per revolution (8192 counts with 4x decoding).
    // Use 2048 here, not 8192, or every distance will be 4x too small.
    m_encoder.setDistancePerPulse(
        1.0 / (PidWheelConstants.kEncoderCyclesPerRev * PidWheelConstants.kEncoderToWheelRatio));
    m_encoder.reset();

    // "Close enough" = within the position tolerance AND nearly stopped.
    m_pid.setTolerance(
        PidWheelConstants.kPositionToleranceRot, PidWheelConstants.kVelocityToleranceRps);

    // Lets you edit kP, kI, and kD live from Glass or Elastic while the robot runs.
    // Dashboard edits are lost on reboot: copy good values back into Constants.
    SmartDashboard.putData("PID Wheel/PID", m_pid);
    // Shows the raw encoder too (count, distance, rate, direction).
    SmartDashboard.putData("PID Wheel/Encoder", m_encoder);
  }

  // ---------------------------------------------------------------- Sensors (real units)

  /** Wheel position in rotations. */
  public double getPositionRotations() {
    return m_encoder.getDistance();
  }

  /** Wheel velocity in rotations per second. */
  public double getVelocityRps() {
    return m_encoder.getRate();
  }

  // ---------------------------------------------------------------- Outputs

  /** One step of PID toward the setpoint. Call exactly once per loop. */
  private void driveToward(double setpointRotations) {
    double volts = m_pid.calculate(getPositionRotations(), setpointRotations);
    volts = MathUtil.clamp(volts, -PidWheelConstants.kMaxVolts, PidWheelConstants.kMaxVolts);
    setVolts(volts);
  }

  private void setVolts(double volts) {
    m_lastVolts = volts;
    m_motor.setVoltage(volts);
  }

  private void stop() {
    m_lastVolts = 0.0;
    m_motor.stopMotor();
  }

  // ---------------------------------------------------------------- Commands

  /**
   * Open loop, for comparison with PID: apply a fixed voltage while held.
   * Exercise: try to stop the wheel at exactly 5 rotations by hand with this. Then use goTo(5).
   */
  public Command spinOpenLoop(double volts) {
    return startEnd(() -> setVolts(volts), this::stop).withName("Open Loop " + volts + " V");
  }

  /** Moves the wheel to a position, then ends and stops the motor. */
  public Command goTo(double targetRotations) {
    return runOnce(m_pid::reset)                       // clear old integral and error history
        .andThen(run(() -> driveToward(targetRotations)))
        .until(m_pid::atSetpoint)
        .finallyDo(this::stop)                         // always stop, however it ends
        .withName("Go To " + targetRotations + " rot");
  }

  /** Moves to a position and keeps holding it until interrupted. Push the wheel and watch it fight back. */
  public Command hold(double targetRotations) {
    return runOnce(m_pid::reset)
        .andThen(run(() -> driveToward(targetRotations)))
        .finallyDo(this::stop)
        .withName("Hold " + targetRotations + " rot");
  }

  /** Follows a setpoint that changes every loop, like a knob or a joystick. */
  public Command follow(DoubleSupplier targetRotations) {
    return runOnce(m_pid::reset)
        .andThen(run(() -> driveToward(targetRotations.getAsDouble())))
        .finallyDo(this::stop)
        .withName("Follow");
  }

  /** Makes the current position zero. Works while disabled. */
  public Command zeroPosition() {
    return runOnce(m_encoder::reset)
        .ignoringDisable(true)
        .withName("Zero Position");
  }

  /** Holds the motor at 0 V. Use as the default command. */
  public Command idle() {
    return run(this::stop).withName("Idle");
  }

  // ---------------------------------------------------------------- Telemetry

  @Override
  public void periodic() {
    // The four values every mechanism should publish: sensor, target, output, state.
    SmartDashboard.putNumber("PID Wheel/Position (rot)", getPositionRotations());
    SmartDashboard.putNumber("PID Wheel/Velocity (rot per s)", getVelocityRps());
    SmartDashboard.putNumber("PID Wheel/Setpoint (rot)", m_pid.getSetpoint());
    SmartDashboard.putNumber("PID Wheel/Error (rot)", m_pid.getError());
    SmartDashboard.putNumber("PID Wheel/Output (V)", m_lastVolts);
    SmartDashboard.putNumber("PID Wheel/Current (A)", m_motor.getOutputCurrent());
    SmartDashboard.putBoolean("PID Wheel/At Setpoint", m_pid.atSetpoint());
  }
}
