type TESTrunPack = {
    input: string;
};
export default {
    routes: [{ name: "TESTrun" }],
    request_schemes: {
        TESTrun: {
            input: {
                required: true,
                type: "string",
                desc: "The employees id",
            },
        },
    },
};
