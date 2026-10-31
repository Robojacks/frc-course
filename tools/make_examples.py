"""Builds examples/: one complete WPILib 2026 project per lab, as it looks at the END of that lab.

The robot code is taken from the lab pages in src/testbed/ wherever a lab shows a whole file,
so the examples and the lab pages can't drift apart. Changes a lab describes in pieces
("add this field", "add this to periodic()") are applied here with anchored edits; if a lab's
code changes so an anchor no longer matches, this script stops with an error.

    python tools/make_examples.py

tools/project-template/ holds the Gradle files every project gets (from a WPILib 2026 project), and
tools/vendordeps/ holds the vendor library files (REVLib, Studica, WPILibNewCommands). To move to a
new season, update those two folders and GRADLERIO below, then run this again.
"""

import argparse
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LABS = ROOT / "src" / "testbed"
OUT = ROOT / "examples"
GRADLERIO = "2026.2.1"
TEAM = 4674

HEADER = """// RoboJacks 4674 FRC Programming Course: finished code for {lab}.
// Built from the WPILib 2026 Command Robot template.

"""


# --------------------------------------------------------------------------- helpers

def library_files():
    """The course's telemetry library (library/telemetry), as files in frc/robot/telemetry."""
    return {f"telemetry/{f.name}": f.read_text() for f in sorted((ROOT / "library" / "telemetry").glob("*.java"))}


def lab_text(name):
    return (LABS / name).read_text()


def java_block(md, must_contain):
    """The first ```java block in a lab page that contains the given text."""
    for block in re.findall(r"```java\n(.*?)```", md, re.S):
        if must_contain in block:
            return block
    raise SystemExit(f"no java block containing {must_contain!r}")


def edit(text, anchor, new, where="after", count=1):
    n = text.count(anchor)
    if n != count:
        raise SystemExit(f"anchor found {n} times (want {count}): {anchor[:80]!r}")
    if where == "after":
        return text.replace(anchor, anchor + new)
    if where == "before":
        return text.replace(anchor, new + anchor)
    return text.replace(anchor, new)


def add_imports(text, *imports):
    """Adds import lines (kept sorted within the existing import section)."""
    lines = text.split("\n")
    existing = {l.strip() for l in lines if l.startswith("import ")}
    new = [f"import {i};" for i in imports if f"import {i};" not in existing]
    if not new:
        return text
    last = max(i for i, l in enumerate(lines) if l.startswith("import "))
    lines[last + 1:last + 1] = new
    return normalize_imports("\n".join(lines))


def normalize_imports(text):
    """Groups imports: java.*, then com.*, then edu.wpi.*, then frc.*, sorted."""
    lines = text.split("\n")
    idx = [i for i, l in enumerate(lines) if l.startswith("import ")]
    if not idx:
        return text
    first, last = idx[0], idx[-1]
    imports = sorted({l for l in lines[first:last + 1] if l.startswith("import ")},
                     key=lambda s: s.rstrip(";"))
    groups = [[i for i in imports if i.startswith(p)] for p in
              ("import static", "import java", "import com.", "import edu.", "import frc.")]
    other = [i for i in imports if not any(i in g for g in groups)]
    block = []
    for g in groups + [other]:
        if g:
            block += g + [""]
    return "\n".join(lines[:first] + block[:-1] + lines[last + 1:])


def class_end(text):
    """Index of the final closing brace of the top-level class."""
    return text.rstrip().rfind("}")


def add_member(text, member):
    i = class_end(text)
    return text[:i].rstrip() + "\n\n" + member.rstrip() + "\n}\n"


def indent(code, spaces):
    pad = " " * spaces
    return "\n".join(pad + l if l.strip() else l for l in code.strip("\n").split("\n"))


def dedent(code):
    lines = [l for l in code.split("\n") if l.strip()]
    n = min(len(l) - len(l.lstrip()) for l in lines)
    return "\n".join(l[n:] if l.strip() else "" for l in code.split("\n"))


# --------------------------------------------------------------------------- template files

