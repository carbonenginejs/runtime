import { EveCamera } from "../../../../npm/dist/trinity/eve/camera/EveCamera.js";

/** Demo interaction policy around Carbon's camera, without a second update or inertia system. */
export function createCameraControls({ camera, getViewport, getBounds, preferences = {} })
{
  const settings = {
    invertX: true, invertY: true, orbitSensitivity: 0.1,
    panSensitivity: 1, dollySensitivity: 0.0015, fovSensitivity: 0.001,
    minFieldOfView: 5 * Math.PI / 180, maxFieldOfView: 120 * Math.PI / 180,
    ...preferences
  };
  const projection = new Float32Array(16);
  const listeners = new Set();

  function project()
  {
    const { width, height } = getViewport();
    if (!(width > 0 && height > 0)) return null;
    EveCamera.CalculateProjectionMatrix(projection, width / height, camera.fieldOfView,
      camera.centerOffset, 0, camera.frontClip, camera.backClip);
    return { width, height, projection };
  }

  function getPose()
  {
    return { yaw: camera.yaw, pitch: camera.pitch, distance: camera.translationFromParent,
      center: Array.from(camera.extraTranslation), fieldOfView: camera.fieldOfView,
      frontClip: camera.frontClip, backClip: camera.backClip };
  }

  function changed()
  {
    const pose = getPose();
    for (const listener of listeners) listener(pose);
  }

  function cancel()
  {
    // Native SetOrbit resets the spring targets (EveCamera.cpp:131-142).
    camera.SetOrbit(camera.yaw, camera.pitch);
  }

  function setFieldOfView(radians)
  {
    if (!Number.isFinite(radians)) throw new RangeError("Field of view must be finite radians.");
    camera.fieldOfView = Math.min(settings.maxFieldOfView, Math.max(settings.minFieldOfView, radians));
    changed();
    return camera.fieldOfView;
  }

  function setPose(pose)
  {
    if (pose.center.length !== 3 || ![pose.yaw, pose.pitch, pose.distance, pose.fieldOfView, ...pose.center].every(Number.isFinite) || pose.distance <= 0) throw new RangeError("Camera pose must be finite with positive distance.");
    camera.SetOrbit(pose.yaw, pose.pitch);
    camera.translationFromParent = pose.distance;
    camera.useExtraTranslation = true;
    camera.extraTranslation.set(pose.center);
    if (pose.frontClip > 0) camera.frontClip = pose.frontClip;
    if (pose.backClip > camera.frontClip) camera.backClip = pose.backClip;
    setFieldOfView(pose.fieldOfView);
  }

  const initial = getPose();
  return {
    preferences: settings, getPose, setPose, cancel, setFieldOfView,
    orbit(dx, dy)
    {
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      camera.OrbitParent(dx * settings.orbitSensitivity * (settings.invertX ? -1 : 1),
        dy * settings.orbitSensitivity * (settings.invertY ? 1 : -1));
    },
    pan(dx, dy)
    {
      const view = project();
      if (!view || !Number.isFinite(dx) || !Number.isFinite(dy)) return false;
      const x = -dx * settings.panSensitivity * 2 * camera.translationFromParent / (projection[0] * view.width);
      const y = dy * settings.panSensitivity * 2 * camera.translationFromParent / (projection[5] * view.height);
      camera.useExtraTranslation = true;
      for (let axis = 0; axis < 3; axis++)
        camera.extraTranslation[axis] += camera.rightVec[axis] * x + camera.upVec[axis] * y;
      changed();
      return true;
    },
    dolly(delta)
    {
      if (!Number.isFinite(delta)) return;
      const radius = Math.max(0.001, getBounds().radius);
      const minimum = Math.max(0.001, radius * 0.01);
      const maximum = Math.max(minimum, camera.backClip - radius);
      const distance = Math.min(maximum, Math.max(minimum,
        camera.translationFromParent * Math.exp(Math.max(-20, Math.min(20, delta * settings.dollySensitivity)))));
      camera.Dolly(distance - camera.translationFromParent);
      changed();
    },
    adjustFieldOfView(delta)
    {
      return setFieldOfView(camera.fieldOfView + delta * settings.fovSensitivity);
    },
    reset() { setPose(initial); },
    subscribe(listener)
    {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() { cancel(); listeners.clear(); }
  };
}

/** Current world-space hull sphere, including native dynamic bounds and parent scaling. */
export function readShipBounds(ship, fallback, sphere)
{
  if (!ship) return fallback;
  ship.UpdateWorldBounds();
  if (!ship.GetBoundingSphere(sphere, 0)) return fallback;
  return { centre: sphere.subarray(0, 3), radius: sphere[3] };
}
