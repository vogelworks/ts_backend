
/** A way to monitor the memory heap. Have not worked out the best method. Would
*   want to get the data back the database.
*
*
*/
let v8 = require('v8');
function snap(){
    setTimeout(()=>{
        console.log(v8.getHeapStatistics());
        //console.log(v8.getHeapCodeStatistics())
        //console.log(v8.getHeapSpaceStatistics())
        snap();
    },400)
}
snap();