def template_robot(println=False, update_dashboard=False):
    hello = ('    System.out.println("Hello from the TestBed! Written by YOUR NAME.");\n'
             if println else "")
    update = ("\n    // Lab 5: RobotContainer has no periodic(), so its dashboard values are sent from here\n"
              "    m_robotContainer.updateDashboard();\n" if update_dashboard else "")
    return f"""package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;

/**
 * The methods in this class are called automatically corresponding to each mode, as described in
 * the TimedRobot documentation. If you change the name of this class or the package after creating
 * this project, you must also update the Main.java file in the project.
 */
public class Robot extends TimedRobot {{
  private Command m_autonomousCommand;

  private final RobotContainer m_robotContainer;

  /**
   * This function is run when the robot is first started up and should be used for any
   * initialization code.
   */
  public Robot() {{
{hello}    // Instantiate our RobotContainer.  This will perform all our button bindings, and put our
    // autonomous chooser on the dashboard.
    m_robotContainer = new RobotContainer();
  }}

  /**
   * This function is called every 20 ms, no matter the mode. Use this for items like diagnostics
   * that you want ran during disabled, autonomous, teleoperated and test.
   */
  @Override
  public void robotPeriodic() {{
    // Runs the Scheduler.  This is responsible for polling buttons, adding newly-scheduled
    // commands, running already-scheduled commands, removing finished or interrupted commands,
    // and running subsystem periodic() methods.  This must be called from the robot's periodic
    // block in order for anything in the Command-based framework to work.
    CommandScheduler.getInstance().run();
{update}  }}

  /** This function is called once each time the robot enters Disabled mode. */
  @Override
  public void disabledInit() {{}}

  @Override
  public void disabledPeriodic() {{}}

  /** This autonomous runs the autonomous command selected by your {{@link RobotContainer}} class. */
  @Override
  public void autonomousInit() {{
    m_autonomousCommand = m_robotContainer.getAutonomousCommand();

    // schedule the autonomous command (example)
    if (m_autonomousCommand != null) {{
      CommandScheduler.getInstance().schedule(m_autonomousCommand);
    }}
  }}

  /** This function is called periodically during autonomous. */
  @Override
  public void autonomousPeriodic() {{}}

  @Override
  public void teleopInit() {{
    // This makes sure that the autonomous stops running when
    // teleop starts running. If you want the autonomous to
    // continue until interrupted by another command, remove
    // this line or comment it out.
    if (m_autonomousCommand != null) {{
      m_autonomousCommand.cancel();
    }}
  }}

  /** This function is called periodically during operator control. */
  @Override
  public void teleopPeriodic() {{}}

  @Override
  public void testInit() {{
    // Cancels all running commands at the start of test mode.
    CommandScheduler.getInstance().cancelAll();
  }}

  /** This function is called periodically during test mode. */
  @Override
  public void testPeriodic() {{}}

  /** This function is called once when the robot is first started up. */
  @Override
  public void simulationInit() {{}}

  /** This function is called periodically whilst in simulation. */
  @Override
  public void simulationPeriodic() {{}}
}}
"""


MAIN = """package frc.robot;

import edu.wpi.first.wpilibj.RobotBase;

/**
 * Do NOT add any static variables to this class, or any initialization at all. Unless you know what
 * you are doing, do not modify this file except to change the parameter class to the startRobot
 * call.
 */
public final class Main {
  private Main() {}

  /**
   * Main initialization function. Do not perform any initialization here.
   *
   * <p>If you change your main robot class, change the parameter type.
   */
  public static void main(String... args) {
    RobotBase.startRobot(Robot::new);
  }
}
"""

EXAMPLE_SUBSYSTEM = """package frc.robot.subsystems;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

public class ExampleSubsystem extends SubsystemBase {
  /** Creates a new ExampleSubsystem. */
  public ExampleSubsystem() {}

  /**
   * Example command factory method.
   *
   * @return a command
   */
  public Command exampleMethodCommand() {
    // Inline construction of command goes here.
    // Subsystem::RunOnce implicitly requires `this` subsystem.
    return runOnce(
        () -> {
          /* one-time action goes here */
        });
  }

  /**
   * An example method querying a boolean state of the subsystem (for example, a digital sensor).
   *
   * @return value of some boolean subsystem state, such as a digital sensor.
   */
  public boolean exampleCondition() {
    // Query some boolean state, such as a digital sensor.
    return false;
  }

  @Override
  public void periodic() {
    // This method will be called once per scheduler run
  }

  @Override
  public void simulationPeriodic() {
    // This method will be called once per scheduler run during simulation
  }
}
"""

EXAMPLE_COMMAND = """package frc.robot.commands;

import edu.wpi.first.wpilibj2.command.Command;
import frc.robot.subsystems.ExampleSubsystem;

/** An example command that uses an example subsystem. */
public class ExampleCommand extends Command {
  @SuppressWarnings("PMD.UnusedPrivateField")
  private final ExampleSubsystem m_subsystem;

  /**
   * Creates a new ExampleCommand.
   *
   * @param subsystem The subsystem used by this command.
   */
  public ExampleCommand(ExampleSubsystem subsystem) {
    m_subsystem = subsystem;
    // Use addRequirements() here to declare subsystem dependencies.
    addRequirements(subsystem);
  }

  // Called when the command is initially scheduled.
  @Override
  public void initialize() {}

  // Called every time the scheduler runs while the command is scheduled.
  @Override
  public void execute() {}

  // Called once the command ends or is interrupted.
  @Override
  public void end(boolean interrupted) {}

  // Returns true when the command should end.
  @Override
  public boolean isFinished() {
    return false;
  }
}
"""

AUTOS = """package frc.robot.commands;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import frc.robot.subsystems.ExampleSubsystem;

public final class Autos {
  /** Example static factory for an autonomous command. */
  public static Command exampleAuto(ExampleSubsystem subsystem) {
    return Commands.sequence(subsystem.exampleMethodCommand(), new ExampleCommand(subsystem));
  }

  private Autos() {
    throw new UnsupportedOperationException("This is a utility class!");
  }
}
"""

