import { CoreManager } from "../lib/index";
import config from "./config";

let api = new CoreManager(config);
console.log(api.health);
// export function StartAPI(){
//     return new CoreManager(config);
// }
