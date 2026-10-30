# 4.1 Motors: NEO, CIM, and 775pro

## Why it matters
The labs use three different motors, and they are **not** interchangeable. Each one has to be set up differently in code, protected differently, and used for different jobs. Telling a SPARK MAX the wrong motor type, or stalling the wrong motor, can destroy hardware in seconds.

This lesson covers the motors on the team's test bed and West Coast Drive:

| Motor | Where it's used | Labs |
|---|---|---|
| **NEO** | Test bed motor, WCD elevator | 1, 3, 4, 5, 10 |
| **CIM** | WCD drivetrain (4 of them) | 2, 7, 8 |
| **775pro** | Test bed wheel | 6, 9 |

## Read this
- [NEO V1.1 (REV)](https://docs.revrobotics.com/brushless/neo/v1.1)
- [Using Motor Controllers in Code (WPILib)](https://docs.wpilib.org/en/stable/docs/software/hardware-apis/motors/using-motor-controllers.html)

## Walkthrough

### Brushed vs. brushless
Every electric motor spins by switching which coils get current as the shaft turns. The difference is **what does the switching**.

| | Brushed | Brushless |
|---|---|---|
| Who switches the coils | Little carbon **brushes** rubbing on the spinning shaft | The **motor controller**, using a sensor that tells it where the shaft is |
| Wires | 2 power wires | 3 power wires + a sensor cable |
| Wear | Brushes wear out over time | Nothing rubs, so very little wear |
| Built-in encoder | No | Yes (the controller needs it to switch the coils) |
| Our motors | **CIM**, **775pro** | **NEO** |

!!! danger "Brushed or brushless must match in code"
    A SPARK MAX drives the two kinds completely differently. In code, CIMs and 775pros are `MotorType.kBrushed`, and NEOs are `MotorType.kBrushless`. Getting it wrong can damage the motor and the controller. Lab 1 (NEO) and Lab 2 (CIMs) are opposites on purpose.

### Reading a motor's specs
Four numbers tell you most of what you need to know about a motor:

| Spec | What it means | Why it matters |
|---|---|---|
| **Free speed** | How fast it spins with nothing attached, at 12 V | The top speed you could ever get (before gearing) |
| **Free current** | Current it draws spinning with no load | Small. A motor doing no work barely draws anything. |
| **Stall torque** | Twisting force when held completely still | How hard it can push |
| **Stall current** | Current it draws when held completely still | The **worst case** for heat, breakers, and brownouts |

A motor's current goes up as it's loaded down. Spinning freely, it draws almost nothing. Held still (**stalled**), it draws the most it ever will, turning all that power into heat.

### Our three motors

| Spec | NEO | CIM | 775pro |
|---|---|---|---|
| Type | Brushless | Brushed | Brushed |
| Free speed | 5,676 RPM | 5,310 RPM | 18,730 RPM |
| Free current | 1.8 A | 2.7 A | 0.7 A |
| Stall torque | 2.6 N·m | 2.42 N·m | 0.71 N·m |
| Stall current | 105 A | 133 A | 134 A |
| Built-in encoder | Yes, 42 counts per revolution | No | No |
| Size | Compact | Large and heavy | Small and light |

Compare them:

- The **NEO** and **CIM** have similar speed and torque. The NEO is lighter, has a built-in encoder, and doesn't wear out brushes. That's why many teams replaced CIMs with NEOs.
- The **775pro** spins more than **3 times faster** but has less than a third of the torque. It almost always needs a big gear reduction, like the gearbox on the test bed's wheel.
- All three pull **over 100 A** when stalled. That's why every lab sets a current limit.

!!! example "Why gearboxes?"
    A 775pro at 18,730 RPM is spinning over 300 times a second, far too fast to drive a wheel or lift anything directly. A gearbox trades speed for torque. A 100:1 gearbox gives about 187 RPM at the output, with up to 100 times the torque (minus losses to friction). Gear ratios multiply: a 10:1 stage followed by a 5:1 stage is 50:1 total.

### Stalls and heat
A stalled motor turns almost all of its power into heat. How fast that heat does damage depends on the motor:

| Motor | Stall behavior |
|---|---|
| **775pro** | Small, light, and spins fast, so it heats up **very quickly** when stalled. It can be damaged in seconds. Never hold the test bed wheel still while the motor is pushing. |
| **CIM** | Big and heavy, so it takes longer to heat up. But four CIMs pushing against a wall can still trip breakers and brown out the robot. |
| **NEO** | REV says to read their stall-testing documentation and **always set a Smart Current Limit** before using one. |

**Current limits** (`smartCurrentLimit` in every lab) are the main protection. They cap how much current the SPARK MAX lets the motor draw, so a stall heats the motor more slowly and doesn't trip the 40 A breakers.

### Wiring
!!! danger "Never wire a motor straight to the battery"
    Every motor connects to a **motor controller**, never directly to the battery or power distribution. REV specifically warns against connecting a NEO to the battery.

| Motor | Connects to the SPARK MAX with |
|---|---|
| CIM, 775pro | 2 power wires (red and black) |
| NEO | 3 power wires (red, black, and white) **plus the sensor cable** into the encoder port. A NEO won't spin without its sensor cable. |

### Inversion
Every motor spins one way for positive voltage. Which way is "forward" for the mechanism depends on how it's mounted. If a mechanism moves backward, you fix it **in code** with `config.inverted(true)`, not by swapping wires. That keeps the wiring the same on every motor, so nobody gets confused later.

## Try it
- [ ] On the test bed and WCD, find every motor. Say which type each is, and which SPARK MAX controls it.
- [ ] Find the NEO's sensor cable and the CIMs' two power wires
- [ ] Using the table, figure out roughly how fast the test bed wheel would spin with a 100:1 gearbox on the 775pro
- [ ] Find the current limit in each lab's code. Why are the drivetrain and the NEO set to 40 A?
- [ ] In [Lab 1](../testbed/lab1-spin-motor.md), watch the NEO's current on the dashboard when it starts. Compare it to the free current in the table.

## Check yourself
??? question "What's the difference between a brushed and a brushless motor?"
    In a brushed motor, carbon brushes inside the motor switch the coils. In a brushless motor, the motor controller does the switching, using a sensor in the motor to know where the shaft is.

??? question "Which motors in our labs are brushed, and which are brushless?"
    CIMs and the 775pro are brushed. NEOs are brushless.

??? question "Why does every lab set a current limit?"
    A stalled motor draws over 100 A. The limit keeps motors from overheating, keeps breakers from tripping, and prevents brownouts.

??? question "Why does the 775pro need a big gearbox?"
    It spins over 18,000 RPM with little torque. A gearbox trades that speed for the torque needed to actually move something.

??? question "Why is a stalled 775pro more dangerous than a stalled CIM?"
    Both draw about the same stall current, but the 775pro is much smaller and lighter, so it heats up much faster.

??? question "A NEO won't spin, but the SPARK MAX shows it's being commanded. What's one likely cause?"
    The NEO's sensor cable isn't plugged in. A brushless motor can't run without it.
