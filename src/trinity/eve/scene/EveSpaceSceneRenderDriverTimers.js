// Source: trinity/trinity/Eve/EveSpaceSceneRenderDriver.h:155-168
import { meta, type, blue } from "#schema";

/**
 * Carbon's unnamed struct behind EveSpaceSceneRenderDriver::m_timers
 * (private, h:155-168): one Tr2ProfileTimer per section of the frame. The
 * struct has no type name in Carbon, so the class is named after its owner
 * and the member, and its `carbon:` names the member it types.
 *
 * Execute's anonymous-namespace TimeSection (EveSpaceSceneRenderDriver.cpp:72-114)
 * is the only writer: around each section it names the timer
 * `<root stat name>/<section>`, copies the root timer's CPU and GPU capture
 * flags into it, and brackets the section with Begin/End - or switches both
 * captures off when the root timer captures nothing. Sections and their
 * names: update "Update" (cpp:478), beginRender "BeginRender" (:488),
 * reflections "RenderReflections" (:492), background "BackgroundPass" (:504),
 * depthPass "DepthPass" (:518), shadows "Shadows" (:530), ssao "SSAO"
 * (:533), mainPass "MainPass" (:554), endRender "EndRender" (:594),
 * postProcess "PostProcess" (:607), ui3d "Render3dUI" (:612).
 *
 * Waiting: Tr2ProfileTimer (Tr2ProfileTimer.h:7-41) is not ported - it is a
 * Tr2DeviceResource holding a Tr2GpuTimerAL plus CPU statistics entries - so
 * every member is null until it is, and Execute does not run TimeSection.
 * Carbon embeds each timer by value; once Tr2ProfileTimer exists each member
 * becomes `new Tr2ProfileTimer()`.
 */
@blue.define({ className: "EveSpaceSceneRenderDriverTimers", donors: [ "EveSpaceSceneRenderDriver::m_timers" ] })
export class EveSpaceSceneRenderDriverTimers
{

  /** update (Tr2ProfileTimer), h:157. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  update = null;

  /** beginRender (Tr2ProfileTimer), h:158. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  beginRender = null;

  /** endRender (Tr2ProfileTimer), h:159. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  endRender = null;

  /** postProcess (Tr2ProfileTimer), h:160. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  postProcess = null;

  /** ui3d (Tr2ProfileTimer), h:161. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  ui3d = null;

  /** background (Tr2ProfileTimer), h:162. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  background = null;

  /** depthPass (Tr2ProfileTimer), h:163. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  depthPass = null;

  /** mainPass (Tr2ProfileTimer), h:164. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  mainPass = null;

  /** reflections (Tr2ProfileTimer), h:165. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  reflections = null;

  /** shadows (Tr2ProfileTimer), h:166. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  shadows = null;

  /** ssao (Tr2ProfileTimer), h:167. Waiting: Tr2ProfileTimer is not ported. */
  @type.unknown
  ssao = null;

}
