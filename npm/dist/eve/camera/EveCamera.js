import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat, fromYawPitchRoll } from '@carbonenginejs/runtime-utils/quat';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { Tr2CurveScalar as _Tr2CurveScalar } from '../../curves/curves/Tr2CurveScalar.js';
import { Tr2CurveInterpolation, Tr2CurveTangentType } from '../../curves/enums.js';
import { TriProjection as _TriProjection } from '../../core/view/TriProjection.js';
import { TriView as _TriView } from '../../core/view/TriView.js';

let _initStatic, _initProto, _initClass, _init_errorHandler, _init_extra_errorHandler, _init_noiseScale, _init_extra_noiseScale, _init_audio2Listener, _init_extra_audio2Listener, _init_noise, _init_extra_noise, _init_centerOffset, _init_extra_centerOffset, _init_pitch, _init_extra_pitch, _init_yaw, _init_extra_yaw, _init_extraTranslation, _init_extra_extraTranslation, _init_idleSpeed, _init_extra_idleSpeed, _init_noiseDamp, _init_extra_noiseDamp, _init_pos, _init_extra_pos, _init_intr, _init_extra_intr, _init_viewVec, _init_extra_viewVec, _init_rightVec, _init_extra_rightVec, _init_upVec, _init_extra_upVec, _init_rotationAroundParent, _init_extra_rotationAroundParent, _init_interest, _init_extra_interest, _init_rotationOfInterest, _init_extra_rotationOfInterest, _init_fieldOfView, _init_extra_fieldOfView, _init_frontClip, _init_extra_frontClip, _init_backClip, _init_extra_backClip, _init_friction, _init_extra_friction, _init_noiseCurve, _init_extra_noiseCurve, _init_noiseScaleCurve, _init_extra_noiseScaleCurve, _init_noiseDampCurve, _init_extra_noiseDampCurve, _init_maxSpeed, _init_extra_maxSpeed, _init_update, _init_extra_update, _init_zoomCurve, _init_extra_zoomCurve, _init_translationFromParent, _init_extra_translationFromParent, _init_minPitch, _init_extra_minPitch, _init_maxPitch, _init_extra_maxPitch, _init_minYaw, _init_extra_minYaw, _init_maxYaw, _init_extra_maxYaw, _init_parent, _init_extra_parent, _init_idleScale, _init_extra_idleScale, _init_alignment, _init_extra_alignment, _init_useExtraTranslation, _init_extra_useExtraTranslation, _init_projectionMatrix, _init_extra_projectionMatrix, _init_viewMatrix, _init_extra_viewMatrix, _init_idleMove, _init_extra_idleMove;
function createDefaultZoomCurve() {
  const curve = new _Tr2CurveScalar();
  curve.AddKey(0, Math.PI / 2, Tr2CurveInterpolation.HERMITE, 0, -11, Tr2CurveTangentType.FREE_SPLIT);
  curve.AddKey(0.225, 0.8, Tr2CurveInterpolation.HERMITE, 0, -9, Tr2CurveTangentType.FREE_SPLIT);
  curve.AddKey(0.45, 0.1, Tr2CurveInterpolation.HERMITE, 0, 20, Tr2CurveTangentType.FREE_SPLIT);
  curve.AddKey(0.675, Math.PI / 2, Tr2CurveInterpolation.HERMITE, 0, 0, Tr2CurveTangentType.FREE_SPLIT);
  return curve;
}
function cutoffYawPitch(value, speed) {
  return Math.abs(value - speed) < 0.0001 ? speed : value;
}
function isFiniteVector(value) {
  return Number.isFinite(value[0]) && Number.isFinite(value[1]) && Number.isFinite(value[2]);
}
function sampleVector(curve, time, out) {
  if (!curve) {
    return vec3.zero(out);
  }
  let result;
  if (typeof curve.GetValueAt === "function") result = curve.GetValueAt(time, out);else if (typeof curve.Update === "function") result = curve.Update(time, out);else if (typeof curve.UpdateValue === "function") result = curve.UpdateValue(time, out);else result = curve.value;
  if (result && result !== out && result.length >= 3) {
    vec3.copy(out, result);
  }
  return out;
}
function sampleScalar(curve, time) {
  if (!curve) return 0;
  if (typeof curve.Update === "function") return Number(curve.Update(time));
  if (typeof curve.GetValueAt === "function") return Number(curve.GetValueAt(time));
  if (typeof curve.GetValue === "function") return Number(curve.GetValue(time));
  return Number(curve.value ?? 0);
}
function quaternionToYawPitchRoll(out, value) {
  let y = 2 * (value[0] * value[3] - value[2] * value[1]);
  const w = Math.sqrt(Math.max(1 - y * y, 0));
  const gamma = Math.SQRT1_2 / Math.sqrt(w + 1);
  y = Math.max(-1, Math.min(1, y));
  out[1] = Math.asin(y);
  const pitchX = y * gamma;
  const pitchW = (w + 1) * gamma;
  if (Math.abs(Math.abs(y) - 1) < 0.00001) {
    const combinedZ = value[2] * pitchW - value[1] * pitchX;
    const combinedW = value[3] * pitchW + value[0] * pitchX;
    let roll = 2 * Math.acos(Math.max(-1, Math.min(1, combinedW)));
    if (roll > Math.PI) roll -= Math.PI * 2;
    if (combinedZ > 0) roll = -roll;
    out[0] = 0;
    out[2] = -roll;
    return out;
  }
  const denominator = 1 / (pitchX * pitchX - pitchW * pitchW);
  const yawRollX = (value[3] * pitchX - value[0] * pitchW) * denominator;
  let yawRollY = -(value[2] * pitchX + value[1] * pitchW) * denominator;
  const yawRollZ = -(value[2] * pitchW + value[1] * pitchX) * denominator;
  let yawRollW = (value[0] * pitchX - value[3] * pitchW) * denominator;
  const divisor = Math.sqrt(yawRollW * yawRollW + yawRollZ * yawRollZ);
  const rollGamma = divisor === 0 ? 0 : 1 / divisor;
  const rollConW = Math.max(-1, Math.min(1, yawRollW * rollGamma));
  let roll = 2 * Math.acos(rollConW);
  if (roll > Math.PI) roll -= Math.PI * 2;
  if (yawRollZ < 0) roll = -roll;
  yawRollY = (yawRollX * yawRollZ + yawRollY * yawRollW) * rollGamma;
  yawRollW = (yawRollZ * yawRollZ + yawRollW * yawRollW) * rollGamma;
  let yaw = Math.asin(Math.max(-1, Math.min(1, yawRollY)));
  if (yawRollW < 0) yaw = Math.PI - yaw;
  if (yaw < 0) yaw += Math.PI;
  out[0] = yaw * 2;
  out[2] = roll;
  return out;
}
function writePerspectiveOffCenter(out, left, right, bottom, top, near, far) {
  out.fill(0);
  out[0] = 2 * near / (right - left);
  out[5] = -2 * near / (bottom - top);
  out[8] = 1 + 2 * left / (right - left);
  out[9] = -1 - 2 * top / (bottom - top);
  out[10] = far / (near - far);
  out[11] = -1;
  out[14] = near * far / (near - far);
  return out;
}
const CAMERA_PARENT_POSITION = vec3.create();
const CAMERA_TRANSLATION = vec3.create();
const CAMERA_POSITION = vec3.create();
const CAMERA_INTEREST = vec3.create();
const CAMERA_TO_INTEREST = vec3.create();
const CAMERA_EXTENDED_INTEREST = vec3.create();
const CAMERA_SIDE = vec3.create();
const CAMERA_UP = vec3.create();
const CAMERA_TRACK_POSITION = vec3.create();
const CAMERA_TRACK_LOCAL = vec3.create();
const CAMERA_REAL_UP = vec3.create();
const CAMERA_LOOK_AT_LENGTH = vec3.create();
const CAMERA_VIEW = mat4.create();
const CAMERA_INTEREST_VIEW = mat4.create();
const CAMERA_INTEREST_ROTATION = mat4.create();
const CAMERA_INVERSE_ROTATION = quat.create();
const CAMERA_YAW_PITCH_ROLL = new Float64Array(3);

