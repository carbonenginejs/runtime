// One value handler per storage kind. What differs between types is data, in GRAPH_TYPES.
import { CjsGraphTypeBool } from "./CjsGraphTypeBool.js";
import { CjsGraphTypeCString } from "./CjsGraphTypeCString.js";
import { CjsGraphTypeDouble } from "./CjsGraphTypeDouble.js";
import { CjsGraphTypeDoubleArray } from "./CjsGraphTypeDoubleArray.js";
import { CjsGraphTypeFloat } from "./CjsGraphTypeFloat.js";
import { CjsGraphTypeFloatArray } from "./CjsGraphTypeFloatArray.js";
import { CjsGraphTypeInt64 } from "./CjsGraphTypeInt64.js";
import { CjsGraphTypeIntArray } from "./CjsGraphTypeIntArray.js";
import { CjsGraphTypeInvalid } from "./CjsGraphTypeInvalid.js";
import { CjsGraphTypeIRoot } from "./CjsGraphTypeIRoot.js";
import { CjsGraphTypeList } from "./CjsGraphTypeList.js";
import { CjsGraphTypeLong } from "./CjsGraphTypeLong.js";
import { CjsGraphTypeMap } from "./CjsGraphTypeMap.js";
import { CjsGraphTypeObject } from "./CjsGraphTypeObject.js";
import { CjsGraphTypePyObject } from "./CjsGraphTypePyObject.js";
import { CjsGraphTypeString } from "./CjsGraphTypeString.js";
import { CjsGraphTypeValues } from "./CjsGraphTypeValues.js";
import { CjsGraphTypeValuesMap } from "./CjsGraphTypeValuesMap.js";

export {
  CjsGraphTypeBool, CjsGraphTypeCString, CjsGraphTypeDouble, CjsGraphTypeDoubleArray, CjsGraphTypeFloat,
  CjsGraphTypeFloatArray, CjsGraphTypeInt64, CjsGraphTypeIntArray, CjsGraphTypeInvalid, CjsGraphTypeIRoot,
  CjsGraphTypeList, CjsGraphTypeLong, CjsGraphTypeMap, CjsGraphTypeObject, CjsGraphTypePyObject, CjsGraphTypeString,
  CjsGraphTypeValues, CjsGraphTypeValuesMap
};

/** The handlers, built on first use: the object handlers and CjsGraph import each other. */
let handlers = null;

/**
 * The one handler for a handler name in GRAPH_TYPES.
 * @cjs
 */
export function getGraphHandler(name)
{
  handlers ??= {
    bool: new CjsGraphTypeBool(), cstring: new CjsGraphTypeCString(), double: new CjsGraphTypeDouble(),
    doubleArray: new CjsGraphTypeDoubleArray(), float: new CjsGraphTypeFloat(), floatArray: new CjsGraphTypeFloatArray(),
    int64: new CjsGraphTypeInt64(), intArray: new CjsGraphTypeIntArray(), invalid: new CjsGraphTypeInvalid(),
    iroot: new CjsGraphTypeIRoot(), list: new CjsGraphTypeList(), long: new CjsGraphTypeLong(), map: new CjsGraphTypeMap(),
    object: new CjsGraphTypeObject(), pyObject: new CjsGraphTypePyObject(), string: new CjsGraphTypeString(), values: new CjsGraphTypeValues(),
    valuesMap: new CjsGraphTypeValuesMap()
  };

  return handlers[name];
}
