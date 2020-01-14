import * as express from 'express';
import { getContractAddressesForNetworkOrThrow } from '@0x/contract-addresses';

import * as global from '../global/global';
import * as dbManager from '../db/dbManager';
import {check_account_auth} from './account-router';

const contractAddresses = getContractAddressesForNetworkOrThrow(global.NETWORK_ID);

const router:express.Router = express.Router();

/*-------------------------------------------------------------------------------
                            API functions
-------------------------------------------------------------------------------*/
var preAction = function(req, res, next) {
    next();
};

function response_fail(res, error) {
    var json_data = {
        "status": 'fail',
        "error": error,
    };
    res.send(json_data);
}

export function parse_market_id(market_id) {
    if (market_id == undefined) {
        return null;
    }

    var res = market_id.split("-");
    if (res.length < 2) {
        return null;
    }

    return {
        token_symbol: res[0],
        base_token: res[1]
    }
}

function get_now_midnight() {
    var now = new Date(Date.now());
    var year = now.getUTCFullYear();
    var month = now.getUTCMonth();
    var date = now.getUTCDate();

    var midnight = new Date(year, month, date, 0, 0, 0, 0);
    return midnight;
}

async function get_market_last_price(base_token, token_symbol) {
    var trades = await dbManager.find_trade_histories(base_token, token_symbol, null, null, true, null, null);
    if (trades.length < 1) {
        return "--";
    }
    return trades[trades.length-1].price;
}

async function get_market_today_change(base_token, token_symbol) {
    var h_price, pre_price, percent;
    var trades = await dbManager.find_trade_histories(base_token, token_symbol, null, get_now_midnight(), true, null, null);
    if (trades.length < 1) {
        return "--";
    }
    h_price = trades[trades.length-1].price;

    trades = await dbManager.find_trade_histories(base_token, token_symbol, null, get_now_midnight(), false, null, null);
    if (trades.length < 1) {
        return 100;
    }
    pre_price = trades[trades.length-1].price;

    percent = (((h_price - pre_price) / pre_price) * 100).toFixed(2);
    return percent;
}

async function get_market_today_volume(base_token, token_symbol) {
    var h_volume = 0
    var trades = await dbManager.find_trade_histories(base_token, token_symbol, null, get_now_midnight(), true, null, null);
    for (var i = 0; i < trades.length; i++) {
        h_volume = h_volume + (trades[i].amount * trades[i].price);
    }
    return h_volume;
}

// Private API
router.get('/get_trades', preAction, async function (req, res) {
    var wallet_addr = req.get('wallet-addr');
    var market_id = req.query.market_id;
    var page = req.query.page;
    var page_size = req.query.page_size;
    var base_token, token_symbol, market;
    var json_data = {
        "status": 'success',
        "trades": '',
    };

    if (wallet_addr != undefined) {
        // Private API
        if (check_account_auth(req, res) == false) {
            return;
        }
        wallet_addr = wallet_addr.toLowerCase();
    } else {
        // Public API
        wallet_addr = null;
    }
    
    market = parse_market_id(market_id);
    if (market == null) {
        return response_fail(res, 'failed to parse market_id');
    }
    base_token = market.base_token;
    token_symbol = market.token_symbol;

    // validate base_token
    if (base_token != "WETH" && base_token != "TM" && base_token != "USDC" && base_token != "WBTC") {
        return response_fail(res, 'invalid base_token:' + base_token);
    }

    // calculate range for query
    if (page_size == undefined) {
        page_size = global.PAGE_DEFAULT_SIZE;
    } else {
        page_size = parseInt(page_size);
        if (page_size <= 0) {
            page_size = global.PAGE_DEFAULT_SIZE;
        }
    }
    if (page == undefined) {
        page = global.PAGE_DEFAULT_NUM;
    } else {
        page = parseInt(page);
        if (page < global.PAGE_DEFAULT_NUM) {
            page = global.PAGE_DEFAULT_NUM;
        }
    }
    
    var my_trades = await dbManager.find_trade_histories(base_token, token_symbol, wallet_addr, null, true, (page-global.PAGE_DEFAULT_NUM)*page_size, page_size);
    if (my_trades.length > 0) {
        var trades = my_trades.map((node) => node.get({ plain: true }));

        for(var i = 0; i < trades.length; i++) {
            market_id = trades[i].token_symbol + "-" + trades[i].base_token;
            trades[i]['market_id'] = market_id;
            trades[i].base_token = undefined;
            trades[i].token_symbol = undefined;
        }
        json_data['trades'] = trades;
    } else {
        json_data['status'] = "no_data";
    }

    res.send(json_data);
});

