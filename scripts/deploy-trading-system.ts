import { writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { network } from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("🚀 开始部署交易系统...");
  const { viem } = await network.connect();
  // 获取部署者账户
  const [deployer] = await viem.getWalletClients();
  console.log(`📊 部署者地址: ${deployer.account.address}`);
  // console.log(`💰 部署者余额: ${Number(await viem.getBalance({ address: deployer.account.address })) / 1e18} ETH`);

  // 部署合约
  console.log("\n📦 开始部署合约...");

  // 1. 部署MockPYUSD
  console.log("1️⃣ 部署MockPYUSD...");
  const mockPYUSD = await viem.deployContract("MockPYUSD", []);
  console.log(`✅ MockPYUSD 部署到: ${mockPYUSD.address}`);

  // 2. 部署MockETH
  console.log("2️⃣ 部署MockETH...");
  const mockETH = await viem.deployContract("MockETH", []);
  console.log(`✅ MockETH 部署到: ${mockETH.address}`);

  // 3. 部署PyusdHandler
  console.log("3️⃣ 部署PyusdHandler...");
  const pyusdHandler = await viem.deployContract("PyusdHandler", [mockPYUSD.address]);
  console.log(`✅ PyusdHandler 部署到: ${pyusdHandler.address}`);

  // 4. 部署LiquidityPool
  console.log("4️⃣ 部署LiquidityPool...");
  const liquidityPool = await viem.deployContract("LiquidityPool", [mockPYUSD.address, mockETH.address, pyusdHandler.address]);
  console.log(`✅ LiquidityPool 部署到: ${liquidityPool.address}`);

  // 5. 部署ETHSimulator
  console.log("5️⃣ 部署ETHSimulator...");
  const ethSimulator = await viem.deployContract("ETHSimulator", [liquidityPool.address, mockETH.address]);
  console.log(`✅ ETHSimulator 部署到: ${ethSimulator.address}`);

  // 初始化系统
  console.log("\n🔧 初始化系统...");

  // 给部署者铸造初始PYUSD
  const initialPYUSD = 20000000n * 10n ** 6n; // 20,000,000 PYUSD
  await mockPYUSD.write.mint([deployer.account.address, initialPYUSD]);
  console.log(`💰 给部署者铸造了 ${Number(initialPYUSD) / 1e6} PYUSD`);

  // 将LiquidityPool添加为MockETH的铸造者
  await mockETH.write.addMinter([liquidityPool.address]);
  console.log(`🔑 将LiquidityPool添加为MockETH的铸造者`);

  // 初始化流动性池
  const initialETHReserve = 100n * 10n ** 18n; // 100 ETH
  const initialPYUSDReserve = 10000n * 10n ** 6n; // 10,000 PYUSD (100 ETH * 100 PYUSD/ETH)
  
  await mockPYUSD.write.approve([liquidityPool.address, initialPYUSDReserve]);
  await liquidityPool.write.initializePool([initialETHReserve, initialPYUSDReserve]);
  console.log(`🏦 流动性池初始化完成: ${Number(initialETHReserve) / 1e18} ETH, ${Number(initialPYUSDReserve) / 1e6} PYUSD`);
  // const cp = await liquidityPool.read.getCurrentPrice();
  // console.log(`📈 初始ETH价格1: ${Number(cp) / 1e6} PYUSD`);
  // 获取初始价格
  const initialPrice = await liquidityPool.read.getCurrentPrice();
  console.log(`📈 初始ETH价格: ${Number(initialPrice) / 1e6} PYUSD`);

  // 保存部署信息
  const deploymentInfo = {
    network: "hardhat",
    deployer: deployer.account.address,
    contracts: {
      MockPYUSD: mockPYUSD.address,
      MockETH: mockETH.address,
      PyusdHandler: pyusdHandler.address,
      LiquidityPool: liquidityPool.address,
      ETHSimulator: ethSimulator.address
    },
    initialization: {
      initialETHReserve: Number(initialETHReserve) / 1e18,
      initialPYUSDReserve: Number(initialPYUSDReserve) / 1e6,
      initialPrice: Number(initialPrice) / 1e6
    },
    timestamp: new Date().toISOString()
  };

  const deploymentPath = join(__dirname, "../log/deployment-info.json");
  writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 部署信息已保存到: ${deploymentPath}`);

  // 输出部署摘要
  console.log("\n📋 部署摘要:");
  console.log("=".repeat(50));
  console.log(`🌐 网络: Hardhat`);
  console.log(`👤 部署者: ${deploymentInfo.deployer}`);
  console.log(`📦 MockPYUSD: ${deploymentInfo.contracts.MockPYUSD}`);
  console.log(`📦 MockETH: ${deploymentInfo.contracts.MockETH}`);
  console.log(`📦 PyusdHandler: ${deploymentInfo.contracts.PyusdHandler}`);
  console.log(`📦 LiquidityPool: ${deploymentInfo.contracts.LiquidityPool}`);
  console.log(`📦 ETHSimulator: ${deploymentInfo.contracts.ETHSimulator}`);
  console.log(`💰 初始价格: ${deploymentInfo.initialization.initialPrice} PYUSD`);
  console.log("=".repeat(50));

  // 测试基本功能
  console.log("\n🧪 测试基本功能...");
  
  // 测试价格查询
  const currentPrice = await liquidityPool.read.getCurrentPrice();
  console.log(`✅ 当前价格查询: ${Number(currentPrice) / 1e6} PYUSD`);
  
  // 测试池子信息查询
  const poolInfo = await liquidityPool.read.getPoolInfo();
  // console.log(`✅ 池子信息查询: ETH=${Number(poolInfo.ethReserve) / 1e18}, PYUSD=${Number(poolInfo.pyusdReserve) / 1e6}`);
  
  // 测试买入计算
  const testETHAmount = 1n * 10n ** 18n; // 1 ETH
  const buyAmount = await liquidityPool.read.calculateBuyAmount([testETHAmount]);
  console.log(`✅ 买入1 ETH需要: ${Number(buyAmount) / 1e6} PYUSD`);
  
  // 测试卖出计算
  const sellAmount = await liquidityPool.read.calculateSellAmount([testETHAmount]);
  console.log(`✅ 卖出1 ETH得到: ${Number(sellAmount) / 1e6} PYUSD`);

  console.log("\n🎉 部署完成！系统已准备就绪。");
  console.log("\n📝 下一步操作:");
  console.log("1. 运行模拟交易: npx hardhat run scripts/simulate-trading.ts");
  console.log("2. 打开前端页面: frontend/trading-dashboard.html");
  console.log("3. 查看部署信息: log/deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });