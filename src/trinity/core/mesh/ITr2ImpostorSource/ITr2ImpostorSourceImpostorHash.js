// Source: trinity/trinity/Tr2ImpostorManager.h
import { vec3 } from "#math/vec3";
import { meta, types } from "#schema";

/**
 * ITr2ImpostorSource::ImpostorHash, a plain nested pair of camera directions.
 * The flattened JavaScript constructor name and independent zero-vector
 * defaults are retained; native code fills the vectors before using the hash.
 * The record neither inherits its enclosing interface nor owns capture work.
 */
@meta.define({ className: "ITr2ImpostorSourceImpostorHash", family: "trinityCore" })
export class ITr2ImpostorSourceImpostorHash
{
  /**
   * View direction used to compare captures.
   * @type {Float32Array}
   */
  @types.vec3
  viewDir = vec3.create();

  /**
   * Camera up direction used to compare captures.
   * @type {Float32Array}
   */
  @types.vec3
  upDir = vec3.create();
}
