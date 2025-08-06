# 调试指南

## 常见错误及解决方案

### 1. "Could not establish connection. Receiving end does not exist."

**原因：**
- Content Script 未正确注入
- 消息传递时机问题
- 权限配置不正确

**解决方案：**

#### 步骤1：检查扩展权限
确保 `manifest.json` 包含必要的权限：
```json
{
  "permissions": [
    "activeTab",
    "scripting", 
    "downloads",
    "tabs"
  ]
}
```

#### 步骤2：使用测试版本
1. 临时修改 `manifest.json` 中的 popup 指向测试版本：
```json
{
  "action": {
    "default_popup": "popup-test.html"
  }
}
```

2. 重新加载扩展
3. 点击扩展图标，使用测试按钮

#### 步骤3：检查控制台日志
1. 右键点击扩展图标 → 检查弹出内容
2. 查看 Console 标签页的错误信息
3. 在目标网页按 F12 打开开发者工具，查看 Console

### 2. 调试步骤

#### 方法1：使用测试版本
1. 安装扩展后，打开任意网页
2. 点击扩展图标
3. 点击"测试连接"按钮
4. 查看日志输出

#### 方法2：手动检查
1. 打开 `chrome://extensions/`
2. 找到你的扩展
3. 点击"详情"
4. 检查权限是否正确
5. 点击"重新加载"按钮

#### 方法3：开发者工具调试
1. 在目标网页按 F12
2. 查看 Console 标签页
3. 查找 "Content script loaded successfully" 消息
4. 检查是否有错误信息

### 3. 常见问题排查

#### 问题1：扩展无法安装
- 检查 Chrome 版本是否支持 Manifest V3
- 确保所有文件都在正确位置
- 检查 manifest.json 格式是否正确

#### 问题2：Content Script 未加载
- 检查 manifest.json 中的 content_scripts 配置
- 确保目标网页在 matches 范围内
- 尝试手动注入 content script

#### 问题3：消息传递失败
- 确保 popup 和 content script 都正确监听消息
- 检查消息格式是否正确
- 确保返回 true 保持消息通道开放

### 4. 测试流程

1. **基础测试**
   - 安装扩展
   - 打开 test.html
   - 使用测试版本验证连接

2. **功能测试**
   - 切换到正式版本
   - 尝试截图功能
   - 检查下载的图片

3. **兼容性测试**
   - 在不同网站上测试
   - 测试不同长度的页面
   - 检查各种网页类型

### 5. 日志分析

查看以下关键日志：
- "Content script loaded successfully" - Content Script 加载成功
- "Content script received message" - 消息接收成功
- "Screenshot completed" - 截图完成
- 任何错误信息

### 6. 恢复步骤

如果测试版本工作正常，但正式版本有问题：

1. 逐步替换文件
2. 每次替换后测试
3. 找出具体的问题文件
4. 针对性修复

### 7. 联系支持

如果问题仍然存在：
1. 收集完整的错误日志
2. 记录复现步骤
3. 提供 Chrome 版本信息
4. 描述具体的错误现象 