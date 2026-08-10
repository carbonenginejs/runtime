// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\IEveSpaceObjectChild.h
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";
import { Origin } from "../../generated/eve/child/enums.js";


/**
 * Base type for space-object children, carrying the shared Origin enum that
 * distinguishes space-authored placement from SOF-authored placement.
 */
@type.define({ className: "IEveSpaceObjectChild", family: "eve/child" })
export class IEveSpaceObjectChild extends CjsModel
{
  static Origin = Origin;

}