// Public API
async function get_all_markets_handler (req, res) {
    var last_price, today_change, today_volume;
    var json_data = {
        "status": 'success',
    };

    var tokens = await dbManager.find_tokens();
    if (tokens.length > 0) {
        var market_weth = {
            "base_token": "WETH",
            "base_token_decimals": global.DECIMALS,
            "base_token_address": contractAddresses.etherToken,
            "tokens": [],
        };

        for (var i = 0; i < tokens.length; i ++) {
            if (tokens[i].symbol == "WETH") {
                continue;
            }
            last_price = await get_market_last_price("WETH", tokens[i].symbol);
            today_change = await get_market_today_change("WETH", tokens[i].symbol);
            today_volume = await get_market_today_volume("WETH", tokens[i].symbol);
            let market = {
                "market_id": tokens[i].symbol + "-" + "WETH",
                "token_symbol": tokens[i].symbol,
                "token_name": tokens[i].name,
                "token_address": tokens[i].contract_address,
                "token_decimals": tokens[i].token_decimals,
                "last_price": last_price,
                "today_change": today_change,
                "today_volume": today_volume,
            }
            market_weth.tokens.push(market);
        }

        var market_tm = {
            "base_token": "TM",
            "base_token_decimals": global.DECIMALS,
            "base_token_address": global.tm_token_addr,
            "tokens": [],
        };

        for (var i = 0; i < tokens.length; i ++) {
            if (tokens[i].tm_field != 1) {
                continue;
            }
            last_price = await get_market_last_price("TM", tokens[i].symbol);
            today_change = await get_market_today_change("TM", tokens[i].symbol);
            today_volume = await get_market_today_volume("TM", tokens[i].symbol);            
            let market = {
                "market_id": tokens[i].symbol + "-" + "TM",
                "token_symbol": tokens[i].symbol,
                "token_name": tokens[i].name,
                "token_address": tokens[i].contract_address,
                "token_decimals": tokens[i].token_decimals,
                "last_price": last_price,
                "today_change": today_change,
                "today_volume": today_volume,
            }
            market_tm.tokens.push(market);
        }

        var market_usdc = {
            "base_token": "USDC",
            "base_token_decimals": global.usdc_decimals,
            "base_token_address": global.usdc_token_addr,
            "tokens": [],
        };

        for (var i = 0; i < tokens.length; i ++) {
            if (tokens[i].usdc_field != 1) {
                continue;
            }
            last_price = await get_market_last_price("USDC", tokens[i].symbol);
            today_change = await get_market_today_change("USDC", tokens[i].symbol);
            today_volume = await get_market_today_volume("USDC", tokens[i].symbol);            
            let market = {
                "market_id": tokens[i].symbol + "-" + "USDC",
                "token_symbol": tokens[i].symbol,
                "token_name": tokens[i].name,
                "token_address": tokens[i].contract_address,
                "token_decimals": tokens[i].token_decimals,
                "last_price": last_price,
                "today_change": today_change,
                "today_volume": today_volume,
            }
            market_usdc.tokens.push(market);
        }
      
        var market_wbtc = {
            "base_token": "WBTC",
            "base_token_decimals": global.wbtc_decimals,
            "base_token_address": global.wbtc_token_addr,
            "tokens": [],
        };

        for (var i = 0; i < tokens.length; i ++) {
            if (tokens[i].symbol == "WBTC") {
                continue;
            }
            last_price = await get_market_last_price("WBTC", tokens[i].symbol);
            today_change = await get_market_today_change("WBTC", tokens[i].symbol);
            today_volume = await get_market_today_volume("WBTC", tokens[i].symbol);            
            let market = {
                "market_id": tokens[i].symbol + "-" + "WBTC",
                "token_symbol": tokens[i].symbol,
                "token_name": tokens[i].name,
                "token_address": tokens[i].contract_address,
                "token_decimals": tokens[i].token_decimals,
                "last_price": last_price,
                "today_change": today_change,
                "today_volume": today_volume,
            }
            market_wbtc.tokens.push(market);
        }

        json_data['markets'] = [market_weth, market_tm, market_usdc, market_wbtc];
    } else {
        json_data['status'] = "no_data";
    }

    res.send(json_data);
}

