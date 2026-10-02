// Source: blue/include/IBlueResMan.h:135, blue/include/IBluePaths.h:49,
//   blue/include/IBlueOS.h:226, blue/src/BlueResMan.cpp:98-123
//
// Carbon's process-wide Blue facilities are interface references. Consumers
// reach them through this holder so composition can install another owner.
// JavaScript supplies inert defaults early: stores and registrations exist,
// but importing Blue does not pump ticks, fetch resources or start a backend.
// Required providers are configured before their operations are requested.
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
import { CjsResMan } from "./CjsResMan.js";
import { CjsBluePaths } from "./CjsBluePaths.js";
import { CjsBlueOS } from "./CjsBlueOS.js";
import { BlueClasses } from "./BlueClasses.js";
import { blueEnums } from "./enums/CjsBlueEnumRegistry.js";

// Carbon uses a private s_tickCookie in BlueResMan::Initialize/Shutdown.
// A private Symbol keeps this holder's registration separate from host cookies.
const RES_MAN_TICK_COOKIE = Symbol("BeResMan");
let installingServices = false;

/** Carbon's process-wide Blue facilities, including early definitions and stores. */
export const blue = {
  /** EnumRegistration and BlueEnum responsibilities combined for JavaScript. */
  enums: blueEnums,
  /** `BeResMan`: an inert resource manager until its operations receive work. */
  resMan: new CjsResMan(),
  /** `BePaths`: the host installs the local file system and remote cache. */
  paths: new CjsBluePaths(),
  /** `BeOS`: the root clock and tick registry; pumping is an explicit host call. */
  os: new CjsBlueOS(),
  /** `BeClasses`: class registration is available before service initialization. */
  classes: new BlueClasses()
};

// BlueResMan::Initialize registers with BeOS (cpp:113). Registering this inert
// default does not deliver a tick; the host must call PumpOS explicitly.
blue.os.RegisterForTicks(blue.resMan, RES_MAN_TICK_COOKIE);

/**
 * Installs named Blue service references and transfers the holder's tick pair.
 *
 * Custom JavaScript composition step: native BlueResMan::Initialize/Shutdown
 * register/unregister one private cookie. This internal synchronous helper
 * preserves that ownership when a host replaces the manager or OS. It creates,
 * starts and disposes nothing; classes and enums retain their existing owners.
 * Tick hooks must be synchronous and must not reenter installation. References
 * are published only after registration succeeds. Failed hooks are compensated
 * using their inverse operations; failed compensation is reported, not hidden.
 *
 * @param {object} [services={}] Named replacements; omitted slots retain their references.
 * @param {IBlueResMan} [services.resMan] Resource manager implementing IBlueEvents.
 * @param {IBluePaths} [services.paths] Path service.
 * @param {IBlueOS} [services.os] Clock and tick service.
 * @returns {{resMan: IBlueResMan, paths: IBluePaths, os: IBlueOS}} Previous references for restoration.
 * @throws {TypeError} If a supplied service does not declare its required interfaces.
 * @throws {Error} If installation is reentered or a tick hook fails.
 * @throws {AggregateError} If a tick hook and any compensating operation fail.
 */
export function installBlueServices(services = {})
{
  if (!services || typeof services !== "object" || Array.isArray(services))
  {
    throw new TypeError("Blue service installation requires named service references.");
  }
  if (installingServices) throw new Error("Blue service installation cannot be reentered.");
  installingServices = true;
  try
  {
    const previous = { resMan: blue.resMan, paths: blue.paths, os: blue.os };
    const next = { ...previous };
    for (const [name, Contract] of [["resMan", IBlueResMan], ["paths", IBluePaths], ["os", IBlueOS]])
    {
      if (!Object.prototype.hasOwnProperty.call(services, name)) continue;
      const value = services[name];
      if (!CjsSchema.cast(value, Contract)
        || (name === "resMan" && !CjsSchema.cast(value, IBlueEvents)))
      {
        throw new TypeError(`Blue service ${name} does not implement its required interfaces.`);
      }
      next[name] = value;
    }

    if (next.os !== previous.os || next.resMan !== previous.resMan)
    {
      try
      {
        next.os.RegisterForTicks(next.resMan, RES_MAN_TICK_COOKIE);
      }
      catch (error)
      {
        const failures = [error];
        try
        {
          next.os.UnregisterForTicks(next.resMan, RES_MAN_TICK_COOKIE);
        }
        catch (cleanupError)
        {
          failures.push(cleanupError);
        }
        if (failures.length > 1)
        {
          throw new AggregateError(failures, "Blue service registration compensation failed.", { cause: error });
        }
        throw error;
      }
      try
      {
        previous.os.UnregisterForTicks(previous.resMan, RES_MAN_TICK_COOKIE);
      }
      catch (error)
      {
        const failures = [error];
        try
        {
          previous.os.RegisterForTicks(previous.resMan, RES_MAN_TICK_COOKIE);
        }
        catch (cleanupError)
        {
          failures.push(cleanupError);
        }
        try
        {
          next.os.UnregisterForTicks(next.resMan, RES_MAN_TICK_COOKIE);
        }
        catch (cleanupError)
        {
          failures.push(cleanupError);
        }
        if (failures.length > 1)
        {
          throw new AggregateError(failures, "Blue service transfer compensation failed.", { cause: error });
        }
        throw error;
      }
    }

    blue.resMan = next.resMan;
    blue.paths = next.paths;
    blue.os = next.os;
    return previous;
  }
  finally
  {
    installingServices = false;
  }
}
