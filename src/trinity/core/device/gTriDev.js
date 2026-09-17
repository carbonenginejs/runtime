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
// The slot starts filled, unlike `blue.resMan`, because a device with no
// backend is a real and useful thing here - its clock reads zero until
// something ticks it, which is what every present caller already defaults to.
// A device that cannot answer is a different problem from a manager that was
// never composed.
import { TriDevice } from "./TriDevice.js";

/** Carbon's `gTriDev`: the process-wide device, and with it the frame clock. */
export const gTriDev = {
  /** The device every consumer reads, replaceable by composition. */
  device: new TriDevice()
};
