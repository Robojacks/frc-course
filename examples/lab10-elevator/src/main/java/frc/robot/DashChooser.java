// RoboJacks 4674 FRC Programming Course: finished code for Lab 10.
// Built from the WPILib 2026 Command Robot template.

package frc.robot;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;

import edu.wpi.first.networktables.NetworkTable;
import edu.wpi.first.networktables.NetworkTableEvent;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.networktables.StringArrayPublisher;
import edu.wpi.first.networktables.StringPublisher;
import edu.wpi.first.networktables.StringSubscriber;

/**
 * A dropdown menu on the dashboard, sent with NetworkTables 4.
 * Elastic shows it as a ComboBox Chooser. It works like WPILib 2027's Selectable.
 */
public class DashChooser<T> {
  private final Map<String, T> m_options = new LinkedHashMap<>();
  private String m_defaultName = "";

  private final StringPublisher m_type;
  private final StringArrayPublisher m_optionNames;
  private final StringPublisher m_default;
  private final StringPublisher m_active;
  private final StringSubscriber m_selected;

  public DashChooser(String tableName) {
    NetworkTableInstance nt = NetworkTableInstance.getDefault();
    NetworkTable table = nt.getTable(tableName);

    // ".type" tells Elastic which widget to show
    m_type = table.getStringTopic(".type").publish();
    m_type.set("String Chooser");

    m_optionNames = table.getStringArrayTopic("options").publish();
    m_default = table.getStringTopic("default").publish();
    m_active = table.getStringTopic("active").publish();

    // The dashboard writes the drive team's pick to "selected". The robot only reads it.
    m_selected = table.getStringTopic("selected").subscribe("");

    // Whenever the pick changes, report back which option the robot will really use
    nt.addListener(m_selected, EnumSet.of(NetworkTableEvent.Kind.kValueAll),
        event -> m_active.set(selectedName()));
  }

  /** Adds an option and makes it the default: the one used if nobody picks. */
  public void addDefault(String name, T value) {
    m_defaultName = name;
    m_default.set(name);
    add(name, value);
  }

  /** Adds an option to the menu. */
  public void add(String name, T value) {
    m_options.put(name, value);
    m_optionNames.set(m_options.keySet().toArray(new String[0]));
    m_active.set(selectedName());
  }

  /** The value for the option picked on the dashboard, or the default if nothing valid is picked. */
  public T getSelected() {
    return m_options.get(selectedName());
  }

  private String selectedName() {
    String name = m_selected.get();
    return m_options.containsKey(name) ? name : m_defaultName;
  }
}
