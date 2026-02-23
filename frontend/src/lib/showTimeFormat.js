const formatShowTime=(time)=>{
const formatTime=new Date(time).toLocaleTimeString('en-US',{
    hour:"2-digit",
    minute:"2-digit",
    hour12:true
})
return formatTime
}

export default formatShowTime;