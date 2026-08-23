# Texture arrays and update generations

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource`
Audience: Users and integrators  
Summary: Defines the texture-array proxy surface, the requested/prepared revision boundary, and the adapter commit contract.

## Layer proxies

Texture-array resources expose one ordinary-looking proxy per ordered layer:

```js
const textureArray = new CjsTextureArrayRes({
  paths: [
    "res:/detail1.dds",
    "res:/detail2.dds",
    "res:/detail3.dds"
  ],
  layerNames: [ "Detail1Map", "Detail2Map", "Detail3Map" ],
  updateScheduler: resource => frameQueue.add(resource)
});

const detail2 = textureArray.GetLayerParameter(1);
detail2.SetValue("res:/replacement.dds");

detail2.textureRes === textureArray; // true
```

Proxy setters only update their source path and invalidate the parent. The
parent is scheduled once even if several proxies change in the same frame.
The next-frame consumer calls `Update()` or `ConsumeUpdateRequest()` to
obtain one immutable ordered snapshot. Runtime-resource does not know which
shader metadata caused the aggregate request; shader packages and engine
adapters map public parameter names to layer indices.

Public effect parameters remain separate from these internal proxies. Their
authored paths and individual 2D source resources are not replaced by the
aggregate. An engine-owned, non-persisted bridge mirrors public changes into
the fixed internal layers.

## Update generations

`CjsTextureArrayRes` is a derived multi-source resource with an explicit
requested/prepared revision boundary:

```text
proxy/source change
    -> requested revision + dirty layer
    -> one scheduled next-frame snapshot
    -> consumed/in-flight request
    -> adapter candidate preparation
    -> guarded adapter + prepared-revision publication
```

`ConsumeUpdateRequest()` produces an immutable snapshot and marks that
revision in flight. A current consumed revision may be completed through
`CommitPreparedAdapterRevision()`, failed through `FailUpdateRequest()`, or
returned to the queue through `RetryUpdateRequest()`. Commit-before-consume
and stale commits are rejected; rejected candidate allocations are destroyed
by default.

Publication installs the adapter allocation and prepared revision before
completion events run. The result returns the displaced allocation to the
adapter owner for post-publication destruction. A reentrant source change may
therefore request a newer revision without allowing stale completion to
replace it. The previous prepared allocation and `IsGood()` remain usable
while a replacement is pending or if replacement preparation fails.

`Ready()` is specialized for this derived resource: it resolves when the
generation requested at call time has been published, rather than delegating
to a single-source object loader. Initial preparation failure rejects it.

## Adapter commit example

Consumed snapshots are explicit in-flight generations. An adapter either
publishes the current candidate atomically, requeues retryable work, or
records failure:

```js
const request = textureArray.ConsumeUpdateRequest();

try {
  const candidate = await adapter.PrepareTextureArray(request);
  const result = textureArray.CommitPreparedAdapterRevision(
    request.revision,
    "webgpu",
    candidate
  );

  // A rejected/stale candidate is destroyed by the commit method by default.
  // The adapter owns disposal of a successfully displaced allocation.
  result.displaced?.destroy();
} catch (error) {
  textureArray.FailUpdateRequest(request.revision, error, { retry: true });
}

await textureArray.Ready(); // the generation requested at call time
```

## Sources and topology

Logical paths and resolved sources are independent. `SetLayerResource()`
attaches a resolved or LOD-specific source without rewriting the logical
requested path or persistence. `TouchLayer()` invalidates an in-place source
revision. `HandleAdapterLoss()` drops an unusable adapter allocation and
schedules a complete topology rebuild. Topology-changing snapshots set
`topologyChanged: true` and report only valid current layer indices in
`dirtyLayers`.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Texture CPU pipeline and LOD membership](texture-pipeline.md)
