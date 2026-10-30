# 3. Java Reference

## How to use this page
You learn Java **before** this course, from an interactive Java course ([see below](#learn-java-first)). This page doesn't replace that. It's a **reference**: the Java that robot code actually uses, in one place, with notes on how each idea shows up on the robot.

Come back here whenever robot code uses something you've forgotten, or something your Java course didn't cover. Three topics matter a lot in FRC and are often skipped or rushed in beginner courses, so read them even if you finished a course:

- [`static` and `final`](#static), used for `Constants`
- [Inheritance: `extends` and `@Override`](#inheritance-extends), used by every subsystem
- [Lambdas and method references](#lambdas-and-method-references), used by every command and button binding

!!! info "Robot connection boxes"
    Look for the **Robot connection** boxes. They show where each Java idea appears in robot code.

## Learn Java first
Before [Lab 1](../testbed/lab1-spin-motor.md), work through one of these interactive Java courses. Both run in your browser, so there's nothing to install.

| Course | Notes |
|---|---|
| [Coddy: Learn Java](https://coddy.tech/landing/java) | Short interactive lessons, free |
| [Codecademy: Learn Java](https://www.codecademy.com/learn/learn-java) | Interactive lessons with projects |

**Finish at least these topics.** Robot code uses every one of them:

- [ ] Variables and types (`int`, `double`, `boolean`, `String`)
- [ ] Math and comparison operators
- [ ] `if` / `else`
- [ ] Loops (`for`, `while`)
- [ ] Methods: parameters and return values
- [ ] Classes and objects: fields, methods, `new`
- [ ] Constructors
- [ ] `public` and `private`

Inheritance, interfaces, and lambdas are a bonus if your course covers them. If it doesn't, this page does.

!!! tip "Already know Java from a class?"
    Skip the outside course. Skim this page, read the three FRC topics above, and do the [check-your-Java exercises](#check-your-java) at the bottom.

## Read this
- [dev.java Learn](https://dev.java/learn/): the official Java tutorials, if you want to go deeper on any topic
- [Java Units Library (WPILib)](https://docs.wpilib.org/en/stable/docs/software/basic-programming/java-units.html): skim now, come back in Lesson 8

## Java for robot code

### Where to practice
You can run plain Java without a robot. For the small examples, use the online [Java Playground](https://dev.java/playground/) so you don't have to set anything up. For the classes later in the lesson, create them in your robot project.

Every Java program starts in a `main` method:

```java
public class Practice {
    public static void main(String[] args) {
        System.out.println("Hello, RoboJacks!");
    }
}
```

`System.out.println(...)` prints a line of text. You'll use it to check your work throughout this lesson.

### Statements, semicolons, and comments
- Java runs **statements** in order, top to bottom. Most statements end with `;`.
- Curly braces `{ }` group statements into a **block**.
- Comments are notes for humans. Java ignores them.

```java
// A one-line comment
/* A comment that can
   span several lines */
/** A Javadoc comment: describes the method or class below it. */
```

### Variables and types
A **variable** is a named box that holds a value. Every variable has a **type** that says what kind of value fits in the box.

```java
int ballsScored = 0;          // whole numbers
double motorSpeed = 0.75;     // decimals: most robot math uses double
boolean hasGamePiece = false; // true or false
String robotName = "Jack";    // text, in double quotes
```

| Type | Holds | Robot example |
|---|---|---|
| `int` | Whole numbers | CAN ID, PWM port, game pieces scored |
| `double` | Decimal numbers | Motor output, encoder position, voltage |
| `boolean` | `true` / `false` | Limit switch pressed, has game piece |
| `String` | Text | Dashboard labels, command names |

Once declared, you can change a variable's value but not its type:

```java
motorSpeed = 0.5;       // ✅ fine
motorSpeed = "fast";    // ❌ error: a String doesn't fit in a double
```

!!! info "Robot connection"
    Motor outputs are `double` values from `-1.0` (full reverse) to `1.0` (full forward). `0.0` is stopped.

### Constants with `final`
`final` means the value can never change after it's set. Use it for things like ports and gear ratios:

```java
final int INTAKE_MOTOR_PORT = 3;
INTAKE_MOTOR_PORT = 4;  // ❌ error: it's final
```

By convention, constants are named in `ALL_CAPS`. They live in `Constants.java` in robot projects.

### Math
```java
double a = 10 + 3;     // 13
double b = 10 - 3;     // 7
double c = 10 * 3;     // 30
double d = 10.0 / 4;   // 2.5
int    e = 10 / 4;     // 2   ← integer division throws away the decimal!
int    f = 10 % 4;     // 2   ← remainder ("mod")
```

!!! warning "Integer division"
    `1 / 2` is `0` in Java, because both numbers are `int`s. Write `1.0 / 2` to get `0.5`. This bug shows up in gear-ratio math all the time.

The `Math` class has the functions you'll need:

```java
Math.abs(-0.4);          // 0.4    absolute value
Math.max(0.2, 0.9);      // 0.9
Math.min(0.2, 0.9);      // 0.2
Math.sqrt(16);           // 4.0
Math.PI;                 // 3.14159...
Math.toRadians(90);      // 1.5707...
Math.cos(Math.PI);       // -1.0   (trig functions use radians)
```

### Comparisons and logic
These produce a `boolean`:

| Operator | Meaning | Example |
|---|---|---|
| `==` | equal | `count == 3` |
| `!=` | not equal | `count != 0` |
| `<`, `>`, `<=`, `>=` | comparisons | `speed > 0.5` |
| `&&` | and | `hasPiece && armIsUp` |
| <code>&#124;&#124;</code> | or | <code>leftPressed &#124;&#124; rightPressed</code> |
| `!` | not | `!hasPiece` |

!!! warning "`=` vs `==`"
    `=` **sets** a value. `==` **compares**. `if (x = 3)` is an error in Java; you meant `if (x == 3)`.

### If statements
```java
if (hasGamePiece) {
    motorSpeed = 0.0;          // stop, we're full
} else if (sensorSeesPiece) {
    motorSpeed = 0.3;          // slow down, almost there
} else {
    motorSpeed = 0.75;         // full speed
}
```

Java checks each condition in order and runs only the **first** block whose condition is true.

### Loops
Loops repeat code.

```java
// for: when you know how many times
for (int i = 0; i < 4; i++) {
    System.out.println("Swerve module " + i);
}

// while: repeat while something is true
int count = 0;
while (count < 3) {
    count++;
}
```

!!! danger "Loops are different on a robot"
    You'll rarely write a `while` loop that **waits** for something on a robot. The robot **already runs your code in a loop** every 20 ms. A loop that waits, like `while (!limitSwitch.get()) {}`, freezes the whole robot: no driving, no other mechanisms, and it may never stop. [Lesson 6](../robot-code/06-robot-program.md) explains the right way. `for` loops over a fixed list, like the four swerve modules, are fine.

### Methods
A **method** is a named, reusable chunk of code. It can take **parameters** (inputs) and **return** a value (output).

```java
//  return type   name   parameters
    double        clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
```

`clamp(1.5, -1, 1)` returns `1.0`. `clamp(-0.3, -1, 1)` returns `-0.3`.

A method that returns nothing uses `void`:

```java
void printSpeed(double speed) {
    System.out.println("Speed: " + speed);
}
```

!!! tip "Name methods with verbs"
    `getAngle()`, `setTarget()`, `isAtSpeed()`, `runIntake()`. Methods that return a `boolean` usually start with `is` or `has`.

### Classes and objects (the big one)
A **class** is a blueprint. An **object** is a thing built from the blueprint. A class bundles **data** (fields) with the **actions** that use that data (methods).

```java
public class Intake {
    // Fields: data each Intake object remembers
    private double speed = 0.0;
    private int piecesCollected = 0;

    // Methods: things an Intake can do
    public void run() {
        speed = 0.75;
    }

    public void stop() {
        speed = 0.0;
    }

    public void collectPiece() {
        piecesCollected++;
    }

    public double getSpeed() {
        return speed;
    }
}
```

Use it by building an object with `new`:

```java
Intake intake = new Intake();          // build one from the blueprint
intake.run();
System.out.println(intake.getSpeed()); // 0.75
intake.stop();
System.out.println(intake.getSpeed()); // 0.0
```

You can build many objects from one class, and each keeps its own fields:

```java
Intake front = new Intake();
Intake back = new Intake();
front.run();
// front.getSpeed() is 0.75, back.getSpeed() is still 0.0
```

!!! info "Robot connection"
    Every mechanism on the robot (drivetrain, intake, arm) becomes a class called a **subsystem**. The motor objects you create, like `new PWMSparkMax(0)`, are objects built from WPILib's classes.

### Constructors
A **constructor** runs once, when the object is built with `new`. It sets up the starting state. It has the same name as the class and no return type:

```java
public class Shooter {
    private final double maxRpm;

    public Shooter(double maxRpm) {   // constructor
        this.maxRpm = maxRpm;
    }
}

Shooter shooter = new Shooter(5000);
```

`this.maxRpm` means "this object's field," which tells it apart from the parameter `maxRpm` with the same name.

### `public` and `private`
- `private` fields and methods can only be used **inside** the class.
- `public` ones can be used from **anywhere**.

Make fields `private` and give other code methods to use instead. That way, the class controls its own data. For example, a `setSpeed()` method can refuse values above 1.0, but a public field can't protect itself.

### `static`
Most fields belong to **each object**. A `static` field or method belongs to the **class itself**, shared by everything:

```java
public final class Constants {
    public static final int INTAKE_MOTOR_PORT = 3;
}

int port = Constants.INTAKE_MOTOR_PORT;   // no object needed
```

`Math.max(...)` is a static method, which is why you never write `new Math()`.

### Inheritance: `extends`
A class can **extend** another class to get all its fields and methods, then add its own:

```java
public class Intake extends SubsystemBase {
    // Intake gets everything SubsystemBase has, plus whatever we add here
}
```

WPILib uses this everywhere: your subsystems extend `SubsystemBase`, and your robot extends `TimedRobot`.

**`@Override`** marks a method that replaces one from the parent class:

```java
@Override
public void periodic() {
    // replaces SubsystemBase's empty periodic() with ours
}
```

If you misspell the name, `@Override` makes the compiler warn you instead of silently creating a new method that never runs.

### Interfaces
An **interface** is a promise: "any class that implements me has these methods." You'll mostly *use* interfaces rather than write them. For example, many WPILib methods take a `BooleanSupplier`, which is any code that can answer true or false.

### Imports and packages
Classes live in **packages**, which are like folders. To use a class from another package, **import** it at the top of the file:

```java
package frc.robot.subsystems;       // the package this file is in

import edu.wpi.first.wpilibj2.command.SubsystemBase;
import edu.wpi.first.wpilibj.motorcontrol.PWMSparkMax;
```

VS Code adds most imports for you. Click a red-underlined class name and use the lightbulb.

### Null
A variable for an object can hold `null`, meaning "no object." Calling a method on `null` crashes with a **NullPointerException**:

```java
Intake intake = null;
intake.run();   // 💥 NullPointerException
```

On a robot this usually means you forgot to create something with `new`, or used it before its constructor ran. The crash message names the file and line.

### Lambdas and method references
WPILib uses these *everywhere*, so learn the syntax now. A **lambda** is a small piece of code you can pass around and run **later**:

```java
Runnable sayHi = () -> System.out.println("Hi!");
sayHi.run();   // prints "Hi!" now
```

The shape is `(parameters) -> what to do`:

```java
() -> intake.run()               // no inputs
() -> controller.getLeftY()      // returns a value
x -> x * 2                       // one input
```

A **method reference** is a shortcut for a lambda that just calls one method:

```java
intake::run              // same as () -> intake.run()
intake::hasGamePiece     // same as () -> intake.hasGamePiece()
```

!!! info "Robot connection: why lambdas matter"
    In `driver.a().whileTrue(intake.runIntake())`, the scheduler needs to run your code **every loop** while the button is held. You can't hand it the result of running the code once; you hand it the **code itself**. That's what lambdas are. [Lesson 7](../robot-code/07-command-based.md) builds on this.

### Reading a stack trace
When the robot code crashes, it prints a **stack trace**:

```
java.lang.NullPointerException: Cannot invoke "Intake.run()" because "this.intake" is null
    at frc.robot.RobotContainer.configureBindings(RobotContainer.java:42)
    at frc.robot.RobotContainer.<init>(RobotContainer.java:25)
    at frc.robot.Robot.robotInit(Robot.java:18)
```

Read the first line for **what** went wrong, then find the first `at frc.robot...` line for **where**: `RobotContainer.java`, line 42.

## Check your Java
If you can do all of these without looking anything up, you're ready for the labs.

**Part 1: Warm-up.** In a `main` method:

- [ ] Compute how many meters a 4-inch wheel travels in one rotation (circumference = π × diameter; 1 inch = 0.0254 m) and print it
- [ ] Print `1 / 2` and `1.0 / 2`. Explain the difference.
- [ ] Write `clamp(value, min, max)` and test it with three values

**Part 2: The Shooter class.** Write a `Shooter` class with:

- [ ] a `private double targetRpm` field
- [ ] a constructor that takes a `double maxRpm` and stores it in a `private final` field
- [ ] `setTarget(double rpm)`, which refuses (ignores) any value above `maxRpm`
- [ ] `getTarget()`
- [ ] `isAtSpeed(double currentRpm)`, which returns `true` if within 50 RPM of the target

Test it from `main()`, or come back after [Lesson 16](../workflow/16-unit-testing.md) and write a unit test.

**Part 3: Lambdas.**

- [ ] Make a `Runnable` that prints your name, and run it three times with a `for` loop
- [ ] Make a `BooleanSupplier` lambda that calls your shooter's `isAtSpeed(...)` and print the result

## Quick quiz
??? question "What's the difference between a class and an object?"
    A class is the blueprint (`Intake`). An object is one actual thing built from it (`new Intake()`). You can build many objects from one class, and each keeps its own data.

??? question "What does `10 / 4` equal in Java, and why?"
    `2`. Both are `int`s, so Java does integer division and drops the decimal. Use `10.0 / 4` to get `2.5`.

??? question "Why mark fields `private`?"
    So other code can't change them directly. It has to go through your methods, which can check that values are valid.

??? question "What does a constructor do, and when does it run?"
    It sets up a new object's starting state. It runs once, when the object is created with `new`.

??? question "What does `extends SubsystemBase` give your class?"
    Everything `SubsystemBase` already has: registration with the scheduler, a `periodic()` method you can override, and command factory methods like `run()` and `runOnce()`.

??? question "What does `() -> intake.run()` mean?"
    A chunk of code that **will** call `intake.run()` when something runs it later. It doesn't run yet.

??? question "Your robot crashes with a NullPointerException. Where do you look first?"
    The first line of the stack trace says what was null. The first `at frc.robot...` line gives the file and line number in your code.
