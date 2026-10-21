import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/UI/EveLineContainer.h
// Source: trinity/trinity/Eve/UI/EveLineContainer.cpp
// Source: trinity/trinity/Eve/UI/EveLineContainer_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; this is portable CPU graph policy.
import { meta, type, blue } from "#schema";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";


/** Owns and updates a connector-built EveCurveLineSet. */
@be.define("EveLineContainer")
@blue.inherit(IEveSpaceObject2)
@be.mapInterface(IEveSpaceObject2)
export class EveLineContainer
{

  /** m_connectors (PEveConnectorVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveConnector")
  connectors = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_lineSet (EveCurveLineSetPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveCurveLineSet")
  lineSet = null;

  /** m_display (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  display = true;

  /** Rebuilds the complete logical line set from the authored connectors. */
  @blue.method
  @meta.implemented
  Update(context)
  {
    if (!this.lineSet)
    {
      return;
    }

    this.lineSet.ClearLines();
    for (const connector of this.connectors)
    {
      connector.Update(context);
      connector.AddLine(this.lineSet);
    }
    this.lineSet.SubmitChanges();
  }

  /** Carbon's synchronous phase owns the connector rebuild. */
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext)
  {
    this.Update(updateContext);
  }

  /** Carbon performs no asynchronous work for this container. */
  @blue.method
  @meta.implemented
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Delegates transformed visibility only while this container is displayed. */
  @blue.method
  @blue.contextual(["camera"])
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform)
  {
    if (this.display && this.lineSet)
    {
      this.lineSet.UpdateVisibility(updateContext, parentTransform);
    }
  }

  /** Collects the concrete line set only while this container is displayed. */
  @meta.implemented
  @blue.method
  GetRenderables__Impostors(renderables, impostors)
  {
    if (this.display && this.lineSet)
    {
      this.lineSet.GetRenderables__Impostors(renderables, impostors);
    }
  }

  /** Delegates the line set's local bound when one is authored. */
  @blue.method
  @meta.implemented
  GetBoundingSphere(sphere, query = 0)
  {
    return this.lineSet ? this.lineSet.GetBoundingSphere(sphere, query) : false;
  }

  /** Delegates Carbon's model-center update hook. */
  @blue.method
  @meta.implemented
  UpdateModelCenterWorldPosition(position, time)
  {
    if (this.lineSet)
    {
      this.lineSet.UpdateModelCenterWorldPosition(position, time);
    }
  }

  /** Delegates Carbon's non-updating model-center query. */
  @blue.method
  @meta.implemented
  GetModelCenterWorldPosition(position)
  {
    if (this.lineSet)
    {
      this.lineSet.GetModelCenterWorldPosition(position);
    }
  }

  /** Delegates a local AABB query when the line set can supply one. */
  @blue.method
  @meta.implemented
  GetLocalBoundingBox(minBounds, maxBounds)
  {
    return this.lineSet ? this.lineSet.GetLocalBoundingBox(minBounds, maxBounds) : false;
  }

  /** Delegates Carbon's local-to-world query without inventing a fallback. */
  @blue.method
  @meta.implemented
  GetLocalToWorldTransform(transform)
  {
    if (this.lineSet)
    {
      this.lineSet.GetLocalToWorldTransform(transform);
    }
  }

}