/** Carbon's orbit camera and its CPU-side view/projection state. */
let _EveCamera;
new class extends _identity {
  static [class EveCamera extends CjsModel {
    static {
      ({
        e: [_init_errorHandler, _init_extra_errorHandler, _init_noiseScale, _init_extra_noiseScale, _init_audio2Listener, _init_extra_audio2Listener, _init_noise, _init_extra_noise, _init_centerOffset, _init_extra_centerOffset, _init_pitch, _init_extra_pitch, _init_yaw, _init_extra_yaw, _init_extraTranslation, _init_extra_extraTranslation, _init_idleSpeed, _init_extra_idleSpeed, _init_noiseDamp, _init_extra_noiseDamp, _init_pos, _init_extra_pos, _init_intr, _init_extra_intr, _init_viewVec, _init_extra_viewVec, _init_rightVec, _init_extra_rightVec, _init_upVec, _init_extra_upVec, _init_rotationAroundParent, _init_extra_rotationAroundParent, _init_interest, _init_extra_interest, _init_rotationOfInterest, _init_extra_rotationOfInterest, _init_fieldOfView, _init_extra_fieldOfView, _init_frontClip, _init_extra_frontClip, _init_backClip, _init_extra_backClip, _init_friction, _init_extra_friction, _init_noiseCurve, _init_extra_noiseCurve, _init_noiseScaleCurve, _init_extra_noiseScaleCurve, _init_noiseDampCurve, _init_extra_noiseDampCurve, _init_maxSpeed, _init_extra_maxSpeed, _init_update, _init_extra_update, _init_zoomCurve, _init_extra_zoomCurve, _init_translationFromParent, _init_extra_translationFromParent, _init_minPitch, _init_extra_minPitch, _init_maxPitch, _init_extra_maxPitch, _init_minYaw, _init_extra_minYaw, _init_maxYaw, _init_extra_maxYaw, _init_parent, _init_extra_parent, _init_idleScale, _init_extra_idleScale, _init_alignment, _init_extra_alignment, _init_useExtraTranslation, _init_extra_useExtraTranslation, _init_projectionMatrix, _init_extra_projectionMatrix, _init_viewMatrix, _init_extra_viewMatrix, _init_idleMove, _init_extra_idleMove, _initProto, _initStatic],
        c: [_EveCamera, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveCamera",
        family: "eve"
      })], [[[io, io.readwrite, void 0, type.objectRef("IBlueEventListener")], 16, "errorHandler"], [[io, io.persist, type, type.float32], 16, "noiseScale"], [[io, io.readwrite, void 0, type.objectRef("IBluePlacementObserver")], 16, "audio2Listener"], [[io, io.persist, type, type.boolean], 16, "noise"], [[io, io.readwrite, type, type.float32], 16, "centerOffset"], [[io, io.persist, type, type.float32], 16, "pitch"], [[io, io.persist, type, type.float32], 16, "yaw"], [[io, io.readwrite, type, type.vec3], 16, "extraTranslation"], [[io, io.persist, type, type.float32], 16, "idleSpeed"], [[io, io.persist, type, type.float32], 16, "noiseDamp"], [[io, io.persist, type, type.vec3], 16, "pos"], [[io, io.persist, type, type.vec3], 16, "intr"], [[io, io.read, type, type.vec3], 16, "viewVec"], [[io, io.read, type, type.vec3], 16, "rightVec"], [[io, io.read, type, type.vec3], 16, "upVec"], [[io, io.notify, io, io.persist, type, type.quat], 16, "rotationAroundParent"], [[io, io.notify, io, io.readwrite, void 0, type.objectRef("ITriVectorFunction")], 16, "interest"], [[io, io.notify, io, io.persist, type, type.quat], 16, "rotationOfInterest"], [[io, io.persist, type, type.float32], 16, "fieldOfView"], [[io, io.persist, type, type.float32], 16, "frontClip"], [[io, io.persist, type, type.float32], 16, "backClip"], [[io, io.persist, type, type.float32], 16, "friction"], [[io, io.persist, void 0, type.model("ITriScalarFunction")], 16, "noiseCurve"], [[io, io.persist, void 0, type.model("ITriScalarFunction")], 16, "noiseScaleCurve"], [[io, io.persist, void 0, type.model("ITriScalarFunction")], 16, "noiseDampCurve"], [[io, io.persist, type, type.float32], 16, "maxSpeed"], [[io, io.persist, type, type.boolean], 16, "update"], [[io, io.persist, void 0, type.model("ITriScalarFunction")], 16, "zoomCurve"], [[io, io.persist, type, type.float32], 16, "translationFromParent"], [[io, io.persist, type, type.float32], 16, "minPitch"], [[io, io.persist, type, type.float32], 16, "maxPitch"], [[io, io.persist, type, type.float32], 16, "minYaw"], [[io, io.persist, type, type.float32], 16, "maxYaw"], [[io, io.readwrite, void 0, type.objectRef("ITriVectorFunction")], 16, "parent"], [[io, io.persist, type, type.float32], 16, "idleScale"], [[io, io.persist, type, type.vec3], 16, "alignment"], [[io, io.readwrite, type, type.boolean], 16, "useExtraTranslation"], [[io, io.readwrite, void 0, type.objectRef("TriProjection")], 16, "projectionMatrix"], [[io, io.read, void 0, type.objectRef("TriView")], 16, "viewMatrix"], [[io, io.persist, type, type.boolean], 16, "idleMove"], [[carbon, carbon.method, impl, impl.implemented], 26, "CalculateProjectionMatrix"], [[carbon, carbon.method, impl, impl.implemented], 26, "CalculateFovFromProjection"], [[carbon, carbon.method, impl, impl.implemented], 26, "ModifyClipPlanes"], [[carbon, carbon.method, impl, impl.implemented], 26, "AddCenterOffset"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetViewMatrix"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProjection"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "Dolly"], [[carbon, carbon.method, impl, impl.implemented], 18, "OrbitParent"], [[carbon, carbon.method, impl, impl.implemented], 18, "RotateOnOrbit"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Uses the runtime curve's portable key list; invalid external keys fail closed instead of indexing native memory.")], 18, "Zoom"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Receives Carbon's global device aspect ratio and real clock as optional arguments so the camera remains GPU- and platform-free.")], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Caches the last notified values because CjsModel's cooperative notification hook does not receive Carbon's Be::Var pointer.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetStartTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetOrbit"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetRotationOnOrbit"]], 0, void 0, CjsModel));
      _initStatic(this);
    }
    constructor(...args) {
      super(...args);
      _init_extra_idleMove(this);
    }
    #failedLastFrame = (_initProto(this), false);
    #idleTheta = 0;
    #lastInterest = null;
    #lastRotationAroundParent = quat.create();
    #maxNoise = 80;
    #noiseX = 0;
    #noiseY = 0;
    #pitchInt = 0;
    #pitchIntSpeed = 0;
    #pitchSpeed = 0;
    #startTime = 0;
    #time = 0;
    #trackInterest = false;
    #yawInt = 0;
    #yawIntSpeed = 0;
    #yawSpeed = 0;
    #zoomKey = 0;
    #zoomTime = 0;

    /** m_errorListener (IBlueEventListenerPtr) [READWRITE] */
    errorHandler = _init_errorHandler(this, null);

    /** m_noiseScale (float) [READWRITE, PERSIST] */
    noiseScale = (_init_extra_errorHandler(this), _init_noiseScale(this, 1));

    /** m_audio2Listener (IBluePlacementObserverPtr) [READWRITE] */
    audio2Listener = (_init_extra_noiseScale(this), _init_audio2Listener(this, null));

    /** m_noise (bool) [READWRITE, PERSIST] */
    noise = (_init_extra_audio2Listener(this), _init_noise(this, false));

    /** m_projectionCenterOffset (float) [READWRITE] */
    centerOffset = (_init_extra_noise(this), _init_centerOffset(this, 0));

    /** m_pitch (float) [READ, PERSIST] */
    pitch = (_init_extra_centerOffset(this), _init_pitch(this, 0));

    /** m_yaw (float) [READ, PERSIST] */
    yaw = (_init_extra_pitch(this), _init_yaw(this, 0));

    /** m_extraParentTranslation (Vector3) [READWRITE] */
    extraTranslation = (_init_extra_yaw(this), _init_extraTranslation(this, vec3.create()));

    /** m_idleSpeed (float) [READWRITE, PERSIST] */
    idleSpeed = (_init_extra_extraTranslation(this), _init_idleSpeed(this, 0.8));

    /** m_noiseDamp (float) [READWRITE, PERSIST] */
    noiseDamp = (_init_extra_idleSpeed(this), _init_noiseDamp(this, 1.1));

    /** m_pos (Vector3) [READ, PERSIST] */
    pos = (_init_extra_noiseDamp(this), _init_pos(this, vec3.create()));

    /** m_intr (Vector3) [READ, PERSIST] */
    intr = (_init_extra_pos(this), _init_intr(this, vec3.create()));

    /** m_viewVec (Vector3) [READ] */
    viewVec = (_init_extra_intr(this), _init_viewVec(this, vec3.create()));

    /** m_rightVec (Vector3) [READ] */
    rightVec = (_init_extra_viewVec(this), _init_rightVec(this, vec3.create()));

    /** m_upVec (Vector3) [READ] */
    upVec = (_init_extra_rightVec(this), _init_upVec(this, vec3.create()));

    /** m_rotationAroundParent (Quaternion) [READWRITE, NOTIFY, PERSIST] */
    rotationAroundParent = (_init_extra_upVec(this), _init_rotationAroundParent(this, quat.create()));

    /** m_interestTranslationCurve (ITriVectorFunctionPtr) [READWRITE, NOTIFY] */
    interest = (_init_extra_rotationAroundParent(this), _init_interest(this, null));

    /** m_rotationOfInterest (Quaternion) [READWRITE, PERSIST, NOTIFY] */
    rotationOfInterest = (_init_extra_interest(this), _init_rotationOfInterest(this, quat.create()));

    /** m_fieldOfView (float) [READWRITE, PERSIST] */
    fieldOfView = (_init_extra_rotationOfInterest(this), _init_fieldOfView(this, Math.PI / 2));

    /** m_frontClip (float) [READWRITE, PERSIST] */
    frontClip = (_init_extra_fieldOfView(this), _init_frontClip(this, 10));

    /** m_backClip (float) [READWRITE, PERSIST] */
    backClip = (_init_extra_frontClip(this), _init_backClip(this, 10000000));

    /** m_friction (float) [READWRITE, PERSIST] */
    friction = (_init_extra_backClip(this), _init_friction(this, 7));

    /** m_noiseCurve (ITriScalarFunctionPtr) [READWRITE, PERSIST] */
    noiseCurve = (_init_extra_friction(this), _init_noiseCurve(this, null));

    /** m_noiseScaleCurve (ITriScalarFunctionPtr) [READWRITE, PERSIST] */
    noiseScaleCurve = (_init_extra_noiseCurve(this), _init_noiseScaleCurve(this, null));

    /** m_noiseDampCurve (ITriScalarFunctionPtr) [READWRITE, PERSIST] */
    noiseDampCurve = (_init_extra_noiseScaleCurve(this), _init_noiseDampCurve(this, null));

    /** m_maxSpeed (float) [READWRITE, PERSIST] */
    maxSpeed = (_init_extra_noiseDampCurve(this), _init_maxSpeed(this, 0.05));

    /** m_update (bool) [READWRITE, PERSIST] */
    update = (_init_extra_maxSpeed(this), _init_update(this, true));

    /** m_zoomCurve (ITriScalarFunctionPtr) [READWRITE, PERSIST] */
    zoomCurve = (_init_extra_update(this), _init_zoomCurve(this, createDefaultZoomCurve()));

    /** Blue exposes m_translationFromParent.z, not the native Vector3. */
    translationFromParent = (_init_extra_zoomCurve(this), _init_translationFromParent(this, 20));

    /** m_minPitch (float) [READWRITE, PERSIST] */
    minPitch = (_init_extra_translationFromParent(this), _init_minPitch(this, -1.4));

    /** m_maxPitch (float) [READWRITE, PERSIST] */
    maxPitch = (_init_extra_minPitch(this), _init_maxPitch(this, 1.4));

    /** m_minYaw (float) [READWRITE, PERSIST] */
    minYaw = (_init_extra_maxPitch(this), _init_minYaw(this, 0));

    /** m_maxYaw (float) [READWRITE, PERSIST] */
    maxYaw = (_init_extra_minYaw(this), _init_maxYaw(this, 0));

    /** m_parentTranslationCurve (ITriVectorFunctionPtr) [READWRITE] */
    parent = (_init_extra_maxYaw(this), _init_parent(this, null));

    /** m_idleScale (float) [READWRITE, PERSIST] */
    idleScale = (_init_extra_parent(this), _init_idleScale(this, 2));

    /** m_alignment (Vector3) [READWRITE, PERSIST] */
    alignment = (_init_extra_idleScale(this), _init_alignment(this, vec3.fromValues(0, 1, 0)));

    /** m_useExtraParentTranslation (bool) [READWRITE] */
    useExtraTranslation = (_init_extra_alignment(this), _init_useExtraTranslation(this, false));

    /** m_projectionMatrix (TriProjectionPtr) [READWRITE] */
    projectionMatrix = (_init_extra_useExtraTranslation(this), _init_projectionMatrix(this, new _TriProjection()));

    /** m_viewMatrix (TriViewPtr) [READ] */
    viewMatrix = (_init_extra_projectionMatrix(this), _init_viewMatrix(this, new _TriView()));

    /** m_idleMove (bool) [READWRITE, PERSIST] */
    idleMove = (_init_extra_viewMatrix(this), _init_idleMove(this, false));

    /** Builds Carbon's aspect-clamped, off-centre projection matrix. */
    static CalculateProjectionMatrix(out, aspectRatio, fieldOfView, offsetX, offsetY, front, back, projection = null) {
      if (!aspectRatio || !Number.isFinite(aspectRatio)) aspectRatio = 1;
      if (!fieldOfView || !Number.isFinite(fieldOfView)) fieldOfView = 1;
      let halfWidth = aspectRatio * front * Math.tan(fieldOfView * 0.5);
      let halfHeight = front * Math.tan(fieldOfView * 0.5);
      if (aspectRatio > 1.6) {
        const adjustment = aspectRatio / 1.6;
        halfWidth /= adjustment;
        halfHeight /= adjustment;
      }
      const left = -halfWidth + halfWidth * offsetX;
      const right = halfWidth + halfWidth * offsetX;
      const top = halfHeight + halfHeight * offsetY;
      const bottom = -halfHeight + halfHeight * offsetY;
      writePerspectiveOffCenter(out, left, right, bottom, top, front, back);
      projection?.CustomProjection?.(out);
      return out;
    }

    /**
     * Recovers the vertical field of view in radians from a projection matrix
     * produced by CalculateProjectionMatrix, undoing the aspect clamp that method
     * applies above 1.6.
     */
    static CalculateFovFromProjection(transform) {
      const aspectRatio = transform[0] ? transform[5] / transform[0] : 0;
      const aspectAdjustment = aspectRatio > 1.6 ? aspectRatio / 1.6 : 1;
      return 2 * Math.atan(aspectAdjustment / transform[5]);
    }

    /**
     * Rebuilds a projection matrix with new near and far clip distances,
     * preserving the field of view, aspect ratio and centre offsets recovered from
     * the original.
     */
    static ModifyClipPlanes(original, nearClip, farClip, out = mat4.create()) {
      const aspectRatio = original[0] ? original[5] / original[0] : 0;
      const fieldOfView = _EveCamera.CalculateFovFromProjection(original);
      return _EveCamera.CalculateProjectionMatrix(out, aspectRatio, fieldOfView, original[8], original[9], nearClip, farClip);
    }

    /**
     * Rebuilds a projection matrix with extra normalized x and y centre offsets
     * added to those the original already carries, used to shift the view frustum
     * without moving the camera.
     */
    static AddCenterOffset(original, xOffset, yOffset, nearClip, farClip, out = mat4.create()) {
      const aspectRatio = original[0] ? original[5] / original[0] : 0;
      const fieldOfView = _EveCamera.CalculateFovFromProjection(original);
      return _EveCamera.CalculateProjectionMatrix(out, aspectRatio, fieldOfView, original[8] + xOffset, original[9] + yOffset, nearClip, farClip);
    }

    /**
     * Returns the camera's TriView wrapper, whose transform is rewritten by each
     * successful update; it is live storage, not a copy.
     */
    GetViewMatrix() {
      return this.viewMatrix;
    }

    /**
     * Returns the camera's TriProjection wrapper, whose transform is rebuilt from
     * the field of view and clip planes on each update.
     */
    GetProjection() {
      return this.projectionMatrix;
    }

    /**
     * Returns the world position resolved by the last update; the vector is the
     * camera's own storage and is overwritten next update.
     */
    GetPosition() {
      return this.pos;
    }

    /** Carbon method Dolly (MAP_METHOD_AND_WRAP). */
    Dolly(factor) {
      this.translationFromParent += factor;
    }

    /** Carbon method OrbitParent (MAP_METHOD_AND_WRAP). */
    OrbitParent(horizontal, vertical) {
      const oldYaw = this.#yawSpeed;
      const oldPitch = this.#pitchSpeed;
      this.#yawSpeed += this.maxSpeed * horizontal;
      this.#pitchSpeed -= this.maxSpeed * vertical;
      if (this.#pitchSpeed > this.maxPitch && this.#pitchSpeed - oldPitch < 0) {
        this.#pitchSpeed = this.maxPitch;
      } else if (this.#pitchSpeed < this.minPitch && oldPitch - this.#pitchSpeed < 0) {
        this.#pitchSpeed = this.minPitch;
      }
      if (this.minYaw !== this.maxYaw) {
        if (this.#yawSpeed > this.maxYaw && this.#yawSpeed - oldYaw < 0) {
          this.#yawSpeed = this.maxYaw;
        } else if (this.#yawSpeed < this.minYaw && oldYaw - this.#yawSpeed < 0) {
          this.#yawSpeed = this.minYaw;
        }
      }
    }

    /** Carbon method RotateOnOrbit (MAP_METHOD_AND_WRAP). */
    RotateOnOrbit(horizontal, vertical) {
      const oldYaw = this.#yawIntSpeed;
      const oldPitch = this.#pitchIntSpeed;
      this.#yawIntSpeed += this.maxSpeed * horizontal;
      this.#pitchIntSpeed -= this.maxSpeed * vertical;
      if (this.#pitchIntSpeed > this.maxPitch && this.#pitchIntSpeed - oldPitch < 0) {
        this.#pitchIntSpeed = this.maxPitch;
      } else if (this.#pitchIntSpeed < this.minPitch && oldPitch - this.#pitchIntSpeed < 0) {
        this.#pitchIntSpeed = this.minPitch;
      }
      if (this.minYaw !== this.maxYaw) {
        if (this.#yawIntSpeed > this.maxYaw && this.#yawIntSpeed - oldYaw < 0) {
          this.#yawIntSpeed = this.maxYaw;
        } else if (this.#yawIntSpeed < this.minYaw && oldYaw - this.#yawIntSpeed < 0) {
          this.#yawIntSpeed = this.minYaw;
        }
      }
      fromYawPitchRoll(this.rotationOfInterest, this.#yawInt, this.#pitchInt, 0);
    }

    /** Carbon method Zoom (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    Zoom(key = -1) {
      const keys = this.zoomCurve?.GetKeys?.() ?? this.zoomCurve?.keys;
      if (!Array.isArray(keys) || keys.length < 1) {
        return false;
      }
      if (key !== -1) {
        this.#zoomKey = Math.trunc(key);
      } else {
        this.#zoomKey++;
      }
      if (this.#zoomKey >= keys.length - 1) {
        this.#zoomKey = 0;
      }
      const selected = keys[this.#zoomKey];
      if (!selected) {
        return false;
      }
      this.#zoomTime = selected.time;
      return true;
    }

    /**
     * Updates the camera's native orbit state.
     *
     * Carbon reads real time and the device aspect ratio from globals. The
     * portable runtime accepts them explicitly while retaining simulation time
     * as argument zero for TriStepSetView compatibility.
     */
    Update(time, aspectRatio = 1, realTime = time) {
      if (!this.update) {
        return false;
      }
      const simTime = Number(time) || 0;
      const now = Number(realTime) || 0;
      let failed = false;
      if (this.#startTime === 0) {
        this.#startTime = simTime;
      }
      const deltaTime = now - this.#time;
      this.#time = now;
      const parentPosition = CAMERA_PARENT_POSITION;
      if (this.parent) sampleVector(this.parent, simTime, parentPosition);else vec3.zero(parentPosition);
      if (this.useExtraTranslation) {
        vec3.add(parentPosition, parentPosition, this.extraTranslation);
      }
      if (this.translationFromParent < Math.max(1, this.frontClip)) {
        this.translationFromParent = Math.max(1, this.frontClip);
      }
      if (!Number.isFinite(this.translationFromParent)) {
        this.translationFromParent = 1;
        failed = true;
      }
      const zoomKeys = this.zoomCurve?.GetKeys?.() ?? this.zoomCurve?.keys;
      const zoomLength = Number(this.zoomCurve?.Length?.() ?? 0);
      if (zoomLength > 0 && Array.isArray(zoomKeys)) {
        const nextKey = zoomKeys[this.#zoomKey + 1];
        if (nextKey && this.#zoomTime < nextKey.time) {
          this.#zoomTime = Math.min(this.#zoomTime + deltaTime, nextKey.time);
          this.fieldOfView = sampleScalar(this.zoomCurve, this.#zoomTime);
        }
      }
      const frictionDelta = this.friction * deltaTime;
      this.yaw = (this.yaw + frictionDelta * this.#yawSpeed) / (1 + frictionDelta);
      this.yaw = cutoffYawPitch(this.yaw, this.#yawSpeed);
      this.pitch = (this.pitch + frictionDelta * this.#pitchSpeed) / (1 + frictionDelta);
      this.pitch = cutoffYawPitch(this.pitch, this.#pitchSpeed);
      this.#CapPitchAndYaw();
      fromYawPitchRoll(this.rotationAroundParent, this.yaw, this.pitch, 0);
      quat.copy(this.#lastRotationAroundParent, this.rotationAroundParent);
      vec3.set(CAMERA_TRANSLATION, 0, 0, this.translationFromParent);
      vec3.transformQuat(CAMERA_POSITION, CAMERA_TRANSLATION, this.rotationAroundParent);
      vec3.add(CAMERA_POSITION, CAMERA_POSITION, parentPosition);
      this.#idleTheta += deltaTime * this.idleSpeed;
      if (this.#idleTheta > Math.PI * 2) {
        this.#idleTheta %= Math.PI * 2;
      }
      let idleYaw = 0;
      let idlePitch = 0;
      if (this.idleMove) {
        idleYaw = this.idleScale * Math.cos(this.#idleTheta);
        idlePitch = 1.2 * idleYaw * Math.sin(this.#idleTheta);
      }
      if (this.noiseCurve) {
        this.noise = sampleScalar(this.noiseCurve, simTime - this.#startTime) > 0;
      } else {
        this.noise = false;
      }
      if (this.noise) {
        if (this.noiseScaleCurve) {
          const nextNoiseScale = sampleScalar(this.noiseScaleCurve, simTime - this.#startTime);
          if (Number.isFinite(nextNoiseScale)) this.noiseScale = nextNoiseScale;
        }
        if (this.noiseDampCurve) {
          const nextNoiseDamp = sampleScalar(this.noiseDampCurve, simTime - this.#startTime);
          if (Number.isFinite(nextNoiseDamp)) this.noiseDamp = nextNoiseDamp;
        }
        this.#noiseX = (this.#noiseX + this.noiseDamp * (Math.random() - 0.5)) / (1 + this.noiseDamp * deltaTime);
        this.#noiseX = Math.max(-this.#maxNoise, Math.min(this.#maxNoise, this.#noiseX));
        this.#noiseY = (this.#noiseY + this.noiseDamp * (Math.random() - 0.5)) / (1 + this.noiseDamp * deltaTime);
        this.#noiseY = Math.max(-this.#maxNoise, Math.min(this.#maxNoise, this.#noiseY));
        idleYaw += this.noiseScale * this.#noiseX;
        idlePitch += this.noiseScale * this.#noiseY;
      }
      vec3.copy(CAMERA_INTEREST, parentPosition);
      vec3.subtract(CAMERA_TO_INTEREST, CAMERA_INTEREST, CAMERA_POSITION);
      vec3.normalize(CAMERA_TO_INTEREST, CAMERA_TO_INTEREST);
      vec3.scale(CAMERA_EXTENDED_INTEREST, CAMERA_TO_INTEREST, 100);
      vec3.cross(CAMERA_SIDE, CAMERA_TO_INTEREST, _EveCamera.#WORLD_UP);
      vec3.cross(CAMERA_UP, CAMERA_SIDE, CAMERA_TO_INTEREST);
      vec3.scaleAndAdd(CAMERA_EXTENDED_INTEREST, CAMERA_EXTENDED_INTEREST, CAMERA_SIDE, idleYaw);
      vec3.scaleAndAdd(CAMERA_EXTENDED_INTEREST, CAMERA_EXTENDED_INTEREST, CAMERA_UP, idlePitch);
      vec3.add(CAMERA_INTEREST, CAMERA_POSITION, CAMERA_EXTENDED_INTEREST);
      this.#yawInt = (this.#yawInt + frictionDelta * this.#yawIntSpeed) / (1 + frictionDelta);
      this.#yawInt = cutoffYawPitch(this.#yawInt, this.#yawIntSpeed);
      this.#pitchInt = (this.#pitchInt + frictionDelta * this.#pitchIntSpeed) / (1 + frictionDelta);
      this.#pitchInt = cutoffYawPitch(this.#pitchInt, this.#pitchIntSpeed);
      if (this.#trackInterest && this.interest) {
        sampleVector(this.interest, simTime, CAMERA_TRACK_POSITION);
        vec3.subtract(CAMERA_TRACK_POSITION, CAMERA_TRACK_POSITION, CAMERA_POSITION);
        vec3.set(CAMERA_TRACK_LOCAL, vec3.dot(CAMERA_TRACK_POSITION, CAMERA_SIDE), vec3.dot(CAMERA_TRACK_POSITION, CAMERA_UP), vec3.dot(CAMERA_TRACK_POSITION, CAMERA_TO_INTEREST));
        const radius = vec3.length(CAMERA_TRACK_LOCAL);
        const interestPitch = radius > 0 ? Math.asin(CAMERA_TRACK_LOCAL[1] / radius) : 0;
        const interestYaw = Math.atan2(CAMERA_TRACK_LOCAL[0], CAMERA_TRACK_LOCAL[2]);
        this.#yawIntSpeed = -interestYaw;
        this.#pitchIntSpeed = interestPitch;
      } else if (this.rotationOfInterest[0] === 0 && this.rotationOfInterest[1] === 0 && this.rotationOfInterest[2] === 0 && this.rotationOfInterest[3] === 1) {
        this.#yawIntSpeed = 0;
        this.#pitchIntSpeed = 0;
      }
      this.#pitchInt = Math.max(this.minPitch, Math.min(this.maxPitch, this.#pitchInt));
      if (this.minYaw !== this.maxYaw) {
        if (this.#yawInt > this.maxYaw) this.#yawInt = this.maxYaw;
        // Preserve Carbon's m_yaw test here (EveCamera.cpp:438).
        else if (this.yaw < this.minYaw) this.#yawInt = this.minYaw;
      }
      fromYawPitchRoll(this.rotationOfInterest, this.#yawInt, this.#pitchInt, 0);
      vec3.transformQuat(CAMERA_REAL_UP, this.alignment, this.rotationAroundParent);
      vec3.normalize(CAMERA_REAL_UP, CAMERA_REAL_UP);
      if (!isFiniteVector(CAMERA_REAL_UP) || vec3.squaredLength(CAMERA_REAL_UP) === 0) {
        vec3.set(CAMERA_REAL_UP, 0, 1, 0);
        failed = true;
      }
      vec3.subtract(CAMERA_LOOK_AT_LENGTH, CAMERA_POSITION, CAMERA_INTEREST);
      if (vec3.length(CAMERA_LOOK_AT_LENGTH) === 0) {
        vec3.add(CAMERA_POSITION, CAMERA_POSITION, CAMERA_TRANSLATION);
        failed = true;
      }
      if (!isFiniteVector(CAMERA_INTEREST) || !isFiniteVector(CAMERA_POSITION)) {
        vec3.zero(CAMERA_INTEREST);
        vec3.copy(CAMERA_POSITION, CAMERA_TRANSLATION);
        failed = true;
      }
      mat4.lookAt(CAMERA_VIEW, CAMERA_POSITION, CAMERA_INTEREST, CAMERA_REAL_UP);
      quat.invert(CAMERA_INVERSE_ROTATION, this.rotationOfInterest);
      mat4.fromQuat(CAMERA_INTEREST_ROTATION, CAMERA_INVERSE_ROTATION);
      // Carbon (row-vector): view * interestRotation - view first.
      mat4.multiply(CAMERA_INTEREST_VIEW, CAMERA_INTEREST_ROTATION, CAMERA_VIEW);
      _EveCamera.CalculateProjectionMatrix(this.projectionMatrix.transform, aspectRatio, this.fieldOfView, this.centerOffset, 0, this.frontClip, this.backClip, this.projectionMatrix);
      vec3.copy(this.pos, CAMERA_POSITION);
      vec3.copy(this.intr, CAMERA_INTEREST);
      _EveCamera.#CopyViewBasis(CAMERA_INTEREST_VIEW, this.viewVec, this.upVec, this.rightVec);
      if (vec3.length(this.viewVec) && vec3.length(this.upVec) && vec3.length(this.rightVec)) {
        this.viewMatrix.SetTransform(CAMERA_INTEREST_VIEW);
      } else {
        failed = true;
        _EveCamera.#CopyViewBasis(CAMERA_VIEW, this.viewVec, this.upVec, this.rightVec);
        this.viewMatrix.SetTransform(CAMERA_VIEW);
      }
      this.audio2Listener?.UpdatePlacement?.(this.viewVec, this.upVec, this.pos);
      if (failed && !this.#failedLastFrame) {
        this.errorHandler?.HandleEvent?.(null);
      }
      this.#failedLastFrame = failed;
      return !failed;
    }

    /**
     * Re-derives yaw and pitch when the parent-orbit rotation quaternion changes,
     * and re-evaluates interest tracking (clearing the interest orbit speeds) when
     * the interest object changes.
     */
    OnModified(_options = {}) {
      if (!quat.exactEquals(this.rotationAroundParent, this.#lastRotationAroundParent)) {
        quaternionToYawPitchRoll(CAMERA_YAW_PITCH_ROLL, this.rotationAroundParent);
        this.yaw = CAMERA_YAW_PITCH_ROLL[0];
        this.pitch = CAMERA_YAW_PITCH_ROLL[1];
        quat.copy(this.#lastRotationAroundParent, this.rotationAroundParent);
      }
      if (this.interest !== this.#lastInterest) {
        this.#trackInterest = !!this.interest && this.interest !== this.parent;
        if (!this.#trackInterest) {
          this.#yawIntSpeed = 0;
          this.#pitchIntSpeed = 0;
        }
        this.#lastInterest = this.interest;
      }
      return true;
    }

    /** Carbon method ResetStartTime (MAP_METHOD_AND_WRAP). */
    ResetStartTime() {
      this.#startTime = 0;
    }

    /** Carbon method SetOrbit (MAP_METHOD_AND_WRAP). */
    SetOrbit(yaw, pitch) {
      this.yaw = yaw;
      this.pitch = pitch;
      this.#yawSpeed = this.yaw;
      this.#pitchSpeed = this.pitch;
      this.#yawSpeed %= Math.PI * 2;
      this.yaw %= Math.PI * 2;
    }

    /** Carbon method SetRotationOnOrbit (MAP_METHOD_AND_WRAP). */
    SetRotationOnOrbit(yaw, pitch) {
      this.#yawInt = yaw;
      this.#pitchInt = pitch;
      this.#yawIntSpeed = yaw;
      this.#pitchIntSpeed = pitch;
      fromYawPitchRoll(this.rotationOfInterest, this.#yawInt, this.#pitchInt, 0);
    }

    /**
     * Clamps pitch into the authored min/max range, and yaw as well but only when
     * a yaw range is configured, that is when minYaw and maxYaw differ.
     */
    #CapPitchAndYaw() {
      this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
      if (this.minYaw !== this.maxYaw) {
        this.yaw = Math.max(this.minYaw, Math.min(this.maxYaw, this.yaw));
      }
    }

    /**
     * Extracts the view, up and right basis vectors out of a view transform into
     * the supplied vectors.
     */
  }];
  #CopyViewBasis(transform, view, up, right) {
    vec3.set(view, transform[2], transform[6], transform[10]);
    vec3.set(up, transform[1], transform[5], transform[9]);
    vec3.set(right, transform[0], transform[4], transform[8]);
  }
  #WORLD_UP = Object.freeze([0, 1, 0]);
  constructor() {
    super(_EveCamera), _initClass();
  }
}();

export { _EveCamera as EveCamera };
//# sourceMappingURL=EveCamera.js.map
