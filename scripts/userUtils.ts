import { BigNumber } from "ethers";
import {ethers} from "hardhat";
// const { ethers, providers } = require('ethers');
import {IPool} from "../typechain/IPool";

const PoolV3Artifact = require('@aave/core-v3/artifacts/contracts/protocol/pool/Pool.sol/Pool.json');
const poolAddressPolygon = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
// Log the ABI into console
// console.log(PoolV3Artifact.abi)

export interface UserAccountData {
  totalCollateralBase: BigNumber
  totalDebtBase: BigNumber
  availableBorrowsBase: BigNumber
  currentLiquidationThreshold: BigNumber
  ltv: BigNumber
  healthFactor: BigNumber
}

export const getUserAccountData = async function getUserAccountData(userAddrees:string):Promise<UserAccountData> {
  const AavePool: IPool = (await ethers.getContractAt(
    'IPool',
    poolAddressPolygon,
  )) as IPool
  const userReserverData:UserAccountData = await AavePool.getUserAccountData(userAddrees)
  // console.log(userReserverData.healthFactor.toString())
  return userReserverData
}

getUserAccountData("0xfd5e813249ce316e77ba353f16e5b8d2e91850ac")
