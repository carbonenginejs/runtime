// Source: blue/include/IBlueResMan.h:135, blue/include/IBluePaths.h:49,
//   blue/include/IBlueOS.h:226, blue/src/BlueResMan.cpp:98-123.
// Shared definitions are available before application startup. Each enum
// registers at its defining module; the holder starts no service on import.
import "../consts/graphics/trinityEnums.js";
import "../consts/trinity.js";
import "../consts/renderContext/presentation.js";
import "../consts/renderContext/window.js";
import "../consts/renderContext/formats.js";
import "../consts/renderContext/upscaling.js";
import "../consts/renderContext/resources.js";
import { CjsSchema } from "#schema";
import { IBlueEvents } from "./IBlueEvents.js";
import { IBlueResMan } from "./IBlueResMan.js";
import { IBluePaths } from "./IBluePaths.js";
import { IBlueOS } from "./IBlueOS.js";
import { ICjsWwiseSoundEngine } from "../audio/ICjsWwiseSoundEngine.js";
import { CjsBlue } from "./CjsBlue.js";

/** The one process-wide Blue holder. Construction is inert. */
export const blue = new CjsBlue();

// Carbon's private s_tickCookie in BlueResMan::Initialize/Shutdown. This
// registration belongs to composition; unrelated host cookies remain intact.
const RES_MAN_TICK_COOKIE = Symbol("BeResMan");
let tickPair = null;
let installingServices = false;

/**
 * Installs named references and the composition-owned resource-manager tick pair.
 *
 * Custom synchronous composition step, called by CjsLibrary.Initialize. Slots
 * and the active pair are independent: initial startup registers even unchanged
 * defaults; restoring an unstarted snapshot detaches without starting anything.
 * Validate every slot first, register the candidate, detach the previous pair,
 * then publish. Failed hooks run inverse operations and preserve the primary
 * error, reporting failed compensation in an AggregateError. Borrowed services
 * are never configured, pumped, initialized or destroyed here.
 *
 * @param {object} [services={}] Named resMan, paths, os, sof and audio references.
 * @param {boolean} [running=true] Whether the installed manager should receive ticks.
 * @returns {object} Previous references and running state for explicit restoration.
 */
export function installBlueServices(services = {}, running = true)
{
  if (!services || typeof services !== "object" || Array.isArray(services))
    throw new TypeError("Blue service installation requires named service references.");
  if (typeof running !== "boolean") throw new TypeError("Blue service running state must be boolean.");
  if (installingServices) throw new Error("Blue service installation cannot be reentered.");
  installingServices = true;
  try
  {
    const previous = {
      resMan: blue.resMan, paths: blue.paths, os: blue.os,
      sof: blue.sof, audio: blue.audio, running: tickPair !== null
    };
    const next = { ...previous };
    for (const [name, Contract] of [["resMan", IBlueResMan], ["paths", IBluePaths], ["os", IBlueOS], ["audio", ICjsWwiseSoundEngine]])
    {
      if (!Object.hasOwn(services, name)) continue;
      const value = services[name];
      if (!CjsSchema.cast(value, Contract)
        || (name === "resMan" && !CjsSchema.cast(value, IBlueEvents)))
        throw new TypeError(`Blue service ${name} does not implement its required interfaces.`);
      next[name] = value;
    }
    if (Object.hasOwn(services, "sof"))
    {
      const sof = services.sof;
      if (sof !== null && (!sof || typeof sof.Fetch !== "function"))
        throw new TypeError("Blue service sof must provide Fetch or be null.");
      next.sof = sof;
    }

    const candidate = running ? { os: next.os, resMan: next.resMan } : null;
    if (candidate?.os !== tickPair?.os || candidate?.resMan !== tickPair?.resMan)
    {
      if (candidate)
      {
        try { candidate.os.RegisterForTicks(candidate.resMan, RES_MAN_TICK_COOKIE); }
        catch (error)
        {
          const failures = [error];
          try { candidate.os.UnregisterForTicks(candidate.resMan, RES_MAN_TICK_COOKIE); }
          catch (cleanupError) { failures.push(cleanupError); }
          if (failures.length > 1)
            throw new AggregateError(failures, "Blue service registration compensation failed.", { cause: error });
          throw error;
        }
      }
      if (tickPair)
      {
        try { tickPair.os.UnregisterForTicks(tickPair.resMan, RES_MAN_TICK_COOKIE); }
        catch (error)
        {
          const failures = [error];
          try { tickPair.os.RegisterForTicks(tickPair.resMan, RES_MAN_TICK_COOKIE); }
          catch (cleanupError) { failures.push(cleanupError); }
          if (candidate)
          {
            try { candidate.os.UnregisterForTicks(candidate.resMan, RES_MAN_TICK_COOKIE); }
            catch (cleanupError) { failures.push(cleanupError); }
          }
          if (failures.length > 1)
            throw new AggregateError(failures, "Blue service transfer compensation failed.", { cause: error });
          throw error;
        }
      }
    }
    blue.resMan = next.resMan;
    blue.paths = next.paths;
    blue.os = next.os;
    blue.sof = next.sof;
    blue.audio = next.audio;
    tickPair = candidate;
    return previous;
  }
  finally { installingServices = false; }
}
