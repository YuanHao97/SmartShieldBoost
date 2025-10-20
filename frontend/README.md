# SmartShieldBoost 前端界面

这是一个现代化的 Web 前端界面，用于与 SmartShieldBoost 项目中的 Counter 智能合约进行交互。

## 功能特性

- 🎨 **现代化设计**: 使用渐变背景、毛玻璃效果和流畅动画
- 🔗 **钱包连接**: 支持 MetaMask 钱包连接
- 📊 **实时数据显示**: 显示当前计数器值和合约地址
- ⚡ **合约交互**: 支持增加计数和按数量增加功能
- 📱 **响应式设计**: 适配桌面和移动设备
- 📝 **交易历史**: 记录和显示交易历史
- 🔔 **通知系统**: 实时反馈操作结果

## 使用方法

### 1. 启动前端服务器

```bash
# 方法一：使用提供的启动脚本
./start.sh

# 方法二：使用 Python HTTP 服务器
python3 -m http.server 8080

# 方法三：直接打开文件
# 双击 index.html 文件在浏览器中打开
```

### 2. 访问前端界面

在浏览器中访问: `http://localhost:8080`

### 3. 使用步骤

1. **连接钱包**
   - 点击"连接钱包"按钮
   - 在 MetaMask 中确认连接

2. **部署合约**
   - 连接钱包后，点击"部署合约"按钮
   - 等待部署完成

3. **操作计数器**
   - 点击"增加 (+1)"按钮增加计数
   - 输入数量后点击"按数量增加"按钮

## 技术栈

- **HTML5**: 语义化标记
- **CSS3**: 现代样式、渐变、动画
- **JavaScript**: ES6+ 语法
- **Ethers.js**: 以太坊交互库
- **Font Awesome**: 图标库
- **Google Fonts**: 字体

## 文件结构

```
frontend/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── app.js             # JavaScript 逻辑
├── start.sh           # 启动脚本
└── README.md          # 说明文档
```

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 注意事项

1. **MetaMask 钱包**: 需要安装 MetaMask 浏览器扩展
2. **网络连接**: 确保网络连接正常
3. **Gas 费用**: 交易需要支付 Gas 费用
4. **合约地址**: 部署后的合约地址会保存在本地存储中

## 故障排除

### 常见问题

1. **无法连接钱包**
   - 确保已安装 MetaMask
   - 检查 MetaMask 是否已解锁
   - 尝试刷新页面

2. **交易失败**
   - 检查账户余额是否足够支付 Gas 费用
   - 确保网络连接正常
   - 查看浏览器控制台错误信息

3. **合约未加载**
   - 确保合约地址正确
   - 检查合约是否已部署
   - 尝试重新部署合约

## 开发说明

### 自定义样式

修改 `styles.css` 文件来自定义界面样式：

```css
/* 修改主题颜色 */
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
}
```

### 添加新功能

在 `app.js` 中添加新的合约交互功能：

```javascript
// 添加新的合约方法
async function newContractMethod() {
    try {
        const tx = await contract.newMethod();
        await tx.wait();
        showNotification('操作成功!', 'success');
    } catch (error) {
        showNotification('操作失败: ' + error.message, 'error');
    }
}
```

## 许可证

MIT License - 详见项目根目录的 LICENSE 文件。
