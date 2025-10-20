#!/bin/bash

# 启动简单的 HTTP 服务器来运行前端
echo "启动 SmartShieldBoost 前端..."
echo "请在浏览器中访问: http://localhost:8080"
echo "按 Ctrl+C 停止服务器"

# 使用 Python 的简单 HTTP 服务器
if command -v python3 &> /dev/null; then
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8080
else
    echo "错误: 未找到 Python，请安装 Python 或使用其他 HTTP 服务器"
    echo "你也可以直接双击 index.html 文件在浏览器中打开"
fi