TEMPLATE_CONSTANTS = """package frc.robot;

/**
 * The Constants class provides a convenient place for teams to hold robot-wide numerical or boolean
 * constants. This class should not be used for any other purpose. All constants should be declared
 * globally (i.e. public static). Do not put anything functional in this class.
 *
 * <p>It is advised to statically import this class (or one of its inner classes) wherever the
 * constants are needed, to reduce verbosity.
 */
public final class Constants {
  public static class OperatorConstants {
    public static final int kDriverControllerPort = 0;
  }
}
"""

TEMPLATE_CONTAINER = """package frc.robot;

import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.OperatorConstants;
import frc.robot.commands.Autos;
import frc.robot.commands.ExampleCommand;
import frc.robot.subsystems.ExampleSubsystem;

/**
 * This class is where the bulk of the robot should be declared. Since Command-based is a
 * "declarative" paradigm, very little robot logic should actually be handled in the {@link Robot}
 * periodic methods (other than the scheduler calls). Instead, the structure of the robot (including
 * subsystems, commands, and trigger mappings) should be declared here.
 */
public class RobotContainer {
  // The robot's subsystems and commands are defined here...
  private final ExampleSubsystem m_exampleSubsystem = new ExampleSubsystem();

  // Replace with CommandPS4Controller or CommandJoystick if needed
  private final CommandXboxController m_driverController =
      new CommandXboxController(OperatorConstants.kDriverControllerPort);

  /** The container for the robot. Contains subsystems, OI devices, and commands. */
  public RobotContainer() {
    // Configure the trigger bindings
    configureBindings();
  }

  /** Use this method to define your trigger->command mappings. */
  private void configureBindings() {
    // Schedule `ExampleCommand` when `exampleCondition` changes to `true`
    new Trigger(m_exampleSubsystem::exampleCondition)
        .onTrue(new ExampleCommand(m_exampleSubsystem));

    // Schedule `exampleMethodCommand` when the Xbox controller's B button is pressed,
    // cancelling on release.
    m_driverController.b().whileTrue(m_exampleSubsystem.exampleMethodCommand());
  }

  /**
   * Use this to pass the autonomous command to the main {@link Robot} class.
   *
   * @return the command to run in autonomous
   */
  public Command getAutonomousCommand() {
    // An example command will be run in autonomous
    return Autos.exampleAuto(m_exampleSubsystem);
  }
}
"""


# --------------------------------------------------------------------------- the TestBed project

