// RoboJacks 4674 FRC Programming Course: finished code for Lab 9.
// Built from the WPILib 2026 Command Robot template.

package frc.robot.telemetry;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import edu.wpi.first.networktables.NetworkTable;
import edu.wpi.first.networktables.NetworkTableEvent;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.networktables.StringArrayPublisher;
import edu.wpi.first.networktables.StringPublisher;
import edu.wpi.first.networktables.StringSubscriber;

/**
 * A dropdown menu on the dashboard, like the autonomous chooser. This matches WPILib 2027's
 * Selectable, which replaces SendableChooser.
 *
 * <pre>
 *   Selectable&lt;Command&gt; autoChooser = new Selectable&lt;&gt;();
 *   autoChooser.addDefault("Do nothing", Commands.none());
 *   autoChooser.add("Drive forward", driveForwardAuto());
 *   Tunables.publish("Auto", autoChooser);    // shows up as /Tunables/Auto
 *   ...
 *   autoChooser.getSelected();                // the command the drive team picked
 * </pre>
 *
 * <p>Elastic shows it as a ComboBox Chooser.
 *
 * @param <V> the type of thing in the menu, like Command
 */
public final class Selectable<V> {
  // The options, by name. A LinkedHashMap remembers the order they were added in,
  // so the menu lists them in that order.
  private final Map<String, V> m_options = new LinkedHashMap<>();
  private final List<Consumer<V>> m_listeners = new ArrayList<>();
  private String m_defaultName = "";

  // These stay null until Tunables.publish(...) puts the menu on the dashboard
  private StringPublisher m_type;
  private StringArrayPublisher m_optionNames;
  private StringPublisher m_default;
  private StringPublisher m_active;
  private StringSubscriber m_selected;

  /** Adds an option to the menu. */
  public void add(String name, V value) {
    m_options.put(name, value);
    update();
  }

  /** Adds an option and makes it the default: the one used if nobody picks. */
  public void addDefault(String name, V value) {
    m_defaultName = name;
    add(name, value);
  }

  /** Runs some code whenever the drive team picks a different option. */
  public void onChange(Consumer<V> listener) {
    m_listeners.add(listener);
  }

  /** The value for the option picked on the dashboard, or the default if nothing valid is picked. */
  public V getSelected() {
    return m_options.get(selectedName());
  }

  /** Called by Tunables.publish(...). Creates the topics that make up the menu. */
  void publish(String path) {
    NetworkTableInstance nt = NetworkTableInstance.getDefault();
    NetworkTable table = nt.getTable(path);

    // ".type" tells Elastic which widget to show
    m_type = table.getStringTopic(".type").publish();
    m_type.set("String Chooser");
    m_optionNames = table.getStringArrayTopic("options").publish();
    m_default = table.getStringTopic("default").publish();
    m_active = table.getStringTopic("active").publish();

    // The dashboard writes the drive team's pick to "selected". The robot only reads it.
    m_selected = table.getStringTopic("selected").subscribe("");

    // Whenever the pick changes: report back which option the robot will use, and tell listeners
    nt.addListener(m_selected, EnumSet.of(NetworkTableEvent.Kind.kValueAll), event -> {
      update();
      V selected = getSelected();
      for (Consumer<V> listener : m_listeners) {
        listener.accept(selected);
      }
    });
    update();
  }

  /** Sends the current options, default, and active choice to the dashboard (once published). */
  private void update() {
    if (m_optionNames == null) {
      return;   // not on the dashboard yet
    }
    m_optionNames.set(m_options.keySet().toArray(new String[0]));
    m_default.set(m_defaultName);
    m_active.set(selectedName());
  }

  /** The name of the option the robot will use. */
  private String selectedName() {
    String name = m_selected == null ? "" : m_selected.get();
    return m_options.containsKey(name) ? name : m_defaultName;
  }
}
