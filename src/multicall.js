const { ethers } = require("ethers");
const V3SwapRouterABI = require("./abis/ISwapRouter.json");
const PeripheryPaymentsABI = require("./abis/IPeripheryPayments.json");
const MultiCallABI = require("./abis/IMulticall.json");
const ERC20ABI = require("./abis/IERC20.json");
const V3QuoterABI = require("./abis/IQuoter.json");

const V3SwapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const V3QuoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
const swapRouterContract = new ethers.Contract(V3SwapRouterAddress,
    V3SwapRouterABI.concat(PeripheryPaymentsABI).concat(MultiCallABI)
);
const provider = new ethers.BrowserProvider(window.ethereum);

// const provider = new ethers.JsonRpcProvider();
// const wallet = new ethers.Wallet("");
// const signer = wallet.connect(provider);

//to create a params object and return it
function getParams(tokenIn, amountIn, tokenFeeIn, tokenOut, walletAddress) {
    const fee = tokenFeeIn[0] * Math.pow(10, 4);
    const deadline = Math.floor(Date.now() / 1000) + (10 * 60);
    const parsedAmountIn = ethers.parseEther(amountIn); //the amountIn should be a string...
    const amountOutMinimum = 0;

    const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: fee,
        recipient: walletAddress,
        deadline: deadline,
        amountIn: parsedAmountIn,
        amountOutMinimum: amountOutMinimum,
        sqrtPriceLimitX96: 0
    }
    return params;
}

//to check if swaprouter contract is approved for the required amount of tokens whose owner is walletAddress
async function getAllowance(tokenIn, signer, walletAddress) {
    const token = new ethers.Contract(tokenIn, ERC20ABI, signer);
    const owner = walletAddress;
    const spender = V3SwapRouterAddress;
    const tokenAllowance = await token.allowance(owner, spender);
    return tokenAllowance;

}

//to get approval of tokens from the user
async function approveTokens(tokenIn, amountIn, signer) {

    const token = new ethers.Contract(tokenIn, ERC20ABI, signer);
    console.log("Approving funds...");
    const approveTx = await token.approve(V3SwapRouterAddress, amountIn);
    const reciept = await approveTx.wait();
    console.log("Approved funds successfully...");
    if (reciept) {
        return true;
    } else {
        return false;
    }

}

//to convert the input amountIn string to the respective decimal amount
function amountStringToDecimals(tokenIn, amountIn) {
    let amount;
    if (tokenIn === USDT || tokenIn === USDC) {
        amount = ethers.parseUnits(amountIn, 6);
        return amount;
    }
    else if (tokenIn === WBTC) {
        amount = ethers.parseUnits(amountIn, 8);
        return amount;
    } else {
        amount = ethers.parseUnits(amountIn, 18);
        return amount;
    }
}

//takes tx longs and decodes the output
function decodeLogs(txLogs) {
    let totalSwapAmount = 0n;
    let abi = ["event Swap(address indexed sender, address indexed recipient,int256 amount0,int256 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick)"];
    const iNew = new ethers.Interface(abi);
    let parsedLogs = [];
    for(let log of txLogs){
        const parsedLog = iNew.parseLog(log);
        if(parsedLog !== null){
            parsedLogs.push(parsedLog);
            console.log(parsedLog);
        }
    }
    console.log("Parsed Logs Length",parsedLogs.length);
    for(var j =0;j<parsedLogs.length;j++){
        const args = parsedLogs[j].args;
        const amountInValue = args[2];
        const amountOutValue = args[3];
        // console.log(typeof(amountInValue));
        // console.log(typeof(amountOutValue));
        if (amountInValue < 0) {
            //amountInvalue was taken out from the pool...
            //swapped happended from token of amountOutValue to token of amountInvalue
            // const amountInString
            totalSwapAmount += (amountInValue*(-1n));
        }else{
            totalSwapAmount += (amountOutValue*(-1n));
        }
    }
    return totalSwapAmount;
}
//convert bigint to the required decimals
function bigIntToDecimals(tokenIn, amountIn) {
    let amount;
    console.log("Changing the number according to decimal places...");
    if (tokenIn === USDT || tokenIn === USDC) {
        amount = parseFloat((Number(amountIn) / (1000000))+'').toFixed(2);
        return amount;
    }
    else if (tokenIn === WBTC) {
        amount = parseFloat((Number(amountIn) / (100000000))+'').toFixed(2);
        return amount;
    } else {
        amount = parseFloat((Number(amountIn) / Number(1000000000000000000n))+'').toFixed(2);
        return amount;
    }
}

