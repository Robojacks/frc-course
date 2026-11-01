# 4.3 Sensors: Switches, Knobs, Encoders, and Gyros

## Why it matters
Motors let the robot act. Sensors let it **know** what's happening. The labs use four kinds of sensor, each wired a different way and answering a different question:

| Sensor | Answers | Wired to | Labs |
|---|---|---|---|
| **Limit switch** | "Am I at the end?" | roboRIO **DIO** | 4 |
| **10-turn potentiometer** | "Where is the knob?" | roboRIO **Analog In** | 5 |
| **REV Through Bore Encoder** | "How far has this shaft turned, and how fast?" | roboRIO **DIO** (two ports) | 6, 9, 10 |
| **NavX2** | "Which way is the robot facing?" | roboRIO **MXP** port | 8 |

The swerve drives use four more ([Lessons 21.1–21.3](../going-further/21-swerve.md)):

| Sensor | Answers | Wired to | Robot |
|---|---|---|---|
| **Through Bore Encoder, absolute mode** | "Which way is this wheel pointing, right now?" | A **SPARK MAX** data port | MAXSwerve (steering) |
| **Encoders inside motors** | "How far and how fast has this motor turned?" | Built in; read over **CAN** | Both swerves, and Labs 1 and 9 |
| **CANcoder** | "Which way is this wheel pointing, right now?" | **CAN** (and 12 V power) | MK5i (steering) |
| **Pigeon 2** | "Which way is the robot facing?" | **CAN** (and 12 V power) | Both swerves |

This lesson covers the hardware side: what each sensor is, how it's wired, and what can go wrong. The labs cover the code. [Lesson 8](../robot-code/08-sensors.md) covers sensors and units in general.

