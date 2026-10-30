// RoboJacks 4674 FRC Programming Course: finished code for Lab 6.
// Built from the WPILib 2026 Command Robot template.

package frc.robot;

public final class Constants {
  public static class OperatorConstants {
    public static final int kControllerPort = 0;
  }

  public static class kBrushlessConstants {
    public static final int BrushlessMotorCanId = 8;         // must match the REV Hardware Client
    public static final double BrushlessMotorSpeed = 0.5;    // 50% power
    public static final int BrushlessMotorCurrentLimit = 40; // amps
  }

  public static class kSensorConstants {
    public static final int LimitSwitchDio = 2;
    public static final int KnobAnalogPort = 0;    // the Analog In port your pot uses
    public static final double KnobTurns = 10.0;   // it's a 10-turn pot
    public static final double KnobMin = 0.1;     // your measured values
    public static final double KnobMax = 9.9;
  }

  public static class kWheelConstants {
    public static final int MotorCanId = 9;
    public static final boolean MotorInverted = false;

    public static final int EncoderChannelA = 0;
    public static final int EncoderChannelB = 1;
    public static final boolean EncoderInverted = false;
    // WPILib counts in quadrature CYCLES. Through Bore Encoder = 2048 (not 8192).
    public static final int EncoderCyclesPerRev = 2048;

    public static final int CurrentLimitAmps = 30;   // protects the 775pro
    public static final double MaxVolts = 6.0;       // keeps PID tests gentle in Lab 9
  }
}
