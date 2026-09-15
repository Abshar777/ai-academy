/**
 * Runs once when the Node server starts. Its one job is the seminar reminder
 * scheduler: every thirty seconds, send whatever reminder is due and not yet
 * sent. Thirty seconds rather than a minute so the 3-minute and 5-minute
 * reminders land close to their mark instead of up to a minute late.
 *
 * Off in development unless SEMINAR_REMINDERS_ENABLED=true is set: a dev
 * server left open through 19:30 must never email sixty real registrants. On
 * in production unless SEMINAR_REMINDERS_ENABLED=false. Sending is claimed in
 * Mongo before it happens, so several instances ticking together still send
 * each reminder once — see lib/seminar-reminders.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runDueReminders, schedulerEnabled } = await import("./lib/seminar-reminders");
  if (!schedulerEnabled()) {
    console.info("[seminar/reminders] scheduler off (SEMINAR_REMINDERS_ENABLED)");
    return;
  }

  const tick = async () => {
    try {
      const result = await runDueReminders();
      if (result.ran.length) console.info("[seminar/reminders] sent", JSON.stringify(result));
    } catch (err) {
      console.error("[seminar/reminders] tick failed", err);
    }
  };

  console.info("[seminar/reminders] scheduler on — checking every 30s");
  setInterval(tick, 30_000);
  void tick();
}
