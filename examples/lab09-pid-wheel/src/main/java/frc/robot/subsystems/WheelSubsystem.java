// RoboJacks 4674 FRC Programming Course: finished code for Lab 9.
// Built from the WPILib 2026 Command Robot template.

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
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.Constants.kWheelConstants;
import frc.robot.DashTable;

public class WheelSubsystem extends SubsystemBase {
    private final SparkMax m_motor =
        new SparkMax(kWheelConstants.MotorCanId, MotorType.kBrushed);

    private final Encoder m_encoder = new Encoder(
        kWheelConstants.EncoderChannelA,
        kWheelConstants.EncoderChannelB,
        kWheelConstants.EncoderInverted,
        EncodingType.k4X);

    private final PIDController m_pid =
        new PIDController(kWheelConstants.P, kWheelConstants.I, kWheelConstants.D);

    private double m_target = 0.0;     // where the current attempt is trying to stop
    private double m_lastVolts = 0.0;  // for the dashboard

    private final DashTable m_dash = new DashTable("Wheel");

    // Gains you can change in Elastic. They start at the values in Constants.
    private final DoubleSupplier m_kP = m_dash.tunable("kP", kWheelConstants.P);
    private final DoubleSupplier m_kI = m_dash.tunable("kI", kWheelConstants.I);
    private final DoubleSupplier m_kD = m_dash.tunable("kD", kWheelConstants.D);
    private final DoubleSupplier m_iZone = m_dash.tunable("IZone", kWheelConstants.IZone);

    public WheelSubsystem() {
        SparkMaxConfig config = new SparkMaxConfig();
        config.smartCurrentLimit(kWheelConstants.CurrentLimitAmps);
        config.idleMode(IdleMode.kBrake);
        config.inverted(kWheelConstants.MotorInverted);
        m_motor.configure(config, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);

        // One "pulse" = one quadrature cycle. After this, getDistance() is in wheel rotations.
        m_encoder.setDistancePerPulse(1.0 / kWheelConstants.EncoderCyclesPerRev);

        m_pid.setTolerance(kWheelConstants.ToleranceRot, kWheelConstants.ToleranceRps);
        m_pid.setIZone(kWheelConstants.IZone);       // limits integral windup (Attempt 5)
    }

    public double getRotations() { return m_encoder.getDistance(); }
    public double getRps()       { return m_encoder.getRate(); }

    private void setVolts(double volts) {
        m_lastVolts = volts;
        m_motor.setVoltage(volts);
    }

    private void stop() {
        m_lastVolts = 0.0;
        m_motor.stopMotor();
    }

    /** Every attempt turns a number of rotations FROM WHEREVER THE WHEEL IS NOW. */
    private void setTargetFromHere(double rotations) {
        m_target = getRotations() + rotations;
    }

    public Command zero() {
        return runOnce(m_encoder::reset).ignoringDisable(true).withName("Zero");
    }

    public Command idle() {
        return run(this::stop).withName("Idle");
    }

    public Command turnTimed(double volts, double seconds) {
        return startEnd(() -> setVolts(volts), this::stop)
            .withTimeout(seconds)
            .withName("Attempt 1: Timed");
    }

    public Command turnBangBang(double rotations, double volts) {
        return runOnce(() -> setTargetFromHere(rotations))
            .andThen(run(() -> setVolts(volts)))         // full speed the whole way
            .until(() -> getRotations() >= m_target)     // stop the moment we arrive
            .withTimeout(5.0)                            // safety: give up if the encoder never gets there
            .finallyDo(this::stop)
            .withName("Attempt 2: Bang-Bang");
    }

    public Command turnPid(double rotations) {
        return runOnce(() -> {
                setTargetFromHere(rotations);
                m_pid.reset();                       // clear old history
            })
            .andThen(run(() -> {
                double volts = m_pid.calculate(getRotations(), m_target);
                setVolts(MathUtil.clamp(volts, -kWheelConstants.MaxVolts, kWheelConstants.MaxVolts));
            }))
            .until(m_pid::atSetpoint)                // within tolerance AND nearly stopped
            .withTimeout(5.0)                        // give up if it never gets there
            .finallyDo(this::stop)
            .withName("Attempts 3-5: PID");
    }

    @Override
    public void periodic() {
        // Use whatever gains are on the dashboard right now
        m_pid.setPID(m_kP.getAsDouble(), m_kI.getAsDouble(), m_kD.getAsDouble());
        m_pid.setIZone(m_iZone.getAsDouble());

        m_dash.log("Position (rot)", getRotations());
        m_dash.log("Target (rot)", m_target);
        m_dash.log("Error (rot)", m_target - getRotations());
        m_dash.log("Velocity (rot per s)", getRps());
        m_dash.log("Output (V)", m_lastVolts);
        m_dash.log("Current (A)", m_motor.getOutputCurrent());
        m_dash.log("Raw Counts", m_encoder.getRaw());
        m_dash.log("Cycles", m_encoder.get());
    }
}
