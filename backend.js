// Example subscribe usage
// const WebSocket = require('ws');
// const wss = new WebSocket.Server({ port: 8080 });
// const OPCUA_Subscriber = require('./opcua-subscription.js');

// (async () => {
//     const opcua = new OPCUA_Subscriber(wss, "opc.tcp://localhost:4000");
//     await opcua.create_session();
//     await opcua.create_subscription();
//     await opcua.subscribe("ns=1;s=overall_time");
// })();

const my_module = require('./my-addons/my_module.node');
console.log(my_module.findServers("opc.tcp://localhost:4840"));
module.exports = my_module;

