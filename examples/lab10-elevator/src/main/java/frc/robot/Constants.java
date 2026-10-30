// RoboJacks 4674 FRC Programming Course: finished code for Lab 10.
// Built from the WPILib 2026 Command Robot template.

package frc.robot;

import edu.wpi.first.math.util.Units;

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

  public static class kElevatorConstants {
    // Motor
    public static final int MotorCanId = 5;
    public static final boolean MotorInverted = false;
    public static final int CurrentLimit = 40;              // amps
    public static final double MaxVolts = 4.0;              // gentle while tuning

    // Through Bore Encoder, on the same shaft as the sprocket
    public static final int EncoderChannelA = 0;
    public static final int EncoderChannelB = 1;
    public static final boolean EncoderInverted = false;
    public static final int EncoderCyclesPerRev = 2048;     // NOT 8192: see below

    // Sprocket: one turn moves the chain (and the carriage) one circumference
    public static final double PitchDiameterInches = 1.432; // from your sprocket's spec sheet
    public static final double PitchDiameterMeters = Units.inchesToMeters(PitchDiameterInches);
    public static final double MetersPerRevolution = Math.PI * PitchDiameterMeters;
    public static final double DistancePerPulse = MetersPerRevolution / EncoderCyclesPerRev;

    // Travel limits
    public static final double MinHeightMeters = 0.0;       // bottom
    public static final double MaxHeightMeters = 0.5;       // you'll measure this in Step 5

    // Presets, in meters (pick your own in Step 6)
    public static final double StartMeters = 0.02;
    public static final double L2Meters = 0.25;
    public static final double L3Meters = 0.45;

    // PID, in volts per meter of error
    public static final double kP = 10.0;
    public static final double kI = 0.0;
    public static final double kD = 0.0;
    public static final double ToleranceMeters = 0.006;     // within 6 mm counts as "there"
    public static final double IZoneMeters = 0.063;         // only build up I within 6.3 cm

    // Motion profile limits
    public static final double MaxVelocityMetersPerSecond = 0.25;
    public static final double MaxAccelerationMetersPerSecondSquared = 0.5;
  }
}
