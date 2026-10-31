// RoboJacks 4674 FRC Programming Course: finished code for Lab 11.
// Built from the WPILib 2026 Command Robot template.

package frc.robot.subsystems;

import com.revrobotics.PersistMode;
import com.revrobotics.ResetMode;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.config.SparkMaxConfig;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.controller.ProfiledPIDController;
import edu.wpi.first.math.trajectory.TrapezoidProfile;
import edu.wpi.first.wpilibj.CounterBase.EncodingType;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Encoder;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants.kElevatorConstants;
import frc.robot.telemetry.Telemetry;
import frc.robot.telemetry.TelemetryTable;
import frc.robot.telemetry.TunableDouble;
import frc.robot.telemetry.Tunables;

public class ElevatorSubsystem extends SubsystemBase {
  /** The heights the operator can pick. */
  public enum Preset { START, L2, L3 }

  // The NEO is BRUSHLESS (the drivetrain CIMs are brushed)
  private final SparkMax m_motor =
      new SparkMax(kElevatorConstants.MotorCanId, MotorType.kBrushless);

  private final Encoder m_encoder = new Encoder(
      kElevatorConstants.EncoderChannelA,
      kElevatorConstants.EncoderChannelB,
      kElevatorConstants.EncoderInverted,
      EncodingType.k4X);

  // PID that follows a motion profile: it plans a smooth path to the goal,
  // then uses PID to follow that path.
  private final ProfiledPIDController m_pid = new ProfiledPIDController(
      kElevatorConstants.kP, kElevatorConstants.kI, kElevatorConstants.kD,
      new TrapezoidProfile.Constraints(
          kElevatorConstants.MaxVelocityMetersPerSecond,
          kElevatorConstants.MaxAccelerationMetersPerSecondSquared));

  private double m_lastVolts = 0.0;      // for the dashboard

  // Values go to /Telemetry/Elevator. The gains and limits are tunable (/Tunables/Elevator) while you test.
  private final TelemetryTable m_telemetry = Telemetry.getTable("Elevator");
  private final TunableDouble m_kP = Tunables.addDouble("Elevator/kP", kElevatorConstants.kP);
  private final TunableDouble m_kI = Tunables.addDouble("Elevator/kI", kElevatorConstants.kI);
  private final TunableDouble m_kD = Tunables.addDouble("Elevator/kD", kElevatorConstants.kD);
  private final TunableDouble m_maxVelocity =
      Tunables.addDouble("Elevator/Max Velocity (m per s)", kElevatorConstants.MaxVelocityMetersPerSecond);
  private final TunableDouble m_maxAcceleration =
      Tunables.addDouble("Elevator/Max Accel (m per s2)", kElevatorConstants.MaxAccelerationMetersPerSecondSquared);

  public ElevatorSubsystem() {
    SparkMaxConfig config = new SparkMaxConfig();
    config.smartCurrentLimit(kElevatorConstants.CurrentLimit);
    config.idleMode(IdleMode.kBrake);    // resists falling when no voltage is applied
    config.inverted(kElevatorConstants.MotorInverted);
    m_motor.configure(config, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);

    // After this, getDistance() is in meters of elevator travel
    m_encoder.setDistancePerPulse(kElevatorConstants.DistancePerPulse);
    m_encoder.reset();   // the elevator MUST start at the bottom: this is height 0

    m_pid.setTolerance(kElevatorConstants.ToleranceMeters);
    m_pid.setIZone(kElevatorConstants.IZoneMeters);
    holdHere();
  }

  public double getHeightMeters() {
    return m_encoder.getDistance();
  }

  /** True when the carriage has reached the GOAL, not just the profile's current step. */
  public boolean atGoal() {
    return m_pid.atGoal();
  }

  /** Every voltage goes through here, so the soft limits can't be skipped. */
  private void setVolts(double volts) {
    double height = getHeightMeters();
    if (height >= kElevatorConstants.MaxHeightMeters && volts > 0) {
      volts = 0;   // at the top: never push higher
    }
    if (height <= kElevatorConstants.MinHeightMeters && volts < 0) {
      volts = 0;   // at the bottom: never push lower
    }
    m_lastVolts = volts;
    m_motor.setVoltage(volts);
  }

  /** Starts a fresh profile from where the carriage is right now, with the goal right here. */
  private void holdHere() {
    m_pid.reset(getHeightMeters());
    m_pid.setGoal(getHeightMeters());
  }

  /** Picks a new goal. The profile plans a smooth path from where the carriage is now. */
  private void setGoalMeters(double meters) {
    m_pid.reset(getHeightMeters(), m_encoder.getRate());
    m_pid.setGoal(MathUtil.clamp(
        meters, kElevatorConstants.MinHeightMeters, kElevatorConstants.MaxHeightMeters));
  }

  private static double presetMeters(Preset preset) {
    return switch (preset) {
      case START -> kElevatorConstants.StartMeters;
      case L2 -> kElevatorConstants.L2Meters;
      case L3 -> kElevatorConstants.L3Meters;
    };
  }

  /** One step: move the setpoint along the profile, then PID toward it. */
  private void followProfile() {
    double volts = m_pid.calculate(getHeightMeters());
    setVolts(MathUtil.clamp(volts, -kElevatorConstants.MaxVolts, kElevatorConstants.MaxVolts));
  }

  // ---------------------------------------------------------------- Commands

  /** The default command: follow the profile to the goal, then hold it. Never ends. */
  public Command holdCommand() {
    return run(this::followProfile).withName("Hold");
  }

  /** Sets a new goal and drives to it. Ends on arrival; then Hold keeps it there. */
  public Command goToPresetCommand(Preset preset) {
    return run(this::followProfile)
        .beforeStarting(() -> setGoalMeters(presetMeters(preset)))
        .until(this::atGoal)
        .withName("Elevator to " + preset);
  }

  /** Manual control while held. When released, hold wherever the carriage is. */
  public Command manualCommand(double volts) {
    return runEnd(() -> setVolts(volts), this::holdHere)
        .withName("Manual " + volts + " V");
  }

  /** Call this height 0. Only use it when the elevator is all the way down. */
  public Command zeroCommand() {
    return runOnce(() -> {
      m_encoder.reset();
      holdHere();
    }).ignoringDisable(true).withName("Zero");
  }

  @Override
  public void periodic() {
    // While disabled, keep the profile and goal on the real height,
    // so enabling never makes the elevator suddenly jump.
    if (DriverStation.isDisabled()) {
      holdHere();
    }

    // Use whatever gains and limits are on the dashboard right now
    m_pid.setPID(m_kP.get(), m_kI.get(), m_kD.get());
    m_pid.setConstraints(new TrapezoidProfile.Constraints(
        m_maxVelocity.get(), m_maxAcceleration.get()));

    m_telemetry.log("Height (m)", getHeightMeters());
    m_telemetry.log("Goal (m)", m_pid.getGoal().position);
    m_telemetry.log("Setpoint (m)", m_pid.getSetpoint().position);
    m_telemetry.log("Setpoint Velocity (m per s)", m_pid.getSetpoint().velocity);
    m_telemetry.log("Error (m)", m_pid.getGoal().position - getHeightMeters());
    m_telemetry.log("Output (V)", m_lastVolts);
    m_telemetry.log("Current (A)", m_motor.getOutputCurrent());
    m_telemetry.log("At Goal", atGoal());
  }
}
