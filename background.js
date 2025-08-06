// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  
  if (request.action === 'captureVisibleTab') {
    captureVisibleTab(sender.tab.id).then(dataUrl => {
      console.log('Screenshot captured successfully');
      sendResponse({ success: true, dataUrl });
    }).catch(error => {
      console.error('Screenshot capture failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道开放
  }
});

// 截取当前可见区域
async function captureVisibleTab(tabId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    });
    return dataUrl;
  } catch (error) {
    console.error('截图API调用失败:', error);
    throw error;
  }
} 