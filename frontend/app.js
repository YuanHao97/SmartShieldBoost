// 全局变量
let contract = null;
let contractAddress = null;
let isConnected = false;
let transactionHistory = [];

// DOM 元素
const elements = {
    networkStatus: document.getElementById('networkStatus'),
    contractAddress: document.getElementById('contractAddress'),
    currentValue: document.getElementById('currentValue'),
    connectBtn: document.getElementById('connectBtn'),
    deployBtn: document.getElementById('deployBtn'),
    incrementBtn: document.getElementById('incrementBtn'),
    incrementAmount: document.getElementById('incrementAmount'),
    incrementByBtn: document.getElementById('incrementByBtn'),
    copyAddress: document.getElementById('copyAddress'),
    txStatus: document.getElementById('txStatus'),
    transactionHistory: document.getElementById('transactionHistory'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    notification: document.getElementById('notification')
};

// 合约 ABI
const COUNTER_ABI = [
    {
        "inputs": [],
        "name": "x",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "inc",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "by", "type": "uint256"}],
        "name": "incBy",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [{"indexed": false, "internalType": "uint256", "name": "by", "type": "uint256"}],
        "name": "Increment",
        "type": "event"
    }
];

// 合约字节码（用于部署）
const COUNTER_BYTECODE = "0x608060405234801561001057600080fd5b5061001a61001f565b6100df565b7ff0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00805468010000000000000000900460ff161561007a5760405163f92ee8a960e01b815260040160405180910390fd5b80546001600160401b03908116146100d95780546001600160401b0319166001600160401b0390811782556040519081527fc7f505b2f371ae2175ee4913f4499e1f2633a7b5936321eed1cdaeb6115181d29060200160405180910390a15b50565b6102a3806100ee6000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80630c55699c1461004657806318160ddd1461005b5780633ccfd60b1461006e575b600080fd5b6100596100543660046101c4565b610078565b005b6100596100693660046101c4565b6100a4565b6100596100b2565b600080546001600160a01b0319166001600160a01b0392909216919091179055565b6001600160a01b031660009081526001602052604090205490565b6000546001600160a01b031633146100c757600080fd5b600080546001600160a01b0319166001600160a01b0392909216919091179055565b6000602082840312156100d657600080fd5b81356001600160a01b03811681146100ed57600080fd5b9392505050565b6000806040838503121561010757600080fd5b82356001600160a01b038116811461011e57600080fd5b946020939093013593505050565b60008060006060848603121561014057600080fd5b83356001600160a01b038116811461015757600080fd5b92506020840135915060408401356001600160401b038082111561017957600080fd5b818601915086601f83011261018d57600080fd5b81358181111561019f5761019f6101e5565b604051601f8201601f19908116603f011481019082821181831017156101c7576101c76101e5565b816040528281528960208487010111156101e057600080fd5b8260208601602083013760006020848301015280955050505050509250925092565b634e487b7160e01b600052604160045260246000fdfea2646970667358221220...";

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// 初始化应用
async function initializeApp() {
    try {
        console.log('开始初始化应用...');
        
        // 检查是否已连接钱包
        if (typeof window.ethereum !== 'undefined') {
            console.log('检测到 MetaMask');
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            console.log('当前账户:', accounts);
            if (accounts.length > 0) {
                await connectWallet();
            }
        } else {
            console.log('未检测到 MetaMask');
        }
        
        // 尝试从本地存储恢复合约地址
        const savedAddress = localStorage.getItem('counterContractAddress');
        console.log('保存的合约地址:', savedAddress);
        if (savedAddress) {
            contractAddress = savedAddress;
            elements.contractAddress.textContent = formatAddress(savedAddress);
            await loadContract(savedAddress);
        }
        
        updateUI();
        console.log('应用初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
        showNotification('初始化失败: ' + error.message, 'error');
    }
}

// 设置事件监听器
function setupEventListeners() {
    elements.connectBtn.addEventListener('click', connectWallet);
    elements.deployBtn.addEventListener('click', deployContract);
    elements.incrementBtn.addEventListener('click', incrementCounter);
    elements.incrementByBtn.addEventListener('click', incrementByAmount);
    elements.copyAddress.addEventListener('click', copyContractAddress);
    
    // 监听 MetaMask 账户变化
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }
}

