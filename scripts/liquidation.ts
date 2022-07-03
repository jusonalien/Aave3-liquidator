import axios from "axios"

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
        users(first:1000, skip:100, orderBy: id, orderDirection: desc, where: {borrowedReservesCount_gt: 0}) {
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
  userData.forEach(user => {
    console.log(user)
  });
}