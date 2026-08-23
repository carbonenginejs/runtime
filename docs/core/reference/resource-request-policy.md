# Resource request policy

Status: Evolving
Scope: `CjsLibrary.ResolveResourceRequest`
Audience: Runtime and resource-service integrators
Summary: Defines named behavior selection, request precedence, path rewriting, output tags, and failure cases.

## Resolution order

The effective request precedence is:

```text
resource defaults
    < behavior request and resolver result
    < caller options
    < path @output suffix
```

`formatOptions` is shallow-merged at each level. Other request fields replace
the earlier value.

## Named behaviors

A behavior is a structural object. It can contain:

- `request`: a static request-options recipe.
- `CanResolveResourceRequest(context)`: a synchronous match predicate.
- `ResolveResourceRequest(context)`: a synchronous path/options resolver.

Registration can mark a behavior as a default and assign a numeric priority.
Default candidates are sorted by descending priority, then registration order.
Equal highest priorities fail as ambiguous.

A caller can select a behavior by name with `behavior` or
`resourceBehavior`, or disable behavior selection for one request with
`behavior: false`. Conflicting selectors, an unknown explicit name, malformed
resolver output, or a promise returned by a behavior method fails closed.

Behavior methods outside the request-policy vocabulary remain on the behavior
object and are not forwarded to the resource manager.

## Path rewriting

`ResolveResourceRequest()` preserves both the original source path and the
resolved path. A behavior resolver may return:

```js
{
    path: "res:/prepared/ship.cmf",
    options: {
        requirement: "geometry",
        emit: "cmf"
    }
}
```

Only `path` and `options` are accepted in that result.

## Diagnostic output suffix

A final `@output` suffix selects a promised output without changing the source
filename passed to the resource service:

```js
const decoded = await library.Fetch("res:/model/ship.gr2@cmf");
```

The suffix is normalized to lowercase and becomes both `variant` and `emit`
in the final request, so it takes precedence over defaults, behaviors, and
caller options. The resource/format service remains responsible for deciding
whether the requested output is supported.

## Immediate and promise facades

Resolution stays synchronous because `GetResource()` must be able to return an
immediate shared resource handle. The `Fetch*` methods perform the same policy
selection and adapt the configured service to promise-facing results.
