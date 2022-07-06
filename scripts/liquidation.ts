import axios from "axios"
import {calculateHealthFactorFromBalances} from "@aave/math-utils"
import { BigNumber } from "bignumber.js"
import {getUserAccountData, UserAccountData} from "./userUtils"

const theGraphURL_v3_polygon = 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-polygon'
const healthFactorThreshold = new BigNumber(1); //liquidation can happen when less than 1
export var profitThreshold = .1 * (10**18) //in eth. A bonus below this will be ignored
const allowedLiquidation = .5 //50% of a borrowed asset can be liquidated

export const fetchUnhealthyLoans = async function fetchUnhealthyLoans() {

  console.log(`${Date().toLocaleString()} fetching unhealthy loans}`)
  console.log('tett')
  const res = axios({
    method: 'post',
    url: theGraphURL_v3_polygon,
    data: JSON.stringify({
      query: `
      query GET_LOANS {
        users(first:100, skip:10, orderBy: id, orderDirection: desc, where: {borrowedReservesCount_gt: 0}) {
          id
          borrowedReservesCount
          collateralReserve:reserves(where: {currentATokenBalance_gt: 0}) {
            currentATokenBalance
            reserve{
              usageAsCollateralEnabled
              reserveLiquidationThreshold
              reserveLiquidationBonus
              borrowingEnabled
              utilizationRate
              symbol
              underlyingAsset
              price {
                priceInEth
              }
              decimals
            }
          }
          borrowReserve: reserves(where: {currentTotalDebt_gt: 0}) {
            currentTotalDebt
            reserve{
              usageAsCollateralEnabled
              reserveLiquidationThreshold
              borrowingEnabled
              utilizationRate
              symbol
              underlyingAsset
              price {
                priceInEth
              }
              decimals
            }
          }
        }
      }
      `
    }
    )
  })
  .then(function(response){
    //console.log(response.data.data.users)
    parsUsers(response.data.data.users)
  })
}

fetchUnhealthyLoans()

interface Loan { 
  userId: any; 
  healthFactor: number; 
  maxCollateralSymbol: number;
  maxCollateralBonus: number; 
  maxCollateralPriceInEth: number; 
  maxBorrowedSymbol: number; 
  maxBorrowedSymbolDecimals: number; 
  maxBorrowedPrincipal: number; 
  maxBorrowedPriceInEth: number;
}

function parsUsers(userData:any[]){
  var loans: Loan[] = []
  userData.forEach(user => {
    var totalDebtInBaseCurrency = 0;
    var totalCollateralInBaseCurrency = 0;
    var avgLiquidationThreshold = 0;
    var maxBorrowedSymbol = 0;
    var maxBorrowedSymbolDecimals = 0;
    var maxBorrowedPrincipal = 0;
    var maxBorrowedPriceInEth = 0;
    var maxCollateralSymbol = 0;
    var maxCollateralBonus = 0;
    var maxCollateralPriceInEth = 0;
    // healthFactor Logic: https://github.com/aave/aave-v3-core/blob/c8722965501b182f6ab380db23e52983eb87e406/contracts/protocol/libraries/logic/GenericLogic.sol#L183
    user.collateralReserve.forEach((collateralReserve:any, i:any) => {
      var priceInEth = collateralReserve.reserve.price.priceInEth;
      var userBalanceInBaseCurrency = priceInEth * collateralReserve.currentATokenBalance / (10**collateralReserve.reserve.decimals);
      totalCollateralInBaseCurrency += userBalanceInBaseCurrency;
      avgLiquidationThreshold += userBalanceInBaseCurrency * collateralReserve.reserve.reserveLiquidationThreshold;
      if(collateralReserve.reserve.reserveLiquidationBonus > maxCollateralBonus) {
        maxCollateralSymbol = collateralReserve.reserve.symbol
        maxCollateralBonus = collateralReserve.reserve.reserveLiquidationBonus
        maxCollateralPriceInEth = priceInEth
      }
    });
  
    user.borrowReserve.forEach((borrowReserve:any, i:any) => {
      var priceInEth = borrowReserve.reserve.price.priceInEth;
      var principalBorrowed = borrowReserve.currentTotalDebt;
      totalDebtInBaseCurrency += priceInEth * principalBorrowed / (10**borrowReserve.reserve.decimals);
      if(principalBorrowed > maxBorrowedPrincipal) {
        maxBorrowedSymbol = borrowReserve.reserve.symbol
        maxBorrowedSymbolDecimals = borrowReserve.reserve.decimals
        maxBorrowedPrincipal = principalBorrowed
        maxBorrowedPriceInEth = priceInEth
      }
    });
  
    avgLiquidationThreshold = avgLiquidationThreshold / totalCollateralInBaseCurrency;
    var healthFactor = calculateHealthFactorFromBalances({
      borrowBalanceMarketReferenceCurrency:totalDebtInBaseCurrency, 
      collateralBalanceMarketReferenceCurrency: totalCollateralInBaseCurrency, 
      currentLiquidationThreshold:avgLiquidationThreshold});
    // console.log(`calUserHealthFactorOfficially ${healthFactor}`);
    if (healthFactor < healthFactorThreshold) {
      loans.push({
        userId: user.id,
        healthFactor: healthFactor.toNumber(),
        maxCollateralSymbol: maxCollateralSymbol,
        maxBorrowedSymbol: maxBorrowedSymbol,
        maxBorrowedPrincipal: maxBorrowedPrincipal,
        maxBorrowedPriceInEth: maxBorrowedPriceInEth,
        maxCollateralBonus: maxCollateralBonus,
        maxCollateralPriceInEth: maxCollateralPriceInEth,
        maxBorrowedSymbolDecimals: maxBorrowedSymbolDecimals
      })
    }
    // loans = loans.filter(loan => loan.maxBorrowedPrincipal * allowedLiquidation * (loan.maxCollateralBonus-1) * loan.maxBorrowedPriceInEth / 10 ** loan.maxBorrowedSymbolDecimals >= profitThreshold)
  });
  loans.forEach(async (loan,i) => {
    const userAccountData:UserAccountData =  await getUserAccountData(loan.userId)
    console.log(`${i}, ${loan.healthFactor} ${userAccountData.healthFactor}`)
  })
}

