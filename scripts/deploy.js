const hre = require('hardhat');

async function main(){
    const uniswapV3Router = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";

    const multiTokenSwap = await hre.ethers.getContractFactory("multiTokenSwap");
    const multiTokenSwapDeploy = multiTokenSwap.deploy(uniswapV3Router);
    console.log("Deploying multiTokenSwap contract.....");

    (await multiTokenSwapDeploy).waitForDeployment();
    const contractAddress = (await multiTokenSwapDeploy).target;
    console.log(`Contract deployed to: ${contractAddress}`);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1)
    });