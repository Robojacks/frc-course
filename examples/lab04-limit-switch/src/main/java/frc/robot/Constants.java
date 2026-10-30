// RoboJacks 4674 FRC Programming Course: finished code for Lab 4.
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
    public static final int LimitSwitchDio = 2;   // the DIO port your switch uses
  }
}