router.get('/get_markets', preAction, async function (req, res) {
    var market_id = req.query.market_id;
    var base_token, token_symbol, market;
    var base_token_decimals, base_token_address;
    var last_price, today_change, today_volume;
    var json_data = {
        "status": 'success',
    };

    if (market_id == undefined) {
        return get_all_markets_handler(req, res);
    }

    market = parse_market_id(market_id);
    if (market == null) {
        return response_fail(res, 'failed to parse market_id');
    }
    base_token = market.base_token;
    token_symbol = market.token_symbol;

    // validate base_token
    if (base_token != "WETH" && base_token != "TM" && base_token != "USDC") {
        return response_fail(res, 'invalid base_token:' + base_token);
    }

    var token = await dbManager.find_token(token_symbol);
    if (token == undefined) {
        return response_fail(res, 'failed to find token');
    }

    base_token_decimals = global.DECIMALS;
    if (base_token == "WETH") {
        base_token_address = contractAddresses.etherToken;
    } if (base_token == "USDC") {
        base_token_address = global.usdc_token_addr;
        base_token_decimals = global.usdc_decimals;
    } if (base_token == "WBTC") {
        base_token_address = global.wbtc_token_addr;
        base_token_decimals = global.wbtc_decimals;
    } else {
        base_token_address = global.tm_token_addr;
    }

    last_price = await get_market_last_price(base_token, token_symbol);
    today_change = await get_market_today_change(base_token, token_symbol);
    today_volume = await get_market_today_volume(base_token, token_symbol);

    let market_data = {
        market_id,
        base_token,
        base_token_decimals,
        base_token_address,
        token_symbol,
        "token_name": token.name,
        "token_address": token.contract_address,
        "token_decimals": token.token_decimals,
        last_price,
        today_change,
        today_volume,
    }

    json_data['market'] = market_data;

    res.send(json_data);
});


async function get_market_ticker(base_token, token_symbol) {
    var ticker = {
        "market_id": token_symbol + "-" + base_token,
        "price": 0,
        "volume": 0,
        "bid": 0,
        "ask": 0,
        "low": 0,
        "high": 0,
        "updated_at": ""
    };

    var last_trade = await dbManager.find_latest_trade_history(base_token, token_symbol);
    if (last_trade == null) {
        return ticker;
    }

    ticker.updated_at = last_trade.updated_at;
    ticker.price = last_trade.price;

    var volume = 0;
    var ask = last_trade.price;
    var bid = last_trade.price;
    var low = last_trade.price;
    var high = last_trade.price;

    var from = new Date(last_trade.updated_at - global.ONE_DAY_MS);
    var trades = await dbManager.find_trade_histories(base_token, token_symbol, null, from, true, null, null);
    for (var i = 0; i < trades.length; i++) {
        var price = trades[i].price;
        volume = volume + (trades[i].amount * price);

        if (price < low) {
            low = price;
        } else if (high < price) {
            high = price;
        }

        if (trades[i].type == global.TYPE_BUY_BID) {
            if (price < bid) {
                bid = price;
            }
        } else {
            if (ask < price) {
                ask = price;
            }
        }
    }

    ticker.volume = volume;
    ticker.ask = ask;
    ticker.bid = bid;
    ticker.low = low;
    ticker.high = high;

    return ticker;
}

async function get_all_tickers_handler (req, res) {
    var last_price, today_change, today_volume;
    var json_data = {
        "status": 'success',
    };
    var tickers = [];
    var ticker;

    var tokens = await dbManager.find_tokens();
    if (tokens.length > 0) {
        for (var i = 0; i < tokens.length; i ++) {
            if (tokens[i].symbol == "WETH") {
                continue;
            }
            ticker = await get_market_ticker("WETH", tokens[i].symbol);
            tickers.push(ticker);
        }

        for (var i = 0; i < tokens.length; i ++) {
            if (tokens[i].tm_field != 1) {
                continue;
            }
            ticker = await get_market_ticker("TM", tokens[i].symbol);
            tickers.push(ticker);
        }

        for (var i = 0; i < tokens.length; i ++) {
            if (tokens[i].usdc_field != 1) {
                continue;
            }
            ticker = await get_market_ticker("USDC", tokens[i].symbol);
            tickers.push(ticker);
        }

        for (var i = 0; i < tokens.length; i ++) {
          if (tokens[i].symbol == "WBTC") {
                continue;
            }
            ticker = await get_market_ticker("WBTC", tokens[i].symbol);
            tickers.push(ticker);
        }

        json_data['tickers'] = tickers;
    } else {
        json_data['status'] = "no_data";
    }

    res.send(json_data);
}

router.get('/get_tickers', preAction, async function (req, res) {
    var market_id = req.query.market_id;
    var base_token, token_symbol, market;
    var json_data = {
        "status": 'success',
    };

    if (market_id == undefined) {
        return get_all_tickers_handler(req, res);
    }

    market = parse_market_id(market_id);
    if (market == null) {
        return response_fail(res, 'failed to parse market_id');
    }
    base_token = market.base_token;
    token_symbol = market.token_symbol;

    // validate base_token
    if (base_token != "WETH" && base_token != "TM" && base_token != "USDC" && base_token != "WBTC") {
        return response_fail(res, 'invalid base_token:' + base_token);
    }

    var ticker = await get_market_ticker(base_token, token_symbol);
    json_data['ticker'] = ticker;

    res.send(json_data);
});

// Error handler
router.use(function(err, req, res, next) {
    if (err) {
        res.status(500).send(err);
    }
});

export const marketRouter: express.Router = router;
