// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'startCapture') {
    // 启动区域选择器
    startAreaSelector().then(result => {
      console.log('Screenshot completed:', result);
      sendResponse(result);
    }).catch(error => {
      console.error('Screenshot failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道开放
  }
  
  if (request.action === 'captureFullPage') {
    captureFullPage().then(result => {
      console.log('Full page screenshot completed:', result);
      sendResponse(result);
    }).catch(error => {
      console.error('Full page screenshot failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'captureArea') {
    captureArea(request.area).then(result => {
      console.log('Area screenshot completed:', result);
      sendResponse(result);
    }).catch(error => {
      console.error('Area screenshot failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// 截取完整页面的函数
async function captureFullPage() {
  try {
    // 获取页面尺寸信息
    const pageInfo = await getPageInfo();
    
    // 创建canvas来拼接图片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置canvas尺寸为完整页面尺寸
    canvas.width = pageInfo.viewportWidth;
    canvas.height = pageInfo.fullHeight;
    
    // 计算需要截图的次数
    const viewportHeight = pageInfo.viewportHeight;
    const totalScreenshots = Math.ceil(pageInfo.fullHeight / viewportHeight);
    
    // 保存原始滚动位置
    const originalScrollTop = window.scrollY;
    
    // 逐段截图并拼接
    for (let i = 0; i < totalScreenshots; i++) {
      // 滚动到指定位置
      const scrollTop = i * viewportHeight;
      window.scrollTo(0, scrollTop);
      
      // 等待页面稳定
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 截取当前可见区域
      const dataUrl = await captureVisibleTab();
      
      // 将截图绘制到canvas上
      const img = await loadImage(dataUrl);
      const drawY = scrollTop;
      const drawHeight = Math.min(viewportHeight, pageInfo.fullHeight - drawY);
      
      ctx.drawImage(img, 0, 0, pageInfo.viewportWidth, drawHeight, 
                   0, drawY, pageInfo.viewportWidth, drawHeight);
    }
    
    // 恢复原始滚动位置
    window.scrollTo(0, originalScrollTop);
    
    // 返回完整的截图数据
    return {
      success: true,
      dataUrl: canvas.toDataURL('image/png')
    };
    
  } catch (error) {
    console.error('截图过程出错:', error);
    throw error;
  }
}

// 获取页面信息
async function getPageInfo() {
  return new Promise((resolve) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const fullHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    resolve({
      viewportWidth,
      viewportHeight,
      fullHeight
    });
  });
}

// 截取当前可见区域
async function captureVisibleTab() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'captureVisibleTab'
    }, (response) => {
      if (response && response.success) {
        resolve(response.dataUrl);
      } else {
        reject(new Error('截图失败'));
      }
    });
  });
}

// 加载图片
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// 区域选择器类
class ScreenshotSelector {
  constructor() {
    this.isActive = false;
    this.isSelecting = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.selectionBox = null;
    this.toolbar = null;
    this.hint = null;
    this.onCapture = null;
    this.onCancel = null;
    this.onFullPage = null;
  }

  // 初始化选择器
  init(onCapture, onCancel, onFullPage) {
    this.onCapture = onCapture;
    this.onCancel = onCancel;
    this.onFullPage = onFullPage;
    
    this.createSelector();
    this.bindEvents();
    this.show();
  }

  // 创建选择器DOM
  createSelector() {
    // 创建主容器
    this.container = document.createElement('div');
    this.container.className = 'screenshot-selector';
    this.container.innerHTML = `
      <div class="selection-box" style="display: none;">
        <div class="resize-handle nw"></div>
        <div class="resize-handle ne"></div>
        <div class="resize-handle sw"></div>
        <div class="resize-handle se"></div>
        <div class="size-info"></div>
      </div>
      <div class="toolbar">
        <button class="fullpage-btn">完整页面</button>
        <button class="capture-btn">截取区域</button>
        <button class="cancel-btn">取消</button>
      </div>
      <div class="hint">拖拽鼠标选择截图区域，或点击按钮选择完整页面</div>
    `;

    document.body.appendChild(this.container);
    
    this.selectionBox = this.container.querySelector('.selection-box');
    this.toolbar = this.container.querySelector('.toolbar');
    this.hint = this.container.querySelector('.hint');
  }

  // 绑定事件
  bindEvents() {
    // 鼠标按下事件
    this.container.addEventListener('mousedown', (e) => {
      if (e.target === this.container) {
        this.startSelection(e);
      }
    });

    // 鼠标移动事件
    this.container.addEventListener('mousemove', (e) => {
      if (this.isSelecting) {
        this.updateSelection(e);
      }
    });

    // 鼠标松开事件
    this.container.addEventListener('mouseup', (e) => {
      if (this.isSelecting) {
        this.endSelection(e);
      }
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    // 工具栏按钮事件
    this.toolbar.querySelector('.capture-btn').addEventListener('click', () => {
      this.captureSelectedArea();
    });

    this.toolbar.querySelector('.cancel-btn').addEventListener('click', () => {
      this.hide();
    });

    this.toolbar.querySelector('.fullpage-btn').addEventListener('click', () => {
      this.captureFullPage();
    });
  }

  // 开始选择
  startSelection(e) {
    this.isSelecting = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentX = e.clientX;
    this.currentY = e.clientY;
    
    this.selectionBox.style.display = 'block';
    this.container.classList.add('selecting');
    this.hint.style.display = 'none';
  }

  // 更新选择
  updateSelection(e) {
    this.currentX = e.clientX;
    this.currentY = e.clientY;
    
    const left = Math.min(this.startX, this.currentX);
    const top = Math.min(this.startY, this.currentY);
    const width = Math.abs(this.currentX - this.startX);
    const height = Math.abs(this.currentY - this.startY);
    
    this.selectionBox.style.left = left + 'px';
    this.selectionBox.style.top = top + 'px';
    this.selectionBox.style.width = width + 'px';
    this.selectionBox.style.height = height + 'px';
    
    // 更新尺寸信息
    const sizeInfo = this.selectionBox.querySelector('.size-info');
    sizeInfo.textContent = `${width} × ${height}`;
  }

  // 结束选择
  endSelection(e) {
    this.isSelecting = false;
    this.container.classList.remove('selecting');
    
    const width = Math.abs(this.currentX - this.startX);
    const height = Math.abs(this.currentY - this.startY);
    
    // 如果选择区域太小，隐藏选择框
    if (width < 10 || height < 10) {
      this.selectionBox.style.display = 'none';
      this.hint.style.display = 'block';
    }
  }

  // 截取选中区域
  captureSelectedArea() {
    if (!this.selectionBox.style.display || this.selectionBox.style.display === 'none') {
      alert('请先选择一个区域');
      return;
    }
    
    const rect = this.selectionBox.getBoundingClientRect();
    const area = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
    
    if (this.onCapture) {
      this.onCapture(area);
    }
     //this.hide();
  }

  // 截取完整页面
  captureFullPage() {
    this.hide();
    if (this.onFullPage) {
      this.onFullPage();
    }
  }

  // 显示选择器
  show() {
    this.isActive = true;
    this.container.style.display = 'block';
    this.hint.style.display = 'block';
  }

  // 隐藏选择器
  hide() {
    this.isActive = false;
    this.container.style.display = 'none';
    this.selectionBox.style.display = 'none';
    this.hint.style.display = 'none';
    
    if (this.onCancel) {
      this.onCancel();
    }
  }

  // 销毁选择器
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// 启动区域选择器
async function startAreaSelector() {
  return new Promise((resolve, reject) => {
    try {
      // 注入CSS样式
      injectStyles();
      
      // 创建选择器
      const selector = new ScreenshotSelector();
      
      selector.init(
        // 区域截图回调
        (area) => {
          captureArea(area).then(resolve).catch(reject);
        },
        // 取消回调
        () => {
          reject(new Error('用户取消了截图'));
        },
        // 完整页面回调
        () => {
          captureFullPage().then(resolve).catch(reject);
        }
      );
      
    } catch (error) {
      reject(error);
    }
  });
}

// 截取指定区域
async function captureArea(area) {
  try {
    console.log('开始区域截图，区域信息:', area);
    
    // 获取页面尺寸信息
    const pageInfo = await getPageInfo();
    console.log('页面信息:', pageInfo);
    
    // 创建canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置canvas尺寸为选择区域尺寸
    canvas.width = area.width;
    canvas.height = area.height;
    
    console.log('Canvas尺寸:', canvas.width, 'x', canvas.height);
    
    // 计算需要截图的次数（如果区域高度超过视口）
    const viewportHeight = pageInfo.viewportHeight;
    const areaHeight = area.height;
    const totalScreenshots = Math.ceil(areaHeight / viewportHeight);
    
    console.log('截图计算:', {
      viewportHeight,
      areaHeight,
      totalScreenshots
    });
    
    // 保存原始滚动位置
    const originalScrollTop = window.scrollY;
    
    // 逐段截图并拼接
    for (let i = 0; i < totalScreenshots; i++) {
      // 修复滚动位置计算，确保每次滚动都能覆盖对应的区域段
      const scrollTop = Math.max(0, area.y + (i * viewportHeight) - viewportHeight / 2);
      window.scrollTo(0, scrollTop);
      
      // 增加等待时间或使用更可靠的页面稳定检测
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 截取当前可见区域
      const dataUrl = await captureVisibleTab();
      
      // 将截图绘制到canvas上
      const img = await loadImage(dataUrl);
      
      // 修复绘制参数计算
      const drawY = i * viewportHeight;
      const remainingHeight = areaHeight - drawY;
      const drawHeight = Math.min(viewportHeight, remainingHeight);
      const sourceY = Math.max(0, viewportHeight / 2 - (scrollTop - area.y));
      
      console.log(`截图段 ${i + 1}/${totalScreenshots}:`, {
        scrollTop,
        sourceY,
        drawY,
        drawHeight,
        area: area
      });
      
      ctx.drawImage(img, 
        area.x, sourceY, area.width, drawHeight,  // 源区域
        0, drawY, area.width, drawHeight           // 目标区域
      );
    }
    
    // 恢复原始滚动位置
    window.scrollTo(0, originalScrollTop);
    
    console.log('区域截图完成，准备返回数据');
    
    // 返回截图数据
    const result = {
      success: true,
      dataUrl: canvas.toDataURL('image/png'),
      area: area
    };
    
    console.log('截图结果:', result);
    return result;
    
  } catch (error) {
    console.error('区域截图过程出错:', error);
    throw error;
  }
}

// 注入CSS样式
function injectStyles() {
  if (document.getElementById('screenshot-selector-styles')) {
    return; // 样式已存在
  }
  
  const style = document.createElement('style');
  style.id = 'screenshot-selector-styles';
  style.textContent = `
    /* 区域选择器样式 */
    .screenshot-selector {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999999;
      cursor: crosshair;
      user-select: none;
    }

    .screenshot-selector.active {
      cursor: crosshair;
    }

    .screenshot-selector .selection-box {
      position: absolute;
      border: 2px solid #4285f4;
      background: rgba(66, 133, 244, 0.1);
      pointer-events: none;
      z-index: 1000000;
    }

    .screenshot-selector .selection-box .resize-handle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: #4285f4;
      border: 1px solid white;
      cursor: pointer;
      pointer-events: all;
    }

    .screenshot-selector .selection-box .resize-handle.nw {
      top: -4px;
      left: -4px;
      cursor: nw-resize;
    }

    .screenshot-selector .selection-box .resize-handle.ne {
      top: -4px;
      right: -4px;
      cursor: ne-resize;
    }

    .screenshot-selector .selection-box .resize-handle.sw {
      bottom: -4px;
      left: -4px;
      cursor: sw-resize;
    }

    .screenshot-selector .selection-box .resize-handle.se {
      bottom: -4px;
      right: -4px;
      cursor: se-resize;
    }

    .screenshot-selector .selection-box .size-info {
      position: absolute;
      top: -30px;
      left: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
    }

    .screenshot-selector .toolbar {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 12px;
      z-index: 1000001;
      display: flex;
      gap: 8px;
    }

    .screenshot-selector .toolbar button {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }

    .screenshot-selector .toolbar .capture-btn {
      background: #4285f4;
      color: white;
    }

    .screenshot-selector .toolbar .capture-btn:hover {
      background: #3367d6;
    }

    .screenshot-selector .toolbar .cancel-btn {
      background: #f1f3f4;
      color: #5f6368;
    }

    .screenshot-selector .toolbar .cancel-btn:hover {
      background: #e8eaed;
    }

    .screenshot-selector .toolbar .fullpage-btn {
      background: #34a853;
      color: white;
    }

    .screenshot-selector .toolbar .fullpage-btn:hover {
      background: #2d8e47;
    }

    .screenshot-selector .hint {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      text-align: center;
      z-index: 1000002;
      pointer-events: none;
    }

    .screenshot-selector.selecting .selection-box {
      border-style: dashed;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
  `;
  
  document.head.appendChild(style);
}