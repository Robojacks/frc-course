/* RoboJacks 4674 PID Lab: an interactive PID / feedforward simulator for the course.
 * Written for this course (no third-party code). Plain JavaScript, no libraries.
 *
 * Usage in a page:
 *   <div class="pidlab" data-mech="wheel" data-terms="P,I,D" data-ff="" data-kp="1"></div>
 *
 * data-mech     wheel | wheelspeed | flywheel | elevator | arm
 * data-terms    which PID knobs to show, e.g. "P,D" (default "P,I,D")
 * data-ff       which feedforward knobs to show, e.g. "kG" or "kS,kV" (default none)
 * data-profile  "1" to follow a trapezoid motion profile (position mechanisms)
 * data-kp, data-ki, data-kd, data-ks, data-kv, data-kg   starting gains (default 0)
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Mechanisms. "plant" is the real (hidden) physics, in the same units students
  // use: volts = kS·sign(v) + kG(·cos θ) + kV·v + kA·a.
  // ---------------------------------------------------------------------------
  var MECHS = {
    wheel: {
      title: "Test bed wheel (16:1)", kind: "position", unit: "rot", unitLong: "rotations",
      start: 0, goal: 10, min: -20, max: 20, barMin: 0, barMax: 20, presets: [0, 5, 10, 15],
      plant: { kS: 0.25, kV: 0.6, kA: 0.15, kG: 0 }, maxV: 6, duration: 4, motor: "775pro", stallA: 134,
      ranges: { kP: 10, kI: 20, kD: 2, kS: 1, kV: 2, kG: 1, iZone: 2 }, iZone: 0.5,
      challenges: [
        ["Ends within 0.02 rot of 10", function (m) { return m.sse < 0.02; }],
        ["Overshoot under 2%", function (m) { return m.overshoot < 2; }],
        ["Settles in under 2.5 s", function (m) { return m.settle !== null && m.settle < 2.5; }]
      ],
      java: function (g, p, r) {
        return "PIDController pid = new PIDController(" + g.kP + ", " + g.kI + ", " + g.kD + ");\n" +
          (r.kI ? "pid.setIZone(" + g.iZone + ");\n" : "") +
          "double volts = pid.calculate(getRotations(), target);   // clamp to ±6 V";
      }
    },
    wheelspeed: {
      title: "Test bed wheel speed (16:1)", kind: "velocity", unit: "rot/s", unitLong: "rotations per second",
      start: 0, goal: 5, min: -9, max: 9, barMin: 0, barMax: 9, presets: [0, 3, 5, 8],
      plant: { kS: 0.25, kV: 0.6, kA: 0.15, kG: 0 }, maxV: 6, duration: 2.5, motor: "775pro", stallA: 134,
      ranges: { kP: 5, kI: 10, kD: 0.2, kS: 1, kV: 2, kG: 1 },
      challenges: [
        ["Holds within 0.1 rot/s of target", function (m) { return m.sse < 0.1; }],
        ["Overshoot under 5%", function (m) { return m.overshoot < 5; }],
        ["At speed in under 0.6 s", function (m) { return m.settle !== null && m.settle < 0.6; }]
      ],
      java: function (g) {
        return "PIDController velocityPid = new PIDController(" + g.kP + ", " + g.kI + ", " + g.kD + ");\n" +
          "double volts = " + g.kS + " * Math.signum(targetRps) + " + g.kV + " * targetRps\n" +
          "    + velocityPid.calculate(getRps(), targetRps);";
      }
    },
    flywheel: {
      title: "Shooter flywheel", kind: "velocity", unit: "rot/s", unitLong: "rotations per second",
      start: 0, goal: 50, min: -80, max: 80, barMin: 0, barMax: 80, presets: [0, 30, 50, 70],
      plant: { kS: 0.2, kV: 0.15, kA: 0.05, kG: 0 }, maxV: 12, duration: 3, motor: "NEO", stallA: 105,
      ranges: { kP: 2, kI: 2, kD: 0.05, kS: 1, kV: 0.4, kG: 1 },
      challenges: [
        ["Holds within 0.5 rot/s of target", function (m) { return m.sse < 0.5; }],
        ["Overshoot under 3%", function (m) { return m.overshoot < 3; }],
        ["At speed in under 1.2 s", function (m) { return m.settle !== null && m.settle < 1.2; }]
      ],
      java: function (g) {
        return "SimpleMotorFeedforward ff = new SimpleMotorFeedforward(" + g.kS + ", " + g.kV + ");\n" +
          "PIDController pid = new PIDController(" + g.kP + ", " + g.kI + ", " + g.kD + ");\n" +
          "double volts = ff.calculate(targetRps) + pid.calculate(getRps(), targetRps);";
      }
    },
    elevator: {
      title: "Elevator", kind: "position", unit: "m", unitLong: "meters",
      start: 0, goal: 1.0, min: 0, max: 1.25, barMin: 0, barMax: 1.2, presets: [0, 0.4, 0.8, 1.2],
      limits: [0, 1.25], plant: { kS: 0.15, kV: 8, kA: 0.5, kG: 0.6 }, maxV: 12, duration: 4, motor: "NEO", stallA: 105,
      ranges: { kP: 60, kI: 30, kD: 5, kS: 1, kV: 20, kG: 2, maxVel: 2, maxAcc: 8 },
      profile: { maxVel: 1.0, maxAcc: 3.0 },
      challenges: [
        ["Ends within 1 cm of 1.0 m", function (m) { return m.sse < 0.01; }],
        ["Overshoot under 3%", function (m) { return m.overshoot < 3; }],
        ["Settles in under 2.5 s", function (m) { return m.settle !== null && m.settle < 2.5; }]
      ],
      java: function (g, p, r) {
        var s = p ? "ProfiledPIDController pid = new ProfiledPIDController(" + g.kP + ", " + g.kI + ", " + g.kD +
            ",\n    new TrapezoidProfile.Constraints(" + g.maxVel + ", " + g.maxAcc + "));\n"
          : "PIDController pid = new PIDController(" + g.kP + ", " + g.kI + ", " + g.kD + ");\n";
        var ff = (r.kG || r.kS || r.kV) ? "ElevatorFeedforward ff = new ElevatorFeedforward(" + g.kS + ", " + g.kG + ", " + g.kV + ");\n" : "";
        var calc = p ? "pid.calculate(getHeight(), goal)" : "pid.calculate(getHeight(), goal)";
        var ffc = (r.kG || r.kS || r.kV) ? (p ? " + ff.calculate(pid.getSetpoint().velocity)" : " + ff.calculate(0)") : "";
        return ff + s + "double volts = " + calc + ffc + ";";
      }
    },
    arm: {
      title: "Arm", kind: "position", unit: "°", unitLong: "degrees",
      start: -90, goal: 45, min: -90, max: 120, barMin: -90, barMax: 120, presets: [-90, 0, 45, 90],
      limits: [-90, 120], cosG: true, plant: { kS: 0.1, kV: 0.04, kA: 0.004, kG: 0.8 }, maxV: 12, duration: 3, motor: "NEO", stallA: 105,
      ranges: { kP: 1, kI: 1, kD: 0.05, kS: 1, kV: 0.1, kG: 2, maxVel: 400, maxAcc: 2000 },
      profile: { maxVel: 180, maxAcc: 720 },
      challenges: [
        ["Ends within 1° of 45°", function (m) { return m.sse < 1; }],
        ["Overshoot under 3%", function (m) { return m.overshoot < 3; }],
        ["Settles in under 1.5 s", function (m) { return m.settle !== null && m.settle < 1.5; }]
      ],
      java: function (g, p, r) {
        var ff = (r.kG || r.kS || r.kV) ? "ArmFeedforward ff = new ArmFeedforward(" + g.kS + ", " + g.kG + ", " + g.kV + ");\n" : "";
        var ffc = (r.kG || r.kS || r.kV) ? " + ff.calculate(Math.toRadians(goal), 0)" : "";
        return ff + "PIDController pid = new PIDController(" + g.kP + ", " + g.kI + ", " + g.kD + ");\n" +
          "double volts = pid.calculate(getAngleDeg(), goal)" + ffc + ";";
      }
    }
  };

  var DT_CTRL = 0.02;    // the roboRIO's 20 ms loop
  var DT_PHYS = 0.001;   // physics substep

  // Small seeded random generator, so the step response is the same every time.
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rand) {
    var u = Math.max(rand(), 1e-9), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function sgn(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

  // ---------------------------------------------------------------------------
  // One simulation: the plant, a WPILib-style PIDController, feedforward, and an
  // optional trapezoid profile. phys = { load, friction, noise, delayMs, maxV }.
  // ---------------------------------------------------------------------------
  function Sim(mech, gains, phys, useProfile, seed) {
    this.m = mech;
    this.g = gains;
    this.phys = phys;
    this.useProfile = !!useProfile && mech.kind === "position";
    this.rand = rng(seed || 4674);
    this.reset(mech.start);
  }
  Sim.prototype.reset = function (x0) {
    this.x = x0;          // position (rot, m, deg). For velocity mechanisms, just for animation.
    this.v = 0;           // velocity
    this.t = 0;
    this.goal = x0;
    this.volts = 0;
    this.terms = { P: 0, I: 0, D: 0, FF: 0 };
    this.integ = 0;
    this.prevErr = 0;
    this.havePrev = false;
    this.heat = 0;
    this.amps = 0;
    this.extraFriction = 0;   // a hand or cloth on the mechanism
    this.prof = { pos: x0, vel: 0 };
    this.sp = x0;
    this.history = [];        // delayed sensor readings
    this.ctrlTimer = 0;
  };
  Sim.prototype.measured = function () { return this.m.kind === "velocity" ? this.v : this.x; };
  Sim.prototype.setGoal = function (goal) {
    var m = this.m;
    goal = clamp(goal, m.min, m.max);
    if (goal !== this.goal) {
      this.goal = goal;
      // like a new move in the labs: clear old I and D history
      this.integ = 0;
      this.havePrev = false;
    }
  };
  Sim.prototype.stepProfile = function () {
    var g = this.g, p = this.prof, goal = this.goal;
    var vmax = Math.max(g.maxVel || 0, 1e-6), amax = Math.max(g.maxAcc || 0, 1e-6);
    var dist = goal - p.pos, dir = sgn(dist);
    if (dir === 0 && Math.abs(p.vel) < 1e-9) { p.vel = 0; return; }
    // speed we can have now and still stop at the goal
    var stopV = Math.sqrt(2 * amax * Math.abs(dist));
    var want = dir * Math.min(vmax, stopV);
    var dv = clamp(want - p.vel, -amax * DT_CTRL, amax * DT_CTRL);
    var nv = p.vel + dv;
    var np = p.pos + (p.vel + nv) / 2 * DT_CTRL;
    if ((goal - np) * dir <= 0 && Math.abs(nv) <= amax * DT_CTRL * 1.5) { np = goal; nv = 0; }
    p.pos = np; p.vel = nv;
  };
  Sim.prototype.control = function () {
    var m = this.m, g = this.g, phys = this.phys;
    // sensor: delayed and noisy
    var raw = this.measured();
    this.history.push(raw);
    var lag = Math.round((phys.delayMs || 0) / 1000 / DT_CTRL);
    while (this.history.length > lag + 1) this.history.shift();
    var meas = this.history[0];
    var span = (m.barMax - m.barMin);
    if (phys.noise) meas += gauss(this.rand) * phys.noise / 100 * span;
    this.lastMeas = meas;

    var sp, ffVel;
    if (this.useProfile) { this.stepProfile(); sp = this.prof.pos; ffVel = this.prof.vel; }
    else { sp = this.goal; ffVel = m.kind === "velocity" ? this.goal : 0; }
    this.sp = sp;

    var err = sp - meas;
    // WPILib's IZone: only build up I when close to the setpoint
    if (g.iZone > 0 && Math.abs(err) > g.iZone) this.integ = 0;
    else this.integ += err * DT_CTRL;
    var P = g.kP * err;
    var I = g.kI * this.integ;
    var D = this.havePrev ? g.kD * (err - this.prevErr) / DT_CTRL : 0;
    this.prevErr = err; this.havePrev = true;

    var FF = (g.kS || 0) * sgn(ffVel) + (g.kV || 0) * ffVel;
    if (g.kG) FF += m.cosG ? g.kG * Math.cos(sp * Math.PI / 180) : g.kG;

    var maxV = phys.maxV;
    this.terms = { P: P, I: I, D: D, FF: FF };
    this.volts = clamp(P + I + D + FF, -maxV, maxV);
  };
  Sim.prototype.physics = function (dt) {
    var m = this.m, pl = m.plant, phys = this.phys;
    var kA = pl.kA * phys.load, kS = pl.kS * phys.friction + this.extraFriction, kV = pl.kV;
    var grav = m.cosG ? pl.kG * phys.load * Math.cos(this.x * Math.PI / 180) : pl.kG * phys.load;
    var V = this.volts, a;
    if (Math.abs(this.v) < 1e-6) {
      var net = V - grav;
      if (Math.abs(net) <= kS) { a = 0; this.v = 0; }
      else a = (net - kS * sgn(net)) / kA;
    } else {
      a = (V - grav - kS * sgn(this.v) - kV * this.v) / kA;
    }
    var nv = this.v + a * dt;
    if (this.v !== 0 && sgn(nv) !== sgn(this.v)) nv = 0;   // friction can stop it, not reverse it
    this.v = nv;
    this.x += this.v * dt;
    if (m.limits) {
      if (this.x <= m.limits[0]) { this.x = m.limits[0]; if (this.v < 0) this.v = 0; }
      if (this.x >= m.limits[1]) { this.x = m.limits[1]; if (this.v > 0) this.v = 0; }
    }
    // motor current and heat: current flows when volts beat the back-EMF
    var amps = (V - kV * this.v) / 12 * m.stallA;
    this.amps = amps;
    var load = (amps / m.stallA) * (amps / m.stallA);
    this.heat += (load * 2.2 - this.heat * 0.12) * dt;
    if (this.heat < 0) this.heat = 0;
  };
  Sim.prototype.advance = function (seconds) {
    var n = Math.round(seconds / DT_PHYS);
    for (var i = 0; i < n; i++) {
      if (this.ctrlTimer <= 1e-9) { this.control(); this.ctrlTimer += DT_CTRL; }
      this.physics(DT_PHYS);
      this.ctrlTimer -= DT_PHYS;
      this.t += DT_PHYS;
    }
  };

  // Step response: start at rest, ask for the goal, record every 20 ms.
  function stepResponse(mech, gains, phys, useProfile) {
    var sim = new Sim(mech, gains, phys, useProfile, 4674);
    var start = mech.start, goal = mech.goal;
    if (mech.kind === "velocity") start = 0;
    sim.reset(start);
    if (mech.kind === "velocity") sim.v = 0;
    sim.setGoal(goal);
    var out = { t: [], y: [], sp: [], v: [], P: [], I: [], D: [], FF: [], heat: 0 };
    var steps = Math.round(mech.duration / DT_CTRL);
    for (var i = 0; i <= steps; i++) {
      out.t.push(i * DT_CTRL);
      out.y.push(sim.measured());
      if (i < steps) sim.advance(DT_CTRL);
      out.sp.push(sim.sp); out.v.push(sim.volts);
      out.P.push(sim.terms.P); out.I.push(sim.terms.I); out.D.push(sim.terms.D); out.FF.push(sim.terms.FF);
      out.heat = Math.max(out.heat, sim.heat);
    }
    out.metrics = metrics(out, start, goal, phys.maxV);
    return out;
  }

  function metrics(r, start, goal, maxV) {
    var step = goal - start, dir = sgn(step) || 1, n = r.y.length;
    var t10 = null, t90 = null, peak = -Infinity, peakT = 0, i;
    for (i = 0; i < n; i++) {
      var frac = (r.y[i] - start) / step;
      if (t10 === null && frac >= 0.1) t10 = r.t[i];
      if (t90 === null && frac >= 0.9) t90 = r.t[i];
      var over = (r.y[i] - goal) * dir;
      if (over > peak) { peak = over; peakT = r.t[i]; }
    }
    var band = Math.abs(step) * 0.02, settle = 0;
    for (i = n - 1; i >= 0; i--) {
      if (Math.abs(r.y[i] - goal) > band) { settle = i + 1 < n ? r.t[i + 1] : null; break; }
    }
    if (settle !== null && settle >= r.t[n - 1]) settle = null;
    var last = Math.max(1, Math.round(0.4 / DT_CTRL)), sse = 0;
    for (i = n - last; i < n; i++) sse += Math.abs(goal - r.y[i]);
    sse /= last;
    // oscillation: count error sign flips after the first crossing, with real amplitude
    var flips = 0, prev = 0, crossed = false;
    for (i = 0; i < n; i++) {
      var e = goal - r.y[i];
      if (Math.abs(e) < band * 0.5) continue;
      var s = sgn(e);
      if (prev !== 0 && s !== prev) { flips++; crossed = true; }
      prev = s;
    }
    var sat = 0;
    for (i = 0; i < n; i++) if (Math.abs(r.v[i]) >= maxV - 1e-6) sat++;
    return {
      rise: (t10 !== null && t90 !== null) ? t90 - t10 : null,
      overshoot: Math.max(0, peak) / Math.abs(step) * 100,
      peakT: peakT,
      settle: settle,
      sse: sse,
      band: band,
      oscillating: flips >= 4,
      crossed: crossed,
      saturatedFrac: sat / n,
      endErr: goal - r.y[n - 1]
    };
  }

  var api = { MECHS: MECHS, Sim: Sim, stepResponse: stepResponse };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  window.PIDLabCore = api;

  // ===========================================================================
  // User interface
  // ===========================================================================
  var COLORS = {
    grid: "#243049", axis: "#3a4867", text: "#8b98ad", bright: "#e6ecf5",
    meas: "#5ab0ff", goal: "#ff9f43", ghost: "rgba(170,185,210,0.35)", band: "rgba(66,211,146,0.10)",
    volts: "#7ee081", limit: "rgba(255,93,108,0.6)", peak: "#ff5d6c", settle: "#42d392",
    P: "#4f9dff", I: "#b086ff", D: "#33d1a0", FF: "#ff7aa8"
  };
  var KNOB_INFO = {
    kP: { label: "kP", color: COLORS.P, tip: "Proportional: push harder the farther away you are" },
    kI: { label: "kI", color: COLORS.I, tip: "Integral: push harder the longer you've been off" },
    kD: { label: "kD", color: COLORS.D, tip: "Derivative: push against fast motion, like a shock absorber" },
    iZone: { label: "IZone", color: COLORS.I, tip: "Only build up I when this close to the target" },
    kS: { label: "kS", color: COLORS.FF, tip: "Static friction: volts just to get moving" },
    kV: { label: "kV", color: COLORS.FF, tip: "Volts per unit of speed" },
    kG: { label: "kG", color: COLORS.FF, tip: "Volts to hold against gravity" },
    maxVel: { label: "Max vel", color: COLORS.goal, tip: "Motion profile top speed" },
    maxAcc: { label: "Max accel", color: COLORS.goal, tip: "Motion profile acceleration" }
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function fmt(x, digits) {
    if (x === null || x === undefined || !isFinite(x)) return "—";
    var a = Math.abs(x);
    var d = digits !== undefined ? digits : a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.1 ? 3 : 4;
    var out = x.toFixed(d);
    return /^-0(\.0+)?$/.test(out) ? out.slice(1) : out;
  }
  function javaNum(x) {
    if (!x) return "0.0";
    var s = String(+x.toFixed(4));
    return s.indexOf(".") < 0 && s.indexOf("e") < 0 ? s + ".0" : s;
  }
  function fitCanvas(c) {
    var dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    }
    var ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }
  function niceTicks(lo, hi, count) {
    var span = hi - lo || 1, raw = span / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 2.5, 5, 10].map(function (k) { return k * mag; }).find(function (s) { return s >= raw; }) || raw;
    var out = [], v = Math.ceil(lo / step) * step;
    for (; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }

  // A rotary knob: drag up/down, arrow keys, or type a number. Double-click resets.
  function Knob(key, max, value, onChange) {
    var info = KNOB_INFO[key], self = this;
    this.key = key; this.max = max; this.def = value; this.onChange = onChange;
    var wrap = el("div", "pl-knob");
    wrap.style.setProperty("--knob", info.color);
    var lab = el("div", "pl-knob-label", info.label);
    lab.title = info.tip;
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 60 60");
    svg.setAttribute("class", "pl-knob-dial");
    svg.setAttribute("tabindex", "0");
    svg.setAttribute("role", "slider");
    svg.setAttribute("aria-label", info.label + ": " + info.tip);
    svg.setAttribute("aria-valuemin", "0");
    svg.setAttribute("aria-valuemax", String(max));
    function arc(r, a0, a1) {
      var p0 = [30 + r * Math.cos(a0), 30 + r * Math.sin(a0)], p1 = [30 + r * Math.cos(a1), 30 + r * Math.sin(a1)];
      var large = a1 - a0 > Math.PI ? 1 : 0;
      return "M" + p0[0].toFixed(2) + " " + p0[1].toFixed(2) + " A" + r + " " + r + " 0 " + large + " 1 " + p1[0].toFixed(2) + " " + p1[1].toFixed(2);
    }
    var A0 = Math.PI * 0.75, A1 = Math.PI * 2.25;
    var track = document.createElementNS(svgNS, "path");
    track.setAttribute("d", arc(24, A0, A1)); track.setAttribute("class", "pl-knob-track");
    var fill = document.createElementNS(svgNS, "path"); fill.setAttribute("class", "pl-knob-fill");
    var cap = document.createElementNS(svgNS, "circle");
    cap.setAttribute("cx", "30"); cap.setAttribute("cy", "30"); cap.setAttribute("r", "15"); cap.setAttribute("class", "pl-knob-cap");
    var ptr = document.createElementNS(svgNS, "line"); ptr.setAttribute("class", "pl-knob-ptr");
    svg.appendChild(track); svg.appendChild(fill); svg.appendChild(cap); svg.appendChild(ptr);
    var input = el("input", "pl-knob-input");
    input.type = "number"; input.step = "any"; input.min = "0"; input.inputMode = "decimal";
    input.setAttribute("aria-label", info.label + " value");
    wrap.appendChild(lab); wrap.appendChild(svg); wrap.appendChild(input);
    this.el = wrap;

    function toT(v) { return Math.sqrt(clamp(v / max, 0, 1)); }   // finer control near 0
    function fromT(t) { var v = max * t * t; return v < max * 1e-4 ? 0 : +v.toPrecision(3); }
    this.draw = function () {
      var t = toT(self.value), a = A0 + (A1 - A0) * t;
      fill.setAttribute("d", t > 0.001 ? arc(24, A0, a) : "");
      ptr.setAttribute("x1", (30 + 6 * Math.cos(a)).toFixed(2)); ptr.setAttribute("y1", (30 + 6 * Math.sin(a)).toFixed(2));
      ptr.setAttribute("x2", (30 + 13 * Math.cos(a)).toFixed(2)); ptr.setAttribute("y2", (30 + 13 * Math.sin(a)).toFixed(2));
      svg.setAttribute("aria-valuenow", String(self.value));
      svg.setAttribute("aria-valuetext", fmt(self.value));
      if (document.activeElement !== input) input.value = String(self.value);
    };
    this.set = function (v, silent) {
      v = Math.max(0, +v || 0);
      self.value = v; self.draw();
      if (!silent) self.onChange(key, v);
    };
    var drag = null;
    svg.addEventListener("pointerdown", function (e) {
      drag = { y: e.clientY, t: toT(self.value) };
      svg.setPointerCapture(e.pointerId); e.preventDefault(); svg.focus();
      wrap.classList.add("is-active");
    });
    svg.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var k = e.shiftKey ? 600 : 160;
      self.set(fromT(clamp(drag.t + (drag.y - e.clientY) / k, 0, 1)));
    });
    function end() { drag = null; wrap.classList.remove("is-active"); }
    svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
    svg.addEventListener("dblclick", function () { self.set(self.def); });
    svg.addEventListener("keydown", function (e) {
      var t = toT(self.value), d = e.shiftKey ? 0.005 : 0.02;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") t += d;
      else if (e.key === "ArrowDown" || e.key === "ArrowLeft") t -= d;
      else if (e.key === "PageUp") t += 0.1;
      else if (e.key === "PageDown") t -= 0.1;
      else if (e.key === "Home") t = 0;
      else if (e.key === "End") t = 1;
      else return;
      e.preventDefault(); self.set(fromT(clamp(t, 0, 1)));
    });
    input.addEventListener("input", function () { if (input.value !== "") self.set(input.value); });
    input.addEventListener("change", function () { input.value = String(self.value); });
    this.value = value; this.draw();
  }

  // A small labeled slider for the "real world" settings.
  function Slider(label, tip, min, max, step, value, unit, onChange) {
    var wrap = el("label", "pl-slider");
    wrap.title = tip;
    var top = el("span", "pl-slider-top");
    var name = el("span", "pl-slider-name", label);
    var val = el("span", "pl-slider-val");
    top.appendChild(name); top.appendChild(val);
    var input = el("input");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    wrap.appendChild(top); wrap.appendChild(input);
    function show() { val.textContent = (+input.value).toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0) + unit; }
    input.addEventListener("input", function () { show(); onChange(+input.value); });
    show();
    this.el = wrap;
    this.set = function (v) { input.value = v; show(); onChange(+v); };
  }

  function PIDLab(root) {
    var mechKey = root.getAttribute("data-mech") || "wheel";
    var mech = MECHS[mechKey];
    if (!mech) { root.textContent = "Unknown mechanism: " + mechKey; return; }
    var terms = (root.getAttribute("data-terms") || "P,I,D").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var ffs = (root.getAttribute("data-ff") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var useProfile = root.getAttribute("data-profile") === "1" && mech.kind === "position";
    function attr(name, def) { var v = root.getAttribute("data-" + name); return v === null ? def : +v; }

    var gains = {
      kP: attr("kp", 0), kI: attr("ki", 0), kD: attr("kd", 0),
      kS: attr("ks", 0), kV: attr("kv", 0), kG: attr("kg", 0),
      iZone: attr("izone", mech.iZone || 0),
      maxVel: attr("maxvel", mech.profile ? mech.profile.maxVel : 0),
      maxAcc: attr("maxacc", mech.profile ? mech.profile.maxAcc : 0)
    };
    // knobs that aren't shown stay at 0
    if (terms.indexOf("P") < 0) gains.kP = 0;
    if (terms.indexOf("I") < 0) gains.kI = 0;
    if (terms.indexOf("D") < 0) gains.kD = 0;
    ["kS", "kV", "kG"].forEach(function (k) { if (ffs.indexOf(k) < 0) gains[k] = 0; });
    var defaults = JSON.parse(JSON.stringify(gains));
    var phys = { load: 1, friction: 1, noise: 0, delayMs: 0, maxV: mech.maxV };
    var physDefaults = JSON.parse(JSON.stringify(phys));
    var knobs = [], sliders = [];

    root.innerHTML = "";
    root.classList.add("pl-ready");

    // ---- Header
    var head = el("div", "pl-head");
    var titleBox = el("div");
    titleBox.appendChild(el("div", "pl-title", "PID Lab · " + mech.title));
    var what = mech.kind === "velocity"
      ? "Hold a speed in " + mech.unitLong + ". Feedback reacts to error; feedforward predicts the volts."
      : "Move to a position in " + mech.unitLong + ". Drag the knobs and watch the step response change instantly.";
    titleBox.appendChild(el("div", "pl-sub", what));
    head.appendChild(titleBox);
    var resetAll = el("button", "pl-btn pl-btn-ghost", "Reset all");
    resetAll.type = "button";
    head.appendChild(resetAll);
    root.appendChild(head);

    // ---- Controls
    var controls = el("div", "pl-controls");
    function card(cls, label) {
      var c = el("section", "pl-card " + cls);
      c.appendChild(el("div", "pl-card-label", label));
      var body = el("div", "pl-card-body");
      c.appendChild(body);
      controls.appendChild(c);
      return body;
    }
    function onGain(k, v) { gains[k] = v; changed(); }
    function addKnob(body, key) {
      var k = new Knob(key, mech.ranges[key], gains[key], onGain);
      knobs.push(k); body.appendChild(k.el);
    }
    if (terms.length) {
      var gb = card("pl-gains", "Feedback · PID");
      terms.forEach(function (t) { addKnob(gb, "k" + t); });
      if (terms.indexOf("I") >= 0 && mech.iZone) addKnob(gb, "iZone");
    }
    if (ffs.length) {
      var fb = card("pl-ff", "Feedforward");
      ffs.forEach(function (k) { addKnob(fb, k); });
    }
    if (useProfile) {
      var pb = card("pl-prof", "Motion profile");
      addKnob(pb, "maxVel"); addKnob(pb, "maxAcc");
    }
    var rb = card("pl-phys", "Real world");
    function addSlider(key, label, tip, min, max, step, unit) {
      var s = new Slider(label, tip, min, max, step, phys[key], unit, function (v) { phys[key] = v; changed(); });
      s.key = key; sliders.push(s); rb.appendChild(s.el);
    }
    addSlider("load", "Load", "How heavy the mechanism is (1 = normal)", 0.5, 3, 0.1, "×");
    addSlider("friction", "Friction", "How much friction (1 = normal)", 0, 3, 0.1, "×");
    addSlider("noise", "Noise", "Random wiggle in the sensor reading", 0, 2, 0.05, "%");
    addSlider("delayMs", "Delay", "How old each sensor reading is", 0, 100, 10, " ms");
    addSlider("maxV", "Max volts", "Clamp on the motor voltage", 2, 12, 0.5, " V");
    root.appendChild(controls);

    // ---- Step response
    var stepCard = el("section", "pl-card pl-step");
    var stepHead = el("div", "pl-card-head");
    stepHead.appendChild(el("div", "pl-card-label", "Step response"));
    var startLabel = mech.kind === "velocity" ? 0 : mech.start;
    stepHead.appendChild(el("div", "pl-card-note", fmt(startLabel, mech.unit === "m" ? 1 : 0) + " → " +
      fmt(mech.goal, mech.unit === "m" ? 1 : 0) + " " + mech.unit + " · " + mech.duration + " s"));
    stepCard.appendChild(stepHead);
    var stepCanvas = el("canvas", "pl-canvas pl-step-canvas");
    stepCanvas.setAttribute("role", "img");
    stepCard.appendChild(stepCanvas);
    var metricRow = el("div", "pl-metrics");
    var M = {};
    [["rise", "Rise"], ["overshoot", "Overshoot"], ["settle", "Settle"], ["sse", "Final error"]].forEach(function (p) {
      var box = el("div", "pl-metric");
      box.appendChild(el("div", "pl-metric-name", p[1]));
      M[p[0]] = el("div", "pl-metric-val", "—");
      box.appendChild(M[p[0]]);
      metricRow.appendChild(box);
    });
    stepCard.appendChild(metricRow);
    var verdicts = el("div", "pl-verdicts");
    verdicts.setAttribute("aria-live", "polite");
    stepCard.appendChild(verdicts);
    var chal = el("div", "pl-challenges");
    chal.appendChild(el("div", "pl-chal-title", "Challenges"));
    var chalItems = mech.challenges.map(function (c) {
      var li = el("div", "pl-chal");
      li.appendChild(el("span", "pl-chal-box"));
      li.appendChild(el("span", "", c[0]));
      chal.appendChild(li);
      return li;
    });
    stepCard.appendChild(chal);
    root.appendChild(stepCard);

    // ---- Live
    var live = el("section", "pl-card pl-live");
    var liveHead = el("div", "pl-card-head");
    liveHead.appendChild(el("div", "pl-card-label", "Live"));
    var liveBtns = el("div", "pl-live-btns");
    var pauseBtn = el("button", "pl-btn", "Pause"); pauseBtn.type = "button";
    var restartBtn = el("button", "pl-btn", "Restart"); restartBtn.type = "button";
    var disturbLabel = mechKey === "flywheel" ? "Shoot a ball" : (mechKey === "wheel" || mechKey === "wheelspeed") ? "Hold the cloth" : "Bump it";
    var disturbBtn = el("button", "pl-btn pl-btn-hot", disturbLabel); disturbBtn.type = "button";
    disturbBtn.title = mechKey === "flywheel" ? "A ball takes energy out of the wheel" :
      (mechKey === "wheel" || mechKey === "wheelspeed") ? "Press and hold to drag a cloth on the wheel" : "Knock it with a quick push";
    liveBtns.appendChild(disturbBtn); liveBtns.appendChild(pauseBtn); liveBtns.appendChild(restartBtn);
    liveHead.appendChild(liveBtns);
    live.appendChild(liveHead);

    var liveGrid = el("div", "pl-live-grid");
    var mechBox = el("div", "pl-mech");
    var mechCanvas = el("canvas", "pl-canvas pl-mech-canvas");
    mechCanvas.setAttribute("aria-label", "Animated " + mech.title.toLowerCase() + ". Drag the orange handle below to set a new target.");
    mechCanvas.setAttribute("role", "img");
    mechBox.appendChild(mechCanvas);
    var readout = el("div", "pl-readout");
    mechBox.appendChild(readout);
    liveGrid.appendChild(mechBox);

    var scopeBox = el("div", "pl-scope");
    var scopeCanvas = el("canvas", "pl-canvas pl-scope-canvas");
    scopeCanvas.setAttribute("role", "img");
    scopeCanvas.setAttribute("aria-label", "Scope: target, measurement, and voltage over the last 6 seconds");
    scopeBox.appendChild(scopeCanvas);
    var legend = el("div", "pl-legend");
    var show = { goal: true, meas: true, volts: true, P: false, I: false, D: false, FF: false };
    var legendItems = [["meas", "Measured", COLORS.meas], ["goal", "Target", COLORS.goal], ["volts", "Volts", COLORS.volts]];
    if (terms.indexOf("P") >= 0) legendItems.push(["P", "P", COLORS.P]);
    if (terms.indexOf("I") >= 0) legendItems.push(["I", "I", COLORS.I]);
    if (terms.indexOf("D") >= 0) legendItems.push(["D", "D", COLORS.D]);
    if (ffs.length) legendItems.push(["FF", "FF", COLORS.FF]);
    legendItems.forEach(function (it) {
      var b = el("button", "pl-chip" + (show[it[0]] ? " is-on" : ""), it[1]);
      b.type = "button";
      b.style.setProperty("--chip", it[2]);
      b.setAttribute("aria-pressed", show[it[0]] ? "true" : "false");
      b.addEventListener("click", function () {
        show[it[0]] = !show[it[0]];
        b.classList.toggle("is-on", show[it[0]]);
        b.setAttribute("aria-pressed", show[it[0]] ? "true" : "false");
      });
      legend.appendChild(b);
    });
    scopeBox.appendChild(legend);
    liveGrid.appendChild(scopeBox);

    var meters = el("div", "pl-meters");
    function meter(name) {
      var m = el("div", "pl-meter");
      m.appendChild(el("div", "pl-meter-name", name));
      var bar = el("div", "pl-meter-bar");
      var fill = el("div", "pl-meter-fill");
      bar.appendChild(fill); m.appendChild(bar);
      var val = el("div", "pl-meter-val", "0");
      m.appendChild(val);
      meters.appendChild(m);
      return { fill: fill, val: val, box: m };
    }
    var voltM = meter("Volts"), ampM = meter("Current"), heatM = meter("Motor heat");
    liveGrid.appendChild(meters);
    live.appendChild(liveGrid);

    // setpoint bar
    var bar = el("div", "pl-bar");
    var barTrack = el("div", "pl-bar-track");
    barTrack.setAttribute("role", "slider");
    barTrack.setAttribute("tabindex", "0");
    barTrack.setAttribute("aria-label", "Target " + mech.unitLong);
    barTrack.setAttribute("aria-valuemin", String(mech.barMin));
    barTrack.setAttribute("aria-valuemax", String(mech.barMax));
    var barMeas = el("div", "pl-bar-meas"), barGoal = el("div", "pl-bar-goal");
    barTrack.appendChild(barMeas); barTrack.appendChild(barGoal);
    bar.appendChild(barTrack);
    var presetRow = el("div", "pl-presets");
    presetRow.appendChild(el("span", "pl-presets-label", "Target:"));
    mech.presets.forEach(function (v) {
      var b = el("button", "pl-chip pl-preset", fmt(v, mech.unit === "m" ? 1 : 0) + (mech.unit === "°" ? "°" : " " + mech.unit));
      b.type = "button";
      b.addEventListener("click", function () { liveSim.setGoal(v); });
      presetRow.appendChild(b);
    });
    bar.appendChild(presetRow);
    live.appendChild(bar);
    root.appendChild(live);

    // ---- Code
    var code = el("section", "pl-code");
    var codeHead = el("div", "pl-card-head");
    codeHead.appendChild(el("div", "pl-card-label", "In your code"));
    var copyBtn = el("button", "pl-btn", "Copy"); copyBtn.type = "button";
    codeHead.appendChild(copyBtn);
    code.appendChild(codeHead);
    var pre = el("pre", "pl-pre"), codeEl = el("code");
    pre.appendChild(codeEl); code.appendChild(pre);
    root.appendChild(code);
    copyBtn.addEventListener("click", function () {
      var done = function () { copyBtn.textContent = "Copied"; setTimeout(function () { copyBtn.textContent = "Copy"; }, 1200); };
      try { navigator.clipboard.writeText(codeEl.textContent).then(done, function () {}); } catch (e) {}
    });

    // ---- State
    var result = null, ghost = null, lastChange = 0;
    var liveSim = new Sim(mech, gains, phys, useProfile, (Date.now() & 0xffff) + 1);
    var startPos = mech.kind === "velocity" ? 0 : mech.start;
    liveSim.reset(startPos);
    var buf = [], BUF_S = 6, sampleTimer = 0, paused = false, started = false, visible = false, lastT = null;

    function updateCode() {
      var g = {};
      Object.keys(gains).forEach(function (k) { g[k] = javaNum(gains[k]); });
      codeEl.textContent = mech.java(g, useProfile, gains);
    }

    function recompute() {
      var now = performance.now();
      if (result && now - lastChange > 700) ghost = result;   // keep the old curve to compare
      lastChange = now;
      result = stepResponse(mech, gains, phys, useProfile);
      drawStep(); showMetrics(); updateCode();
    }
    var pending = false;
    function changed() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; recompute(); });
    }

    function showMetrics() {
      var m = result.metrics, u = mech.unit;
      function grade(elm, cls) { elm.className = "pl-metric-val" + (cls ? " " + cls : ""); }
      M.rise.textContent = m.rise === null ? "—" : fmt(m.rise, 2) + " s";
      grade(M.rise, m.rise === null ? "bad" : "");
      M.overshoot.textContent = fmt(m.overshoot, 1) + "%";
      grade(M.overshoot, m.overshoot < 2 ? "good" : m.overshoot < 10 ? "warn" : "bad");
      M.settle.textContent = m.settle === null ? "never" : fmt(m.settle, 2) + " s";
      grade(M.settle, m.settle === null ? "bad" : "good");
      M.sse.textContent = fmt(m.sse) + (u === "°" ? "°" : " " + u);
      grade(M.sse, m.sse <= m.band * 0.5 ? "good" : m.sse <= m.band ? "warn" : "bad");
      stepCanvas.setAttribute("aria-label", "Step response graph. Rise " + M.rise.textContent + ", overshoot " +
        M.overshoot.textContent + ", settle " + M.settle.textContent + ", final error " + M.sse.textContent + ".");

      // what's going on, in words
      var v = [];
      var noMove = Math.abs(result.y[result.y.length - 1] - (mech.kind === "velocity" ? 0 : mech.start)) < m.band;
      var hasFF = gains.kS || gains.kV || gains.kG;
      if (!gains.kP && !gains.kI && !gains.kD && !hasFF) v.push(["info", "All gains are 0, so the controller asks for 0 V. Turn up kP" + (ffs.length && mech.kind === "velocity" ? " or kV" : "") + "."]);
      else if (noMove) v.push(["bad", "It barely moves. The output is too small to beat friction" + (mech.plant.kG ? " and gravity" : "") + "."]);
      else if (m.sse > m.band) {
        if (mech.kind === "velocity") v.push(["bad", "Runs slow. P only pushes when there's error, but spinning needs volts all the time." + (ffs.indexOf("kV") >= 0 ? " Add kV." : " Try kI.")]);
        else if (mech.plant.kG && !gains.kG) v.push(["bad", "Sags short of the target. Gravity is pulling it down." + (ffs.indexOf("kG") >= 0 ? " Add kG." : " More kP or some kI helps.")]);
        else if (m.endErr * Math.sign(mech.goal - mech.start) < 0) v.push(["bad", "Ends up past the target."]);
        else v.push(["bad", "Stops short. Near the target the push is too small to beat friction." + (terms.indexOf("I") >= 0 ? " More kP, or some kI." : " Try more kP.")]);
      }
      if (m.oscillating) v.push(["bad", "Oscillates. Lower kP" + (terms.indexOf("D") >= 0 ? " or add kD" : "") + "."]);
      else if (m.overshoot >= 10) v.push(["warn", "Overshoots a lot." + (gains.kI && !gains.iZone && mech.iZone ? " That's integral windup: set an IZone." : terms.indexOf("D") >= 0 ? " Add kD or lower kP." : " Lower kP.")]);
      else if (m.overshoot >= 2) v.push(["warn", "Overshoots a little."]);
      if (m.saturatedFrac > 0.5) v.push(["info", "Maxed out at ±" + fmt(phys.maxV, 1) + " V for most of the move, so more kP can't make it faster."]);
      if (result.heat > 0.6) v.push(["bad", "The " + mech.motor + " is getting hot."]);
      var pass = mech.challenges.map(function (c) { return c[1](m); });
      var allPass = pass.every(Boolean);
      if (allPass) v.unshift(["good", "★ All challenges done! Copy these gains into Constants.java."]);
      else if (!v.length) v.push(["good", "Close! Now try to check off every challenge."]);
      verdicts.innerHTML = "";
      v.forEach(function (x) { verdicts.appendChild(el("div", "pl-verdict pl-" + x[0], x[1])); });
      chalItems.forEach(function (li, i) { li.classList.toggle("is-done", pass[i]); });
      chal.classList.toggle("is-all", allPass);
    }

    // ---- Drawing helpers
    function line(ctx, xs, ys, X, Y, color, width, dash) {
      ctx.beginPath();
      for (var i = 0; i < xs.length; i++) {
        var px = X(xs[i]), py = Y(ys[i]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = color; ctx.lineWidth = width || 1.5; ctx.setLineDash(dash || []);
      ctx.stroke(); ctx.setLineDash([]);
    }
    function grid(ctx, x0, x1, y0, y1, ticksX, ticksY, X, Y, unitY, fmtX) {
      ctx.font = "10px ui-monospace, Consolas, monospace";
      ctx.lineWidth = 1;
      ticksY.forEach(function (v) {
        var y = Math.round(Y(v)) + 0.5;
        ctx.strokeStyle = COLORS.grid; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        ctx.fillStyle = COLORS.text; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(fmt(v, Math.abs(v) < 10 && v % 1 ? (Math.abs(v * 10 % 1) > 1e-6 ? 2 : 1) : 0), x0 - 4, y);
      });
      ticksX.forEach(function (v) {
        var x = Math.round(X(v)) + 0.5;
        ctx.strokeStyle = COLORS.grid; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
        if (fmtX) { ctx.fillStyle = COLORS.text; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(fmtX(v), x, y1 + 3); }
      });
      if (unitY) { ctx.fillStyle = COLORS.text; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(unitY, x0 + 4, y0 + 2); }
    }

    function drawStep() {
      var f = fitCanvas(stepCanvas), ctx = f.ctx, w = f.w, h = f.h;
      ctx.clearRect(0, 0, w, h);
      if (!result) return;
      var L = 44, R = 10, T = 8, B = 18, gap = 14;
      var hTop = (h - T - B - gap) * 0.7, hBot = (h - T - B - gap) - hTop;
      var top0 = T, top1 = T + hTop, bot0 = top1 + gap, bot1 = bot0 + hBot;
      var tMax = mech.duration;
      var X = function (t) { return L + (w - L - R) * t / tMax; };
      var ys = result.y.concat(result.sp, [mech.goal, mech.kind === "velocity" ? 0 : mech.start]);
      if (ghost) ys = ys.concat(ghost.y);
      var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys), pad = (hi - lo || 1) * 0.08;
      lo -= pad; hi += pad;
      var Y = function (v) { return top1 - (v - lo) / (hi - lo) * hTop; };
      var tTicks = niceTicks(0, tMax, 6);
      grid(ctx, L, w - R, top0, top1, tTicks, niceTicks(lo, hi, 4), X, Y, mech.unit, null);
      // settle band
      var m = result.metrics;
      ctx.fillStyle = COLORS.band;
      ctx.fillRect(L, Y(mech.goal + m.band), w - L - R, Math.max(1, Y(mech.goal - m.band) - Y(mech.goal + m.band)));
      // rise shading
      if (m.rise !== null) {
        var t10 = null, t90 = null, st = mech.kind === "velocity" ? 0 : mech.start, step = mech.goal - st;
        for (var i = 0; i < result.y.length; i++) {
          var fr = (result.y[i] - st) / step;
          if (t10 === null && fr >= 0.1) t10 = result.t[i];
          if (t90 === null && fr >= 0.9) { t90 = result.t[i]; break; }
        }
        ctx.fillStyle = "rgba(90,176,255,0.07)";
        ctx.fillRect(X(t10), top0, X(t90) - X(t10), hTop);
      }
      line(ctx, [0, tMax], [mech.goal, mech.goal], X, Y, COLORS.goal, 1, [5, 4]);
      if (useProfile) line(ctx, result.t, result.sp, X, Y, COLORS.goal, 1.5);
      if (ghost) line(ctx, ghost.t, ghost.y, X, Y, COLORS.ghost, 2);
      line(ctx, result.t, result.y, X, Y, COLORS.meas, 2.2);
      if (m.overshoot >= 0.5) {
        var pk = Y(mech.goal + Math.sign(mech.goal - (mech.kind === "velocity" ? 0 : mech.start)) * m.overshoot / 100 * Math.abs(mech.goal - (mech.kind === "velocity" ? 0 : mech.start)));
        ctx.fillStyle = COLORS.peak; ctx.beginPath(); ctx.arc(X(m.peakT), pk, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      if (m.settle !== null) {
        ctx.strokeStyle = COLORS.settle; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(X(m.settle)) + 0.5, top0); ctx.lineTo(Math.round(X(m.settle)) + 0.5, top1); ctx.stroke();
        ctx.setLineDash([]);
      }
      // volts
      var vmax = phys.maxV * 1.15;
      var YV = function (v) { return bot0 + hBot / 2 - v / vmax * hBot / 2; };
      grid(ctx, L, w - R, bot0, bot1, tTicks, [-phys.maxV, 0, phys.maxV].filter(function (v, i, a) { return a.indexOf(v) === i; }), X, YV, "V", function (t) { return fmt(t, t % 1 ? 1 : 0) + "s"; });
      line(ctx, [0, tMax], [phys.maxV, phys.maxV], X, YV, COLORS.limit, 1, [4, 3]);
      line(ctx, [0, tMax], [-phys.maxV, -phys.maxV], X, YV, COLORS.limit, 1, [4, 3]);
      line(ctx, result.t, result.v, X, YV, COLORS.volts, 1.6);
      // legend
      ctx.font = "10px ui-monospace, Consolas, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "top";
      var lx = w - R - 4, ly = top0 + 3;
      [["measured", COLORS.meas], [useProfile ? "profile" : "target", COLORS.goal]].concat(ghost ? [["before", "rgba(170,185,210,0.7)"]] : []).forEach(function (it) {
        ctx.fillStyle = it[1]; ctx.fillText(it[0], lx, ly); ly += 12;
      });
    }

    function drawScope() {
      var f = fitCanvas(scopeCanvas), ctx = f.ctx, w = f.w, h = f.h;
      ctx.clearRect(0, 0, w, h);
      var L = 40, R = 6, T = 6, B = 16, gap = 10;
      var hTop = (h - T - B - gap) * 0.6, hBot = (h - T - B - gap) - hTop;
      var top0 = T, top1 = T + hTop, bot0 = top1 + gap, bot1 = bot0 + hBot;
      var now = liveSim.t, t0 = now - BUF_S;
      var X = function (t) { return L + (w - L - R) * (t - t0) / BUF_S; };
      var lo = mech.barMin, hi = mech.barMax;
      buf.forEach(function (s) { lo = Math.min(lo, s.y, s.goal); hi = Math.max(hi, s.y, s.goal); });
      var pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
      var Y = function (v) { return top1 - (v - lo) / (hi - lo) * hTop; };
      grid(ctx, L, w - R, top0, top1, [], niceTicks(lo, hi, 3), X, Y, mech.unit, null);
      var ts = buf.map(function (s) { return s.t; });
      function series(k) { return buf.map(function (s) { return s[k]; }); }
      if (show.goal) { line(ctx, ts, series("goal"), X, Y, COLORS.goal, 1, [5, 4]); if (useProfile) line(ctx, ts, series("sp"), X, Y, COLORS.goal, 1.4); }
      if (show.meas) line(ctx, ts, series("y"), X, Y, COLORS.meas, 2);
      var vm = phys.maxV;
      buf.forEach(function (s) { ["P", "I", "D", "FF"].forEach(function (k) { if (show[k]) vm = Math.max(vm, Math.abs(s[k])); }); });
      vm = Math.min(vm * 1.1, 40);
      var YV = function (v) { return bot0 + hBot / 2 - clamp(v, -vm, vm) / vm * hBot / 2; };
      grid(ctx, L, w - R, bot0, bot1, [], [-phys.maxV, 0, phys.maxV], X, YV, "V", null);
      ["FF", "D", "I", "P"].forEach(function (k) { if (show[k]) line(ctx, ts, series(k), X, YV, COLORS[k], 1.2); });
      if (show.volts) line(ctx, ts, series("v"), X, YV, COLORS.volts, 1.8);
      ctx.fillStyle = COLORS.text; ctx.font = "10px ui-monospace, Consolas, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillText("last 6 s", w - R, bot1 + 3);
    }

    function drawMech() {
      var f = fitCanvas(mechCanvas), ctx = f.ctx, w = f.w, h = f.h;
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.36;
      var s = liveSim;
      if (mech.kind === "velocity" || mechKey === "wheel") {
        var ang = s.x * Math.PI * 2;
        var speed = Math.abs(s.v);
        // blur trail when spinning fast
        if (mech.kind === "velocity" && speed > 0.5) {
          var trail = Math.min(Math.PI * 1.2, speed * 0.06 * (mechKey === "flywheel" ? 0.25 : 1));
          ctx.strokeStyle = "rgba(90,176,255,0.25)"; ctx.lineWidth = r * 0.22;
          ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, ang - trail - Math.PI / 2, ang - Math.PI / 2); ctx.stroke();
        }
        // tire
        ctx.fillStyle = "#1b2436"; ctx.strokeStyle = "#3a4867"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#0b0f18"; ctx.lineWidth = r * 0.16;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2); ctx.stroke();
        // spokes
        for (var k = 0; k < 5; k++) {
          var a = ang + k * Math.PI * 2 / 5 - Math.PI / 2;
          ctx.strokeStyle = k === 0 ? COLORS.meas : "#56648a"; ctx.lineWidth = k === 0 ? 4 : 3; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.16);
          ctx.lineTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78); ctx.stroke();
        }
        ctx.fillStyle = "#c7c7c6"; ctx.beginPath(); ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2); ctx.fill();
        if (mechKey === "wheel") {
          // target marker: where the blue spoke should point
          var ga = s.goal * Math.PI * 2 - Math.PI / 2;
          ctx.fillStyle = COLORS.goal;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ga) * (r + 3), cy + Math.sin(ga) * (r + 3));
          ctx.lineTo(cx + Math.cos(ga - 0.12) * (r + 14), cy + Math.sin(ga - 0.12) * (r + 14));
          ctx.lineTo(cx + Math.cos(ga + 0.12) * (r + 14), cy + Math.sin(ga + 0.12) * (r + 14));
          ctx.fill();
        }
        if (s.extraFriction > 0) {
          ctx.fillStyle = "rgba(255,159,67,0.85)";
          ctx.fillRect(cx + r * 0.75, cy - r * 0.35, r * 0.35, r * 0.7);
          ctx.fillStyle = "#0f1522"; ctx.font = "bold 10px ui-monospace, Consolas, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.save(); ctx.translate(cx + r * 0.925, cy); ctx.rotate(Math.PI / 2); ctx.fillText("CLOTH", 0, 0); ctx.restore();
        }
      } else if (mechKey === "elevator") {
        var lim = mech.limits, y0 = h - 14, y1 = 14;
        var YE = function (v) { return y0 - (v - lim[0]) / (lim[1] - lim[0]) * (y0 - y1); };
        ctx.strokeStyle = "#56648a"; ctx.lineWidth = 6; ctx.lineCap = "butt";
        ctx.beginPath(); ctx.moveTo(cx - 34, y0 + 8); ctx.lineTo(cx - 34, y1 - 6); ctx.moveTo(cx + 34, y0 + 8); ctx.lineTo(cx + 34, y1 - 6); ctx.stroke();
        ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
        for (var q = 0; q <= 1.25; q += 0.25) {
          ctx.beginPath(); ctx.moveTo(cx + 42, YE(q)); ctx.lineTo(cx + 50, YE(q)); ctx.stroke();
          ctx.fillStyle = COLORS.text; ctx.font = "9px ui-monospace, Consolas, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText(q.toFixed(2), cx + 52, YE(q));
        }
        // target
        ctx.strokeStyle = COLORS.goal; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - 50, YE(s.goal)); ctx.lineTo(cx + 44, YE(s.goal)); ctx.stroke(); ctx.setLineDash([]);
        if (useProfile) { ctx.fillStyle = COLORS.goal; ctx.beginPath(); ctx.arc(cx - 50, YE(s.sp), 4, 0, Math.PI * 2); ctx.fill(); }
        // carriage
        var cyE = YE(s.x);
        ctx.fillStyle = "#33499b"; ctx.strokeStyle = COLORS.meas; ctx.lineWidth = 2;
        ctx.fillRect(cx - 30, cyE - 12, 60, 24); ctx.strokeRect(cx - 30, cyE - 12, 60, 24);
        ctx.fillStyle = COLORS.bright; ctx.font = "bold 10px ui-monospace, Consolas, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("4674", cx, cyE);
      } else if (mechKey === "arm") {
        var px = cx - r * 0.2, py = cy + r * 0.15, len = r * 1.15;
        // range arc
        ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, py, len + 8, -mech.limits[1] * Math.PI / 180, -mech.limits[0] * Math.PI / 180); ctx.stroke();
        // target ghost
        var gA = -s.goal * Math.PI / 180;
        ctx.strokeStyle = COLORS.goal; ctx.setLineDash([6, 4]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(gA) * len, py + Math.sin(gA) * len); ctx.stroke(); ctx.setLineDash([]);
        // arm
        var aA = -s.x * Math.PI / 180;
        ctx.strokeStyle = COLORS.meas; ctx.lineWidth = 10; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(aA) * len, py + Math.sin(aA) * len); ctx.stroke();
        ctx.fillStyle = "#33499b"; ctx.beginPath(); ctx.arc(px + Math.cos(aA) * len, py + Math.sin(aA) * len, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c7c7c6"; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
        // tower
        ctx.strokeStyle = "#56648a"; ctx.lineWidth = 6; ctx.lineCap = "butt";
        ctx.beginPath(); ctx.moveTo(px, py + 6); ctx.lineTo(px, h - 6); ctx.stroke();
      }
    }

    function updateLiveReadouts() {
      var s = liveSim, u = mech.unit;
      readout.innerHTML = "";
      [["Target", s.goal, "pl-c-goal"], ["Measured", s.measured(), "pl-c-meas"], ["Error", s.goal - s.measured(), "pl-c-err"]].forEach(function (p) {
        var d = el("div", "pl-ro");
        d.appendChild(el("span", "pl-ro-name", p[0]));
        d.appendChild(el("span", "pl-ro-val " + p[2], fmt(p[1], u === "m" ? 3 : u === "°" ? 1 : 2) + (u === "°" ? "°" : " " + u)));
        readout.appendChild(d);
      });
      var vf = s.volts / phys.maxV;
      voltM.fill.style.left = vf >= 0 ? "50%" : (50 + vf * 50) + "%";
      voltM.fill.style.width = Math.abs(vf) * 50 + "%";
      voltM.fill.style.background = COLORS.volts;
      voltM.val.textContent = fmt(s.volts, 1) + " V";
      var af = clamp(Math.abs(s.amps) / mech.stallA, 0, 1);
      ampM.fill.style.left = "0"; ampM.fill.style.width = af * 100 + "%";
      ampM.fill.style.background = af > 0.5 ? COLORS.peak : af > 0.25 ? "#ffc04d" : COLORS.settle;
      ampM.val.textContent = fmt(Math.abs(s.amps), 0) + " A";
      var hf = clamp(s.heat, 0, 1);
      heatM.fill.style.left = "0"; heatM.fill.style.width = hf * 100 + "%";
      heatM.fill.style.background = hf > 0.6 ? COLORS.peak : hf > 0.3 ? "#ffc04d" : COLORS.settle;
      heatM.val.textContent = hf > 0.6 ? "HOT" : hf > 0.3 ? "Warm" : "OK";
      heatM.box.classList.toggle("is-hot", hf > 0.6);
      // setpoint bar
      function pct(v) { return clamp((v - mech.barMin) / (mech.barMax - mech.barMin), 0, 1) * 100 + "%"; }
      barGoal.style.left = pct(s.goal);
      barMeas.style.left = pct(s.measured());
      barTrack.setAttribute("aria-valuenow", String(+s.goal.toFixed(3)));
      barTrack.setAttribute("aria-valuetext", fmt(s.goal) + " " + mech.unitLong);
    }

    function frame(ts) {
      requestAnimationFrame(frame);
      if (!visible) { lastT = null; return; }
      var dt = lastT === null ? 0 : Math.min(0.05, (ts - lastT) / 1000);
      lastT = ts;
      if (!paused && dt > 0) {
        var steps = Math.round(dt / DT_PHYS);
        for (var i = 0; i < steps; i++) {
          liveSim.advance(DT_PHYS);
          sampleTimer += DT_PHYS;
          if (sampleTimer >= DT_CTRL) {
            sampleTimer -= DT_CTRL;
            buf.push({ t: liveSim.t, y: liveSim.measured(), goal: liveSim.goal, sp: liveSim.sp, v: liveSim.volts,
              P: liveSim.terms.P, I: liveSim.terms.I, D: liveSim.terms.D, FF: liveSim.terms.FF });
          }
        }
        while (buf.length && buf[0].t < liveSim.t - BUF_S) buf.shift();
      }
      drawMech(); drawScope(); updateLiveReadouts();
    }

    // ---- Interactions
    function goalFromBar(clientX) {
      var r = barTrack.getBoundingClientRect();
      var v = mech.barMin + clamp((clientX - r.left) / r.width, 0, 1) * (mech.barMax - mech.barMin);
      var stepSize = mech.unit === "m" ? 0.01 : mech.unit === "°" ? 1 : mech.kind === "velocity" && mech.barMax > 20 ? 1 : 0.1;
      liveSim.setGoal(Math.round(v / stepSize) * stepSize);
    }
    var barDrag = false;
    barTrack.addEventListener("pointerdown", function (e) { barDrag = true; barTrack.setPointerCapture(e.pointerId); goalFromBar(e.clientX); e.preventDefault(); });
    barTrack.addEventListener("pointermove", function (e) { if (barDrag) goalFromBar(e.clientX); });
    barTrack.addEventListener("pointerup", function () { barDrag = false; });
    barTrack.addEventListener("pointercancel", function () { barDrag = false; });
    barTrack.addEventListener("keydown", function (e) {
      var span = mech.barMax - mech.barMin, d = span / (e.shiftKey ? 200 : 40);
      if (e.key === "ArrowRight" || e.key === "ArrowUp") liveSim.setGoal(liveSim.goal + d);
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") liveSim.setGoal(liveSim.goal - d);
      else return;
      e.preventDefault();
    });
    // drag directly on the elevator or arm
    var mechDrag = false;
    function goalFromMech(e) {
      var r = mechCanvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (mechKey === "elevator") {
        var lim = mech.limits, y0 = r.height - 14, y1 = 14;
        liveSim.setGoal(Math.round((lim[0] + (y0 - y) / (y0 - y1) * (lim[1] - lim[0])) * 100) / 100);
      } else if (mechKey === "arm") {
        var rr = Math.min(r.width, r.height) * 0.36, px = r.width / 2 - rr * 0.2, py = r.height / 2 + rr * 0.15;
        var deg = -Math.atan2(y - py, x - px) * 180 / Math.PI;
        if (deg < -90) deg += 360;
        liveSim.setGoal(Math.round(deg));
      }
    }
    if (mechKey === "elevator" || mechKey === "arm") {
      mechCanvas.classList.add("is-draggable");
      mechCanvas.addEventListener("pointerdown", function (e) { mechDrag = true; mechCanvas.setPointerCapture(e.pointerId); goalFromMech(e); e.preventDefault(); });
      mechCanvas.addEventListener("pointermove", function (e) { if (mechDrag) goalFromMech(e); });
      mechCanvas.addEventListener("pointerup", function () { mechDrag = false; });
      mechCanvas.addEventListener("pointercancel", function () { mechDrag = false; });
    }
    if (mechKey === "wheel" || mechKey === "wheelspeed") {
      var on = function (e) { liveSim.extraFriction = 1.2; disturbBtn.classList.add("is-active"); e.preventDefault(); };
      var off = function () { liveSim.extraFriction = 0; disturbBtn.classList.remove("is-active"); };
      disturbBtn.addEventListener("pointerdown", on);
      disturbBtn.addEventListener("pointerup", off); disturbBtn.addEventListener("pointerleave", off); disturbBtn.addEventListener("pointercancel", off);
      disturbBtn.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") on(e); });
      disturbBtn.addEventListener("keyup", off);
    } else {
      disturbBtn.addEventListener("click", function () {
        if (mechKey === "flywheel") liveSim.v *= 0.7;
        else if (mechKey === "elevator") liveSim.v -= 0.8;
        else liveSim.v -= 200;
      });
    }
    pauseBtn.addEventListener("click", function () {
      paused = !paused; pauseBtn.textContent = paused ? "Play" : "Pause";
      pauseBtn.classList.toggle("is-active", paused);
    });
    restartBtn.addEventListener("click", function () {
      liveSim.reset(startPos); buf = []; sampleTimer = 0;
      liveSim.setGoal(mech.goal);
    });
    resetAll.addEventListener("click", function () {
      Object.keys(defaults).forEach(function (k) { gains[k] = defaults[k]; });
      knobs.forEach(function (k) { k.set(defaults[k.key], true); });
      sliders.forEach(function (s) { s.set(physDefaults[s.key]); });
      ghost = null; result = null;
      recompute();
    });

    // start the live view the first time it scrolls into view
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !started) { started = true; liveSim.setGoal(mech.goal); }
      }, { threshold: 0.15 }).observe(live);
    } else { visible = true; started = true; liveSim.setGoal(mech.goal); }
    if ("ResizeObserver" in window) new ResizeObserver(function () { drawStep(); }).observe(stepCanvas);
    window.addEventListener("resize", drawStep);
    document.addEventListener("themechange", drawStep);

    recompute();
    requestAnimationFrame(frame);
  }

  function init() {
    var nodes = document.querySelectorAll(".pidlab:not(.pl-ready)");
    for (var i = 0; i < nodes.length; i++) {
      try { new PIDLab(nodes[i]); } catch (e) { nodes[i].textContent = "The simulator couldn't start: " + e.message; }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
