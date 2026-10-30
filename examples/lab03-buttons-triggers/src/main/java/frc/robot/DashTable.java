// RoboJacks 4674 FRC Programming Course: finished code for Lab 3.
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
 * One folder of values on the dashboard, sent with NetworkTables 4.
 * new DashTable("Wheel").log("Position (rot)", 3.4) shows up in Elastic as /Wheel/Position (rot).
 */
public class DashTable {
  private final NetworkTable m_table;
  private final Map<String, DoublePublisher> m_numbers = new HashMap<>();
  private final Map<String, BooleanPublisher> m_booleans = new HashMap<>();
  private final Map<String, StringPublisher> m_strings = new HashMap<>();
  private final Map<String, DoubleEntry> m_tunables = new HashMap<>();

  public DashTable(String tableName) {
    m_table = NetworkTableInstance.getDefault().getTable(tableName);
  }

  /** Sends a number. The first call makes the publisher; later calls reuse it. */
  public void log(String key, double value) {
    m_numbers.computeIfAbsent(key, k -> m_table.getDoubleTopic(k).publish()).set(value);
  }

  /** Sends true or false. */
  public void log(String key, boolean value) {
    m_booleans.computeIfAbsent(key, k -> m_table.getBooleanTopic(k).publish()).set(value);
  }

  /** Sends text. */
  public void log(String key, String value) {
    m_strings.computeIfAbsent(key, k -> m_table.getStringTopic(k).publish()).set(value);
  }

  /**
   * A number you can change from the dashboard while the robot runs.
   * It starts at defaultValue every time the robot code starts.
   */
  public DoubleSupplier tunable(String key, double defaultValue) {
    DoubleEntry entry = m_tunables.computeIfAbsent(key, k -> {
      DoubleEntry newEntry = m_table.getDoubleTopic(k).getEntry(defaultValue);
      newEntry.set(defaultValue);
      return newEntry;
    });
    return entry::get;
  }
}
