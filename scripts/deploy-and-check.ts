import hre from "hardhat";

async function main() {
  console.log("=== 部署并查看 Counter 合约 ===");
  
  // 获取网络连接
  const { viem } = await hre.network.connect();
  
  // 部署合约
  const counter = await viem.deployContract("Counter");
  
  console.log("✅ Counter 合约已部署");
  console.log("合约地址:", counter.address);
  
  // 查看初始值
  const initialValue = await counter.read.x();
  console.log("初始计数器值:", initialValue.toString());
  
  // 测试增加计数
  console.log("正在增加计数...");
  await counter.write.inc();
  
  const newValue = await counter.read.x();
  console.log("增加后的计数器值:", newValue.toString());
  
  // 测试按数量增加
  console.log("正在按 5 增加计数...");
  await counter.write.incBy([5n]);
  
  const finalValue = await counter.read.x();
  console.log("最终计数器值:", finalValue.toString());
  
  console.log("\n=== 合约交互完成 ===");
  console.log("合约地址:", counter.address);
  console.log("你可以在 Hardhat 控制台中使用这个地址与合约交互");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });