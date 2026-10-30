package frc.robot.telemetry;

import java.util.HashMap;
import java.util.Map;

/**
 * Numbers and menus you can change from the dashboard while the robot runs.
 *
 * <p>This is a small 2026 version of the Tunables API that WPILib adds in 2027. It uses the same
 * class and method names, and publishes to the same place in NetworkTables (under /Tunables).
 *
 * <pre>
 *   TunableDouble kP = Tunables.addDouble("Wheel/kP", 1.0);   // shows up as /Tunables/Wheel/kP
 *   pid.setP(kP.get());                                       // read it whenever you need it
 * </pre>
 *
 * <p>Tunable values go back to their starting value every time the robot code starts, so
 * dashboard changes are NOT saved. When you find a good number, copy it into Constants.java.
 */
public final class Tunables {
  // The top folder for everything tunable
  static final String kRoot = "/Tunables";

  // Every tunable made so far, by name, so asking for the same name twice returns the same one
  private static final Map<String, TunableDouble> kDoubles = new HashMap<>();

  // A "utility class": everything is static, so nobody should ever make a Tunables object
  private Tunables() {}

  /**
   * Makes a number you can change from the dashboard, like a PID gain.
   *
   * <p>Call this ONCE, when you create a field, and keep what it returns. Then call
   * {@code get()} on it whenever you need the current value.
   *
   * @param name the number's name, usually "Subsystem/name", like "Wheel/kP"
   * @param initialValue the starting value, usually from Constants
   * @return the tunable number
   */
  public static TunableDouble addDouble(String name, double initialValue) {
    return kDoubles.computeIfAbsent(name, n -> new TunableDouble(kRoot + "/" + n, initialValue));
  }

  /**
   * Puts a menu on the dashboard, like the autonomous chooser.
   *
   * @param name the menu's name, like "Auto". It shows up as /Tunables/Auto.
   * @param selectable the menu, with its options already added
   */
  public static void publish(String name, Selectable<?> selectable) {
    selectable.publish(kRoot + "/" + name);
  }
}
