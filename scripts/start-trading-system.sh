#!/bin/bash
lsof -t -i :8080 | xargs -r kill -9
lsof -t -i :8545 | xargs -r kill -9

echo "🚀 Starting ETH Trading Simulation System"
echo "================================"

# Check Node.js and npm
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js not found, please install Node.js first"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm not found, please install npm first"
    exit 1
fi

# Check dependencies
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Compile contracts
echo "🔨 Compiling smart contracts..."
npx hardhat compile

# Create log directory
mkdir -p log

echo "🧪 Starting local node..."
npx hardhat node > log/localhost.log 2>&1 &
NODE_PID=$!
# Wait for node to start
echo "⏳ Waiting for node to start..."
sleep 3

# Deploy contracts
echo "🚀 Deploying contracts..."
npx hardhat run scripts/deploy-trading-system.ts --network localhost

# Run simulation trading
echo "🎲 Starting simulation trading..."
npx hardhat run scripts/simulate-trading.ts --network localhost &

# Start frontend server
echo "🌐 Starting frontend server..."
cd frontend
python3 -m http.server 8080 &
FRONTEND_PID=$!

echo ""
echo "✅ System startup completed!"
echo "================================"
echo "📊 Frontend Interface: http://localhost:8080/trading-dashboard.html"
echo "📋 Deployment Info: log/deployment-info.json"
echo "📈 Trading History: trade-history.json"
echo "📝 Node Logs: log/localhost.log"
echo ""
echo "Press Ctrl+C to stop the system"
echo "================================"

# Wait for user interrupt
trap 'echo ""; echo "🛑 Stopping system..."; kill $FRONTEND_PID 2>/dev/null; kill $NODE_PID 2>/dev/null; exit 0' INT
wait
