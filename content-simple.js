// 简化的content script用于测试
console.log('Content script loaded successfully');

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'startCapture') {
    // 简单的测试响应
    console.log('Starting capture process...');
    
    // 模拟截图过程
    setTimeout(() => {
      console.log('Capture completed');
      sendResponse({ 
        success: true, 
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        message: 'Test screenshot completed'
      });
    }, 1000);
    
    return true; // 保持消息通道开放
  }
});

// 页面加载完成后的确认
document.addEventListener('DOMContentLoaded', () => {
  console.log('Content script: DOM loaded');
});

// 立即执行的确认
console.log('Content script: Script loaded and ready'); 