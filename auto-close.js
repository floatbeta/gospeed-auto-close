const { gospeed, storage } = await import('@gospeed/base');

let checkInterval = null;
let wasIdle = false;

async function onStart() {
  // Monitor download state changes
  gopeer.onDownloadStateChanged(async (event) => {
    await checkIdle();
  });

  // Also check periodically in case of batch completions
  checkInterval = setInterval(checkIdle, 2000);
}

async function checkIdle() {
  try {
    const downloads = await gospeed.download.getList({ 
      status: ['running', 'paused', 'waiting'] 
    });
    
    const hasActiveDownloads = downloads && downloads.length > 0;
    
    if (!hasActiveDownloads && !wasIdle) {
      // All downloads finished - close Gopeed after short delay
      setTimeout(async () => {
        // Verify still no active downloads
        const verifyDownloads = await gospeed.download.getList({ 
          status: ['running', 'paused', 'waiting'] 
        });
        
        if (!verifyDownloads || verifyDownloads.length === 0) {
          await gospeed.system.exit();
        }
      }, 1000);
      wasIdle = true;
    } else if (hasActiveDownloads) {
      wasIdle = false;
    }
  } catch (error) {
    console.error('Auto-close check failed:', error);
  }
}

async function onStop() {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
}

export default {
  onStart,
  onStop
};
