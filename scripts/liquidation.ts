import axios from "axios"
import {calculateHealthFactorFromBalances} from "@aave/math-utils"

const theGraphURL_v3_polygon = 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-polygon'

export const fetchUnhealthyLoans = async function fetchUnhealthyLoans() {

  console.log(`${Date().toLocaleString()} fetching unhealthy loans}`)
  console.log('tett')
  const res = axios({
    method: 'post',
    url: theGraphURL_v3_polygon,
    data: JSON.stringify({
      query: `
      query GET_LOANS {
        users(first:20, skip:10, orderBy: id, orderDirection: desc, where: {borrowedReservesCount_gt: 0}) {
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

function parsUsers(userData:any[]){
  
  var loans = []
  

  userData.forEach(user => {
    // console.log(user)
    // var totalCollateralInBaseCurrency = 0
    // var avgLiquidationThreshold = 0
    calUserHealthFactorOfficially(user);
    // calUserHealthFactor(user);
  });

}

function calUserHealthFactorOfficially(user:any) {
  var totalDebtInBaseCurrency = 0;
  var totalCollateralInBaseCurrency = 0;
  var avgLiquidationThreshold = 0;

  user.collateralReserve.forEach((collateralReserve:any, i:any) => {
    var priceInEth = collateralReserve.reserve.price.priceInEth;
    var userBalanceInBaseCurrency = priceInEth * collateralReserve.currentATokenBalance / (10**collateralReserve.reserve.decimals);
    totalCollateralInBaseCurrency += userBalanceInBaseCurrency;
    avgLiquidationThreshold += userBalanceInBaseCurrency * collateralReserve.reserve.reserveLiquidationThreshold;
  });

  user.borrowReserve.forEach((borrowReserve:any, i:any) => {
    var priceInEth = borrowReserve.reserve.price.priceInEth;
    var pricipalBorrowed = borrowReserve.currentTotalDebt;
    totalDebtInBaseCurrency += priceInEth * pricipalBorrowed / (10**borrowReserve.reserve.decimals);
  });

  avgLiquidationThreshold = avgLiquidationThreshold / totalCollateralInBaseCurrency;
  var healthFactor = calculateHealthFactorFromBalances({
    borrowBalanceMarketReferenceCurrency:totalDebtInBaseCurrency, 
    collateralBalanceMarketReferenceCurrency: totalCollateralInBaseCurrency, 
    currentLiquidationThreshold:avgLiquidationThreshold});
  console.log(`calUserHealthFactorOfficially ${healthFactor}`);
}

function calUserHealthFactor(user:any){
  var borrowBalanceMarketReferenceCurrency = 0;
  var collateralBalanceMarketReferenceCurrency = 0;
  var currentLiquidationThreshold = 0;
  user.borrowReserve.forEach((borrowReserve:any, i:any) => {
    var priceInEth = borrowReserve.reserve.price.priceInEth;
    var pricipalBorrowed = borrowReserve.currentTotalDebt;
    borrowBalanceMarketReferenceCurrency += priceInEth * pricipalBorrowed / (10**borrowReserve.reserve.decimals);
  });

  user.collateralReserve.forEach((collateralReserve:any, i:any) => {
    var priceInEth = collateralReserve.reserve.price.priceInEth;
    var principalATokenBalance = collateralReserve.currentATokenBalance;
    collateralBalanceMarketReferenceCurrency +=  priceInEth * principalATokenBalance / (10**collateralReserve.reserve.decimals);
    currentLiquidationThreshold += priceInEth * principalATokenBalance * (collateralReserve.reserve.reserveLiquidationThreshold/10000)/ (10**collateralReserve.reserve.decimals);
  });
  var mhF = currentLiquidationThreshold / borrowBalanceMarketReferenceCurrency;
  console.log(`mhF ${mhF}`)
}