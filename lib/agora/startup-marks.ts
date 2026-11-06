'use client'

/**
 * Browser startup marks, visible in the Performance panel as `alibai:*` and logged once as a
 * single line of milliseconds. Timings only. To remove, delete this file and its `marks` calls.
 *
 * In order: sdk-import, mic, connect-response (POST /connect returned; Agora starts on the server
 * after this), player-joined, mic-published, then for each remote {agent,avatar}: -joined
 * (user-joined), -published-{audio,video} (user-published), -decoded-{audio,video} (first decoded
 * frame), then ready-request, ready-pending (first retry) and ready (the server started the clock).
 *
 * server-epoch is this attempt's start on the server's clock, good to about one round trip. The
 * agent's join delay is server-epoch + agent-joined - agoraReturnedAt, from the server's
 * `[timing] agent-start` line. A negative result means it joined before Agora's call returned.
 */
export function startupMarks() {
  const began = performance.now()
  const marks: Record<string, number> = {}
  return {
    mark(name: string) {
      if (name in marks) return
      marks[name] = Math.round(performance.now() - began)
      performance.mark(`alibai:${name}`)
    },
    note(name: string, value: number) { marks[name] = value },
    anchor(serverTime: string) { marks['server-epoch'] = Date.parse(serverTime) - Math.round(performance.now() - began) },
    report(outcome: 'ready' | 'failed') { console.info(`[timing] startup ${outcome} ${JSON.stringify(marks)}`) },
  }
}
