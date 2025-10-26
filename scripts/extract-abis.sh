#!/bin/bash

# ABI提取脚本
# 用于手动提取合约ABI并生成前端文件

echo "🔧 开始提取合约ABI..."

# 检查是否在正确的目录
if [ ! -d "artifacts" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 运行ABI提取脚本
echo "📦 运行ABI提取脚本..."
npx tsx scripts/extract-abis.ts

if [ $? -eq 0 ]; then
    echo "✅ ABI提取完成！"
    echo "📄 生成的文件:"
    echo "  - frontend/contract-abis.js"
    echo "  - frontend/contract-abis.json"
    echo "  - frontend/contract-abis.d.ts"
    echo ""
    echo "🚀 现在可以刷新前端页面使用最新的ABI！"
else
    echo "❌ ABI提取失败"
    exit 1
fi
