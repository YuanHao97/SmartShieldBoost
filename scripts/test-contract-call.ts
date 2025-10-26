import { ethers } from "ethers";

async function testContractCall() {
    try {
        // Connect to local Hardhat node
        const provider = new ethers.JsonRpcProvider("http://localhost:8545");
        
        // ETHSimulator contract address
        const ethSimulatorAddress = "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9";
        
        // Simplified ABI, only getCurrentPrice function
        const abi = [
            {
                "inputs": [],
                "name": "getCurrentPrice",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        // Create contract instance
        const contract = new ethers.Contract(ethSimulatorAddress, abi, provider);
        
        console.log("🔍 Testing contract call...");
        console.log(`📍 Contract address: ${ethSimulatorAddress}`);
        
        // Call getCurrentPrice function
        const priceWei = await contract.getCurrentPrice();
        const price = parseFloat(ethers.formatEther(priceWei));
        
        console.log(`💰 Current price: ${price} PYUSD`);
        console.log("✅ Contract call successful!");
        
        // Test with Web3Provider (same as frontend)
        console.log("\n🔍 Testing with Web3Provider...");
        const web3Provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
        const web3Contract = new ethers.Contract(ethSimulatorAddress, abi, web3Provider);
        
        const web3PriceWei = await web3Contract.getCurrentPrice();
        const web3Price = parseFloat(ethers.utils.formatEther(web3PriceWei));
        
        console.log(`💰 Web3Provider price: ${web3Price} PYUSD`);
        console.log("✅ Web3Provider call successful!");
        
    } catch (error) {
        console.error("❌ Contract call failed:", error);
    }
}

testContractCall();
