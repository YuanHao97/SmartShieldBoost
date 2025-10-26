import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { network } from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("🚀 开始模拟交易系统...");
  
  const { viem } = await network.connect();
  
  // 获取测试账户
  const [deployer, ...accounts] = await viem.getWalletClients();
  console.log(`📊 使用 ${accounts.length} 个测试账户进行模拟交易`);

  // 读取部署信息
  let deploymentInfo;
  try {
    const deploymentPath = join(__dirname, '../log/deployment-info.json');
    const deploymentData = readFileSync(deploymentPath, 'utf8');
    deploymentInfo = JSON.parse(deploymentData);
  } catch (error) {
    console.error(error);
    console.error("❌ 无法读取部署信息，请先运行部署脚本");
    process.exit(1);
  }
  // console.log("deploymentInfo:"+JSON.stringify(deploymentInfo));
  // 获取合约实例
  const mockPYUSD = await viem.getContractAt("MockPYUSD", deploymentInfo.contracts.MockPYUSD);
  const mockETH = await viem.getContractAt("MockETH", deploymentInfo.contracts.MockETH);
  const liquidityPool = await viem.getContractAt("LiquidityPool", deploymentInfo.contracts.LiquidityPool);
  const ethSimulator = await viem.getContractAt("ETHSimulator", deploymentInfo.contracts.ETHSimulator);
  // 给所有账户铸造MockPYUSD
  const initialPYUSDBalance = 100000n * 10n ** 6n; // 100,000 PYUSD
  for (const account of accounts) {
    await mockPYUSD.write.mint([account.account.address, initialPYUSDBalance]);
  }
  console.log(`💰 给每个账户铸造了 ${Number(initialPYUSDBalance) / 1e6} PYUSD`);

  // 获取初始价格
  const initialPrice = await liquidityPool.read.getCurrentPrice();
  console.log(`📈 初始ETH价格2: ${Number(initialPrice) / 1e6} PYUSD`);

  // 交易历史
  const tradeHistory: Array<{
    trader: string;
    isBuy: boolean;
    ethAmount: string;
    pyusdAmount: string;
    price: string;
    timestamp: number;
  }> = [];

  // 模拟5次交易
  for (let i = 0; i < 5; i++) {
    const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
    const isBuy = Math.random() > 0.5;
    const ethAmount = BigInt(Math.floor(Math.random() * 2 * 1e18) + 1e17); // 0.1-2.1 ETH
    
    try {
      if (isBuy) {
        // 买入ETH
        const pyusdNeeded = await liquidityPool.read.calculateBuyAmount([ethAmount]);
        const accountBalance = await mockPYUSD.read.balanceOf([randomAccount.account.address]);
        
        if (accountBalance >= pyusdNeeded) {
          await mockPYUSD.write.approve([ethSimulator.address, pyusdNeeded], {
            account: randomAccount.account
          });
          await ethSimulator.write.buyETH([ethAmount], {
            account: randomAccount.account
          });
          
          const newPrice = await liquidityPool.read.getCurrentPrice();
          tradeHistory.push({
            trader: randomAccount.account.address,
            isBuy: true,
            ethAmount: (Number(ethAmount) / 1e18).toFixed(2),
            pyusdAmount: (Number(pyusdNeeded) / 1e6).toFixed(2),
            price: (Number(newPrice) / 1e6).toFixed(2),
            timestamp: Date.now()
          });
          
          console.log(`🟢 账户 ${randomAccount.account.address.slice(0, 6)}... 买入 ${(Number(ethAmount) / 1e18).toFixed(2)} ETH, 价格: ${(Number(newPrice) / 1e6).toFixed(2)} PYUSD`);
        }
      } else {
        // 卖出ETH
        const ethBalance = await mockETH.read.balanceOf([randomAccount.account.address]);
        const sellAmount = ethBalance > ethAmount ? ethAmount : ethBalance;
        
        if (sellAmount > 0) {
          await ethSimulator.write.sellETH([sellAmount], {
            account: randomAccount.account
          });
          
          const newPrice = await liquidityPool.read.getCurrentPrice();
          const pyusdReceived = await liquidityPool.read.calculateSellAmount([sellAmount]);
          
          tradeHistory.push({
            trader: randomAccount.account.address,
            isBuy: false,
            ethAmount: (Number(sellAmount) / 1e18).toFixed(2),
            pyusdAmount: (Number(pyusdReceived) / 1e6).toFixed(2),
            price: (Number(newPrice) / 1e6).toFixed(2),
            timestamp: Date.now()
          });
          
          console.log(`🔴 账户 ${randomAccount.account.address.slice(0, 6)}... 卖出 ${(Number(sellAmount) / 1e18).toFixed(2)} ETH, 价格: ${(Number(newPrice) / 1e6).toFixed(2)} PYUSD`);
        }
      }
    } catch (error) {
      console.log(`❌ 交易失败: ${error}`);
    }
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 输出最终结果
  console.log("\n📊 交易模拟完成!");
  
  // 获取最终价格和池子信息
  const finalPrice = await liquidityPool.read.getCurrentPrice();
  const poolInfo = await liquidityPool.read.getPoolInfo();
  
  console.log(`📈 最终ETH价格: ${(Number(finalPrice) / 1e6).toFixed(2)} PYUSD`);
  
  console.log(`🏦 最终池子状态:`);
  console.log(`   ETH储备: ${(Number(poolInfo[0]) / 1e18).toFixed(2)} ETH`);
  console.log(`   PYUSD储备: ${(Number(poolInfo[1]) / 1e6).toLocaleString()} PYUSD`);
  console.log(`   总流动性: ${(Number(poolInfo[3]) / 1e18).toFixed(2)}`);

  // 输出交易历史
  console.log("\n📋 交易历史 (最近10笔):");
  const recentTrades = tradeHistory.slice(-10);
  recentTrades.forEach((trade, index) => {
    const action = trade.isBuy ? "买入" : "卖出";
    console.log(`${index + 1}. ${action} ${trade.ethAmount} ETH, 价格: ${trade.price} PYUSD`);
  });

  // 保存交易历史到文件
  const historyPath = join(__dirname, '../trade-history.json');
  writeFileSync(historyPath, JSON.stringify(tradeHistory, null, 2));
  console.log(`\n💾 交易历史已保存到: ${historyPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });