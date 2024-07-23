// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

// Import ERC20 token standard interface
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract TokenSwapper {
    ISwapRouter public constant swapRouter =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    //function to swap eth to erc20 token
    //perfectly working
    function swapEthToErc20(
        address tokenIn,
        address tokenOut,
        uint256 amountOutMinimum,
        uint24 fee // Pool fee tier
    ) public payable returns (uint256 amountOut) {
        require(
            tokenIn == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            "TokenIn is not WEth!"
        );
        require(msg.value != 0, "Not enough token to swap");
        address recipient = msg.sender;
        uint256 deadline = block.timestamp + 6000;
        uint256 amountIn = msg.value;

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: recipient,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        amountOut = swapRouter.exactInputSingle{value: amountIn}(params);
        return amountOut;
    }

    //function to get the token balance
    //perfectly working
    function getBalance(address tokenAddress)
        public
        view
        returns (uint256 balance)
    {
        IERC20 token = IERC20(tokenAddress);
        address walletAddress = msg.sender;
        balance = token.balanceOf(walletAddress);
        return balance;
    }

    //function to get the approved token amount
    function allowanceAmount(address tokenAddress)
        external
        view
        returns (uint256 allowance)
    {
        IERC20 token = IERC20(tokenAddress);
        address owner = msg.sender;
        address spender = address(this);
        allowance = token.allowance(owner, spender);
        return allowance;
    }

    //function to swap erc20 to erc20 token
    function swapErc20ToErc20(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 fee
    ) external returns (uint256 amountOut) {
        require(
            tokenIn != 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            "TokenIn is WEth"
        );
        require(amountIn != 0, "Not enough token to swap");

        address recipient = msg.sender;
        uint256 deadline = block.timestamp + 6000;

        // Transfer the specified amount of token to this contract.
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountIn
        );

        // Approve the router to spend DAI.
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        //after token approval, create the params for the swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: recipient,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        //call the exactInputSingle function of the swaprouter
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut;
    }
}
