// 调试版本的content script
console.log('调试版本content script已加载');

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  if (request.action === 'startCapture') {
    console.log('开始区域选择器...');
    
    // 简化的测试：直接返回一个测试图片
    setTimeout(() => {
      console.log('模拟截图完成');
      sendResponse({
        success: true,
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        area: { x: 100, y: 100, width: 300, height: 200 }
      });
    }, 1000);
    
    return true;
  }
  
  if (request.action === 'captureFullPage') {
    console.log('开始完整页面截图...');
    
    setTimeout(() => {
      console.log('模拟完整页面截图完成');
      sendResponse({
        success: true,
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      });
    }, 1000);
    
    return true;
  }
});

// 页面加载完成后的确认
document.addEventListener('DOMContentLoaded', () => {
  console.log('调试版本: DOM加载完成');
});

// 立即执行的确认
console.log('调试版本: Script加载完成'); 