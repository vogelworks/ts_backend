import fs from 'fs'
export default function LogJSON(path,pack){
    if(typeof path =='string'){
        if(path[0] == '.'){
            let fpack =`{
                "error":"Could not print channels(s) to JSON"
            }`
            try{ fpack = JSON.stringify(pack)}
            catch{}
            //check pATH?
            fs.writeFile(path,fpack,(e)=>{console.error('Cannot Print Log JSON ',e)})
        }
    }else{console.log('Could not JSON log')}
}