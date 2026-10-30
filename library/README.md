# The course's telemetry library

`telemetry/` is a small **WPILib 2026** copy of the **Telemetry** and **Tunables** APIs that WPILib adds in 2027. Every lab uses it to send values to Elastic and to change numbers from the dashboard.

| Class | What it does | 2027 equivalent |
|---|---|---|
| `Telemetry` | Get a table: `Telemetry.getTable("Wheel")`. Log a one-off value. | `Telemetry` |
| `TelemetryTable` | One folder of values: `table.log("Position (rot)", x)` | `TelemetryTable` |
| `Tunables` | Make a tunable number: `Tunables.addDouble("Wheel/kP", 1.0)`. Publish a menu. | `Tunables` |
| `TunableDouble` | A number you can change from the dashboard: `kP.get()` | `TunableDouble` |
| `Selectable` | A dropdown menu, like the auto chooser | `Selectable` |

Values go to the same places in NetworkTables as WPILib 2027: `/Telemetry/...` and `/Tunables/...`.

## Add it to a robot project
Copy the whole `telemetry` folder into your project's `src/main/java/frc/robot/` folder, so you have `src/main/java/frc/robot/telemetry/Telemetry.java` and the others. Then import what you use, like `import frc.robot.telemetry.Telemetry;`.

## Moving to WPILib 2027
Delete the `telemetry` folder and change the `frc.robot.telemetry` imports to WPILib's. The class and method names are the same. The 2027 APIs were still in preview when this was written, so check WPILib's documentation for the final names.
