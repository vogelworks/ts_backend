import AuthController from "./Auth/auth-controller";
import SettingsController from "./Settings/SettingsController";
import UserController from "./User/UserController";

export default {
    name: "gateway-test",
    dev: true,
    auth: false,
    servers: [
        {
            name: "gateway-http",
            type: "http",
            host: "0.0.0.0",
            port: 8080,
        },
        {
            name: "gateway-ws",
            type: "ws",
            host: "0.0.0.0",
            port: 8081,
        },
    ],
    controllers: [AuthController, SettingsController, UserController],
    upstreams: [
        {
            name: "API",
            type: "tcp",
            options: {
                port: 8080,
                host: "api",
            },
        },
    ],
    logging: false,
};

