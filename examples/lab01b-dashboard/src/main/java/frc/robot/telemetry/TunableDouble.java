// RoboJacks 4674 FRC Programming Course: finished code for Lab 1.1.
// Built from the WPILib 2026 Command Robot template.

package frc.robot.telemetry;

import java.util.function.DoubleSupplier;

import edu.wpi.first.networktables.DoubleEntry;
import edu.wpi.first.networktables.NetworkTableInstance;

/**
 * A number you can change from the dashboard while the robot runs. Make one with
 * {@link Tunables#addDouble(String, double)}. This matches WPILib 2027's TunableDouble.
 *
 * <p>It's also a DoubleSupplier, so you can pass it anywhere a DoubleSupplier is wanted.
 */
public final class TunableDouble implements DoubleSupplier {
  // An entry is a publisher and a subscriber in one: it sends the value to the dashboard,
  // and also reads back whatever the dashboard writes
  private final DoubleEntry m_entry;

  /** Use Tunables.addDouble(...) instead of making these yourself. */
  TunableDouble(String topic, double initialValue) {
    m_entry = NetworkTableInstance.getDefault().getDoubleTopic(topic).getEntry(initialValue);
    m_entry.set(initialValue);   // put the starting value on the dashboard
  }

  /** The current value: whatever is on the dashboard right now. */
  public double get() {
    return m_entry.get();
  }

  /** Changes the value from robot code. The dashboard shows the new value too. */
  public void set(double value) {
    m_entry.set(value);
  }

  /** Same as get(). This is what lets a TunableDouble be used as a DoubleSupplier. */
  @Override
  public double getAsDouble() {
    return get();
  }
}
