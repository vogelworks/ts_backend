import {CoreManager} from '../lib/index'
import config from './config'

let core = new CoreManager(config);
console.log(core.health)
// export function StartCore(){
//     return new CoreManager(config);
// }