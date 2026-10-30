# 16. Unit Testing & CI

## Why it matters
A **unit test** is code that checks your code automatically. Instead of deploying to the robot to discover your conversion math is wrong, a test catches it in seconds, on your laptop, without a robot.

**CI** (continuous integration) runs your tests automatically every time someone opens a pull request. If anything is broken, GitHub shows a red ❌ and the PR can't merge. Broken code never reaches `main`, and nobody has to remember to run the tests.

Tests are an investment: a few minutes writing one saves hours of robot time later, and it keeps checking the code every time anyone changes it, all season.

## Read this
- [Unit Testing (WPILib)](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/unit-testing.html)
- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/): the "Writing Tests" section
- [GitHub Actions quickstart](https://docs.github.com/en/actions/writing-workflows/quickstart)

## Walkthrough

### What's worth testing?
Start with logic that doesn't need hardware. These are fast, reliable, and catch real bugs:

| Test this | Example |
|---|---|
| Unit conversions | Does `METERS_PER_MOTOR_ROTATION` give the right distance for 10 rotations? |
| Conditions | Does `isAtSpeed()` return `true` at 3040 RPM with a 3000 target? |
| Limits and safety | Does `setTarget()` refuse a value above the max? |
| Input processing | Does the deadband turn 0.03 into 0? |
| State machines | Intake has piece → stop → index → ready to shoot |

Things that are hard to unit test, like "does the robot drive straight," are better checked in simulation ([Lesson 9](../robot-code/09-debugging.md)) and on the robot.

!!! tip "Design for testing"
    Logic that's pulled out into plain methods, with inputs and outputs, is easy to test. Logic buried inside a command's `execute()` that reads hardware directly is not. When you write a calculation, put it in a method you can call from a test.

### How a test is structured
Every test follows the same three steps, often called **Arrange, Act, Assert**:

```java
@Test
void isAtSpeedWhenClose() {
    Shooter shooter = new Shooter(5000);   // Arrange: set up what you need
    shooter.setTarget(3000);

    boolean result = shooter.isAtSpeed(3040);  // Act: do the thing being tested

    assertTrue(result);                    // Assert: check the result
}
```

One test checks **one behavior**. Name it for what it checks, so a failing test's name tells you what broke.

### Your first test
WPILib projects already include JUnit 5. Tests go in `src/test/java`, mirroring the `src/main/java` folders. Create `src/test/java/frc/robot/ShooterTest.java` to test the `Shooter` class from [Lesson 3](../foundations/03-java.md):

```java
package frc.robot;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ShooterTest {
    private Shooter shooter;

    @BeforeEach
    void setUp() {
        shooter = new Shooter(5000);   // runs before every test, so each starts fresh
    }

    @Test
    void isAtSpeedWhenClose() {
        shooter.setTarget(3000);
        assertTrue(shooter.isAtSpeed(3040));
    }

    @Test
    void notAtSpeedWhenFar() {
        shooter.setTarget(3000);
        assertFalse(shooter.isAtSpeed(2800));
    }

    @Test
    void refusesTargetAboveMax() {
        shooter.setTarget(6000);
        assertEquals(0, shooter.getTarget(), 1e-9);
    }
}
```

Run it:

```bash
./gradlew test
```

Or click the ▷ icon next to a test in VS Code to run just that one.

### The assertions you'll use
| Assertion | Passes when |
|---|---|
| `assertTrue(x)` | `x` is true |
| `assertFalse(x)` | `x` is false |
| `assertEquals(expected, actual)` | They're equal (ints, strings, objects) |
| `assertEquals(expected, actual, delta)` | Two `double`s are within `delta` of each other |
| `assertThrows(Exception.class, () -> ...)` | The code throws that exception |

!!! warning "Always use a delta for doubles"
    Decimal math isn't exact on computers: `0.1 + 0.2` is `0.30000000000000004`. `assertEquals(0.3, 0.1 + 0.2)` fails. Write `assertEquals(0.3, 0.1 + 0.2, 1e-9)` instead.

### Testing a conversion
```java
@Test
void tenRotationsIsAboutFourTenthsOfAMeter() {
    double meters = 10 * DriveConstants.METERS_PER_MOTOR_ROTATION;
    assertEquals(0.399, meters, 0.001);   // 4-inch wheel, 8:1 gearing
}
```

Work out the expected answer **by hand** first. A test that just copies the code's formula will happily agree with a wrong formula.

### Reading a failing test
```
ShooterTest > refusesTargetAboveMax() FAILED
    org.opentest4j.AssertionFailedError: expected: <0.0> but was: <6000.0>
        at frc.robot.ShooterTest.refusesTargetAboveMax(ShooterTest.java:31)
```

The test name says **what** broke, the message says **expected vs. actual**, and the line number points to the assertion. Here, `setTarget()` isn't refusing values above the max.

### Testing code that uses WPILib hardware classes
Some WPILib classes need the hardware layer started before they work in a test. Initialize it once at the start of the test class:

```java
@BeforeEach
void setUp() {
    assert HAL.initialize(500, 0);   // start WPILib's hardware layer in test mode
    intake = new Intake();
}

@AfterEach
void tearDown() {
    intake.close();   // free the simulated ports for the next test
}
```

Then you can use simulation classes like `PWMSim` or `DIOSim` to fake sensor inputs and check motor outputs. The WPILib unit testing page above has a complete example.

### Test-driven fixes
When you find a bug, try this order:

1. Write a test that **fails** because of the bug.
2. Fix the code.
3. Watch the test **pass**.

Now that bug can never come back without the test catching it.

### Set up CI with GitHub Actions
GitHub Actions runs commands on GitHub's computers whenever something happens in your repo. Create `.github/workflows/build.yml` in your **robot** repo:

```yaml
name: Build

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - run: chmod +x gradlew
      - run: ./gradlew build
```

Reading it:

- **`on:`** run on every push to `main` and every pull request
- **`checkout`** download the code
- **`setup-java`** install the right Java version
- **`./gradlew build`** compile and run every test, exactly like on your laptop

Now every PR shows ✅ or ❌, and you can click through to the full log to see which test failed.

!!! note "Match the Java version"
    Use the JDK version your season's WPILib installer ships with. Check the WPILib release notes each year, and update `java-version` to match.

### Branch protection
CI only helps if a red ❌ actually stops a merge. In the repo's **Settings → Branches**, add a rule for `main`:

- **Require a pull request before merging**
- **Require approvals:** 1
- **Require status checks to pass:** select the **build** job

Now nobody, including you, can merge broken code by accident.

## Try it
- [ ] Write three tests for your `Shooter` class and run `./gradlew test`
- [ ] Break the logic on purpose and read the failing test's message. Then fix it.
- [ ] Write a test for a conversion constant, working out the expected answer by hand
- [ ] Add the CI workflow to your practice repo and open a PR to see it run
- [ ] Turn on branch protection for `main`, then try to merge a PR with a failing test

## Check yourself
??? question "What are the three steps of a unit test?"
    Arrange (set up), Act (do the thing being tested), Assert (check the result).

??? question "Why does `assertEquals(0.3, 0.1 + 0.2)` fail, and how do you fix it?"
    Decimal math on computers isn't exact, so the result is 0.30000000000000004. Pass a small delta: `assertEquals(0.3, 0.1 + 0.2, 1e-9)`.

??? question "Why work out a test's expected value by hand?"
    If you copy the code's formula into the test, a wrong formula passes its own test.

??? question "What does CI add on top of running tests yourself?"
    It runs them automatically on every PR, so nobody can forget, and with branch protection, broken code can't merge.

??? question "You found a bug. What should you do before fixing it?"
    Write a test that fails because of it. Then fix the code and watch the test pass, so the bug can't come back unnoticed.
