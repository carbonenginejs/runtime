export class CjsTestWorkerFormat
{
  static async readAsync(input, options = {}) {
    return {
      bytes: Array.from(input),
      options,
      worker: true
    };
  }
}
