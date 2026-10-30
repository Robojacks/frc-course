package frc.robot.subsystems;

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
import frc.robot.Constants.WheelConstants;

/**
 * Test Bed Lab 1: Turn the Wheel Exactly 10 Times.
 * 775pro (brushed) on a SPARK MAX over CAN, quadrature encoder on roboRIO DIO.
 * Five attempts: timed, bang-bang, P, P + D, and P + I + D. No feedforward.
 */
public class WheelSubsystem extends SubsystemBase {
    private final SparkMax m_motor =
        new SparkMax(WheelConstants.kMotorCanId, MotorType.kBrushed);

    private final Encoder m_encoder = new Encoder(
        WheelConstants.kEncoderChannelA,
        WheelConstants.kEncoderChannelB,
        WheelConstants.kEncoderInverted,
        EncodingType.k4X);

    private final PIDController m_pid =
        new PIDController(WheelConstants.kP, WheelConstants.kI, WheelConstants.kD);

    private double m_target = 0.0;     // where the current attempt is trying to stop
    private double m_lastVolts = 0.0;  // for the dashboard

    public WheelSubsystem() {
        SparkMaxConfig config = new SparkMaxConfig();
        config.smartCurrentLimit(WheelConstants.kCurrentLimitAmps);
        config.idleMode(IdleMode.kBrake);
        config.inverted(WheelConstants.kMotorInverted);
        m_motor.configure(config, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);

        // One "pulse" = one quadrature cycle. After this, getDistance() is in wheel rotations.
        m_encoder.setDistancePerPulse(1.0 / WheelConstants.kEncoderCyclesPerRev);

        m_pid.setTolerance(WheelConstants.kToleranceRot, WheelConstants.kToleranceRps);
        m_pid.setIZone(WheelConstants.kIZone);   // limits integral windup (Attempt 5)
        SmartDashboard.putData("Wheel/PID", m_pid);   // tune kP and kD live
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

    // ---------------------------------------------------------------- The attempts

    public Command turnTimed(double volts, double seconds) {
        return startEnd(() -> setVolts(volts), this::stop)
            .withTimeout(seconds)
            .withName("Attempt 1: Timed");
    }

    public Command turnBangBang(double rotations, double volts) {
        return runOnce(() -> setTargetFromHere(rotations))
            .andThen(run(() -> setVolts(volts)))         // full speed the whole way
            .until(() -> getRotations() >= m_target)     // stop the moment we arrive
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
                setVolts(MathUtil.clamp(volts, -WheelConstants.kMaxVolts, WheelConstants.kMaxVolts));
            }))
            .until(m_pid::atSetpoint)                // within tolerance AND nearly stopped
            .withTimeout(5.0)                        // give up if it never gets there
            .finallyDo(this::stop)
            .withName("Attempts 3-5: PID");
    }

    @Override
    public void periodic() {
        SmartDashboard.putNumber("Wheel/Position (rot)", getRotations());
        SmartDashboard.putNumber("Wheel/Target (rot)", m_target);
        SmartDashboard.putNumber("Wheel/Error (rot)", m_target - getRotations());
        SmartDashboard.putNumber("Wheel/Velocity (rot per s)", getRps());
        SmartDashboard.putNumber("Wheel/Output (V)", m_lastVolts);
        SmartDashboard.putNumber("Wheel/Current (A)", m_motor.getOutputCurrent());
    }
}
