

const dateTimeFormat=(dateTime)=>{
    if(!dateTime){
        return "N/A"
    }

    const dateFormat=new Date(dateTime).toLocaleDateString('en-US',{
        weekday:"short",
        month:"long",
        day:"numeric"

    })
    const timeFormat=new Date(dateTime).toLocaleTimeString('en-US',{
        hour12:true,
        hour:"numeric",
        minute:"2-digit"

    })
    return `${dateFormat} at ${timeFormat}`
}

export default dateTimeFormat
