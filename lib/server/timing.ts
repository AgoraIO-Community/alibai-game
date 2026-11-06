import './only';

/**
 * Step durations for measuring startup. Logs step names and milliseconds only: never pass
 * tokens, prompts, IDs or player data in. To remove, delete this file and its `timer` calls.
 */
export interface StepTimer {
  step<T>(name: string, work: () => Promise<T>): Promise<T>;
  /** Adds a number that isn't a duration, such as a time to match against the browser's marks. */
  note(name: string, value: number): void;
  done(): void;
}
export const noTimer: StepTimer = { step: (_name, work) => work(), note() {}, done() {} };

export function stepTimer(label: string, log: (line: string) => void = console.info): StepTimer {
  const began = performance.now();
  const steps: Record<string, number> = {};
  let failed = false;
  return {
    async step(name, work) {
      const at = performance.now();
      try { return await work(); }
      catch (error) { failed = true; throw error; }
      finally { steps[name] = Math.round(performance.now() - at); }
    },
    note(name, value) { steps[name] = value; },
    done() { log(`[timing] ${label} ${JSON.stringify({ ...steps, total: Math.round(performance.now() - began), ok: !failed })}`); },
  };
}