const main = async (tokenInArr, amountInArr, tokenFeeArr, tokenOut) => {

    let ethValue = ethers.parseEther("0");
    const signer = await provider.getSigner();
    const walletAddress = await signer.getAddress();
    // console.log(walletAddress);

    let paramsArr = [];
    let CallsArr = [];
    if (tokenInArr.length === amountInArr.length) {
        let approved = true;
        for (var i = 0; i < tokenInArr.length; i++) {
            const allowance = await getAllowance(tokenInArr[i], signer, walletAddress);
            const amountInNum = amountStringToDecimals(tokenInArr[i], amountInArr[i]);

            console.log("Allowance: ", tokenInArr[i], allowance, typeof (allowance));
            console.log("AmountIn: ", tokenInArr[i], amountInNum, typeof (amountInNum));
            // console.log("Allowance less than swap amount: ", allowance < amountInNum);
            if (allowance < amountInNum) {
                if (tokenInArr[i] !== WETH) {
                    console.log("Token is not WETH: ", tokenInArr[i] !== WETH);
                    try {
                        approved = await approveTokens(tokenInArr[i], amountInNum, signer);
                    } catch (error) {
                        console.error(error);
                    }

                }
            }
            // console.log("Contructing the params...");
            const param = getParams(tokenInArr[i], amountInArr[i], tokenFeeArr[i], tokenOut, walletAddress);
            // console.log("Got the params.. Adding it to the params array...");
            paramsArr.push(param);

            //if any of the tokenIn is weth then set the value of the eth sent with the transaction to amountIn
            if (tokenInArr[i] === WETH) {
                ethValue = ethers.parseEther(amountInArr[i]);
            }
        }
        try {
            // console.log("Starting the encoding data process...");
            console.log("Params Array length: ", paramsArr.length);
            //encode the params and save it in a n array
            for (var j = 0; j < paramsArr.length; j++) {
                console.log("Encoding data for the paramsArr index:", j);
                const encodeData = swapRouterContract.interface.encodeFunctionData("exactInputSingle", [paramsArr[j]]);
                CallsArr.push(encodeData);
            }
            // console.log("Encoded the function data and added to the CallsArr...");

            //the main multi call function call
            const encodeMultiCallData = swapRouterContract.interface.encodeFunctionData("multicall", [CallsArr]);

            console.log("Encoded all the required multicall data...");

            //construct the transaction and then call the contract
            const txArgs = {
                to: V3SwapRouterAddress,
                from: walletAddress,
                data: encodeMultiCallData,
                value: ethValue
            }

            console.log("Transaction sent to the blockchain...Waiting for conformation...");

            if (approved) {
                const tx = await signer.sendTransaction(txArgs);
                const reciept = await tx.wait();
                console.log("Reciept: ", reciept);

                const txLogs = reciept.logs; // an array of logs
                const swapAmount = decodeLogs(txLogs);
                const amount = bigIntToDecimals(tokenOut, swapAmount);

                if (amount) {
                    alert("Swap is success...");
                }
                console.log(amount);
                console.log("Transaction is success...");
                return amount;
            }
            else {
                alert("Tokens not approved...");
            }
        } catch (error) {
            console.error(error);
        }
    }
}

export { main };

// decoding individual call
                // for (const calldata of calldataArray) {
                //     // decoding each log. if you don't have the function in the uniswapInterface, this would throw error
                //     console.log(swapRouterContract.interface.decodeFunctionData(calldata.slice(0, 10), calldata));
                //     // console.log(uniswapInterface.decodeFunctionData(calldata.slice(0, 10), calldata));
                // }


//function to get the minimum amountoutput for the tokenIn
// async function getQuoteExactOutputSingle(tokenIn, tokenOut, fee, amountIn, sqrtPriceLimitX96) {
//     const signer = await provider.getSigner();
//     const quoterContract = new ethers.Contract(V3QuoterAddress, V3QuoterABI, signer);
//     console.log("Geeting the minimum amount...");
//     const amountOutMinimum = await quoterContract.quoteExactOutputSingle(tokenIn, tokenOut, fee, amountIn, sqrtPriceLimitX96);
//     console.log(amountOutMinimum);
//     const amountOut = ethers.parseUnits(amountOutMinimum, 18)
//     console.log(`For 1${amountIn} you would get ${amountOut} tokens`);
//     console.log(amountOut);
//     return amountOutMinimum;
// }

// const tokenIns = ["0x6B175474E89094C44Da98b954EedeAC495271d0F", "0x6B175474E89094C44Da98b954EedeAC495271d0F"]
// const amountIns = ["0.005", "0.05"]
// const tokenOut = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
// main(tokenIns, amountIns, tokenOut);

// swap1 ->   WBTC ==> USDT
// swap2 ->   DAI ==> USDT
// tokenOut = USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"



// const params1 = getParams(DAI, USDT, walletAddress, amountIn);
// //encode the data call to the exactInputSingle Function in swaprouter
// const encodeData1 = swapRouterContract.interface.encodeFunctionData("exactInputSingle", [params1]);
// console.log("Encoded the required data for param1...");

// const params2 = getParams(DAI, USDC, walletAddress, amountIn);
// const encodeData2 = swapRouterContract.interface.encodeFunctionData("exactInputSingle", [params2]);
// console.log("Encoded the required data for param2...");

// //the main multi call function call
// const calls = [encodeData1, encodeData2];
// const encodeMultiCallData = swapRouterContract.interface.encodeFunctionData("multicall", [calls]);

// console.log("Encoded all the required multicall data...");

// //construct the transaction and then call the contract
// const txArgs = {
//     to: V3SwapRouterAddress,
//     from: walletAddress,
//     data: encodeMultiCallData,
//     value: amountIn
// }
// console.log("Transaction ready to send...");
// const tx = await signer.sendTransaction(txArgs);
// console.log("Transaction: ", tx);
// const reciept = await tx.wait();
// console.log("Reciept: ", reciept);


// const tx = await swapRouterContract.multiCall(calls);
// console.log("Transaction: ", tx);
// const reciept = await tx.wait();
// console.log("Reciept: ", reciept);