def testbed_states():
    """Yields (folder, lab title, lab page, files, vendordeps) for each TestBed lab."""
    l1 = lab_text("lab1-spin-motor.md")
    l1b = lab_text("lab1b-dashboard.md")
    l3 = lab_text("lab3-buttons-triggers.md")
    l4 = lab_text("lab4-limit-switch.md")
    l5 = lab_text("lab5-knob-speed.md")
    l6 = lab_text("lab6-encoder.md")
    l9 = lab_text("lab9-pid-wheel.md")

    library = library_files()

    # ---- Lab 0: the template, plus a hello message
    files = {
        "Main.java": MAIN,
        "Robot.java": template_robot(println=True),
        "Constants.java": TEMPLATE_CONSTANTS,
        "RobotContainer.java": TEMPLATE_CONTAINER,
        "subsystems/ExampleSubsystem.java": EXAMPLE_SUBSYSTEM,
        "commands/ExampleCommand.java": EXAMPLE_COMMAND,
        "commands/Autos.java": AUTOS,
    }
    yield "lab00-testbed-setup", "Lab 0", "lab0-first-project.md", dict(files), ["REVLib"]

    # ---- Lab 1: constants, the subsystem, and the A button
    constants = "package frc.robot;\n\n" + java_block(l1, "kBrushlessConstants").strip() + "\n"
    spin = java_block(l1, "public class SpinBrushlessMotorSubsystem")
    container = TEMPLATE_CONTAINER
    container = edit(container, "import frc.robot.commands.ExampleCommand;\n", "", where="replace")
    container = edit(container, "  // Replace with CommandPS4Controller or CommandJoystick if needed\n"
                     "  private final CommandXboxController m_driverController =\n"
                     "      new CommandXboxController(OperatorConstants.kDriverControllerPort);",
                     "  private final SpinBrushlessMotorSubsystem m_spinBrushlessMotorSubsystem =\n"
                     "      new SpinBrushlessMotorSubsystem();\n\n"
                     "  // The driver's Xbox controller, in Driver Station slot 0\n"
                     "  private final CommandXboxController m_controller =\n"
                     "      new CommandXboxController(OperatorConstants.kControllerPort);",
                     where="replace")
    bindings_l1 = dedent(java_block(l1, "m_controller.a().whileTrue("))
    container = re.sub(r"  /\*\* Use this method to define your trigger->command mappings\. \*/\n"
                       r"  private void configureBindings\(\) \{.*?\n  \}\n",
                       lambda m: "  /** Use this method to define your trigger->command mappings. */\n"
                                 + indent(bindings_l1, 2) + "\n",
                       container, flags=re.S)
    container = add_imports(container.replace("import edu.wpi.first.wpilibj2.command.button.Trigger;\n", ""),
                            "frc.robot.subsystems.SpinBrushlessMotorSubsystem")
    files.update({"Constants.java": constants, "RobotContainer.java": container,
                  "subsystems/SpinBrushlessMotorSubsystem.java": spin})
    yield "lab01-spin-motor", "Lab 1", "lab1-spin-motor.md", dict(files), ["REVLib"]

    # ---- Lab 1.1: the telemetry library, periodic(), and a tunable speed on B
    spin = add_imports(spin, "frc.robot.telemetry.Telemetry", "frc.robot.telemetry.TelemetryTable",
                       "frc.robot.telemetry.TunableDouble", "frc.robot.telemetry.Tunables")
    spin = edit(spin, "MotorType.kBrushless);\n",
                "\n" + java_block(l1b, 'Telemetry.getTable("Brushless")') + "\n"
                + java_block(l1b, "m_tunableSpeed ="))
    spin = edit(spin, '    ).withName("Spin Brushless");\n  }\n',
                "\n" + java_block(l1b, "spinAtTunableSpeedCommand()"))
    spin = add_member(spin, java_block(l1b, "public void periodic()"))
    container = edit(container, "          Constants.kBrushlessConstants.BrushlessMotorSpeed));\n",
                     "\n" + indent(java_block(l1b, "spinAtTunableSpeedCommand());"), 2) + "\n")
    files.update(library)
    files.update({"RobotContainer.java": container,
                  "subsystems/SpinBrushlessMotorSubsystem.java": spin})
    yield "lab01b-dashboard", "Lab 1.1", "lab1b-dashboard.md", dict(files), ["REVLib"]

    # ---- Lab 3: more commands, five bindings, a default command
    spin = edit(spin, "\n  /** Spins the motor at whatever speed is on the dashboard",
                "\n" + indent(java_block(l3, "public Command stopCommand()"), 0) + "\n",
                where="before")
    spin = add_imports(spin, "java.util.function.DoubleSupplier")   # Lab 3 says to add this import
    bindings = java_block(l3, "private void configureBindings()")
    default_cmd = java_block(l3, "setDefaultCommand(")
    bindings = edit(bindings, "\n    // Show which commands are running, live\n",
                    "\n    // When nothing else is using the motor, keep it stopped\n" + default_cmd,
                    where="before")
    container = re.sub(r"  /\*\* Use this method to define your trigger->command mappings\. \*/\n"
                       r"  private void configureBindings\(\) \{.*?\n  \}\n",
                       lambda m: "  /** Use this method to define your trigger->command mappings. */\n"
                                 + bindings.rstrip("\n") + "\n",
                       container, flags=re.S)
    container = add_imports(container, "edu.wpi.first.wpilibj.smartdashboard.SmartDashboard",
                            "edu.wpi.first.wpilibj2.command.CommandScheduler")
    files.update({"RobotContainer.java": container,
                  "subsystems/SpinBrushlessMotorSubsystem.java": spin})
    yield "lab03-buttons-triggers", "Lab 3", "lab3-buttons-triggers.md", dict(files), ["REVLib"]

    # ---- Lab 4: the limit switch
    constants = edit(constants, "  }\n}\n", "  }\n\n" + java_block(l4, "kSensorConstants").rstrip("\n") + "\n}\n",
                     where="replace")
    spin = add_imports(spin, "edu.wpi.first.wpilibj.DigitalInput")
    spin = edit(spin, '  // Everything this subsystem sends shows up in /Telemetry/Brushless on the dashboard\n',
                "  // The limit switch on the test bed (Lab 4)\n" + java_block(l4, "new DigitalInput(") + "\n",
                where="before")
    spin = edit(spin, "\n  /** Spins the motor at whatever speed is on the dashboard",
                "\n" + indent(java_block(l4, "public boolean isLimitPressed()"), 0) + "\n\n"
                + indent(java_block(l4, ".unless(this::isLimitPressed)"), 0)
                .replace("  public Command spinUntilLimitCommand",
                         "  /** Spins until the limit switch is pressed, then stops. Won't start if it's already pressed. */\n"
                         "  public Command spinUntilLimitCommand") + "\n",
                where="before")
    spin = edit(spin, '    m_telemetry.log("Command", running == null ? "none" : running.getName());\n',
                java_block(l4, 'm_telemetry.log("Limit Pressed"'))
    pov = java_block(l4, "m_controller.povUp()")
    trig = java_block(l4, "new Trigger(")
    container = edit(container, "\n    // Show which commands are running, live\n",
                     "\n" + pov + "\n" + trig, where="before")
    container = add_imports(container, "edu.wpi.first.wpilibj2.command.Commands",
                            "edu.wpi.first.wpilibj2.command.button.Trigger")
    files.update({"Constants.java": constants, "RobotContainer.java": container,
                  "subsystems/SpinBrushlessMotorSubsystem.java": spin})
    yield "lab04-limit-switch", "Lab 4", "lab4-limit-switch.md", dict(files), ["REVLib"]

    # ---- Lab 5: the knob
    sensor5 = java_block(l5, "KnobAnalogPort")
    calib = java_block(l5, "KnobMin")
    sensor5 = edit(sensor5, "    public static final double KnobTurns = 10.0;   // it's a 10-turn pot\n", calib)
    constants = re.sub(r"  public static class kSensorConstants \{.*?\n  \}\n", lambda m: sensor5, constants, flags=re.S)
    container = edit(container, "      new CommandXboxController(OperatorConstants.kControllerPort);\n",
                     "\n" + java_block(l5, "new AnalogPotentiometer(") + "\n"
                     + java_block(l5, 'Telemetry.getTable("Knob")'))
    container = edit(container, "\n  /**\n   * Use this to pass the autonomous command",
                     "\n" + java_block(l5, "public void updateDashboard()").rstrip("\n").replace(
                         '    m_knobTelemetry.log("Turns", m_knob.get());\n',
                         '    m_knobTelemetry.log("Turns", m_knob.get());\n' + java_block(l5, 'm_knobTelemetry.log("Speed"'))
                     + "\n\n" + java_block(l5, "private double knobToSpeed()").rstrip("\n") + "\n",
                     where="before")
    container = edit(container, "\n    // Show which commands are running, live\n",
                     "\n" + java_block(l5, "m_controller.povRight()"), where="before")
    container = add_imports(container, "edu.wpi.first.wpilibj.AnalogPotentiometer", "edu.wpi.first.math.MathUtil",
                            "frc.robot.telemetry.Telemetry", "frc.robot.telemetry.TelemetryTable")
    files.update({"Constants.java": constants, "RobotContainer.java": container,
                  "Robot.java": template_robot(println=True, update_dashboard=True)})
    yield "lab05-knob-speed", "Lab 5", "lab5-knob-speed.md", dict(files), ["REVLib"]

    # ---- Lab 6: the encoder wheel
    wheel_consts = indent(re.sub(r"(?m)^    ", "  ", java_block(l6, "public static class kWheelConstants")), 2)
    constants = constants.rstrip().rstrip("}").rstrip() + "\n\n" + wheel_consts + "\n}\n"
    wheel = java_block(l6, "public class WheelSubsystem")
    wheel = edit(wheel, '        m_telemetry.log("Current (A)", m_motor.getOutputCurrent());\n',
                 java_block(l6, 'm_telemetry.log("Raw Counts"'))
    for marker in ("public Command turnTimed(", "public Command turnBangBang("):
        wheel = edit(wheel, "\n    @Override\n    public void periodic()",
                     "\n" + indent(java_block(l6, marker), 4) + "\n", where="before")
    container = edit(container, "      new CommandXboxController(OperatorConstants.kControllerPort);\n",
                     "\n  // The 775pro wheel, and a second controller (Driver Station slot 1) for it\n"
                     + java_block(l6, "new WheelSubsystem()"))
    wheel_bind = (java_block(l6, "m_wheel.setDefaultCommand(") + java_block(l6, "m_wheel.turnTimed(")
                  + java_block(l6, "m_wheel.turnBangBang("))
    container = edit(container, "\n    // Show which commands are running, live\n",
                     "\n" + wheel_bind, where="before")
    container = add_imports(container, "frc.robot.subsystems.WheelSubsystem")
    files.update({"Constants.java": constants, "RobotContainer.java": container,
                  "subsystems/WheelSubsystem.java": wheel})
    yield "lab06-encoder", "Lab 6", "lab6-encoder.md", dict(files), ["REVLib"]

    # ---- Lab 9: PID on the wheel
    gains = java_block(l9, "public static final double P = 1.0;").replace("    // Add these inside kWheelConstants\n", "")
    constants = edit(constants, "    public static final double MaxVolts = 6.0;       // keeps PID tests gentle in Lab 9\n",
                     "\n    // Lab 9: PID\n" + gains)
    wheel = add_imports(wheel, "edu.wpi.first.math.MathUtil", "edu.wpi.first.math.controller.PIDController",
                        "frc.robot.telemetry.TunableDouble", "frc.robot.telemetry.Tunables")
    wheel = edit(wheel, "        EncodingType.k4X);\n", "\n" + java_block(l9, "new PIDController(kWheelConstants.P"))
    wheel = edit(wheel, '    private final TelemetryTable m_telemetry = Telemetry.getTable("Wheel");\n',
                 "\n" + java_block(l9, 'Tunables.addDouble("Wheel/kP"'))
    wheel = edit(wheel, "        m_encoder.setDistancePerPulse(1.0 / kWheelConstants.EncoderCyclesPerRev);\n",
                 "\n" + java_block(l9, "m_pid.setTolerance("))
    wheel = edit(wheel, "    public void periodic() {\n", java_block(l9, "m_pid.setPID(") + "\n")
    wheel = edit(wheel, "\n    @Override\n    public void periodic()",
                 "\n" + indent(java_block(l9, "public Command turnPid("), 4) + "\n", where="before")
    container = edit(container, "  // Attempt 2\n", java_block(l9, "m_wheel.turnPid("))
    files.update({"Constants.java": constants, "RobotContainer.java": container,
                  "subsystems/WheelSubsystem.java": wheel})
    yield "lab09-pid-wheel", "Lab 9", "lab9-pid-wheel.md", dict(files), ["REVLib"]


