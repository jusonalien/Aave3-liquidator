//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {IPool} from "./interfaces/IPool.sol";
import {IPoolAddressesProvider} from "./interfaces/IPoolAddressesProvider.sol";

contract Liquidator is Ownable {
  IPool public immutable POOL;

  constructor(address _poolAddress) {
    POOL = IPool(_poolAddress);
  }

  function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums,
    address initiator,
    bytes calldata params
  )
    external 
    returns (bool) 
  {
     (address collateral, address userToLiquidate, uint256 amountOutMin, address[] memory swapPath) = abi.decode(params, (address, address, uint256, address[]));
  }
  function makeFlashLoan(
    address _assetToLiquidate, 
    uint256 _flashAmt, 
    address _collateral, 
    address _userToLiquidate, 
    uint256 _amountOutMin, 
    address[] memory _swapPath
  ) public onlyOwner {
    address receiverAddress = address(this);
    
    address[] memory assets = new address[](1);
    assets[0] = _assetToLiquidate;
    
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = _flashAmt;

    // 0: no open debt. (amount+fee must be paid in this case or revert)
    // 1: stable mode debt
    // 2: variable mode debt
    uint256[] memory modes = new uint256[](1);
    modes[0] = 0;

    address onBehalfOf = address(this);

    bytes memory params = abi.encode(_collateral, _userToLiquidate, _amountOutMin, _swapPath);

    uint16 referralCode = 0;

    POOL.flashLoan(
      receiverAddress, 
      assets, 
      amounts, 
      modes, 
      onBehalfOf, 
      params, 
      referralCode);
  }

  function makeLiquationCall(
      address poolAddres,
      address collateralAsset,
      address debtAsset,
      address user,
      uint256 debtToCover,
      bool receiveAToken
  ) external returns (bool) {

    POOL.liquidationCall(collateralAsset, debtAsset, user, debtToCover, receiveAToken);
  }

}