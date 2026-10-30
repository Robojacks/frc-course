// RoboJacks 4674 FRC Programming Course: finished code for Lab 9.
// Built from the WPILib 2026 Command Robot template.

package frc.robot.telemetry;

import java.util.HashMap;
import java.util.Map;

import edu.wpi.first.networktables.BooleanPublisher;
import edu.wpi.first.networktables.DoubleArrayPublisher;
import edu.wpi.first.networktables.DoublePublisher;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.networktables.StringPublisher;
import edu.wpi.first.networktables.StructPublisher;
import edu.wpi.first.util.struct.Struct;
import edu.wpi.first.util.struct.StructSerializable;

/**
 * One folder of values on the dashboard, like /Telemetry/Wheel.
 *
 * <p>Get one with {@code Telemetry.getTable("Wheel")}, keep it in a field, and call {@code log}
 * every loop (usually in a subsystem's periodic()). Each value shows up in Elastic inside the
 * folder. This matches WPILib 2027's TelemetryTable.
 */
public final class TelemetryTable {
  // The robot's one NetworkTables instance. Every value goes through it.
  private static final NetworkTableInstance kNT = NetworkTableInstance.getDefault();

  // The folder's full path, like "/Telemetry/Wheel"
  private final String m_path;

  // Folders inside this one, remembered so getTable() always returns the same object for a name
  private final Map<String, TelemetryTable> m_children = new HashMap<>();

  // One publisher per value, remembered by name so each is only created once.
  // A Map is a lookup table: give it a key (the value's name), get back its publisher.
  private final Map<String, DoublePublisher> m_numbers = new HashMap<>();
  private final Map<String, BooleanPublisher> m_booleans = new HashMap<>();
  private final Map<String, StringPublisher> m_strings = new HashMap<>();
  private final Map<String, DoubleArrayPublisher> m_numberArrays = new HashMap<>();
  private final Map<String, StructPublisher<?>> m_structs = new HashMap<>();

  /** Use Telemetry.getTable(...) instead of making these yourself. */
  TelemetryTable(String path) {
    m_path = path;
  }

  /** The folder's full path in NetworkTables, like "/Telemetry/Wheel". */
  public String getPath() {
    return m_path;
  }

  /**
   * A folder inside this one. {@code Telemetry.getTable("Drive").getTable("Gyro")} is
   * /Telemetry/Drive/Gyro.
   */
  public TelemetryTable getTable(String name) {
    // computeIfAbsent: "find the table for this name; if there isn't one yet, make it with this
    // code and remember it." So asking twice for the same name gives back the same table.
    return m_children.computeIfAbsent(name, n -> new TelemetryTable(m_path + "/" + n));
  }

  /**
   * Sends a number. Call it every loop.
   *
   * @param name the value's name in Elastic. Put units in it, like "Height (m)".
   * @param value the number to show
   */
  public void log(String name, double value) {
    // The first call for a name creates its publisher; every later call reuses it
    m_numbers.computeIfAbsent(name, n -> kNT.getDoubleTopic(topic(n)).publish()).set(value);
  }

  /**
   * Sends true or false. Show it as a Boolean Box in Elastic.
   *
   * @param name the value's name in Elastic, like "At Goal"
   * @param value true or false
   */
  public void log(String name, boolean value) {
    m_booleans.computeIfAbsent(name, n -> kNT.getBooleanTopic(topic(n)).publish()).set(value);
  }

  /**
   * Sends text. Show it as a Text Display in Elastic.
   *
   * @param name the value's name in Elastic, like "Command"
   * @param value the text to show
   */
  public void log(String name, String value) {
    m_strings.computeIfAbsent(name, n -> kNT.getStringTopic(topic(n)).publish()).set(value);
  }

  /** Sends a list of numbers, like the four swerve module speeds. */
  public void log(String name, double[] value) {
    m_numberArrays.computeIfAbsent(name, n -> kNT.getDoubleArrayTopic(topic(n)).publish()).set(value);
  }

  /**
   * Sends a structured value (like a Pose2d) with the serializer you give it. AdvantageScope and
   * Elastic's Field widget understand these.
   *
   * <p>Example: {@code telemetry.log("Pose", pose, Pose2d.struct);}
   */
  @SuppressWarnings("unchecked")
  public <T> void log(String name, T value, Struct<T> struct) {
    StructPublisher<T> publisher = (StructPublisher<T>)
        m_structs.computeIfAbsent(name, n -> kNT.getStructTopic(topic(n), struct).publish());
    publisher.set(value);
  }

  /**
   * Sends any other kind of value. Like WPILib 2027, it decides how by checking what it is:
   *
   * <ul>
   *   <li>A WPILib struct type (Pose2d, Rotation2d, ChassisSpeeds, ...): sent as a struct
   *   <li>Any other number (Integer, Long, ...): sent as a number
   *   <li>A Boolean: sent as true or false
   *   <li>Anything else: sent as text, using its toString()
   * </ul>
   */
  @SuppressWarnings({"unchecked", "rawtypes"})
  public void log(String name, Object value) {
    if (value instanceof StructSerializable) {
      // WPILib struct types keep their serializer in a public static field named "struct",
      // like Pose2d.struct. Look it up by name (this is called "reflection").
      try {
        Struct struct = (Struct) value.getClass().getField("struct").get(null);
        log(name, value, struct);
        return;
      } catch (ReflectiveOperationException e) {
        // No "struct" field: fall through and send it as text instead
      }
    }
    if (value instanceof Number number) {
      log(name, number.doubleValue());
    } else if (value instanceof Boolean bool) {
      log(name, bool.booleanValue());
    } else {
      log(name, String.valueOf(value));
    }
  }

  /** The full topic name for a value in this folder, like "/Telemetry/Wheel/Position (rot)". */
  private String topic(String name) {
    return m_path + "/" + name;
  }
}
