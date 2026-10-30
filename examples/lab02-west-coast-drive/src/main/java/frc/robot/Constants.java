// RoboJacks 4674 FRC Programming Course: finished code for Lab 2.
// Built from the WPILib 2026 Command Robot template.

package frc.robot;

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
  }
}
