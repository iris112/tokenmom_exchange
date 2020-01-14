"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const order_router_1 = require("./routers/order-router");
const account_router_1 = require("./routers/account-router");
const market_router_1 = require("./routers/market-router");
// Creates and configures an ExpressJS web server.
class App {
    //Run configuration methods on the Express instance.
    constructor() {
        this.express = express();
        this.middleware();
        this.express.use(bodyParser.urlencoded({
            extended: true
        }));
        this.express.use(bodyParser.json());
        this.routes();
    }
    // Configure Express middleware.
    middleware() { }
    // Configure API endpoints.
    routes() {
        this.express.use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
        this.express.use('/order', order_router_1.orderRouter);
        this.express.use('/account', account_router_1.accountRouter);
        this.express.use('/market', market_router_1.marketRouter);
    }
}
exports.default = new App().express;
