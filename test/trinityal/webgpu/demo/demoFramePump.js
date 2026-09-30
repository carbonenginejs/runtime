import { blue } from "../../../../npm/dist/global/blue/index.js";
import { TriDevice } from "../../../../npm/dist/trinity/core/index.js";
import { Tr2RenderJobs, TriRenderJob, TriStepPythonCB } from "../../../../npm/dist/trinity/renderJob/index.js";

/** Runs the demo draw inside the device's one recurring render job. */
export function createDemoFramePump(device, draw)
{
  const previousJobs = device.GetRenderJobs();
  const jobs = previousJobs ?? new Tr2RenderJobs();
  const job = new TriRenderJob();
  const step = new TriStepPythonCB();
  let disposed = false;
  let failed = false;
  let failure;
  step.SetCallback(() => {
    try { draw(); }
    catch (error) { failed = true; failure = error; }
  });
  job.name = "WebGPU demo scene";
  job.steps.push(step);
  jobs.recurring.push(job);
  device.SetRenderJobs(jobs);
  const wasRegistered = blue.os.IsRegisteredForTicks(device);
  blue.os.RegisterForTicks(device, TriDevice.TICK_COOKIE);
  return {
    render() {
      if (disposed) return false;
      failed = false;
      failure = undefined;
      blue.os.PumpOS();
      // Report draw errors after the device closes its frame and retires pools.
      if (failed) throw failure;
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const index = jobs.recurring.indexOf(job);
      if (index >= 0) jobs.recurring.splice(index, 1);
      step.SetCallback(null);
      if (!previousJobs && device.GetRenderJobs() === jobs) device.SetRenderJobs(null);
      if (!wasRegistered) blue.os.UnregisterForTicks(device, TriDevice.TICK_COOKIE);
    }
  };
}