# --------------------------------------------------------------------------- the WestCoastDrive project

def wcd_states():
    l2 = lab_text("lab2-west-coast-drive.md")
    l7 = lab_text("lab7-timed-auto.md")
    l8 = lab_text("lab8-navx-gyro.md")
    l10 = lab_text("lab10-elevator.md")
    library = library_files()

    # ---- Lab 2
    constants = "package frc.robot;\n\n" + java_block(l2, "public final class Constants")
    drive = java_block(l2, "public class DriveSubsystem")
    container = f"""package frc.robot;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.Constants.OperatorConstants;
import frc.robot.subsystems.DriveSubsystem;

/**
 * This class is where the bulk of the robot should be declared: subsystems, controllers,
 * and the bindings between them.
 */
public class RobotContainer {{
  // The robot's subsystems
{indent(java_block(l2, "new DriveSubsystem()"), 2)}

  // The driver's Xbox controller, in Driver Station slot 0
  private final CommandXboxController m_controller =
      new CommandXboxController(OperatorConstants.kControllerPort);

  /** The container for the robot. Contains subsystems, OI devices, and commands. */
  public RobotContainer() {{
    configureBindings();
  }}

{indent(java_block(l2, "private void configureBindings()"), 2)}

{indent(java_block(l2, "return null;   // no autonomous yet"), 2)}
}}
"""
    files = {
        "Main.java": MAIN,
        "Robot.java": template_robot(),
        "Constants.java": constants,
        "RobotContainer.java": container,
        "subsystems/DriveSubsystem.java": drive,
    }
    files.update(library)
    yield "lab02-west-coast-drive", "Lab 2", "lab2-west-coast-drive.md", dict(files), ["REVLib"]

    # ---- Lab 7: timed autos and the chooser
    drive = edit(drive, "\n  @Override\n  public void periodic()",
                 "\n" + java_block(l7, "public Command driveForSecondsCommand(") + "", where="before")
    container = edit(container, "      new CommandXboxController(OperatorConstants.kControllerPort);\n",
                     "\n  // The autonomous menu in Elastic\n" + java_block(l7, "new Selectable<>()"))
    container = edit(container, "    configureBindings();\n", "\n" + java_block(l7, "m_autoChooser.addDefault("))
    autos = java_block(l7, "private Command squareAuto()")
    container = re.sub(r"  public Command getAutonomousCommand\(\) \{.*?\n  \}\n",
                       lambda m: java_block(l7, "return m_autoChooser.getSelected();") + "\n" + autos,
                       container, flags=re.S)
    container = add_imports(container, "edu.wpi.first.wpilibj2.command.Commands",
                            "frc.robot.telemetry.Selectable", "frc.robot.telemetry.Tunables")
    files.update({"RobotContainer.java": container,
                  "subsystems/DriveSubsystem.java": drive})
    yield "lab07-timed-auto", "Lab 7", "lab7-timed-auto.md", dict(files), ["REVLib"]

    # ---- Lab 8: the NavX2, then the drive encoders
    drive = add_imports(drive, "com.studica.frc.AHRS", "com.studica.frc.AHRS.NavXComType",
                        "edu.wpi.first.wpilibj.CounterBase.EncodingType", "edu.wpi.first.wpilibj.Encoder")
    drive = edit(drive, '  private final TelemetryTable m_telemetry = Telemetry.getTable("Drive");\n',
                 "\n" + java_block(l8, "new AHRS(NavXComType.kMXP_SPI)")
                 + "\n" + java_block(l8, "private final Encoder m_leftEncoder")
                 + "\n  private double m_turnTarget = 0.0;   // where the current turn is trying to end\n"
                 + "  private double m_distanceTarget = 0.0;   // where the current drive is trying to stop\n")
    drive = edit(drive, "    m_drive.setMaxOutput(kDriveConstants.MaxOutput);\n",
                 "\n" + java_block(l8, "double metersPerPulse"))
    for marker in ("public double getHeadingDegrees()", "public double getLeftMeters()"):
        drive = edit(drive, "\n  @Override\n  public void periodic()",
                     "\n" + java_block(l8, marker), where="before")
    turn = java_block(l8, "public Command turnDegreesCommand(")
    turn = edit(turn, "  private double m_turnTarget = 0.0;\n\n", "", where="replace")
    drive = edit(drive, "\n  @Override\n  public void periodic()", "\n" + turn, where="before")
    drive = edit(drive, "\n  @Override\n  public void periodic()",
                 "\n" + java_block(l8, "public Command twoSpeedTurnCommand("), where="before")
    dist = java_block(l8, "public Command driveDistanceCommand(")
    dist = edit(dist, "  private double m_distanceTarget = 0.0;   // where the current drive is trying to stop\n\n", "", where="replace")
    drive = edit(drive, "\n  @Override\n  public void periodic()", "\n" + dist, where="before")
    drive = edit(drive, "\n  @Override\n  public void periodic()",
                 "\n" + java_block(l8, "public double getEncoderHeadingDegrees()"), where="before")
    drive = edit(drive, '    m_telemetry.log("Battery (V)", RobotController.getBatteryVoltage());\n',
                 "\n" + java_block(l8, 'm_telemetry.log("Gyro/Heading (deg)"') + java_block(l8, 'm_telemetry.log("Gyro/Turn Target (deg)"')
                 + "\n" + java_block(l8, 'm_telemetry.log("Encoders/Left (m)"')
                 + java_block(l8, 'm_telemetry.log("Encoders/Distance Target (m)"')
                 + java_block(l8, 'm_telemetry.log("Encoders/Heading Estimate (deg)"'))
    enc_consts = java_block(l8, "LeftEncoderChannelA = 2;")
    constants = edit(constants, "    public static final double MaxOutput = 0.5;    // top speed, 0 to 1. Start slow!\n",
                     "\n" + enc_consts)
    constants = add_imports(constants.replace("package frc.robot;\n\n", "package frc.robot;\n\nimport edu.wpi.first.math.util.Units;\n\n", 1))
    gyro_bind = (java_block(l8, "zeroHeadingCommand());") + java_block(l8, "turnDegreesCommand(90, 0.4)")
                 + java_block(l8, "twoSpeedTurnCommand(90));"))
    enc_bind = java_block(l8, "resetEncodersCommand());") + java_block(l8, "driveDistanceCommand(1.0, 0.4));   // drive 1 meter")
    container = edit(container, "OperatorConstants.kDeadband)));\n",
                     "\n    // ---- Gyro and encoders (Lab 8) ----\n" + gyro_bind + enc_bind)
    container = re.sub(r"  /\*\* One side of a square:.*?\n  \}\n",
                       lambda m: "  /** One side of a square: forward 1 m by the encoders, pause, turn left 90 degrees by the gyro, pause. */\n"
                                 + java_block(l8, "driveDistanceCommand(1.0, 0.4),"),
                       container, flags=re.S)
    files.update({"Constants.java": constants, "RobotContainer.java": container, "subsystems/DriveSubsystem.java": drive})
    yield "lab08-navx-gyro", "Lab 8", "lab8-navx-gyro.md", dict(files), ["REVLib", "Studica"]

    # ---- Lab 10: the elevator
    elev_consts = java_block(l10, "public static class kElevatorConstants")
    constants = constants.rstrip().rstrip("}").rstrip() + "\n\n" + elev_consts.rstrip("\n") + "\n}\n"
    constants = add_imports(constants.replace("package frc.robot;\n\n", "package frc.robot;\n\nimport edu.wpi.first.math.util.Units;\n\n"))
    elevator = java_block(l10, "public class ElevatorSubsystem")
    container = edit(container, "      new CommandXboxController(OperatorConstants.kControllerPort);\n",
                     "\n  // The elevator, and the operator's controller (Driver Station slot 1)\n"
                     + java_block(l10, "new ElevatorSubsystem()"))
    elev_bind = java_block(l10, "m_elevator.setDefaultCommand(").replace("\n    // Presets: you'll add these in Step 6\n", "")
    elev_bind += java_block(l10, "goToPresetCommand(Preset.START)")
    container = edit(container, "    m_controller.y().onTrue(m_driveSubsystem.twoSpeedTurnCommand(90));\n",
                     "\n" + elev_bind)
    container = add_imports(container, "frc.robot.subsystems.ElevatorSubsystem",
                            "frc.robot.subsystems.ElevatorSubsystem.Preset")
    files.update({"Constants.java": constants, "RobotContainer.java": container,
                  "subsystems/ElevatorSubsystem.java": elevator})
    yield "lab10-elevator", "Lab 10", "lab10-elevator.md", dict(files), ["REVLib", "Studica"]

    # ---- Lab 11: odometry and the field map
    l11 = lab_text("lab11-odometry.md")
    drive = add_imports(drive, "edu.wpi.first.math.geometry.Pose2d",
                        "edu.wpi.first.math.kinematics.DifferentialDriveOdometry",
                        "edu.wpi.first.wpilibj.smartdashboard.Field2d",
                        "edu.wpi.first.wpilibj.smartdashboard.SmartDashboard")
    drive = edit(drive, "  private double m_turnTarget = 0.0;",
                 java_block(l11, "private final DifferentialDriveOdometry m_odometry;") + "\n", where="before")
    drive = edit(drive, "    m_rightEncoder.setDistancePerPulse(metersPerPulse);\n",
                 "\n" + java_block(l11, "m_odometry = new DifferentialDriveOdometry("))
    drive = edit(drive, "  public void periodic() {\n", java_block(l11, "m_odometry.update(m_gyro") + "\n")
    drive = edit(drive, '    m_telemetry.log("Encoders/Heading Estimate (deg)", getEncoderHeadingDegrees());\n',
                 "\n" + java_block(l11, "Pose2d pose = getPose();"))
    drive = edit(drive, "\n  @Override\n  public void periodic()",
                 "\n" + java_block(l11, "public Pose2d getPose()"), where="before")
    container = edit(container, "    m_controller.back().onTrue(m_driveSubsystem.zeroHeadingCommand());\n", "", where="replace")
    container = edit(container, "    m_controller.start().onTrue(m_driveSubsystem.resetEncodersCommand());\n",
                     java_block(l11, "resetPoseCommand());"), where="replace")
    files.update({"RobotContainer.java": container, "subsystems/DriveSubsystem.java": drive})
    yield "lab11-odometry", "Lab 11", "lab11-odometry.md", dict(files), ["REVLib", "Studica"]


