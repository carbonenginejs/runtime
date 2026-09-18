// Source: trinity/trinity/TriDevice.h:347
//
//     extern BlueBasicPtr<TriDevice> gTriDev;
//
// Carbon's process-wide device. It is how the renderer reaches the frame clock
// without being handed one: `Tr2Renderer::GetAnimationTime()` is exactly
// `gTriDev->GetAnimationTime()` (Tr2Renderer.cpp), and the clock itself is
// `TriDevice::m_animationTime`, advanced in `TriDevice::Tick`
// (TriDevice.cpp:805-823).
//
// WHY A HOLDER, AS `blue` IS. Reach the device THROUGH it and never capture it:
// `gTriDev.device.GetAnimationTime()`, not `const d = gTriDev.device` at module
// scope. The holder owns the reference, so the device behind it can be replaced
// without anyone's cooperation, and there is never a null for a caller to
// guard against.
//
// The slot is never empty, unlike `blue.resMan`, because a device with no
// backend is a real and useful thing here - its clock reads zero until
// something ticks it, which is what every present caller already defaults to.
// A device that cannot answer is a different problem from a manager that was
// never composed.
//
// IT FILLS ON FIRST READ RATHER THAN AT EVALUATION, and that is not a
// preference. `TriDevice.Render` calls the `Tr2Renderer` frame statics, which
// reach the ambient render context, which reaches this holder - so constructing
// the device while this module is evaluating would construct it from inside
// TriDevice.js's own evaluation, where the class binding is still in its
// temporal dead zone. Carbon has the same cycle and no such problem, because
// its `gTriDev` starts NULL and is filled by the first device constructed
// (`TriDevice.h:356-365`). Reaching through the holder is what makes a lazy
// slot indistinguishable from an eager one at every call site.
import { TriDevice } from "./TriDevice.js";

let s_device = null;

/** Carbon's `gTriDev`: the process-wide device, and with it the frame clock. */
export const gTriDev = {
  /** The device every consumer reads, replaceable by composition. */
  get device()
  {
    if (!s_device) s_device = new TriDevice();
    return s_device;
  },

  set device(device)
  {
    s_device = device ?? null;
  }
};
