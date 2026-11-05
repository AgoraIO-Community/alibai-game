'use client'

/**
 * Browser startup marks, visible in the Performance panel as `alibai:*` and logged once as a
 * single line of milliseconds. Timings only. To remove, delete this file and its `marks` calls.
 */
export function startupMarks(began = performance.now()) {
  const marks: Record<string, number> = {}
  return {
    mark(name: string) {
      if (name in marks) return
      marks[name] = Math.round(performance.now() - began)
      performance.mark(`alibai:${name}`)
    },
    report(outcome: 'ready' | 'failed') { console.info(`[timing] startup ${outcome} ${JSON.stringify(marks)}`) },
  }
}
