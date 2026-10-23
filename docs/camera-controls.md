# Camera controls and deferred fitting

TnyCameraControls owns editor input around Carbon's EveCamera. A Frame request
made while the viewport has zero size is deferred until Resize sees a usable
viewport. That request remains valid only until newer camera intent supersedes
it: restoring a pose, editing FOV, orbiting, panning, dollying or cancellation
(including a selection change) discards the pending fit. An ordinary resize only
records viewport dimensions; it does not fit the current selection.

The regression reproduced before the correction: defer Frame at zero size,
restore distance 123 and centre [4, 5, 6], then resize to 800 by 500. The stale
request replaced that pose with the current bounds' centre [100, 200, 300] and a
fitted distance. Focused tests cover the restored pose, cancellation/gestures,
and a deferred explicit fit that remains valid until its viewport appears.

This corrects the shared controls' pending intent; it does not change Carbon's
projection. EveCamera.CalculateProjectionMatrix clamps the horizontal extent
above aspect 1.6 (Carbon EveCamera.cpp:615-625). A wider viewport can therefore
change effective vertical FOV while the camera's fieldOfView property and pose
stay fixed. A different editor projection policy must be chosen explicitly.

Graphene browser investigation on 2026-10-24 used a panned, rotated camera at
distance 771.297304832488 and fieldOfView .8. Creating and selecting a temperate
planet preserved its pose, eye and projection exactly. Changing the viewport
from 1280 by 720 to 960 by 420 changed the canvas from 480 by 450 to 960 by 306;
pose and eye stayed identical while projection[5] changed from 2.365222454071045
to 4.637691020965576, consistent with the native aspect clamp. The ordinary
planet-load reset report was not reproduced. Browser zoom shortcuts did not
change the available in-app browser's zoom, so actual browser zoom remains
unverified. These observations were on the pre-refresh renderer artifact.
