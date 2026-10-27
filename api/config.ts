import Test from "./Test/TestController";
export default {
    name: "api-test",
    dev: true,
    auth: false,
    servers: [
        {
            type: "tcp",
            port: 8080,
            host: "0.0.0.0",
            name: "vapi-api",
        },
    ],
    controllers: [Test],
    upstreams: [],
    logging: false,
};
