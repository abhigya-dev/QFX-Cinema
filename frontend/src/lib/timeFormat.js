

const timeFormat=(time)=>{

    const hours=Math.floor(time/60);
    const minutes=time%60

    const playTime=`${hours}h ${minutes}m`
    return playTime;
}

export default timeFormat;