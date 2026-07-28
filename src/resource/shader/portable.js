import { copyBytes } from "@carbonenginejs/runtime-utils/bytes";
import {
  isPlainObject,
  isUint32
} from "@carbonenginejs/runtime-utils/is";
import { cloneCarbonValue } from "@carbonenginejs/runtime-utils/types";

/** Require one of Carbon's six authored shader-stage indices. */
export function requirePortableStageType(value)
{
  if (!isUint32(value))
  {
    throw new RangeError("Portable shader stage type must fit uint32");
  }
  if (value >= 6)
  {
    throw new RangeError("Portable shader stage type must be in [0, 5]");
  }
  return value;
}

/** Clone and validate one owned source-program payload. */
export function clonePortableSourceProgram(value, expectedKind)
{
  if (!isPlainObject(value))
  {
    throw new TypeError(
      `Portable ${expectedKind} source program must be an object`
    );
  }
  if (value.kind !== expectedKind)
  {
    throw new Error(
      `Portable source program kind "${value.kind}" is not "${expectedKind}"`
    );
  }
  if (!(value.bytes instanceof Uint8Array))
  {
    throw new TypeError(
      `Portable ${expectedKind} source program must be Uint8Array bytes`
    );
  }

  const result = cloneCarbonValue(value);
  result.bytes = copyBytes(value.bytes);
  return result;
}
