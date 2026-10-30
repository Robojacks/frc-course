// Paste inside your Constants class.
public static final class WheelConstants {
    public static final int kMotorCanId = 9;
    public static final boolean kMotorInverted = false;

    public static final int kEncoderChannelA = 0;
    public static final int kEncoderChannelB = 1;
    public static final boolean kEncoderInverted = false;
    // WPILib counts in quadrature CYCLES. Through Bore Encoder = 2048 (not 8192).
    public static final int kEncoderCyclesPerRev = 2048;

    public static final int kCurrentLimitAmps = 30;   // protects the 775pro
    public static final double kMaxVolts = 6.0;       // keeps tests gentle

    public static final double kP = 1.0;              // volts per rotation of error
    public static final double kI = 0.0;              // volts per (rotation × second) of error
    public static final double kD = 0.0;              // volts per (rotation per second)
    public static final double kIZone = 0.5;          // only build up I within 0.5 rotations
    public static final double kToleranceRot = 0.02;  // 0.02 rotations ≈ 7°
    public static final double kToleranceRps = 0.1;   // "nearly stopped"
}
