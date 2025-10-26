#!/bin/bash
lsof -t -i :8080 | xargs -r kill -9
lsof -t -i :8545 | xargs -r kill -9

echo "🚀 启动ETH交易模拟系统"
echo "================================"

# 检查Node.js和npm
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到npm，请先安装npm"
    exit 1
fi

# 检查依赖
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖..."
    npm install
fi

# 编译合约
echo "🔨 编译智能合约..."
npx hardhat compile

# 创建日志目录
mkdir -p log

echo "🧪 启动本地节点..."
npx hardhat node > log/localhost.log 2>&1 &
NODE_PID=$!
# 等待节点启动
echo "⏳ 等待节点启动..."
sleep 3

# 部署合约
echo "🚀 部署合约..."
npx hardhat run scripts/deploy-trading-system.ts --network localhost

# 运行模拟交易
echo "🎲 开始模拟交易..."
npx hardhat run scripts/simulate-trading.ts --network localhost &

# 启动前端服务器
echo "🌐 启动前端服务器..."
cd frontend
python3 -m http.server 8080 &
FRONTEND_PID=$!

echo ""
echo "✅ 系统启动完成！"
echo "================================"
echo "📊 前端界面: http://localhost:8080/trading-dashboard.html"
echo "📋 部署信息: log/deployment-info.json"
echo "📈 交易历史: trade-history.json"
echo "📝 节点日志: log/localhost.log"
echo ""
echo "按 Ctrl+C 停止系统"
echo "================================"

# 等待用户中断
trap 'echo ""; echo "🛑 正在停止系统..."; kill $FRONTEND_PID 2>/dev/null; kill $NODE_PID 2>/dev/null; exit 0' INT
wait
