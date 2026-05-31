// index.js
//
// Runs on each onResolve event as defined in manifest.json

// Helper: check whether any tasks are still active
async function hasActiveTasks() {
  // Gopeed JS API is documented in gopeed-js typings referenced in docs
  // We can query tasks via HTTP API using fetch here.
  // Default HTTP API port is 9999; adjust if you changed it in settings.
  const baseUrl = "http://127.0.0.1:9999";

  try {
    const resp = await fetch(baseUrl + "/api/v1/tasks");
    if (!resp.ok) {
      return true; // assume active to avoid premature exit
    }
    const tasks = await resp.json();

    // Consider running or waiting tasks as "active"
    return tasks.some(t => t.status === "running" || t.status === "waiting");
  } catch (e) {
    // If API fails, do not exit Gopeed
    gopeed.logger.error("auto-close: failed to query tasks: " + e);
    return true;
  }
}

// Main hook: called when a task is being resolved
gopeed.events.onResolve(async (ctx) => {
  try {
    const url = ctx.req.url || "";
    gopeed.logger.info("auto-close: onResolve for " + url);

    // Basic passthrough resolution: let Gopeed just download the requested URL
    // This mirrors the demo style from docs.
    ctx.res = {
      name: url.split("/").pop() || "download",
      files: [
        {
          name: url.split("/").pop() || "download",
          req: {
            url: url
          }
        }
      ]
    };

    // Small delay to let the current task register and start
    await new Promise(r => setTimeout(r, 1000));

    const active = await hasActiveTasks();

    if (!active) {
      gopeed.logger.info("auto-close: no active tasks, exiting Gopeed in 2s");
      await new Promise(r => setTimeout(r, 2000));

      // Re-check before actually exiting
      if (!(await hasActiveTasks())) {
        gopeed.logger.info("auto-close: still no active tasks, calling system.exit");
        // Gopeed’s JS bindings expose system APIs through gopeed.* (see gopeed-js)
        if (gopeed.system && typeof gopeed.system.exit === "function") {
          await gopeed.system.exit();
        } else {
          gopeed.logger.error("auto-close: gopeed.system.exit not available in this build");
        }
      } else {
        gopeed.logger.info("auto-close: tasks became active again, abort exit");
      }
    }
  } catch (e) {
    gopeed.logger.error("auto-close: onResolve error: " + e);
  }
});
