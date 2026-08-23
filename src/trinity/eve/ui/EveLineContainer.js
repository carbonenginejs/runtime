// Source: trinity/trinity/Eve/UI/EveLineContainer.h
// Source: trinity/trinity/Eve/UI/EveLineContainer.cpp
// Source: trinity/trinity/Eve/UI/EveLineContainer_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; this is portable CPU graph policy.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";


/** Owns and updates a connector-built EveCurveLineSet. */
@type.define({ className: "EveLineContainer", family: "eve/ui" })
export class EveLineContainer extends CjsModel
{

  /** m_connectors (PEveConnectorVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveConnector")
  connectors = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_lineSet (EveCurveLineSetPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("EveCurveLineSet")
  lineSet = null;

  /** m_display (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  display = true;

  /** Rebuilds the complete logical line set from the authored connectors. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext)
  {
    this.Update(updateContext);
  }

  /** Carbon performs no asynchronous work for this container. */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Delegates transformed visibility only while this container is displayed. */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform)
  {
    if (this.display && this.lineSet)
    {
      this.lineSet.UpdateVisibility(updateContext, parentTransform);
    }
  }

  /** Collects the concrete line set only while this container is displayed. */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables, impostors = null)
  {
    if (this.display && this.lineSet)
    {
      this.lineSet.GetRenderables(renderables, impostors);
    }
  }

  /** Delegates the line set's local bound when one is authored. */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(sphere, query = 0)
  {
    return this.lineSet ? this.lineSet.GetBoundingSphere(sphere, query) : false;
  }

  /** Delegates Carbon's model-center update hook. */
  @carbon.method
  @impl.implemented
  UpdateModelCenterWorldPosition(position, time)
  {
    if (this.lineSet)
    {
      this.lineSet.UpdateModelCenterWorldPosition(position, time);
    }
  }

  /** Delegates Carbon's non-updating model-center query. */
  @carbon.method
  @impl.implemented
  GetModelCenterWorldPosition(position)
  {
    if (this.lineSet)
    {
      this.lineSet.GetModelCenterWorldPosition(position);
    }
  }

  /** Delegates a local AABB query when the line set can supply one. */
  @carbon.method
  @impl.implemented
  GetLocalBoundingBox(minBounds, maxBounds)
  {
    return this.lineSet ? this.lineSet.GetLocalBoundingBox(minBounds, maxBounds) : false;
  }

  /** Delegates Carbon's local-to-world query without inventing a fallback. */
  @carbon.method
  @impl.implemented
  GetLocalToWorldTransform(transform)
  {
    if (this.lineSet)
    {
      this.lineSet.GetLocalToWorldTransform(transform);
    }
  }

}
