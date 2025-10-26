import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { network } from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("🚀 Starting trading simulation system...");
  
  const { viem } = await network.connect();
  
  // Get test accounts
  const [deployer, ...accounts] = await viem.getWalletClients();
  console.log(`📊 Using ${accounts.length} test accounts for simulation trading`);

  // Read deployment info
  let deploymentInfo;
  try {
    const deploymentPath = join(__dirname, '../log/deployment-info.json');
    const deploymentData = readFileSync(deploymentPath, 'utf8');
    deploymentInfo = JSON.parse(deploymentData);
  } catch (error) {
    console.error(error);
    console.error("❌ Cannot read deployment info, please run deployment script first");
    process.exit(1);
  }
  // console.log("deploymentInfo:"+JSON.stringify(deploymentInfo));
  // Get contract instances
  const mockPYUSD = await viem.getContractAt("MockPYUSD", deploymentInfo.contracts.MockPYUSD);
  const mockETH = await viem.getContractAt("MockETH", deploymentInfo.contracts.MockETH);
  const liquidityPool = await viem.getContractAt("LiquidityPool", deploymentInfo.contracts.LiquidityPool);
  const ethSimulator = await viem.getContractAt("ETHSimulator", deploymentInfo.contracts.ETHSimulator);
  // Mint MockPYUSD to all accounts
  const initialPYUSDBalance = 100000n * 10n ** 6n; // 100,000 PYUSD
  for (const account of accounts) {
    await mockPYUSD.write.mint([account.account.address, initialPYUSDBalance]);
  }
  console.log(`💰 Minted ${Number(initialPYUSDBalance) / 1e6} PYUSD to each account`);

  // Get initial price
  const initialPrice = await liquidityPool.read.getCurrentPrice();
  console.log(`📈 Initial ETH price: ${Number(initialPrice) / 1e6} PYUSD`);

  // Trading history
  const tradeHistory: Array<{
    trader: string;
    isBuy: boolean;
    ethAmount: string;
    pyusdAmount: string;
    price: string;
    timestamp: number;
  }> = [];

  // Simulate 10 trades
  for (let i = 0; i < 10; i++) {
    const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
    const isBuy = Math.random() > 0.5;
    const ethAmount = BigInt(Math.floor(Math.random() * 2 * 1e18) + 1e17); // 0.1-2.1 ETH
    
    try {
      if (isBuy) {
        // Buy ETH
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
          
          console.log(`🟢 Account ${randomAccount.account.address.slice(0, 6)}... bought ${(Number(ethAmount) / 1e18).toFixed(2)} ETH, price: ${(Number(newPrice) / 1e6).toFixed(2)} PYUSD`);
        }
      } else {
        // Sell ETH
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
          
          console.log(`🔴 Account ${randomAccount.account.address.slice(0, 6)}... sold ${(Number(sellAmount) / 1e18).toFixed(2)} ETH, price: ${(Number(newPrice) / 1e6).toFixed(2)} PYUSD`);
        }
      }
    } catch (error) {
      console.log(`❌ Trading failed: ${error}`);
    }
    
    // Wait for a while
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Output final results
  console.log("\n📊 Trading simulation completed!");
  
  // Get final price and pool info
  const finalPrice = await liquidityPool.read.getCurrentPrice();
  const poolInfo = await liquidityPool.read.getPoolInfo();
  
  console.log(`📈 Final ETH price: ${(Number(finalPrice) / 1e6).toFixed(2)} PYUSD`);
  
  console.log(`🏦 Final pool status:`);
  console.log(`   ETH Reserve: ${(Number(poolInfo[0]) / 1e18).toFixed(2)} ETH`);
  console.log(`   PYUSD Reserve: ${(Number(poolInfo[1]) / 1e6).toLocaleString()} PYUSD`);
  console.log(`   Total Liquidity: ${(Number(poolInfo[3]) / 1e18).toFixed(2)}`);

  // Output trading history
  console.log("\n📋 Trading History (Last 10 trades):");
  const recentTrades = tradeHistory.slice(-10);
  recentTrades.forEach((trade, index) => {
    const action = trade.isBuy ? "Buy" : "Sell";
    console.log(`${index + 1}. ${action} ${trade.ethAmount} ETH, price: ${trade.price} PYUSD`);
  });

  // Save trading history to file
  const historyPath = join(__dirname, '../trade-history.json');
  writeFileSync(historyPath, JSON.stringify(tradeHistory, null, 2));
  console.log(`\n💾 Trading history saved to: ${historyPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });