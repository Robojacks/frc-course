// RoboJacks 4674 FRC Programming Course: finished code for Lesson 10.1.
// Built from the WPILib 2026 XRP - Command Robot template.

package frc.robot;

public final class Constants {
  public static final class DriveConstants {
    // The XRP's motor channels and encoder DIO pins are fixed on the board
    public static final int kLeftMotorChannel = 0;
    public static final int kRightMotorChannel = 1;
    public static final int kLeftEncoderA = 4;
    public static final int kLeftEncoderB = 5;
    public static final int kRightEncoderA = 6;
    public static final int kRightEncoderB = 7;

    // Gearbox and encoder: 12 counts per motor turn x 48.75:1 = 585 counts per wheel turn
    public static final double kGearRatio = (30.0 / 14.0) * (28.0 / 16.0) * (36.0 / 9.0) * (26.0 / 8.0);
    public static final double kCountsPerWheelRev = 12.0 * kGearRatio;

    // Wheels and chassis
    public static final double kWheelDiameterMeters = 0.060;   // 60 mm
    public static final double kTrackWidthMeters = 0.155;      // 155 mm between the wheels
    public static final double kMetersPerCount = Math.PI * kWheelDiameterMeters / kCountsPerWheelRev;

    // About how fast a wheel goes at full output (90 RPM, no load). Only the simulation uses it.
    public static final double kMaxSpeedMetersPerSecond = 90.0 / 60.0 * Math.PI * kWheelDiameterMeters;
  }

  public static final class ArmConstants {
    public static final int kServoChannel = 4;   // the XRP's Servo 1 port
  }

  public static final class OIConstants {
    public static final int kDriverControllerPort = 0;
    public static final double kDeadband = 0.08;
    public static final double kSlowModeScale = 0.5;
  }
}
