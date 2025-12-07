
# ETH交易模拟器前端

## 功能特性

### ✅ 已实现的功能
- **Web3集成**: 使用ethers.js连接MetaMask钱包
- **真实合约交互**: 与部署的智能合约进行交互
- **实时价格显示**: 从合约获取当前ETH价格
- **流动性池信息**: 显示ETH和PYUSD储备量
- **真实交易**: 支持买入和卖出ETH
- **交易记录**: 显示用户的交易历史
- **价格图表**: 实时价格走势图

### 🔧 技术栈
- **前端**: HTML5 + CSS3 + JavaScript
- **Web3**: ethers.js v5.7.2 (稳定可靠)
- **钱包**: MetaMask

### 📋 合约地址 (Hardhat本地网络)
```javascript
const CONTRACT_ADDRESSES = {
    MockPYUSD: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    MockETH: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
    LiquidityPool: "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
};
```

### 🚀 使用方法

1. **启动本地网络**:
   ```bash
   npx hardhat node
   ```

2. **部署合约**:
   ```bash
   npx hardhat run scripts/deploy-trading-system.ts --network localhost
   ```

3. **打开前端**:
   - 在浏览器中打开 `trading-dashboard.html`
   - 确保MetaMask连接到本地网络 (http://localhost:8545)
   - 导入测试账户私钥

4. **开始交易**:
   - 连接钱包后会自动显示当前价格和池子信息
   - 输入ETH数量，系统会自动计算需要的PYUSD
   - 点击买入/卖出按钮执行交易

### 💡 主要改进

#### 移除的功能
- ❌ 模拟价格波动
- ❌ 模拟交易功能
- ❌ 虚假的交易记录

#### 新增的功能
- ✅ 真实的Web3连接
- ✅ 智能合约交互
- ✅ 实时价格获取
- ✅ 真实的交易执行
- ✅ 事件监听和自动更新
- ✅ 余额检查
- ✅ 交易状态提示

### 🔍 核心功能说明

#### 1. Web3连接
```javascript
// 创建public client
publicClient = viem.createPublicClient({
    transport: viem.windowEthereum()
});

// 创建wallet client
walletClient = viem.createWalletClient({
    transport: viem.windowEthereum()
});

// 获取用户账户
const accounts = await walletClient.requestAccounts();
userAddress = accounts[0];
```

#### 2. 合约交互
```javascript
// 买入ETH
const buyHash = await ethSimulatorContract.write.buyETH([ethAmountWei]);
await publicClient.waitForTransactionReceipt({ hash: buyHash });

// 卖出ETH  
const sellHash = await ethSimulatorContract.write.sellETH([ethAmountWei]);
await publicClient.waitForTransactionReceipt({ hash: sellHash });
```

#### 3. 事件监听
```javascript
publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.ETHSimulator,
    abi: ETH_SIMULATOR_ABI,
    eventName: 'ETHTraded',
    onLogs: (logs) => {
        logs.forEach(log => {
            if (log.args.trader.toLowerCase() === userAddress.toLowerCase()) {
                addTradeToHistory(log.args.isBuy, log.args.ethAmount, log.args.pyusdAmount, log.args.newPrice);
                updatePriceDisplay();
                updatePoolInfo();
                updateTradesList();
            }
        });
    }
});
```

### ⚠️ 注意事项

1. **网络配置**: 确保MetaMask连接到正确的本地网络
2. **账户余额**: 确保测试账户有足够的PYUSD进行交易
3. **Gas费用**: 本地网络通常不需要真实的Gas费用
4. **合约初始化**: 确保流动性池已经正确初始化

### 🐛 故障排除

- **连接失败**: 检查MetaMask是否安装并连接到本地网络
- **交易失败**: 检查账户余额和合约状态
- **价格不更新**: 检查合约是否正确部署和初始化
- **事件不触发**: 检查事件监听器是否正确设置