## Read this
- [Digital Inputs – Hardware (WPILib)](https://docs.wpilib.org/en/stable/docs/hardware/sensors/digital-inputs-hardware.html)
- [Analog Inputs – Hardware (WPILib)](https://docs.wpilib.org/en/stable/docs/hardware/sensors/analog-inputs-hardware.html)
- [Encoders – Hardware (WPILib)](https://docs.wpilib.org/en/stable/docs/hardware/sensors/encoders-hardware.html)
- [Gyroscopes – Hardware (WPILib)](https://docs.wpilib.org/en/stable/docs/hardware/sensors/gyros-hardware.html)
- [CANcoder](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/cancoder/index.html) and [Pigeon 2.0](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/pigeon2/index.html) (CTRE hardware reference)
- [MAXSwerve module documentation (REV)](https://docs.revrobotics.com/brushless/maxswerve)

## Walkthrough

### The roboRIO's sensor ports

| Port | How many | Signal | Our sensors |
|---|---|---|---|
| **DIO** (Digital I/O) | 10 (0–9) | On or off, read very fast | Limit switches, encoder channels A and B |
| **Analog In** | 4 (0–3) | A voltage from 0 to 5 V | Potentiometer |
| **MXP** | 1 wide connector | Many signals, including SPI | NavX2 |

Every DIO and Analog In port has three pins: **ground**, **5 V power**, and **signal**. Sensors that need power use all three. A plain switch uses just signal and ground.

!!! warning "Plug the right way around"
    Most sensor plugs fit either way. Check the pin labels on the roboRIO (they're printed next to each row) and match ground, power, and signal. A backward plug usually just doesn't work, but it can damage some sensors.

### Limit switches
The test bed's limit switches are industrial plunger switches. Pushing the plunger flips a set of contacts inside.

| Contact | When not pressed | When pressed |
|---|---|---|
| **NO** (normally open) | Open: no connection | Closed: connected |
| **NC** (normally closed) | Closed: connected | Open: no connection |

The switch connects between a DIO **signal** pin and **ground**:

![A limit switch wired to a roboRIO DIO port](../assets/wpilib/limit-switch-to-roborio.svg)

<p class="credit">A limit switch wired to a DIO port: signal and ground only. From the WPILib docs, <a href="https://docs.wpilib.org/en/stable/docs/hardware/sensors/digital-inputs-hardware.html">Digital Inputs - Hardware</a> (CC BY 4.0).</p>

!!! wpilib "From the WPILib docs: Why a switch reads high when open"
    All DIO ports have built-in **pull-up resistors** between the power pins and the signal pins. These make sure that when the signal pin is "floating" (not connected to anything), it reads **high**.

    A simple switch doesn't need power, so it has just two wires, between **signal** and **ground**. When the switch is open, the signal pin floats and the pull-up makes it read high. When the switch closes, it connects the signal straight to ground, so it reads low.

    *Adapted from [Digital Inputs - Hardware](https://docs.wpilib.org/en/stable/docs/hardware/sensors/digital-inputs-hardware.html), CC BY 4.0.*

So with NO contacts:

| Switch | Signal | `get()` returns |
|---|---|---|
| Not pressed | Pulled up | `true` |
| Pressed | Connected to ground | `false` |

That's why [Lab 4](../testbed/lab4-limit-switch.md) uses `!m_limitSwitch.get()` to mean "pressed."

!!! tip "NC is safer for real mechanisms"
    With **NC** wiring, a broken or unplugged wire reads the same as "pressed," so the robot stops instead of driving past the end. With NO wiring, a broken wire looks like "never pressed" and the motor keeps going. Many teams wire safety limits NC for this reason.

### Potentiometers
A potentiometer ("pot") is a variable resistor with three pins: two ends of a resistive strip, and a **wiper** that slides along it as the shaft turns.

```
5 V ──┬─────────────────┐
      │  resistive strip │
GND ──┴────────▲────────┘
               │
            wiper ──→ Analog In signal
```

The wiper's voltage goes from about 0 V at one end to about 5 V at the other. The test bed's is a **10-turn** pot: ten full turns from end to end, which gives very fine resolution.

![A potentiometer wired to a roboRIO analog input, with its voltage divider circuit](../assets/wpilib/analog-potentiometer-to-roborio.svg)

<p class="credit">A potentiometer on an Analog In port (left) is a voltage divider (right). From the WPILib docs, <a href="https://docs.wpilib.org/en/stable/docs/hardware/sensors/analog-potentiometers-hardware.html">Analog Potentiometers - Hardware</a> (CC BY 4.0).</p>

!!! wpilib "From the WPILib docs: Which end reads 0 V?"
    The middle pin of a potentiometer is the **signal**. The two outer pins can each be **either** power or ground. As the shaft turns, the two resistances R1 and R2 change, but their sum stays the same, so the signal voltage changes evenly as you turn.

    Because the circuit is symmetric, you choose which end of the travel reads 0 V. To reverse the direction, **wire it backwards**: swap the two outer pins.

    *Adapted from [Analog Potentiometers - Hardware](https://docs.wpilib.org/en/stable/docs/hardware/sensors/analog-potentiometers-hardware.html), CC BY 4.0.*


| | Potentiometer |
|---|---|
| Measures | Absolute position, within its range |
| After power-on | Knows its real position right away |
| Range | Limited: has **hard stops** at each end |
| Weaknesses | A little noisy; can wear out with lots of use |

Potentiometers are cheap and simple, so teams use them to measure arm angles and as driver knobs, like in [Lab 5](../testbed/lab5-knob-speed.md).

### The REV Through Bore Encoder
The Through Bore Encoder mounts **around** a 1/2" hex shaft (the shaft passes through its center), and measures the shaft's rotation with a magnet and sensor.

It has two outputs:

| Output | Signal | What it gives you | We use it? |
|---|---|---|---|
| **Quadrature** (A and B) | Two square waves | How far the shaft has turned, any number of turns, plus speed. 2048 cycles (8192 counts) per revolution. | **Yes**, on two DIO ports |
| **Absolute** | One pulse whose width shows the angle | The shaft's angle within **one** turn, even right after power-on | Not yet |

**Quadrature, explained.** Channels A and B each switch on and off as the shaft turns, a quarter-cycle apart. One full cycle steps through four states, and the **order** of the states tells the roboRIO the direction:

| Step | Turning forward (A, B) | Turning backward (A, B) |
|---|---|---|
| 1 | off, off | off, off |
| 2 | **on**, off | off, **on** |
| 3 | on, **on** | **on**, on |
| 4 | off, on | on, off |

Turning forward, **A** switches first. Turning backward, **B** switches first. Every one of those switches is one **count**, so one cycle is 4 counts.

![Quadrature signals: channel A leads for one direction, channel B leads for the other](../assets/wpilib/encoding-direction.png)

<p class="credit">The direction comes from which channel (A or B) changes first. From the WPILib docs, <a href="https://docs.wpilib.org/en/stable/docs/software/hardware-apis/sensors/encoders-software.html">Encoders - Software</a> (CC BY 4.0).</p>


The roboRIO counts these in hardware (its FPGA chip), so it never misses a count, even though your code only runs every 20 ms.

| | Quadrature encoder |
|---|---|
| Measures | How far, and how fast, from where it started |
| After power-on | Reads **0**, wherever the shaft is |
| Range | Unlimited turns |
| So you must... | Start the mechanism in a known spot, like the elevator at the bottom ([Lab 10](../testbed/lab10-elevator.md)) |

#### Wiring the Through Bore Encoder to the roboRIO
The encoder has a small white **6-pin JST** socket. Its cable splits into **four 3-pin Dupont plugs**, one per signal, each with its own **red** (5 V) and **black** (ground) wire. The **color of the third wire** tells you which signal it is:

![The Through Bore Encoder's cable: a white 6-pin JST plug at one end, and four black 3-pin Dupont plugs with blue, yellow, green, and white signal wires](../assets/photos/through-bore-cable.jpg)

<p class="credit">The encoder end of the cable is the white JST plug (right). The four 3-pin Dupont plugs go to the roboRIO. Each has a red wire (5 V), a black wire (ground), and one colored signal wire.</p>

| Plug (signal wire color) | Signal | Where it goes |
|---|---|---|
| **Blue** | Quadrature channel **A** | A DIO port, like **0** |
| **Yellow** | Quadrature channel **B** | The next DIO port, like **1** |
| **Green** | Index: one pulse per turn | Not used in this course. Tape it out of the way. |
| **White** | Absolute position (a duty-cycle signal) | Not used in this course. It's for reading the shaft's angle right after power-on, with WPILib's `DutyCycleEncoder`. |

**Which way around?** Each roboRIO DIO port is three pins in a row, and the roboRIO has a label printed next to each row of pins: the ground symbol (⏚), **V** (5 V), and **S** (signal). Turn each plug so the **black** wire is on **ground** (⏚), the **red** wire is on **V**, and the **blue** or **yellow** wire is on **S**. Every plug on this cable has its own red and black, so each one powers itself; that's normal.

The two DIO port numbers become `EncoderChannelA` and `EncoderChannelB` in `Constants`. Which robot uses which ports:

| Encoder | Robot | Blue (A) | Yellow (B) | Lab |
|---|---|---|---|---|
| Test bed wheel | Test bed | DIO 0 | DIO 1 | [Lab 6](../testbed/lab6-encoder.md) |
| Left drive gearbox | WCD | DIO 2 | DIO 3 | [Lab 8](../testbed/lab8-navx-gyro.md) |
| Right drive gearbox | WCD | DIO 4 | DIO 5 | [Lab 8](../testbed/lab8-navx-gyro.md) |
| Elevator | WCD | DIO 0 | DIO 1 | [Lab 10](../testbed/lab10-elevator.md) |

!!! tip "Counting the wrong way?"
    If the encoder counts **down** when the mechanism moves the way you call forward, you can either set its `...Inverted` constant to `true` in code, or swap the blue and yellow plugs. Pick one. Doing both puts it back where it started.

!!! warning "Cycles, not counts"
    WPILib's `Encoder` class calls one full quadrature **cycle** a "pulse." The Through Bore is **2048** cycles per revolution. Using 8192 (the count with 4x decoding) makes every distance 4 times too small.

### The NavX2-MXP gyro
The NavX2 is a small board with its own processor and three kinds of sensors: gyros (rotation), accelerometers (acceleration), and a magnetometer (compass). It combines them to report the robot's orientation.

| | NavX2-MXP |
|---|---|
| Mounts | Plugs straight into the roboRIO's **MXP** port, on top of the roboRIO |
| Talks over | SPI, through the MXP port (USB also works) |
| Most useful value | **Yaw**: which way the robot is facing ([Lab 8](../testbed/lab8-navx-gyro.md)) |
| At power-on | Calibrates for a few seconds. The robot **must sit still**. |
| Weakness | Slowly **drifts**: the heading creeps a little over time |

![Yaw, pitch, and roll axes on a robot drivetrain](../assets/wpilib/drive-yaw-pitch-roll.svg)

<p class="credit">Yaw is turning left and right; pitch and roll are tipping. From the WPILib docs, <a href="https://docs.wpilib.org/en/stable/docs/hardware/sensors/gyros-hardware.html">Gyroscopes - Hardware</a> (CC BY 4.0).</p>

!!! info "Mounting matters"
    The NavX measures rotation around the axis pointing up through the board. If the roboRIO is mounted flat, that's the robot's yaw. If it's mounted on its side, the NavX has to be told which way is up, or the headings will be wrong. Keep it flat, and firmly attached, so it moves exactly with the robot.

### Encoders inside motors
Brushless motors need to know where their rotor is to run at all, so most FRC brushless motors have an encoder **built in**:

| Motor | Built-in encoder | Read through |
|---|---|---|
| NEO, NEO 550, NEO Vortex | Hall-effect sensors (NEO, NEO 550) or a built-in encoder (Vortex) | The SPARK MAX / SPARK Flex, with REVLib |
| Kraken X60, Kraken X44, Falcon 500 | A high-resolution encoder in the integrated TalonFX | The TalonFX, with Phoenix 6 |

There's nothing to wire: the reading comes over CAN from the motor controller. These encoders are **relative**: they read 0 at power-on (or wherever the code last set them). They count the **motor's** turns, so divide by the gear ratio to get the mechanism's turns. That's exactly what the conversion factors in [Lesson 8](../robot-code/08-sensors.md#encoders-count-rotations-conversion-factors) are for.

A swerve module's **drive** distance and speed come from the drive motor's built-in encoder. Its **steering** angle needs an **absolute** sensor, because the wheel can be pointing any direction when the robot turns on. That's the next two sections.

### The Through Bore Encoder in absolute mode (MAXSwerve)
The Through Bore Encoder has two outputs ([above](#the-rev-through-bore-encoder)): the **quadrature** signal the labs use (relative), and an **absolute** signal on the **white** wire, which tells the angle of the shaft within one turn, even right after power-on.

On a MAXSwerve module, the Through Bore Encoder sits on the steering axis and plugs into the **steering SPARK MAX's data port** (the connector on top), not the roboRIO. The SPARK MAX reads the absolute angle and runs the steering PID itself.

| | MAXSwerve steering encoder |
|---|---|
| Wired to | The turning SPARK MAX's data port, with the cable and adapter that come with the module |
| Reads | The wheel's angle, 0 to 1 turn (the code converts it to radians) |
| Zeroing | In **REV Hardware Client**, with REV's alignment tool in the module: select the turning SPARK MAX and use the **Absolute Encoder** tool to set the zero offset ([Lesson 21.1](../going-further/21b-swerve-maxswerve.md#encoder-offsets-the-chassis-angular-offsets)) |
| If it reads wrong | Re-zero it. Check the cable at both ends. Check the encoder is pressed fully onto the shaft. |

### The CTRE CANcoder (MK5i)
The CANcoder is an **absolute magnetic encoder** that talks over CAN. A small round **magnet** is attached to the end of the rotating shaft (on a swerve module, the steering axis); the CANcoder sits just above it on the module and measures the magnet's angle.

| | CANcoder |
|---|---|
| Wires | **Red/black: 12 V power**. **Yellow/green: CAN high/low**, daisy-chained like other CAN devices ([Lesson 4](04-electronics.md)). |
| Has a CAN ID | Yes. Set it in Phoenix Tuner X ([Lesson 21.3](../going-further/21d-phoenix-tuner.md#step-3-name-id-and-blink)). |
| Reads | **Absolute position** (within one turn) and a relative position and velocity |
| Magnet | Comes with the encoder, not the module. It must be centered under the CANcoder and the right distance away. |
| Zeroing | For swerve, the Tuner X generator measures each offset ([Lesson 21.2](../going-further/21c-swerve-ctre.md#step-2-the-swerve-project-generator)) |

**The LED tells you about the magnet.** Wait about 8 seconds after power-on:

| LED | Means | Do |
|---|---|---|
| Off | No power | Check the red/black power wires |
| Slow bright red | No CAN | Check the yellow/green wires; is the robot on? |
| Rapid **green** | Magnet in range | Good |
| Rapid **orange** | Magnet in range, but a little too close or far | Adjust the magnet or the CANcoder's spacing |
| Rapid **red** | Magnet out of range | The magnet is missing, off-center, or far too close or far |

Bright blinking means CAN is healthy; dim blinking means CAN hasn't been seen since power-on. Tuner X's **Self Test** shows the magnet health too.

*Source: [CTRE: CANcoder hardware reference](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/cancoder/index.html), written in our own words.*

### The CTRE Pigeon 2 (gyro)
The Pigeon 2 is CTRE's gyro (an **IMU**: gyros plus accelerometers). It's what both swerve robots use for heading.

| | Pigeon 2 | NavX2 (for comparison) |
|---|---|---|
| Wires | **Red/black: 12 V**, **yellow/green: CAN** | Plugs into the roboRIO's MXP port |
| Has a CAN ID | Yes (CAN ID 9 on the MAXSwerve robot) | No |
| At power-on | **No calibration wait**: it's ready right away | Must sit still for a few seconds |
| Drift | Very low | Some |
| Mounting | Anywhere, any orientation, firmly attached. Then run **Mount Calibration** in Tuner X ([Lesson 21.3](../going-further/21d-phoenix-tuner.md#step-8-configs-self-test-and-pigeon-calibration)) so it knows which way is up. | Flat, with the roboRIO |

**Its LEDs:**

| LEDs | Means |
|---|---|
| Off | No power |
| Alternating **red** | No CAN |
| Alternating **orange** | CAN works, but no robot code using Phoenix is running |
| Both **orange** together | Robot code is running; robot disabled |
| Alternating **green** | Robot enabled. All good. |

!!! info "Pigeon 2 on a CANivore"
    Some Pigeon 2s made in September 2022 can't talk on a CANivore until their firmware is updated. If every device on a CANivore goes red when the Pigeon is added, see CTRE's [Pigeon 2.0 troubleshooting](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/pigeon2/pigeon-issues.html) page.

*Source: [CTRE: Pigeon 2.0 hardware reference](https://v6.docs.ctr-electronics.com/en/stable/docs/hardware-reference/pigeon2/index.html), written in our own words.*

### Which sensor for which job?

| Job | Best sensor | Why |
|---|---|---|
| Stop an elevator at the bottom | Limit switch | Simple, reliable, and can re-zero an encoder |
| Know how high the elevator is | Encoder | Precise over the whole range of travel |
| Measure an arm angle | Potentiometer or absolute encoder | Knows the angle right after power-on |
| Drive a set distance | Encoder on the drivetrain | Counts wheel rotations |
| Turn to an angle | Gyro | Measures the robot's rotation directly |
| Point a swerve wheel | Absolute encoder (Through Bore on a SPARK MAX, or CANcoder) | Knows the wheel's angle right after power-on |
| Drive speed and distance of a swerve wheel | The drive motor's built-in encoder | Already there; high resolution |
| Driver adjusts a value | Potentiometer | A knob is easy for people to use |

## Try it
- [ ] Find each sensor on the test bed and WCD, and follow its wire to the roboRIO. Write down the port number for each.
- [ ] On a limit switch, find the NO and NC terminals. Which one is wired on the test bed?
- [ ] Find the Through Bore Encoder's two quadrature wires and which DIO ports they go to
- [ ] Find the NavX2 on the WCD's roboRIO. Is it mounted flat?
- [ ] Fill in a wiring table for your team: every sensor, its port, and which lab uses it. Post it near the test bed.
- [ ] On the swerve robot, find each module's steering encoder and follow its cable to the SPARK MAX
- [ ] On a CANcoder, read the LED after 8 seconds. Is the magnet green?
- [ ] Find the Pigeon 2 and check its LEDs with the robot disabled and enabled

## Check yourself
??? question "What's the difference between DIO and Analog In ports?"
    DIO reads on or off. Analog In reads a voltage from 0 to 5 V, so it can measure a range of values.

??? question "With NO wiring, what does a limit switch read when pressed? Why?"
    `false`. Pressing connects the signal pin to ground, which pulls it low.

??? question "Why might a team wire a safety limit switch NC instead of NO?"
    With NC, a broken wire looks the same as "pressed," so the mechanism stops. With NO, a broken wire looks like "never pressed," and the motor keeps going.

??? question "Why does a quadrature encoder need two channels?"
    The order the two channels change tells the roboRIO which direction the shaft is turning.

??? question "What's the difference between a potentiometer and a quadrature encoder after the robot turns on?"
    The potentiometer knows its real position immediately. The quadrature encoder reads 0 wherever the shaft is, so the mechanism has to start in a known position.

??? question "Why must the robot sit still when the NavX2 powers on?"
    It calibrates itself during the first few seconds. Moving during calibration makes the heading drift for the rest of the session.

??? question "Why does a swerve module's steering need an absolute encoder, but its drive doesn't?"
    The wheel can be pointing any direction when the robot turns on, and the code has to know which. The drive only needs to measure how far it rolls from now, which a relative encoder does.

??? question "A CANcoder's LED is blinking rapid red. What's wrong?"
    CAN is fine, but the magnet is out of range: missing, off-center, or much too close or far.

??? question "Name two differences between the Pigeon 2 and the NavX2."
    The Pigeon 2 is on CAN (with its own 12 V power), needs no calibration wait at power-on, and can be mounted in any orientation after a mount calibration. The NavX2 plugs into the roboRIO's MXP port and must sit still to calibrate.

??? question "Where does the MAXSwerve steering encoder plug in?"
    Into the turning SPARK MAX's data port, not the roboRIO. The SPARK MAX reads it and runs the steering PID.

