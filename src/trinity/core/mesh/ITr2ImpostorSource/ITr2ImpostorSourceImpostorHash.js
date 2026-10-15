// Source: trinity/trinity/Tr2ImpostorManager.h
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";

/**
 * ITr2ImpostorSource::ImpostorHash, a plain nested pair of camera directions.
 * The flattened JavaScript constructor name and independent zero-vector
 * defaults are retained; native code fills the vectors before using the hash.
 * The record neither inherits its enclosing interface nor owns capture work.
 */
@blue.define("ITr2ImpostorSourceImpostorHash")
export class ITr2ImpostorSourceImpostorHash
{
  /**
   * View direction used to compare captures.
   * @type {Float32Array}
   */
  @type.vec3
  viewDir = vec3.create();

  /**
   * Camera up direction used to compare captures.
   * @type {Float32Array}
   */
  @type.vec3
  upDir = vec3.create();
}
