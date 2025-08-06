document.addEventListener('DOMContentLoaded', function() {
  const captureBtn = document.getElementById('captureBtn');
  const fullPageBtn = document.getElementById('fullPageBtn');
  const status = document.getElementById('status');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');

  // 区域截图功能
  captureBtn.addEventListener('click', async function() {
    try {
      // 禁用按钮
      captureBtn.disabled = true;
      captureBtn.textContent = '截图中...';
      status.textContent = '正在准备截图...';
      progressContainer.style.display = 'block';
      progressBar.style.width = '10%';

      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('无法获取当前标签页');
      }

      // 注入content script并发送消息
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // 发送消息给content script开始截图
      console.log('发送截图请求...');
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'startCapture'
      });

      console.log('收到截图响应:', response);

      if (response && response.success) {
        status.textContent = '截图完成！正在保存...';
        progressBar.style.width = '90%';
        
        // 下载图片
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let filename;
        
        if (response.area) {
          // 区域截图
          filename = `area-screenshot-${response.area.width}x${response.area.height}-${timestamp}.png`;
        } else {
          // 完整页面截图
          filename = `fullpage-screenshot-${timestamp}.png`;
        }
        
        console.log('准备下载文件:', filename);
        
        await chrome.downloads.download({
          url: response.dataUrl,
          filename: filename,
          saveAs: true
        });

        status.textContent = response.area ? '区域截图已保存！' : '截图已保存！';
        progressBar.style.width = '100%';
      } else {
        throw new Error(response?.error || '截图失败');
      }

    } catch (error) {
      console.error('截图错误:', error);
      status.textContent = `错误: ${error.message}`;
    } finally {
      // 恢复按钮状态
      setTimeout(() => {
        captureBtn.disabled = false;
        captureBtn.textContent = '选择区域截图';
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
        status.textContent = '选择截图方式';
      }, 2000);
    }
  });

  // 完整页面截图功能
  fullPageBtn.addEventListener('click', async function() {
    try {
      // 禁用按钮
      fullPageBtn.disabled = true;
      fullPageBtn.textContent = '截图中...';
      status.textContent = '正在准备截图...';
      progressContainer.style.display = 'block';
      progressBar.style.width = '10%';

      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('无法获取当前标签页');
      }

      // 注入content script并发送消息
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // 发送消息给content script开始完整页面截图
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'captureFullPage'
      });

      if (response && response.success) {
        status.textContent = '截图完成！正在保存...';
        progressBar.style.width = '90%';
        
        // 下载图片
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `fullpage-screenshot-${timestamp}.png`;
        
        await chrome.downloads.download({
          url: response.dataUrl,
          filename: filename,
          saveAs: true
        });

        status.textContent = '完整页面截图已保存！';
        progressBar.style.width = '100%';
      } else {
        throw new Error(response?.error || '截图失败');
      }

    } catch (error) {
      console.error('截图错误:', error);
      status.textContent = `错误: ${error.message}`;
    } finally {
      // 恢复按钮状态
      setTimeout(() => {
        fullPageBtn.disabled = false;
        fullPageBtn.textContent = '完整页面截图';
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
        status.textContent = '选择截图方式';
      }, 2000);
    }
  });
}); 