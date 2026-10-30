// RoboJacks 4674 FRC Programming Course: finished code for Lab 8.
// Built from the WPILib 2026 Command Robot template.

package frc.robot;

import edu.wpi.first.math.util.Units;

public final class Constants {
  public static class OperatorConstants {
    public static final int kControllerPort = 0;
    public static final double kDeadband = 0.08;   // ignore tiny stick movements
  }

  public static class kDriveConstants {
    public static final int LeftLeaderCanId = 1;
    public static final int LeftFollowerCanId = 2;
    public static final int RightLeaderCanId = 3;
    public static final int RightFollowerCanId = 4;

    public static final int CurrentLimit = 40;     // amps, matches the 40 A breakers
    public static final double MaxOutput = 0.5;    // top speed, 0 to 1. Start slow!

    // Lab 8: Through Bore Encoders on each gearbox output shaft, wired to the roboRIO
    public static final int LeftEncoderChannelA = 2;
    public static final int LeftEncoderChannelB = 3;
    public static final int RightEncoderChannelA = 4;
    public static final int RightEncoderChannelB = 5;
    public static final boolean LeftEncoderInverted = false;
    public static final boolean RightEncoderInverted = true;   // the right side faces the other way
    public static final int EncoderCyclesPerRev = 2048;        // Through Bore: 2048 cycles per turn

    public static final double WheelDiameterMeters = Units.inchesToMeters(6.0);
    public static final double MetersPerRotation = Math.PI * WheelDiameterMeters;   // about 0.479 m
    public static final double TrackWidthMeters = 0.6;   // measure yours: left wheels' center to right wheels' center
  }
}
