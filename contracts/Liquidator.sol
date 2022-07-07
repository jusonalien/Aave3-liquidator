//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import {DataTypes} from "./libraries/DataTypes.sol";
import {IPool} from "./interfaces/IPool.sol";
import {IPoolAddressesProvider} from "./interfaces/IPoolAddressesProvider.sol";



contract Liquidator is Ownable {
  
  using SafeERC20 for IERC20;
  using EnumerableSet for EnumerableSet.AddressSet;

  IPool public immutable POOL;
  IUniswapV2Router02 public immutable UniswapV2Router02;

  EnumerableSet.AddressSet private _baseTokens;

  event Withdrawn(address indexed to, uint256 indexed value);
  event BaseTokenAdded(address indexed token);
  event BaseTokenRemoved(address indexed token);

  constructor(address _poolAddress, address _UniswapV2Router02) {
    POOL = IPool(_poolAddress);
    UniswapV2Router02 = IUniswapV2Router02(_UniswapV2Router02);
  }

  function addBaseToken(address token) external onlyOwner {
    _baseTokens.add(token);
    emit BaseTokenAdded(token);
  }

  function removeBaseToken(address token) external onlyOwner {
    uint256 balance = IERC20(token).balanceOf(address(this));
    if (balance > 0) {
      IERC20(token).transfer(owner(), balance);
    }
    _baseTokens.remove(token);
    emit BaseTokenRemoved(token);
  }

  function withdraw() external {
    uint256 balance = address(this).balance;
    if (balance > 0) {
      payable(owner()).transfer(balance);
      emit Withdrawn(owner(), balance);
    }

    for(uint256 i = 0;i < _baseTokens.length(); i++) {
      address token = _baseTokens.at(i);
      balance = IERC20(token).balanceOf(address(this));
      if (balance > 0) {
        // do not use safe transfer here to prevents revert by any shitty token
        IERC20(token).transfer(owner(), balance);
      }
    }
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
    require(initiator == address(this) && msg.sender == address(POOL),"address check failed!");

    (address collateralAsset, address userToLiquidate, uint256 amountOutMin, address[] memory swapPath) = abi.decode(params, (address, address, uint256, address[]));

    makeLiquationCall(collateralAsset, assets[0], userToLiquidate,amounts[0], false);
    _swapExactTokensForTokens(collateralAsset, assets[0], amountOutMin, swapPath);
    uint256 profit = calProfits(IERC20(assets[0]).balanceOf(address(this)), amounts[0], premiums[0]);
    require(profit > 0, "No Profit");
    uint amountOwing = amounts[0] + premiums[0];
    // for payback of the loan
    IERC20(assets[0]).approve(address(POOL), amountOwing);
    return true;
  }

  function _swapExactTokensForTokens(
    address _assetFrom, 
    address _assetTo,
    uint _amountOutMin,
    address[] memory _swapPath
  ) private {

    IERC20 _assetFromToken = IERC20(_assetFrom);
    uint256 deadline = block.timestamp + 300;
    uint amountToTrade = _assetFromToken.balanceOf(address(this));
    _assetFromToken.approve(address(UniswapV2Router02), amountToTrade);
    UniswapV2Router02.swapExactTokensForTokens(amountToTrade, _amountOutMin, _swapPath, address(this), deadline);

  }

  function calProfits(uint256 _balance, uint256 _loanAmount, uint256 _loanFee) pure private returns(uint256) {
    return _balance-( _loanAmount + _loanFee);
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
      address collateralAsset,
      address debtAsset,
      address user,
      uint256 debtToCover,
      bool receiveAToken
  ) public {
    require(IERC20(debtAsset).approve(address(POOL), debtToCover), "Approval error");
    POOL.liquidationCall(collateralAsset, debtAsset, user, debtToCover, receiveAToken);
  }

}