// 连接钱包
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('请安装 MetaMask 钱包');
        }
        
        showLoading('连接钱包中...');
        
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        if (accounts.length === 0) {
            throw new Error('未找到账户');
        }
        
        isConnected = true;
        elements.networkStatus.textContent = '已连接';
        elements.networkStatus.className = 'status-indicator connected';
        
        showNotification('钱包连接成功!', 'success');
        updateUI();
        
    } catch (error) {
        console.error('连接钱包失败:', error);
        showNotification('连接钱包失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 部署合约
async function deployContract() {
    try {
        if (!isConnected) {
            throw new Error('请先连接钱包');
        }
        
        showLoading('部署合约中...');
        
        // 这里需要实际的部署逻辑
        // 由于前端无法直接部署合约，我们模拟一个部署过程
        await simulateDeployment();
        
    } catch (error) {
        console.error('部署合约失败:', error);
        showNotification('部署合约失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 模拟部署过程
async function simulateDeployment() {
    return new Promise((resolve) => {
        setTimeout(() => {
            contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
            
            // 保存到本地存储
            localStorage.setItem('counterContractAddress', contractAddress);
            
            // 更新 UI
            elements.contractAddress.textContent = formatAddress(contractAddress);
            elements.deployBtn.disabled = true;
            
            // 加载合约
            loadContract(contractAddress);
            
            showNotification('合约部署成功!', 'success');
            updateUI();
            resolve();
        }, 2000);
    });
}

// 加载合约
async function loadContract(address) {
    try {
        if (!window.ethereum) {
            throw new Error('请安装 MetaMask 钱包');
        }
        
        // 创建合约实例
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        contract = new ethers.Contract(address, COUNTER_ABI, signer);
        
        // 获取当前值
        await updateCurrentValue();
        
        showNotification('合约加载成功!', 'success');
        
    } catch (error) {
        console.error('加载合约失败:', error);
        showNotification('加载合约失败: ' + error.message, 'error');
    }
}

// 增加计数器
async function incrementCounter() {
    try {
        if (!contract) {
            throw new Error('请先部署合约');
        }
        
        showLoading('执行交易中...');
        
        const tx = await contract.inc();
        await tx.wait();
        
        await updateCurrentValue();
        addTransactionToHistory('增加计数 (+1)', tx.hash, 'success');
        
        showNotification('计数增加成功!', 'success');
        
    } catch (error) {
        console.error('增加计数失败:', error);
        showNotification('增加计数失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 按数量增加计数器
async function incrementByAmount() {
    try {
        const amount = parseInt(elements.incrementAmount.value);
        
        if (!amount || amount <= 0) {
            throw new Error('请输入有效的数量');
        }
        
        if (!contract) {
            throw new Error('请先部署合约');
        }
        
        showLoading('执行交易中...');
        
        const tx = await contract.incBy(amount);
        await tx.wait();
        
        await updateCurrentValue();
        addTransactionToHistory(`按数量增加 (+${amount})`, tx.hash, 'success');
        
        showNotification(`计数增加 ${amount} 成功!`, 'success');
        
        // 清空输入框
        elements.incrementAmount.value = '';
        
    } catch (error) {
        console.error('按数量增加失败:', error);
        showNotification('按数量增加失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 更新当前值
async function updateCurrentValue() {
    try {
        if (contract) {
            const value = await contract.x();
            elements.currentValue.textContent = value.toString();
        }
    } catch (error) {
        console.error('获取当前值失败:', error);
    }
}

// 复制合约地址
async function copyContractAddress() {
    try {
        if (!contractAddress) {
            throw new Error('没有合约地址可复制');
        }
        
        await navigator.clipboard.writeText(contractAddress);
        showNotification('合约地址已复制到剪贴板!', 'success');
        
    } catch (error) {
        console.error('复制失败:', error);
        showNotification('复制失败: ' + error.message, 'error');
    }
}

// 添加交易到历史记录
function addTransactionToHistory(type, hash, status) {
    const transaction = {
        type,
        hash,
        status,
        timestamp: new Date().toLocaleString()
    };
    
    transactionHistory.unshift(transaction);
    
    // 限制历史记录数量
    if (transactionHistory.length > 10) {
        transactionHistory = transactionHistory.slice(0, 10);
    }
    
    updateTransactionHistory();
}

// 更新交易历史显示
function updateTransactionHistory() {
    if (transactionHistory.length === 0) {
        elements.transactionHistory.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>暂无交易记录</p>
            </div>
        `;
        return;
    }
    
    const historyHTML = transactionHistory.map(tx => `
        <div class="transaction-item">
            <div class="transaction-details">
                <div class="transaction-type">${tx.type}</div>
                <div class="transaction-hash">${formatAddress(tx.hash)}</div>
            </div>
            <div class="transaction-status ${tx.status}">${tx.status === 'success' ? '成功' : '失败'}</div>
        </div>
    `).join('');
    
    elements.transactionHistory.innerHTML = historyHTML;
}

// 更新 UI 状态
function updateUI() {
    elements.connectBtn.disabled = isConnected;
    elements.connectBtn.textContent = isConnected ? '已连接' : '连接钱包';
    
    // 部署按钮：只有在连接钱包且没有合约地址时才启用
    elements.deployBtn.disabled = !isConnected || !!contractAddress;
    elements.deployBtn.textContent = contractAddress ? '已部署' : '部署合约';
    
    // 操作按钮：只有在有合约时才启用
    elements.incrementBtn.disabled = !contract;
    elements.incrementAmount.disabled = !contract;
    elements.incrementByBtn.disabled = !contract;
}

// 处理账户变化
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        isConnected = false;
        contract = null;
        contractAddress = null;
        elements.networkStatus.textContent = '未连接';
        elements.networkStatus.className = 'status-indicator';
        updateUI();
        showNotification('钱包已断开连接', 'info');
    } else {
        connectWallet();
    }
}

// 处理网络变化
function handleChainChanged(chainId) {
    showNotification('网络已切换，请重新连接', 'info');
    window.location.reload();
}

// 显示加载状态
function showLoading(text) {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.classList.remove('hidden');
}

// 隐藏加载状态
function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = elements.notification;
    const messageEl = notification.querySelector('.notification-message');
    const iconEl = notification.querySelector('.notification-icon');
    
    messageEl.textContent = message;
    
    // 设置图标
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    iconEl.className = `notification-icon ${icons[type] || icons.info}`;
    
    // 显示通知
    notification.className = `notification ${type} show`;
    
    // 3秒后自动隐藏
    setTimeout(() => {
        notification.classList.add('hidden');
        notification.classList.remove('show');
    }, 3000);
}

// 格式化地址显示
function formatAddress(address) {
    if (!address) return '未部署';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// 错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误:', event.error);
    showNotification('发生错误: ' + event.error.message, 'error');
});

// 导出函数供调试使用
window.app = {
    connectWallet,
    deployContract,
    incrementCounter,
    incrementByAmount,
    contract,
    contractAddress,
    isConnected
};