# --------------------------------------------------------------------------- writing projects

def write_project(folder, lab, page, files, deps, template, vendordeps, project_name):
    dest = OUT / folder
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    for name in ("gradlew", "gradlew.bat", "gradle/wrapper/gradle-wrapper.jar",
                 "gradle/wrapper/gradle-wrapper.properties", "settings.gradle", ".gitignore",
                 ".vscode/launch.json", ".vscode/settings.json", "WPILib-License.md"):
        (dest / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(template / name, dest / name)
    build = (template / "build.gradle").read_text()
    build = re.sub(r'id "edu\.wpi\.first\.GradleRIO" version "[^"]+"',
                   f'id "edu.wpi.first.GradleRIO" version "{GRADLERIO}"', build)
    (dest / "build.gradle").write_text(build)
    (dest / ".wpilib").mkdir()
    (dest / ".wpilib/wpilib_preferences.json").write_text(json.dumps(
        {"enableCppIntellisense": False, "currentLanguage": "java", "projectYear": "2026",
         "teamNumber": TEAM}, indent=4) + "\n")
    (dest / "src/main/deploy").mkdir(parents=True)
    (dest / "src/main/deploy/example.txt").write_text(
        "Files placed in this directory will be deployed to the RoboRIO into the\n"
        "'deploy' directory in the home folder. Use the 'Filesystem.getDeployDirectory' wpilib function\n"
        "to get a proper path relative to the deploy directory.\n")

    vd = dest / "vendordeps"
    vd.mkdir()
    shutil.copy2(vendordeps / "WPILibNewCommands.json", vd / "WPILibNewCommands.json")
    for dep in deps:
        src = sorted(vendordeps.glob(f"{dep}-2026.*.json"))[-1]
        data = json.loads(src.read_text())
        (vd / data["fileName"]).write_text(src.read_text())

    java_root = dest / "src/main/java/frc/robot"
    for rel, code in files.items():
        path = java_root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(HEADER.format(lab=lab) + code.strip("\n") + "\n")

    hardware = "the test bed (team 4674)" if project_name == "TestBed" else "the West Coast Drive (team 4674)"
    (dest / "README.md").write_text(f"""# {lab} finished code ({project_name})

This is the **{project_name}** project as it looks at the end of [{lab}](../../src/testbed/{page}).
It runs on {hardware}.

Use it to check your own work, or to catch up if you missed a lab. Try to finish the lab
yourself first: you learn much more from fixing your own code than from reading this.

## Open and deploy it
1. Open this folder in **WPILib VS Code** (File → Open Folder).
2. Check the CAN IDs, DIO ports, and other numbers in `Constants.java` against your robot.
3. Build (Ctrl+Shift+P → **WPILib: Build Robot Code**), then deploy.

The vendor libraries it needs are already in `vendordeps/`: {", ".join(["WPILib New Commands"] + deps)}.
The first build downloads them, so be online for it.
""")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--template", type=Path, default=ROOT / "tools" / "project-template")
    parser.add_argument("--vendordeps", type=Path, default=ROOT / "tools" / "vendordeps")
    args = parser.parse_args()

    OUT.mkdir(exist_ok=True)
    made = []
    for project, states in (("TestBed", testbed_states()), ("WestCoastDrive", wcd_states())):
        for folder, lab, page, files, deps in states:
            write_project(folder, lab, page, files, deps, args.template, args.vendordeps, project)
            made.append((folder, lab, page, project))

    rows = "\n".join(f"| [{lab}](../src/testbed/{page}) | [`{folder}`]({folder}/) | {project} |"
                     for folder, lab, page, project in sorted(made))
    (OUT / "README.md").write_text(f"""# Finished code for every lab

Each folder is a complete **WPILib 2026** Java project: the robot code exactly as it looks at the
**end** of that lab. Open a folder in WPILib VS Code, build, and deploy.

| Lab | Folder | Project |
|---|---|---|
{rows}

Labs on the test bed build up the **TestBed** project; labs on the West Coast Drive build up the
**WestCoastDrive** project. Each folder includes everything from the labs before it in the same project.

These are generated from the lab pages by `tools/make_examples.py`, so they always match the code
shown in the labs. Don't edit them by hand; change the lab page and run the script again.
""")
    print(f"wrote {len(made)} projects to {OUT}")


if __name__ == "__main__":
    main()