function calCollateralProfits(loan:Loan) {
}

function calUserHealthFactor(user:any): BigNumber{
  var totalDebtInBaseCurrency = 0;
  var totalCollateralInBaseCurrency = 0;
  var avgLiquidationThreshold = 0;
  var maxBorrowedSymbol = 0;
  var maxBorrowedPrincipal = 0;
  var maxBorrowedPriceInEth = 0;
  var maxCollateralSymbol = 0;
  var maxCollateralBonus = 0;
  var maxCollateralPriceInEth = 0;

  user.collateralReserve.forEach((collateralReserve:any, i:any) => {
    var priceInEth = collateralReserve.reserve.price.priceInEth;
    var userBalanceInBaseCurrency = priceInEth * collateralReserve.currentATokenBalance / (10**collateralReserve.reserve.decimals);
    totalCollateralInBaseCurrency += userBalanceInBaseCurrency;
    avgLiquidationThreshold += userBalanceInBaseCurrency * collateralReserve.reserve.reserveLiquidationThreshold;
    if(collateralReserve.reserve.reserveLiquidationBonus > maxCollateralBonus) {
      maxCollateralSymbol = collateralReserve.reserve.symbol
      maxCollateralBonus = collateralReserve.reserve.reserveLiquidationBonus
      maxCollateralPriceInEth = priceInEth
    }
  });

  user.borrowReserve.forEach((borrowReserve:any, i:any) => {
    var priceInEth = borrowReserve.reserve.price.priceInEth;
    var principalBorrowed = borrowReserve.currentTotalDebt;
    totalDebtInBaseCurrency += priceInEth * principalBorrowed / (10**borrowReserve.reserve.decimals);
    if(principalBorrowed > maxBorrowedPrincipal) {
      maxBorrowedSymbol = borrowReserve.reserve.symbol
      maxBorrowedPrincipal = principalBorrowed
      maxBorrowedPriceInEth = priceInEth
    }
  });

  avgLiquidationThreshold = avgLiquidationThreshold / totalCollateralInBaseCurrency;
  var healthFactor = calculateHealthFactorFromBalances({
    borrowBalanceMarketReferenceCurrency:totalDebtInBaseCurrency, 
    collateralBalanceMarketReferenceCurrency: totalCollateralInBaseCurrency, 
    currentLiquidationThreshold:avgLiquidationThreshold});
  // console.log(`calUserHealthFactorOfficially ${healthFactor}`);
  return healthFactor
}

// function calUserHealthFactor(user:any){
//   var borrowBalanceMarketReferenceCurrency = 0;
//   var collateralBalanceMarketReferenceCurrency = 0;
//   var currentLiquidationThreshold = 0;
//   user.borrowReserve.forEach((borrowReserve:any, i:any) => {
//     var priceInEth = borrowReserve.reserve.price.priceInEth;
//     var pricipalBorrowed = borrowReserve.currentTotalDebt;
//     borrowBalanceMarketReferenceCurrency += priceInEth * pricipalBorrowed / (10**borrowReserve.reserve.decimals);
//   });

//   user.collateralReserve.forEach((collateralReserve:any, i:any) => {
//     var priceInEth = collateralReserve.reserve.price.priceInEth;
//     var principalATokenBalance = collateralReserve.currentATokenBalance;
//     collateralBalanceMarketReferenceCurrency +=  priceInEth * principalATokenBalance / (10**collateralReserve.reserve.decimals);
//     currentLiquidationThreshold += priceInEth * principalATokenBalance * (collateralReserve.reserve.reserveLiquidationThreshold/10000)/ (10**collateralReserve.reserve.decimals);
//   });
//   var mhF = currentLiquidationThreshold / borrowBalanceMarketReferenceCurrency;
//   console.log(`mhF ${mhF}`)
// }