import { CoreController } from "../../lib/index";
import config from "./testconfig";

export default class TestController extends CoreController {
    config = config;
    constructor() {
        super("TestController");
    }
    TESTrun = async (handler: any, pack: any) => {
        let { input } = pack;
    };
}
