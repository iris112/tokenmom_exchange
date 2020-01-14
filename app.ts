import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as morgan from 'morgan';
import {orderRouter} from './routers/order-router';
import {accountRouter} from './routers/account-router';
import {marketRouter} from './routers/market-router';

// Creates and configures an ExpressJS web server.
class App {
  // ref to Express instance
  public express: express.Application;
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
  private middleware(): void {}

  // Configure API endpoints.
  private routes(): void {
    this.express.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });

    this.express.use('/order', orderRouter);
    this.express.use('/account', accountRouter);
    this.express.use('/market', marketRouter);
  }
}
export default new App().express;
