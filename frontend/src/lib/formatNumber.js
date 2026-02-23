

const formatNumber=(number)=>{
  return new Intl.NumberFormat("en-US",{
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number)

}

export default formatNumber