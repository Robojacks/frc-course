// RoboJacks 4674 FRC Programming Course: finished code for Lab 9.
// Built from the WPILib 2026 Command Robot template.

package frc.robot.telemetry;

import edu.wpi.first.util.struct.Struct;

/**
 * Sends values from robot code to dashboards like Elastic and AdvantageScope.
 *
 * <p>This is a small 2026 version of the Telemetry API that WPILib adds in 2027. It uses the same
 * class and method names, and publishes to the same place in NetworkTables (under /Telemetry), so
 * moving to WPILib 2027 means deleting this folder and changing the imports.
 *
 * <p>Most code gets a table for its subsystem and logs into that:
 *
 * <pre>
 *   TelemetryTable telemetry = Telemetry.getTable("Wheel");
 *   telemetry.log("Position (rot)", 3.4);   // shows up as /Telemetry/Wheel/Position (rot)
 * </pre>
 *
 * <p>For a one-off value, log straight from here: {@code Telemetry.log("Battery (V)", volts)}.
 */
public final class Telemetry {
  // The top folder, /Telemetry. Every other table is inside it.
  private static final TelemetryTable kRoot = new TelemetryTable("/Telemetry");

  // A "utility class": everything is static, so nobody should ever make a Telemetry object
  private Telemetry() {}

  /** The top-level table, /Telemetry. */
  public static TelemetryTable getTable() {
    return kRoot;
  }

  /**
   * A folder inside /Telemetry, usually named after a subsystem.
   *
   * @param name the folder's name, like "Wheel". It can include slashes, like "Drive/Gyro".
   */
  public static TelemetryTable getTable(String name) {
    return kRoot.getTable(name);
  }

  /** Sends a number to /Telemetry/{name}. */
  public static void log(String name, double value) {
    kRoot.log(name, value);
  }

  /** Sends true or false to /Telemetry/{name}. */
  public static void log(String name, boolean value) {
    kRoot.log(name, value);
  }

  /** Sends text to /Telemetry/{name}. */
  public static void log(String name, String value) {
    kRoot.log(name, value);
  }

  /** Sends a list of numbers to /Telemetry/{name}. */
  public static void log(String name, double[] value) {
    kRoot.log(name, value);
  }

  /**
   * Sends anything else, like a Pose2d. See {@link TelemetryTable#log(String, Object)} for how
   * each kind of object is sent.
   */
  public static void log(String name, Object value) {
    kRoot.log(name, value);
  }

  /** Sends a structured value (like a Pose2d) with the serializer you give it. */
  public static <T> void log(String name, T value, Struct<T> struct) {
    kRoot.log(name, value, struct);
  }
}
