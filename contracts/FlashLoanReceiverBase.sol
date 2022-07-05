//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {ILendingPoolAddressesProvider, ILendingPool ,IERC20} from "./Interfaces.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {IFlashLoanReceiver} from "./interfaces/IFlashLoanReceiver.sol";

abstract contract FlashLoanReceiverBase is IFlashLoanReceiver {
  using SafeERC20 for IERC20;

  ILendingPoolAddressesProvider internal _addressesProvider;
  ILendingPool internal _lendingPool;

  constructor(ILendingPoolAddressesProvider provider) {
    _addressesProvider = provider;
    _lendingPool = ILendingPool(ILendingPoolAddressesProvider(provider).getLendingPool());
  }

  function test(uint a) external {
    
  }
  receive() external payable {}
}
