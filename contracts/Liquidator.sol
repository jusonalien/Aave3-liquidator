//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";


import {FlashLoanReceiverBase} from "./FlashLoanReceiverBase.sol";
import {DataTypes} from "./Libraries.sol";
import {IPOOL} from "@aave/core-v3/contracts/interfaces/IPool.sol";

contract Liquidator is FlashLoanReceiverBase ,Ownable {
    IPool public immutable POOL;

    constructor() {}

    function makeFlashLoan() public onlyOwner {

    }

    function makeLiquationCall(
        address poolAddres,
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external returns (bool) {
        (bytes32 arg1, bytes32 arg2) = encodeLiquidationCall(collateralAsset, debtAsset, user, debtToCover, receiveAToken);
        IPool(poolAddres).liquidationCall(collateralAsset, debtAsset, user, debtToCover, receiveAToken);
    }


    /**
    * @notice Encodes liquidation call parameters from standard input to compact representation of 2 bytes32
    * @param collateralAsset The address of the underlying asset used as collateral, to receive as result of the liquidation
    * @param debtAsset The address of the underlying borrowed asset to be repaid with the liquidation
    * @param user The address of the borrower getting liquidated
    * @param debtToCover The debt amount of borrowed `asset` the liquidator wants to cover
    * @param receiveAToken True if the liquidators wants to receive the collateral aTokens, `false` if he wants
    * to receive the underlying collateral asset directly
    * @return First half ot compact representation of liquidation call parameters
    * @return Second half ot compact representation of liquidation call parameters
    */
    function encodeLiquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external view returns (bytes32, bytes32) {
        DataTypes.ReserveData memory collateralData = POOL.getReserveData(collateralAsset);
        uint16 collateralAssetId = collateralData.id;

        DataTypes.ReserveData memory debtData = POOL.getReserveData(debtAsset);
        uint16 debtAssetId = debtData.id;

        uint128 shortenedDebtToCover = debtToCover == type(uint256).max
            ? type(uint128).max
            : debtToCover.toUint128();

        bytes32 res1;
        bytes32 res2;

        assembly {
            res1 := add(add(collateralAssetId, shl(16, debtAssetId)), shl(32, user))
            res2 := add(shortenedDebtToCover, shl(128, receiveAToken))
        }
        return (res1, res2);
    }
}