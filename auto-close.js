// index.js – GoSpeed JS extension

export async function onLoad(ctx) {
  const { api, logger } = ctx;

  logger.info('Auto-close extension loaded');

  // Poll tasks every 2 seconds
  const interval = setInterval(async () => {
    try {
      const tasks = await api.task.list({});
      const running = tasks.filter(t => t.status === 'running' || t.status === 'waiting');

      if (running.length === 0 && tasks.length > 0) {
        logger.info('No active tasks, exiting GoSpeed in 2s...');
        clearInterval(interval);

        setTimeout(async () => {
          const verify = await api.task.list({});
          const stillRunning = verify.filter(t => t.status === 'running' || t.status === 'waiting');
          if (stillRunning.length === 0) {
            await api.system.exit();
          }
        }, 2000);
      }
    } catch (e) {
      logger.error('Auto-close check failed: ' + e.message);
    }
  }, 2000);

  // Save handle for cleanup
  ctx.state.interval = interval;
}

export async function onUnload(ctx) {
  const { state, logger } = ctx;
  if (state.interval) {
    clearInterval(state.interval);
  }
  logger.info('Auto-close extension unloaded');
}