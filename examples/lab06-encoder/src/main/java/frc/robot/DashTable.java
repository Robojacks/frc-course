// RoboJacks 4674 FRC Programming Course: finished code for Lab 6.
// Built from the WPILib 2026 Command Robot template.

package frc.robot;

import java.util.HashMap;
import java.util.Map;
import java.util.function.DoubleSupplier;

import edu.wpi.first.networktables.BooleanPublisher;
import edu.wpi.first.networktables.DoubleEntry;
import edu.wpi.first.networktables.DoublePublisher;
import edu.wpi.first.networktables.NetworkTable;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.networktables.StringPublisher;

/**
 * One folder ("table") of values on the dashboard, sent with NetworkTables 4.
 *
 * <p>Each subsystem makes its own DashTable, named after the subsystem. Every value it logs
 * shows up in Elastic inside that folder. For example:
 *
 * <pre>
 *   DashTable dash = new DashTable("Wheel");
 *   dash.log("Position (rot)", 3.4);   // shows up in Elastic as /Wheel/Position (rot)
 * </pre>
 *
 * <p>In WPILib 2027, this class is replaced by the built-in Telemetry and Tunables APIs:
 * {@code new DashTable("Wheel")} becomes {@code Telemetry.getTable("Wheel")}, and
 * {@code tunable(...)} becomes {@code Tunables.addDouble(...)}.
 */
public class DashTable {
  // The NetworkTables folder this DashTable writes into, like /Wheel
  private final NetworkTable m_table;

  // One publisher per value, remembered by name so it's only created once.
  // A Map is a lookup table: give it a key (the value's name), get back its publisher.
  private final Map<String, DoublePublisher> m_numbers = new HashMap<>();
  private final Map<String, BooleanPublisher> m_booleans = new HashMap<>();
  private final Map<String, StringPublisher> m_strings = new HashMap<>();

  // Tunable numbers use entries, which can both send a value AND read back changes from the dashboard
  private final Map<String, DoubleEntry> m_tunables = new HashMap<>();

  /**
   * Creates a folder of dashboard values.
   *
   * @param tableName the folder's name in Elastic, usually the subsystem's name (like "Wheel")
   */
  public DashTable(String tableName) {
    // getDefault() is the robot's one NetworkTables instance; getTable() picks the folder
    m_table = NetworkTableInstance.getDefault().getTable(tableName);
  }

  /**
   * Sends a number to the dashboard. Call it every loop (for example, in periodic()).
   *
   * @param key the value's name in Elastic. Put units in it, like "Height (m)".
   * @param value the number to show
   */
  public void log(String key, double value) {
    // computeIfAbsent: "find the publisher for this key; if there isn't one yet, make it
    // with this code and remember it." So the first call creates the publisher,
    // and every later call just reuses it and sends the new value.
    m_numbers.computeIfAbsent(key, k -> m_table.getDoubleTopic(k).publish()).set(value);
  }

  /**
   * Sends true or false to the dashboard. Show it as a Boolean Box in Elastic.
   *
   * @param key the value's name in Elastic, like "At Goal"
   * @param value true or false
   */
  public void log(String key, boolean value) {
    // Same pattern as the number version, with a BooleanPublisher
    m_booleans.computeIfAbsent(key, k -> m_table.getBooleanTopic(k).publish()).set(value);
  }

  /**
   * Sends text to the dashboard. Show it as a Text Display in Elastic.
   *
   * @param key the value's name in Elastic, like "Command"
   * @param value the text to show
   */
  public void log(String key, String value) {
    // Same pattern again, with a StringPublisher
    m_strings.computeIfAbsent(key, k -> m_table.getStringTopic(k).publish()).set(value);
  }

  /**
   * Makes a number you can change from the dashboard while the robot runs, like a PID gain.
   *
   * <p>Call this ONCE, when you create a field, and keep what it returns. Then call
   * {@code getAsDouble()} on it whenever you need the current value.
   *
   * <p>The number goes back to defaultValue every time the robot code starts, so dashboard
   * changes are NOT saved. When you find a good value, copy it into Constants.java.
   *
   * @param key the number's name in Elastic, like "kP"
   * @param defaultValue the starting value, usually from Constants
   * @return something you can ask for the current value at any time, with getAsDouble()
   */
  public DoubleSupplier tunable(String key, double defaultValue) {
    DoubleEntry entry = m_tunables.computeIfAbsent(key, k -> {
      // An entry is a publisher and a subscriber in one: it sends values and reads changes
      DoubleEntry newEntry = m_table.getDoubleTopic(k).getEntry(defaultValue);
      newEntry.set(defaultValue);   // put the starting value on the dashboard
      return newEntry;
    });
    // entry::get is a method reference: "call entry.get() whenever someone asks for the value"
    return entry::get;
  }
}
