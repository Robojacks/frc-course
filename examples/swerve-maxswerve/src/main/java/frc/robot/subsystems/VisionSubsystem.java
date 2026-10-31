// RoboJacks 4674 FRC Programming Course: finished code for Lesson 21.1.
// Built from REV Robotics' MAXSwerve Java Template (BSD 3-Clause, see REV-LICENSE.txt) and the team's copy.

package frc.robot.subsystems;

import java.util.Optional;

import org.photonvision.PhotonCamera;
import org.photonvision.PhotonUtils;
import org.photonvision.targeting.PhotonPipelineResult;
import org.photonvision.targeting.PhotonTrackedTarget;

import edu.wpi.first.apriltag.AprilTagFieldLayout;
import edu.wpi.first.apriltag.AprilTagFields;
import edu.wpi.first.math.VecBuilder;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Pose3d;
import edu.wpi.first.math.geometry.Rotation3d;
import edu.wpi.first.math.geometry.Transform3d;
import edu.wpi.first.math.geometry.Translation3d;
import edu.wpi.first.math.util.Units;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

import frc.robot.telemetry.Telemetry;
import frc.robot.telemetry.TelemetryTable;

public class VisionSubsystem extends SubsystemBase {
  // Ignore a tag when PhotonVision is less sure than this about its 3D pose (0 = sure)
  private static final double kMaxAmbiguity = 0.15;

  private final DriveSubsystem m_drive;   // vision measurements go to its pose estimator
  private final TelemetryTable m_telemetry = Telemetry.getTable("Vision");

  // Where every AprilTag is on this season's field
  private final AprilTagFieldLayout m_fieldLayout =
      AprilTagFieldLayout.loadField(AprilTagFields.k2026RebuiltWelded);

  // The camera, by its nickname in the PhotonVision web page
  private final PhotonCamera m_frontCamera = new PhotonCamera("frontCamera");

  // Where the front camera is mounted. Measure your real robot!
  private final Transform3d m_robotToFrontCamera = new Transform3d(
      new Translation3d(Units.inchesToMeters(14), 0, Units.inchesToMeters(8)),
      new Rotation3d(0, Units.degreesToRadians(-10), 0));

  // The newest frame from the front camera, for aiming (it may have no targets)
  private PhotonPipelineResult m_latestFront = new PhotonPipelineResult();

  public VisionSubsystem(DriveSubsystem drive) {
    m_drive = drive;
  }

  @Override
  public void periodic() {
    PhotonPipelineResult newest = updateCamera("Front", m_frontCamera, m_robotToFrontCamera);
    if (newest != null) {
      m_latestFront = newest;   // keep the newest frame for aiming
    }
    // A second camera is one more line: updateCamera("Back", m_backCamera, m_robotToBackCamera);
  }

  /**
   * Reads every new frame from one camera and sends good robot poses to the drive subsystem.
   * Returns the newest frame, or null if there were no new frames.
   */
  private PhotonPipelineResult updateCamera(String name, PhotonCamera camera, Transform3d robotToCamera) {
    int used = 0;
    PhotonPipelineResult newest = null;
    for (PhotonPipelineResult result : camera.getAllUnreadResults()) {
      newest = result;
      if (!result.hasTargets()) {
        continue;   // no tags in this frame
      }
      PhotonTrackedTarget target = result.getBestTarget();

      // Where is this tag on the field? (Empty if it's not one of this year's tags.)
      Optional<Pose3d> tagPose = m_fieldLayout.getTagPose(target.getFiducialId());
      if (tagPose.isEmpty() || target.getPoseAmbiguity() > kMaxAmbiguity) {
        continue;   // unknown tag, or PhotonVision isn't sure: skip it
      }

      // Tag seen from the camera + tag on the field + camera on the robot = robot on the field
      Pose2d robotPose = PhotonUtils.estimateFieldToRobotAprilTag(
          target.getBestCameraToTarget(), tagPose.get(), robotToCamera.inverse())
          .toPose2d();

      // Trust it less the farther away the tag is: about 0.1 at 1.2 m, 0.6 at 3 m, 1.1 at 4 m
      double distance = PhotonUtils.getDistanceToPose(robotPose, tagPose.get().toPose2d());
      double stdDev = 0.07 * distance * distance;

      m_drive.addVisionMeasurement(robotPose, result.getTimestampSeconds(),
          VecBuilder.fill(stdDev, stdDev, stdDev));

      used++;
      m_telemetry.log(name + "/Pose", robotPose);           // for AdvantageScope's field view
      m_telemetry.log(name + "/Tag ID", target.getFiducialId());
      m_telemetry.log(name + "/Distance (m)", distance);
    }
    m_telemetry.log(name + "/Connected", camera.isConnected());
    m_telemetry.log(name + "/Measurements Used", used);
    return newest;
  }
}
