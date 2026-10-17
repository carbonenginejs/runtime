// Source: trinity/trinity/Eve/Turret/EveTurretSet.h:323-347
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec4 } from "#math/vec4";
import { type, blue } from "#schema";
import { Tr2ConstantBufferAL } from "#trinityal";

/**
 * Carbon EveTurretSet::SingleTurretData: one turret of the set - its
 * placement, world matrix, animation sequencer and pose, and ray-tracing
 * data - kept in m_singleTurrets. Carbon fills a new one in SetLocalTransform
 * (EveTurretSet.cpp:1713-1729) before it is placed.
 */
@blue.define({ className: "EveTurretSetSingleTurretData", donors: [ "EveTurretSet::SingleTurretData" ] })
export class EveTurretSetSingleTurretData
{

  /** valid (bool). Carbon leaves it unset. */
  @type.boolean
  valid = false;

  /** visible (bool). Carbon leaves it unset. */
  @type.boolean
  visible = false;

  /** localPosition (Vector4). Carbon leaves it unset. */
  @type.vec4
  localPosition = vec4.create();

  /** localQuaternion (Quaternion). Carbon leaves it unset. */
  @type.quat
  localQuaternion = quat.create();

  /** localMatrix (Matrix). Carbon leaves it unset. */
  @type.mat4
  localMatrix = mat4.create();

  /** worldMatrix (Matrix). Carbon leaves it unset. */
  @type.mat4
  worldMatrix = mat4.create();

  /** grnSkeleton (granny_skeleton*, WITH_GRANNY only). JS samples Granny through the sequencer, so nothing sets it. */
  @type.rawStruct("granny_skeleton")
  grnSkeleton = null;

  /** grnModelInstance (granny_model_instance*, WITH_GRANNY only). JS samples Granny through the sequencer, so nothing sets it. */
  @type.rawStruct("granny_model_instance")
  grnModelInstance = null;

  /** grnLocalPose (granny_local_pose*, WITH_GRANNY only). JS samples Granny through the sequencer, so nothing sets it. */
  @type.rawStruct("granny_local_pose")
  grnLocalPose = null;

  /** grnWorldPose (granny_world_pose*, WITH_GRANNY only). JS samples Granny through the sequencer, so nothing sets it. */
  @type.rawStruct("granny_world_pose")
  grnWorldPose = null;

  /**
   * sequencer (std::unique_ptr<cmf::AnimationSequencer>). Ours holds the
   * Tr2GrannyAnimation that EveTurretSet.InitializeAnimation attaches, which
   * samples both CMF and Granny resources.
   */
  @type.unknown
  sequencer = null;

  /**
   * pose (cmf::SkeletonPose). Carbon embeds the pose by value; ours points at
   * the pose the sequencer owns, so it stays null until
   * EveTurretSet.InitializeAnimation attaches a sequencer.
   */
  @type.unknown
  pose = null;

  /**
   * worldTransforms (std::vector<Matrix>). EveTurretSet.InitializeAnimation
   * replaces it with the sequencer's own animation transforms.
   */
  @type.array("mat4")
  worldTransforms = [];

  /** rtMesh (std::unique_ptr<Tr2RaytracingMesh>) */
  @type.root("Tr2RaytracingMesh")
  rtMesh = null;

  /** rtMeshArea (std::unique_ptr<Tr2RaytracingMeshArea>) */
  @type.root("Tr2RaytracingMeshArea")
  rtMeshArea = null;

  /** rtPerObjectData (mutable Tr2ConstantBufferAL) */
  @type.rawStruct("Tr2ConstantBufferAL")
  rtPerObjectData = new Tr2ConstantBufferAL();

}
