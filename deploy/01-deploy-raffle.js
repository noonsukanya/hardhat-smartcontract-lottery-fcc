const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionId = transactionReceipt.events[0].args.subId
        // Fund the subscription
        // Usually, you'd need the link token on a real network
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args, // args for constructor in contract
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // verify
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(raffle.address, args)
    }
    log("-----------------------------------")
}

module.exports.tags = ["all", "raffle"]

// ตอน deploy ไล่ระบุ arguments ของ constructor ทีละตัว >> เริ่มที่ address vrfCoordinatorV2
// constructor(
//     // constructor performs after deploy
//     address vrfCoordinatorV2, // contract address (meaning need deploy mock for this)
//     uint256 entranceFee,
//     bytes32 gasLane,
//     uint64 subscriptionId,
//     uint32 callbackGasLimit,
//     uint256 interval
// ) VRFConsumerBaseV2(vrfCoordinatorV2) {
//     // want it to configurable
//     i_entranceFee = entranceFee;
//     i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
//     i_gasLane = gasLane;
//     i_subscriptionId = subscriptionId;
//     i_callbackGasLimit = callbackGasLimit;
//     s_raffleState = RaffleState.OPEN; // or RaffleState(0)
//     s_lastTimeStamp = block.timestamp;
//     i_interval = interval;
// }
