import { useState } from "react";
import React from "react";
import "./swap.css";
import { ethers } from "ethers";
import { main } from "./multicall";

const Swap = () => {

    const [connectionStatus, setConnectionStatus] = useState(false);
    const [formData, setFormData] = useState({
        token1: "",
        amount1: "",
        token2: "",
        amount2: "",
        token3: "",
    });
    const [totalSwappedAmount , setTotalSwappedAmount ] = useState(0);
    // let totalSwapAmount;

    const tokens = ["ETH", "DAI", "USDC", "WBTC", "USDT"];
    const tokenAddresses = {
        ETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    };
    const tokenSwapFees = new Map([
        ["WBTC_ETH", [0.3, 0.05]],//
        ["USDC_ETH", [0.3, 0.05]],//
        ["ETH_USDT", [0.3, 0.05, 0.01]],//
        ["DAI_USDC", [0.01, 0.05]],//
        ["DAI_USDT", [0.01]],//
        ["USDC_USDT", [0.01]],//
        ["WBTC_USDT", [0.3]],//
        ["UNI_ETH", [0.3]],//
        ["MNT_ETH", [0.3]],
        ["LINK_ETH", [0.3]],
        ["WBTC_USDC", [0.3]],//
        ["DAI_ETH", [0.3]],//
        ["DOG_ETH", [0.3]],
        ["PEPE_ETH", [0.3]],
    ]);
    function getSwapFees(tokenIn, tokenOut) {
        const key1 = `${tokenIn}_${tokenOut}`;
        const value1 = tokenSwapFees.get(key1);
        
        const key2 = `${tokenOut}_${tokenIn}`;
        const value2 = tokenSwapFees.get(key2);
       
        // console.log("key1", value1);
        // console.log("key2", value2);
        // console.log(value1 === undefined);
        if(value1 === undefined){
            // console.log("Executing the true statement...");
            return value2;
        } 
        else {
            // console.log("Executing the false statement...");
            return value1;
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    //function to check if the tokenIn and amountIn are not empty 
    function isTokenValid(tokenIn, amountIn, tokenFee) {
        // console.log(tokenIn !== undefined);
        // console.log(amountIn !== "");
        // console.log(tokenFee !== undefined);
        return (tokenIn !== undefined) && (amountIn !== "") && (tokenFee !== undefined);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { token1, amount1, token2, amount2, token3 } = formData;
        
        const token1Address = tokenAddresses[token1];
        // console.log("token 1 address: ",token1Address);
        
        const token2Address = tokenAddresses[token2];
        // console.log("token 2 address: ",token2Address);
        const tokenOutAddress = tokenAddresses[token3];

        const token1Fee = getSwapFees(token1, token3);
        console.log("token1Fee: ",token1Fee);
        
        const token2Fee = getSwapFees(token2, token3);
        console.log("token2Fee: ",token2Fee);

        const tokensIn = [token1Address, token2Address];
        const amountsIn = [amount1, amount2];
        const feesIn = [token1Fee, token2Fee];

        const isToken1Valid = isTokenValid(token1Address, amount1, token1Fee);
        console.log("isToken1Valid",isToken1Valid);
        const isToken2Valid = isTokenValid(token2Address, amount2, token2Fee);
        console.log("isToken2Valid",isToken2Valid);

        
        if (!isToken1Valid && isToken2Valid) {
            alert("Token 1 or its amount is invalid.");
            alert("You are sending the transaction for only token2 swap.");
            try {
                const totalSwap = await main([token2Address], [amount2], [token2Fee], tokenOutAddress);
                setTotalSwappedAmount(totalSwap);
            } catch (error) {
                console.error(error);
            }
        }
        else if (!isToken2Valid && isToken1Valid) {
            alert("Token 2 or its amount is invalid.");
            alert("You are sending the transaction for only token1 swap.");
            try {
                const totalSwap = await main([token1Address], [amount1], [token1Fee], tokenOutAddress);
                setTotalSwappedAmount(totalSwap);
            } catch (error) {
                console.error(error);
            }
        }
        else if(isToken2Valid && isToken1Valid){
            
            console.log("You are sending the transaction for both token swaps.");
            try {
                const totalSwap = await main(tokensIn, amountsIn, feesIn, tokenOutAddress);
                setTotalSwappedAmount(totalSwap);
            } catch (error) {
                console.error(error);
            }
        }
        else{
            alert("Invalid tokens and amounts. Please check the tokens and amounts and try again!");
        }
    };


    const walletConnect = async () => {
        try {
            if (!window.ethereum) {
                throw new Error("Metamask is not Installed! Please install metamask");
            }

            const currentNetwork = await window.ethereum.request({
                method: 'eth_chainId'
            });
            console.log(currentNetwork);
            if (currentNetwork !== "0xaa36a7") {
                //change the metamask network from any other network to sepolia testnet
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: "0xaa36a7" }]
                });
            }

            //   await window.ethereum.request({
            //     method: 'wallet_requestPermissions',
            //     params: [{eth_accounts: {}}]
            //   });

            //let's create a provide and signer that can be used to perform the read and write operations on the blockchain
            const newProvider = new ethers.BrowserProvider(window.ethereum);
            const newSigner = await newProvider.getSigner();
            const walletConnected = await newSigner.getAddress();
            console.log(walletConnected);
            setConnectionStatus(true);

        } catch (error) {
            console.log({ Error, error });
        }
    }

    async function walletDisconnect() {
        setConnectionStatus(false);
    }

    return (
        <div className="container">
            <div className="title">
                <h1>Multi Token Swap</h1>
                <button className="connect-wallet" onClick={connectionStatus ? walletDisconnect : walletConnect}>{connectionStatus ? "Disconnect Wallet" : "Connect Wallet"}</button>
            </div>
            <form onSubmit={handleSubmit} className="swap-section">
                <div className="swap-row">
                    <label htmlFor="token1">Token 1</label>
                    <select name="token1" id="token1" value={formData.token1} onChange={handleChange}>
                        <option value="" disabled>
                            Select a token
                        </option>
                        {tokens.map((token) => (
                            <option key={token} value={token}>
                                {token}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        id="amount1"
                        name="amount1"
                        value={formData.amount1}
                        onChange={handleChange}
                        placeholder="Amount"
                    />
                </div>

                <div className="swap-row">
                    <label htmlFor="token2">Token 2</label>
                    <select name="token2" id="token2" value={formData.token2} onChange={handleChange}>
                        <option value="" disabled>
                            Select a token
                        </option>
                        {tokens.map((token) => (
                            <option key={token} value={token}>
                                {token}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        id="amount2"
                        name="amount2"
                        value={formData.amount2}
                        onChange={handleChange}
                        placeholder="Amount"
                    />
                </div>
                <div className="swap-row">
                    <label htmlFor="token3">Swap Token Into</label>
                    <select name="token3" id="token3" value={formData.token3} onChange={handleChange}>
                        <option value="" disabled>
                            Select a token
                        </option>
                        {tokens.map((token) => (
                            <option key={token} value={token}>
                                {token}
                            </option>
                        ))}
                    </select>
                    <h4>{`Swapped Amount: ${totalSwappedAmount}`}</h4>
                </div>

                <button type="submit" className="submit-button">
                    Swap
                </button>
            </form>
        </div>
    );
};
export default Swap;




// if(token1In === tokenAddresses["ETH"]){
//     console.log("Swapping ETH token1..");
//     await swapEthToken(token1In, tokenOut, amount1In);
// }
// else{
//     console.log("Swapping ERC20 Tokens...");
//     await swapErc20Token(token1In, tokenOut, amount1In);
// }