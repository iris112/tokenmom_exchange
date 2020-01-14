"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const fetch = require("node-fetch");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const _0x_js_1 = require("0x.js");
const contract_addresses_1 = require("@0x/contract-addresses");
const subproviders_1 = require("@0x/subproviders");
const order_utils_1 = require("@0x/order-utils");
const ethereumjs_util_1 = require("ethereumjs-util");
const Web3 = require("web3");
const global = require("../global/global");
const dbManager = require("../db/dbManager");
const order_channel_1 = require("../action_cable/order_channel");
const account_router_1 = require("./account-router");
const market_router_1 = require("./market-router");
// const mnemonicWallet = new MnemonicWalletSubprovider({
//     mnemonic: '',
//     baseDerivationPath: `44'/60'/0'/0`
// });
exports.NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const minABI = [
    // decimals
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "type": "function"
    },
    // balanceOf
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    },
];
const wallet_address = "0x7Cc2768c52DEAB5Bc304485c0Fd82Bed287372cD";
const server_key = "6EFDB4FB96870179BC6DB81900B40B2DCA3F1E899A4FA180DA7A66A85C1EDD72";
const providerEngine = new _0x_js_1.Web3ProviderEngine();
// providerEngine.addProvider(mnemonicWallet);
const privateKeyWallet = new subproviders_1.PrivateKeyWalletSubprovider(server_key);
const nonceTracker = new subproviders_1.NonceTrackerSubprovider();
providerEngine.addProvider(privateKeyWallet);
providerEngine.addProvider(nonceTracker);
providerEngine.addProvider(new _0x_js_1.RPCSubprovider('https://ropsten.infura.io'));
providerEngine.start();
const web3Wrapper = new web3_wrapper_1.Web3Wrapper(providerEngine);
const web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/'));
const contractAddresses = contract_addresses_1.getContractAddressesForNetworkOrThrow(global.NETWORK_ID);
const contractWrappersConfig = { networkId: global.NETWORK_ID, contractAddresses: contractAddresses };
const contractWrappers = new _0x_js_1.ContractWrappers(providerEngine, contractWrappersConfig);
const rewardRatio = 40;
const rewardRequestAmount = 10000;
// const rewardRequestAmount = 100;
const rewardTMFee = 100;
const apiURL = 'https://api-ropsten.etherscan.io/api?module=proxy&action=eth_getTransactionCount&address=' + wallet_address;
var preAction = function (req, res, next) {
    next();
};
// function getMethods(obj) {
//     for (var id in obj) {
//         try {
//             if (typeof(obj[id]) == "function") {
//                 console.log(id);
//                 console.log(obj[id].toString());
//             }
//         } catch (err) {
//             console.log(id);
//             console.log("inaccessible");
//         }
//     }
// }
// async function abc() {
// const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
// console.log(maker, taker);
// var token_allow = await contractWrappers.erc20Token.getBalanceAsync(
//                         '0x91495D6969120fc016BB687EaD5F5cE56F135504',
//                         maker,
//                         );
// console.log(token_allow);
// var match_order = await dbManager.find_matching_orders('TM', 'KRWT2', 0.5, 1);
// console.log(match_order);
// getMethods(contractWrappers.exchange);
// }
// abc();
function min_value(a, b) {
    return a < b ? a : b;
}
function hash32(str) {
    var num = 64 - str.length;
    var i = 0;
    while (i < num) {
        str = '0' + str;
        i += 1;
    }
    return str;
}
function getTransactionCount() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(apiURL);
        const json = yield response.json();
        return json['result'];
    });
}
function initNonceValue() {
    return __awaiter(this, void 0, void 0, function* () {
        // var nonce = await web3.eth.getTransactionCount(wallet_address.toLowerCase(), 'pending');
        // nonceTracker._nonceCache[wallet_address.toLowerCase()] = '0x' + nonce.toString(16);
        var nonce = yield getTransactionCount();
        nonceTracker._nonceCache[wallet_address.toLowerCase()] = nonce;
        console.log('------------ Init Nonce = ' + nonce);
    });
}
initNonceValue();
// Allow the 0x ERC20 Proxy to move WETH and TM of taker
var set_allowance = (token_symbol, token_contract_addr) => __awaiter(this, void 0, void 0, function* () {
    try {
        console.log("Check " + token_symbol + " ----");
        var allowanceBalance = yield contractWrappers.erc20Token.getProxyAllowanceAsync(token_contract_addr, wallet_address.toLowerCase());
        if (allowanceBalance.eq(0)) {
            console.log("Allowing " + token_symbol + " ---");
            const tokenApprovalTxHash = yield contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(token_contract_addr, wallet_address.toLowerCase());
            yield web3Wrapper.awaitTransactionMinedAsync(tokenApprovalTxHash);
            console.log(token_symbol + " unlimited: " + tokenApprovalTxHash);
        }
    }
    catch (err) {
        console.log(err);
    }
});
function getTokenDecimals(token_addr) {
    const contractABI = web3.eth.contract(minABI).at(token_addr);
    var decimals = contractABI.decimals();
    return decimals;
}
function getBalance(token_addr) {
    const contractABI = web3.eth.contract(minABI).at(token_addr);
    var balance = contractABI.balanceOf(wallet_address.toLowerCase());
    return balance;
}
function order_create(order_detail) {
    // Set up the Order and fill it
    const order = {
        exchangeAddress: order_detail.exchangeAddress,
        makerAddress: order_detail.makerAddress,
        takerAddress: order_detail.takerAddress,
        senderAddress: order_detail.senderAddress,
        feeRecipientAddress: order_detail.feeRecipientAddress,
        expirationTimeSeconds: order_detail.expirationTimeSeconds,
        salt: order_detail.salt,
        makerAssetAmount: order_detail.makerAssetAmount,
        takerAssetAmount: order_detail.takerAssetAmount,
        makerAssetData: order_detail.makerAssetData,
        takerAssetData: order_detail.takerAssetData,
        makerFee: order_detail.makerFee,
        takerFee: order_detail.takerFee,
    };
    return order;
}
function getFilledAmount(type, order_hash, order_detail) {
    return __awaiter(this, void 0, void 0, function* () {
        // Generate the order hash
        var amount = yield contractWrappers.exchange.getFilledTakerAssetAmountAsync(order_hash);
        if (type == 1)
            amount = amount.mul(order_detail.makerAssetAmount).div(order_detail.takerAssetAmount).round(0, 1);
        console.log("getUnavailableTakerTokenAmount = " + amount);
        return amount;
    });
}
function convertToBaseTokenAmount(tokenAmount, orderdetail) {
    var baseTokenAmount;
    baseTokenAmount = tokenAmount.mul(orderdetail.takerAssetAmount).div(orderdetail.makerAssetAmount).round(0, 2);
    return baseTokenAmount;
}
function convertToTokenAmount(baseTokenAmount, orderdetail) {
    var tokenAmount;
    tokenAmount = baseTokenAmount.mul(orderdetail.makerAssetAmount).div(orderdetail.takerAssetAmount).round(0, 1);
    return tokenAmount;
}
function batchfillOrder(create_order, type, price, amount, token_address, base_token = 'WETH', token_symbol = 'ZRX') {
    return __awaiter(this, void 0, void 0, function* () {
        var result = "No Match";
        var signed_order_detail = [];
        var signed_order = [];
        var fillable_order = [];
        var delete_order = [];
        var update_order = undefined;
        var update_order_amount;
        var order_real_amountArray = [];
        var status_order = [];
        var maker_amount = new _0x_js_1.BigNumber(0);
        var taker_amount = new _0x_js_1.BigNumber(0);
        var match_order;
        var match_order_detail;
        var orderFilledAmount;
        var order;
        // check the limit per maker
        var count = yield dbManager.count_orders(create_order.maker_address);
        if (global.MAX_ORDERS_PER_MAKER <= count) {
            result = 'fail';
            return result;
        }
        var orderDetail = yield dbManager.find_order_detail(create_order.detail_id);
        if (orderDetail == undefined)
            return result;
        var order_detail = JSON.parse(orderDetail.signedorder);
        // Get matching orders
        if (type == 0)
            match_order = yield dbManager.find_matching_orders(base_token, token_symbol, price, 1);
        else
            match_order = yield dbManager.find_matching_orders(base_token, token_symbol, price, 0);
        // Get Token Decimals From Token Address
        var decimals = getTokenDecimals(token_address);
        taker_amount = new _0x_js_1.BigNumber(create_order.amount).mul(new _0x_js_1.BigNumber(10).pow(decimals));
        // status -> 1 for lock order
        status_order[status_order.length] = create_order.id;
        yield dbManager.update_status_order(create_order.id, 1);
        for (var i = 0; i < match_order.length; i++) {
            status_order[status_order.length] = match_order[i].id;
            yield dbManager.update_status_order(match_order[i].id, 1);
        }
        try {
            if (match_order.length > 0) {
                var i = 0;
                var order_real_amount;
                while (i < match_order.length) {
                    if (create_order.maker_address === match_order[i].maker_address) {
                        i += 1;
                        continue;
                    }
                    orderDetail = yield dbManager.find_order_detail(match_order[i].detail_id);
                    match_order_detail = JSON.parse(orderDetail.signedorder);
                    order = order_create(match_order_detail);
                    order_real_amount = new _0x_js_1.BigNumber(match_order[i].amount).mul(new _0x_js_1.BigNumber(10).pow(decimals));
                    if (!order_real_amount.eq(0)) {
                        signed_order_detail[signed_order_detail.length] = match_order_detail;
                        signed_order[signed_order.length] = match_order[i];
                        fillable_order[fillable_order.length] = order;
                        order_real_amountArray[order_real_amountArray.length] = order_real_amount;
                        maker_amount = maker_amount.plus(order_real_amount);
                    }
                    else {
                        delete_order[delete_order.length] = match_order[i];
                        i += 1;
                        continue;
                    }
                    if (maker_amount.gte(taker_amount)) {
                        if (maker_amount.eq(taker_amount))
                            delete_order[delete_order.length] = match_order[i];
                        break;
                    }
                    else
                        delete_order[delete_order.length] = match_order[i];
                    i += 1;
                }
            }
            console.log("----------taker Amount: " + taker_amount);
            if (signed_order_detail.length > 0) {
                //fill order
                var signed_fillable_order = [];
                var takerAssetFillAmounts = [];
                var is_update_last_maker_order = false;
                var trade_amount_for_last_maker_order;
                var real_taker_amount = taker_amount;
                maker_amount = new _0x_js_1.BigNumber(0);
                for (var i = 0; i < fillable_order.length; i++) {
                    // const orderHashHex = orderHashUtils.getOrderHashHex(fillable_order[i]);
                    // const signature = await signatureUtils.ecSignHashAsync(providerEngine, orderHashHex, signed_order_detail[i].makerAddress);
                    const signature = signed_order_detail[i].signature;
                    const signedOrder = Object.assign({}, fillable_order[i], { signature });
                    signed_fillable_order[i] = signedOrder;
                    maker_amount = maker_amount.plus(order_real_amountArray[i]);
                    console.log("----------maker " + i + " Amount: " + order_real_amountArray[i]);
                    // orderFilledAmount = await getFilledAmount(type, signed_order[i].order_hash, signed_order_detail[i]);
                    takerAssetFillAmounts[i] = order_real_amountArray[i];
                    if (type == 1)
                        takerAssetFillAmounts[i] = convertToBaseTokenAmount(order_real_amountArray[i], signed_order_detail[i]);
                    if (i == fillable_order.length - 1) {
                        var update_amount;
                        var tradeAmount;
                        if (maker_amount.lt(taker_amount)) {
                            //update taker order
                            if (type == 0) {
                                var temp1 = convertToBaseTokenAmount(taker_amount, order_detail);
                                var temp2 = convertToBaseTokenAmount(maker_amount, order_detail);
                                var temp = temp1.minus(temp2);
                                update_amount = convertToTokenAmount(temp, order_detail);
                            }
                            else
                                update_amount = taker_amount.minus(maker_amount);
                            tradeAmount = update_amount.div(new _0x_js_1.BigNumber(10).pow(decimals));
                            console.log("----------update taker order: " + tradeAmount);
                            update_order = create_order;
                            update_order_amount = tradeAmount.round(8, 1).toNumber();
                            real_taker_amount = maker_amount;
                        }
                        else {
                            // update last maker order
                            update_amount = maker_amount.minus(taker_amount);
                            var filledAmount = order_real_amountArray[i].minus(update_amount);
                            if (!update_amount.eq(0)) {
                                if (type == 1) {
                                    var temp1 = convertToBaseTokenAmount(order_real_amountArray[i], signed_order_detail[i]);
                                    var temp2 = convertToBaseTokenAmount(filledAmount, signed_order_detail[i]);
                                    var temp = temp1.minus(temp2);
                                    takerAssetFillAmounts[i] = temp2;
                                    update_amount = convertToTokenAmount(temp, signed_order_detail[i]);
                                }
                                else
                                    takerAssetFillAmounts[i] = order_real_amountArray[i].minus(update_amount);
                                tradeAmount = update_amount.div(new _0x_js_1.BigNumber(10).pow(decimals));
                                console.log("----------update last make order: " + tradeAmount);
                                update_order = signed_order[i];
                                update_order_amount = tradeAmount.round(8, 1).toNumber();
                                trade_amount_for_last_maker_order = filledAmount.div(new _0x_js_1.BigNumber(10).pow(decimals));
                                is_update_last_maker_order = true;
                            }
                            delete_order[delete_order.length] = create_order;
                        }
                    }
                }
                if (type == 0)
                    real_taker_amount = convertToBaseTokenAmount(real_taker_amount, order_detail);
                // Change order arrays
                const signature = order_detail.signature;
                const signed_create_order = Object.assign({}, order_create(order_detail), { signature });
                signed_fillable_order[signed_fillable_order.length] = signed_create_order;
                takerAssetFillAmounts[takerAssetFillAmounts.length] = real_taker_amount;
                var tmp;
                if (type == 0) {
                    tmp = signed_fillable_order[0];
                    signed_fillable_order[0] = signed_fillable_order[signed_fillable_order.length - 1];
                    signed_fillable_order[signed_fillable_order.length - 1] = tmp;
                    tmp = takerAssetFillAmounts[0];
                    takerAssetFillAmounts[0] = takerAssetFillAmounts[takerAssetFillAmounts.length - 1];
                    takerAssetFillAmounts[takerAssetFillAmounts.length - 1] = tmp;
                }
                // for (var i = 0; i < signed_fillable_order.length; i++) {
                //     console.log("exchangeAddress: " + signed_fillable_order[i].exchangeAddress);
                //     console.log("makerAddress: " + signed_fillable_order[i].makerAddress);
                //     console.log("takerAddress: " + signed_fillable_order[i].takerAddress);
                //     console.log("senderAddress: " + signed_fillable_order[i].senderAddress);
                //     console.log("feeRecipientAddress: " + signed_fillable_order[i].feeRecipientAddress);
                //     console.log("expirationTimeSeconds: " + signed_fillable_order[i].expirationTimeSeconds);
                //     console.log("salt: " + signed_fillable_order[i].salt);
                //     console.log("makerAssetAmount: " + signed_fillable_order[i].makerAssetAmount);
                //     console.log("takerAssetAmount: " + signed_fillable_order[i].takerAssetAmount);
                //     console.log("makerAssetData: " + signed_fillable_order[i].makerAssetData);
                //     console.log("takerAssetData: " + signed_fillable_order[i].takerAssetData);
                //     console.log("makerFee: " + signed_fillable_order[i].makerFee);
                //     console.log("takerFee: " + signed_fillable_order[i].takerFee);
                //     console.log("takerAssetFillAmounts: " + takerAssetFillAmounts[i] + "\n");
                // }
                var txHash = '';
                for (var i = 0; i < 3; i++) {
                    try {
                        txHash = yield contractWrappers.exchange.batchFillOrdersAsync(signed_fillable_order, takerAssetFillAmounts, wallet_address.toLowerCase(), {
                            shouldValidate: true,
                            gasLimit: 1000000,
                        });
                    }
                    catch (error) {
                        console.log(error);
                        var nonce = parseInt(nonceTracker._nonceCache[wallet_address.toLowerCase()]);
                        console.log("-----------nonce = " + nonce);
                        yield initNonceValue();
                        if (i == 2)
                            throw error;
                        continue;
                    }
                    break;
                }
                if (delete_order.length > 0) {
                    var jj = 0;
                    var indexof;
                    var trade_history;
                    while (jj < delete_order.length) {
                        indexof = status_order.indexOf(delete_order[jj].id);
                        if (indexof >= 0)
                            delete status_order[indexof];
                        yield dbManager.delete_order(delete_order[jj].id);
                        order_channel_1.orderChannel.perform("broadcast", { order: delete_order[jj], type: "remove" });
                        if (delete_order[jj].id === create_order.id) {
                            jj += 1;
                            continue;
                        }
                        trade_history = yield dbManager.create_trade_histories(delete_order[jj].token_symbol, delete_order[jj].type, delete_order[jj].maker_address, create_order.maker_address, delete_order[jj].price, delete_order[jj].amount, delete_order[jj].base_token, delete_order[jj].total_amount, create_order.total_amount, txHash);
                        yield dbManager.create_pending_trades(delete_order[jj].token_symbol, delete_order[jj].type, delete_order[jj].maker_address, create_order.maker_address, delete_order[jj].price, delete_order[jj].amount, delete_order[jj].base_token, txHash);
                        order_channel_1.tradeChannel.perform("broadcast", { trade: trade_history });
                        jj += 1;
                    }
                }
                if (update_order !== undefined) {
                    yield dbManager.update_order(update_order.id, update_order_amount);
                    order_channel_1.orderChannel.perform("broadcast", { order: update_order, type: "update" });
                    if (update_order.id !== create_order.id) {
                        var trade_history = yield dbManager.create_trade_histories(update_order.token_symbol, update_order.type, update_order.maker_address, create_order.maker_address, update_order.price, trade_amount_for_last_maker_order.round(8, 1).toNumber(), update_order.base_token, update_order.total_amount, create_order.total_amount, txHash);
                        yield dbManager.create_pending_trades(update_order.token_symbol, update_order.type, update_order.maker_address, create_order.maker_address, update_order.price, trade_amount_for_last_maker_order.round(8, 1).toNumber(), update_order.base_token, txHash);
                        order_channel_1.tradeChannel.perform("broadcast", { trade: trade_history });
                    }
                }
                result = txHash;
            }
            else {
                if (delete_order.length > 0) {
                    var jj = 0;
                    while (jj < delete_order.length) {
                        yield dbManager.delete_order(delete_order[jj].id);
                        order_channel_1.orderChannel.perform("broadcast", { order: delete_order[jj], type: "remove" });
                        jj += 1;
                    }
                }
            }
        }
        catch (err) {
            console.log(err);
            result = 'fail';
        }
        // status -> 0 for unlock order
        for (var i = 0; i < status_order.length; i++) {
            if (status_order[i] === undefined)
                continue;
            yield dbManager.update_status_order(status_order[i], 0);
        }
        return result;
    });
}
const router = express.Router();
router.post('/create', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var signed_order = req.body.signed_order;
        var state = req.body.state;
        var type = req.body.type;
        var base_token = req.body.base_token;
        var token_symbol = req.body.token_symbol;
        var amount = req.body.amount;
        var token_price = req.body.price;
        var expire = req.body.expire;
        var expire_date = req.body.expire_date;
        var taker_amount = req.body.taker_amount;
        var maker_amount = req.body.maker_amount;
        var maker_address = req.body.maker_addr;
        var token_addr = req.body.token_addr;
        var trade_fee = req.body.trade_fee;
        var order_hash = req.body.order_hash;
        var detail_id = 0;
        var json_data = {
            "status": 'ok',
            "result": '',
        };
        try {
            // const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
            // console.log('Maker = ' + maker);
            // console.log('Taker = ' + taker);
            // check token symbol allowance
            if (base_token == "WETH")
                yield set_allowance(base_token, global.weth_contract_addr);
            else if (base_token == "TM")
                yield set_allowance(base_token, global.tm_token_addr);
            else if (base_token == "USDC")
                yield set_allowance(base_token, global.usdc_token_addr);
            else if (base_token == "WBTC")
                yield set_allowance(base_token, global.wbtc_token_addr);
            yield set_allowance(token_symbol, token_addr);
            // console.log(base_token + " Balance = " + getBalance(global.weth_contract_addr));
            // console.log(token_symbol + " Balance = " + getBalance(token_addr));
            var orderDetail = yield dbManager.create_order_detail(signed_order, expire_date, taker_amount, maker_amount);
            detail_id = orderDetail.id;
            var order = yield dbManager.create_order(type, state, base_token, token_symbol, amount, token_price, order_hash, trade_fee, expire, detail_id, maker_address, amount);
            order_channel_1.orderChannel.perform("broadcast", { order: order, type: "add" });
            var result = yield batchfillOrder(order, type, token_price, amount, token_addr, base_token, token_symbol);
            console.log('txHash = ' + result);
            if (result === 'fail')
                json_data['status'] = 'fail';
            else
                json_data['result'] = result;
        }
        catch (e) {
            console.log(e);
            json_data['status'] = 'fail';
        }
        res.send(json_data);
    });
});
function send_tm_token(value = 100, wallet_addr) {
    return __awaiter(this, void 0, void 0, function* () {
        var contract_address = global.tm_token_addr;
        var decimal = 18;
        var big_value = new _0x_js_1.BigNumber(value).mul(new _0x_js_1.BigNumber(10).pow(decimal)).round();
        var big_value_string = big_value.toString(16);
        var big_value_param = hash32(big_value_string);
        var spender_address = wallet_addr;
        var function_name = '0xa9059cbb';
        spender_address = hash32(spender_address.slice(2));
        var address_param = hash32(spender_address);
        function_name += address_param;
        function_name += big_value_param;
        var txHash = '';
        for (var i = 0; i < 3; i++) {
            try {
                txHash = yield web3Wrapper.sendTransactionAsync({
                    value: 0,
                    from: wallet_address.toLowerCase(),
                    to: contract_address.toLowerCase(),
                    data: function_name
                });
            }
            catch (error) {
                console.log(error);
                var nonce = parseInt(nonceTracker._nonceCache[wallet_address.toLowerCase()]);
                console.log("-----------nonce = " + nonce);
                yield initNonceValue();
                if (i == 2)
                    throw error;
                continue;
            }
            break;
        }
        return txHash;
    });
}
router.post('/request_reward', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var wallet_addr = req.body.wallet_addr;
        var json_data = {
            "state": 'ok',
            "tx": '',
            "tm_point": '',
            "volume": '',
        };
        try {
            var old_reward = yield dbManager.find_reward(wallet_addr);
            var trades;
            var total_volume = 0;
            if (old_reward)
                trades = yield dbManager.find_trade_histories('WETH', null, wallet_addr, old_reward.created_at, true, null, null);
            else {
                total_volume = 1000;
                trades = yield dbManager.find_trade_histories('WETH', null, wallet_addr, null, true, null, null);
            }
            if (trades) {
                var volume;
                trades.forEach(function (trade) {
                    // volume = trade.price * trade.amount;
                    if ((trade.total_amount == null) || (trade.taker_total_amount == null))
                        return;
                    if ((trade.total_amount == 0) || (trade.taker_total_amount == 0))
                        return;
                    if (trade.maker_address === wallet_addr)
                        volume = trade.amount * 100.0 / trade.total_amount;
                    else if (trade.taker_address === wallet_addr)
                        volume = trade.amount * 100.0 / trade.taker_total_amount;
                    total_volume += volume;
                });
                // var tm_point = total_volume * rewardRatio;
                // tm_point = Number(tm_point.toFixed(2));
                var tm_point = Number(total_volume.toFixed(2));
                console.log("TM_POINT = " + tm_point);
                if (tm_point > rewardRequestAmount) {
                    var amount = tm_point - rewardTMFee;
                    amount = Number(amount.toFixed(2));
                    yield dbManager.create_reward_manager(wallet_addr, amount);
                    var current_user = yield dbManager.find_user_by_wallet(wallet_addr);
                    if (current_user) {
                        var recommended_user = yield dbManager.find_user_by_referral(current_user.recommended_id);
                        if (recommended_user) {
                            amount = tm_point * 0.1 - rewardTMFee;
                            if (amount < 0)
                                return;
                            amount = Number(amount.toFixed(2));
                            yield dbManager.create_referral_manager(recommended_user.wallet_address, amount, current_user.referral_id);
                        }
                    }
                    json_data['state'] = 'ok';
                }
                else {
                    json_data['state'] = 'low_tm_point';
                    json_data['volume'] = total_volume.toString();
                }
            }
            else {
                json_data['state'] = 'No_transaction';
                json_data['volume'] = total_volume.toString();
            }
        }
        catch (e) {
            console.log(e);
            json_data['state'] = 'fail';
        }
        res.send(json_data);
    });
});
router.post('/allow_reward', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var wallet_addr = req.body.wallet_address;
        var tm_point = req.body.amount;
        var id = req.body.id;
        var json_data = {
            "state": 'ok',
            "tx": '',
            "tm_point": '',
            "volume": '',
        };
        try {
            console.log("Allowed Reward TM POINT = " + tm_point);
            var txHash = yield send_tm_token(tm_point, wallet_addr);
            console.log("TX HASH = " + txHash);
            json_data['tx'] = txHash;
            json_data['tm_point'] = tm_point.toString();
            order_channel_1.rewardChannel.perform("broadcast", { reward: wallet_addr.toLowerCase() });
        }
        catch (e) {
            console.log(e);
            json_data['state'] = 'fail';
        }
        res.send(json_data);
    });
});
router.post('/allow_referral', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var wallet_addr = req.body.wallet_address;
        var tm_point = req.body.amount;
        var json_data = {
            "state": 'ok',
            "tx": '',
            "tm_point": '',
            "volume": '',
        };
        try {
            console.log("Allowed Referral TM POINT = " + tm_point);
            var txHash = yield send_tm_token(tm_point, wallet_addr);
            console.log("TX HASH = " + txHash);
            json_data['tx'] = txHash;
            json_data['tm_point'] = tm_point.toString();
            order_channel_1.rewardChannel.perform("broadcast", { reward: wallet_addr.toLowerCase() });
        }
        catch (e) {
            console.log(e);
            json_data['state'] = 'fail';
        }
        res.send(json_data);
    });
});
/*-------------------------------------------------------------------------------
                            API functions
-------------------------------------------------------------------------------*/
function response_fail(res, error) {
    var json_data = {
        "status": 'fail',
        "error": error,
    };
    res.send(json_data);
}
function calculate_fee(total, base_token) {
    if (base_token == "TM") {
        return ((parseFloat(total) * global.tm_fee_percent) / 100 + global.initial_tm_fee);
    }
    else if (base_token == "USDC") {
        return ((parseFloat(total) * global.usdc_fee_percent) / 100 + global.initial_usdc_fee);
    }
    else if (base_token == "WBTC") {
        return ((parseFloat(total) * global.wbtc_fee_percent) / 100 + global.initial_wbtc_fee);
    }
    else {
        return ((parseFloat(total) * global.fee_percent) / 100 + global.initial_fee);
    }
}
var set_wallet_allowance = (token_symbol, token_contract_addr, wallet_addr) => __awaiter(this, void 0, void 0, function* () {
    try {
        var allowanceBalance = yield contractWrappers.erc20Token.getProxyAllowanceAsync(token_contract_addr, wallet_addr.toLowerCase());
        if (allowanceBalance.eq(0)) {
            console.log("Allowing " + token_symbol + " ---");
            const tokenApprovalTxHash = yield contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(token_contract_addr, wallet_addr.toLowerCase());
            yield web3Wrapper.awaitTransactionMinedAsync(tokenApprovalTxHash);
            console.log(token_symbol + " unlimited: " + tokenApprovalTxHash);
        }
    }
    catch (err) {
        console.log(err);
    }
});
function check_balance(res, token, order, param, real_price) {
    var wallet_addr = param.wallet_addr;
    var get_allowance;
    if (param.trade == "buy") {
        get_allowance = () => __awaiter(this, void 0, void 0, function* () {
            if (param.base_token == "WETH") {
                let balance_status = yield contractWrappers.erc20Token.getBalanceAsync(param.maker_token_addr, wallet_addr);
                let balance = web3.fromWei(balance_status.toNumber(), "ether");
                if ((balance < param.amount * param.price) || (balance < real_price)) {
                    response_fail(res, 'insufficient balance');
                }
                else if (real_price > global.max_trading_eth) {
                    response_fail(res, 'max trade size is ' + global.max_trading_eth + " " + param.base_token);
                }
                else {
                    build_order(res, order, param);
                }
            }
            else if (param.base_token == "TM") {
                let balance_status = yield contractWrappers.erc20Token.getBalanceAsync(param.maker_token_addr, wallet_addr);
                let balance = parseFloat((balance_status.toNumber() / Math.pow(10, global.DECIMALS)).toFixed(6));
                if ((balance < param.amount * param.price) || (balance < real_price)) {
                    response_fail(res, 'insufficient balance');
                }
                else if (real_price > global.max_trading_tm) {
                    response_fail(res, 'max trade size is ' + global.max_trading_tm + " " + param.base_token);
                }
                else {
                    build_order(res, order, param);
                }
            }
            else if (param.base_token == "USDC") {
                let balance_status = yield contractWrappers.erc20Token.getBalanceAsync(param.maker_token_addr, wallet_addr);
                let balance = parseFloat((balance_status.toNumber() / Math.pow(10, global.usdc_decimals)).toFixed(6));
                if ((balance < param.amount * param.price) || (balance < real_price)) {
                    response_fail(res, 'insufficient balance');
                }
                else if (real_price > global.max_trading_usdc) {
                    response_fail(res, 'max trade size is ' + global.max_trading_usdc + " " + param.base_token);
                }
                else {
                    build_order(res, order, param);
                }
            }
            else if (param.base_token == "WBTC") {
                let balance_status = yield contractWrappers.erc20Token.getBalanceAsync(param.maker_token_addr, wallet_addr);
                let balance = parseFloat((balance_status.toNumber() / Math.pow(10, global.wbtc_decimals)).toFixed(6));
                if ((balance < param.amount * param.price) || (balance < real_price)) {
                    response_fail(res, 'insufficient balance');
                }
                else if (real_price > global.max_trading_wbtc) {
                    response_fail(res, 'max trade size is ' + global.max_trading_wbtc + " " + param.base_token);
                }
                else {
                    build_order(res, order, param);
                }
            }
            else {
                return response_fail(res, 'unknown base_token');
            }
        });
        get_allowance().catch(console.error);
    }
    else {
        get_allowance = () => __awaiter(this, void 0, void 0, function* () {
            let token_decimals = token.token_decimals;
            let balance_status = yield contractWrappers.erc20Token.getBalanceAsync(param.maker_token_addr, wallet_addr);
            let balance = (balance_status.toNumber() / Math.pow(10, token_decimals));
            if (balance < param.amount || real_price < 0) {
                response_fail(res, 'insufficient balance');
            }
            else {
                var max_trading;
                if (param.base_token == "WETH") {
                    max_trading = global.max_trading_eth;
                }
                else if (param.base_token == "USDC") {
                    max_trading = global.max_trading_usdc;
                }
                else if (param.base_token == "WBTC") {
                    max_trading = global.max_trading_wbtc;
                }
                else {
                    max_trading = global.max_trading_tm;
                }
                if (real_price > max_trading) {
                    response_fail(res, 'max trade size is ' + max_trading + " " + param.base_token);
                }
                else {
                    build_order(res, order, param);
                }
            }
        });
        get_allowance().catch(console.error);
    }
}
function build_order(res, order, param) {
    return __awaiter(this, void 0, void 0, function* () {
        var json_data = {
            "status": 'success',
        };
        try {
            let orderHash = order_utils_1.orderHashUtils.getOrderHashHex(order);
            yield dbManager.delete_building_order(param.wallet_addr);
            var buildingOrder = yield dbManager.create_building_order(param.wallet_addr, orderHash, JSON.stringify(order), JSON.stringify(param));
            json_data['result'] = {
                "market_id": param.token_symbol + "-" + param.base_token,
                "wallet_addr": param.wallet_addr,
                "trade": param.trade,
                "price": param.price,
                "amount": param.amount,
                "orderHash": orderHash,
                "order": order,
            };
        }
        catch (e) {
            console.log(e);
            json_data['status'] = 'fail';
        }
        res.send(json_data);
    });
}
router.post('/build_order', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var wallet_addr = req.get('wallet-addr');
        var trade = req.body.trade;
        var price = req.body.price;
        var amount = req.body.amount;
        var market_id = req.body.market_id;
        var base_token, token_symbol, market;
        var token;
        var type, maker_token_addr, taker_token_addr, taker_amount, maker_amount, maker_decimals, taker_decimals, maker_amount, trade_fee;
        var total_price, fee_price, real_price;
        if (account_router_1.check_account_auth(req, res) == false) {
            return;
        }
        wallet_addr = wallet_addr.toLowerCase();
        market = market_router_1.parse_market_id(market_id);
        if (market == null) {
            return response_fail(res, 'failed to parse market_id');
        }
        base_token = market.base_token;
        token_symbol = market.token_symbol;
        // validate base_token
        if (base_token != "WETH" && base_token != "TM" && base_token != "USDC" && base_token != "WBTC") {
            return response_fail(res, 'invalid base_token:' + base_token);
        }
        // get token info
        token = yield dbManager.find_token(token_symbol);
        if (token == undefined) {
            return response_fail(res, 'invalid token_symbol:' + token_symbol);
        }
        // validate amount and price
        if (isNaN(amount) || amount == 0 || price == 0 || isNaN(price)) {
            return response_fail(res, 'invalid amount and price');
        }
        price = parseFloat(price);
        amount = parseFloat(amount);
        // calculate fee and price
        total_price = (price * amount).toFixed(6);
        fee_price = calculate_fee(total_price, base_token).toFixed(5);
        if (trade == "buy") {
            real_price = (parseFloat(total_price) + parseFloat(fee_price)).toFixed(6);
        }
        else {
            real_price = (parseFloat(total_price) - parseFloat(fee_price)).toFixed(6);
        }
        if (trade == "buy") {
            type = 1;
            if (base_token == "WETH") {
                maker_token_addr = contractAddresses.etherToken;
                maker_decimals = global.DECIMALS;
            }
            else if (base_token == "USDC") {
                maker_token_addr = global.usdc_token_addr;
                maker_decimals = global.usdc_decimals;
            }
            else if (base_token == "WBTC") {
                maker_token_addr = global.wbtc_token_addr;
                maker_decimals = global.wbtc_decimals;
            }
            else {
                maker_decimals = global.DECIMALS;
                maker_token_addr = global.tm_token_addr;
            }
            taker_token_addr = token.contract_address;
            if (token_symbol == "TM") {
                // for test
                taker_token_addr = global.tm_token_addr;
            }
            taker_token_addr = taker_token_addr.toLowerCase();
            maker_amount = parseFloat(real_price);
            taker_amount = parseFloat(amount);
            taker_decimals = token.token_decimals;
            trade_fee = fee_price;
            set_wallet_allowance(base_token, maker_token_addr, wallet_addr);
            set_wallet_allowance(token_symbol, taker_token_addr, wallet_addr);
        }
        else if (trade == "sell") {
            type = 0;
            maker_token_addr = token.contract_address;
            if (token_symbol == "TM") {
                // for test
                maker_token_addr = global.tm_token_addr;
            }
            maker_token_addr = maker_token_addr.toLowerCase();
            if (base_token == "WETH") {
                taker_token_addr = contractAddresses.etherToken;
                taker_decimals = global.DECIMALS;
            }
            else if (base_token == "USDC") {
                taker_token_addr = global.usdc_token_addr;
                taker_decimals = global.usdc_decimals;
            }
            else if (base_token == "WBTC") {
                taker_token_addr = global.wbtc_token_addr;
                taker_decimals = global.wbtc_decimals;
            }
            else {
                taker_token_addr = global.tm_token_addr;
                taker_decimals = global.DECIMALS;
            }
            maker_amount = parseFloat(amount);
            taker_amount = parseFloat(real_price);
            maker_decimals = token.token_decimals;
            trade_fee = fee_price;
            set_wallet_allowance(token_symbol, maker_token_addr, wallet_addr);
            set_wallet_allowance(base_token, taker_token_addr, wallet_addr);
        }
        else {
            return response_fail(res, 'invalid trade:' + trade);
        }
        var exchangeAddress = contractWrappers.exchange.address;
        var makerAddress = wallet_addr;
        var takerAddress = exports.NULL_ADDRESS;
        var senderAddress = exports.NULL_ADDRESS;
        var feeRecipientAddress = exports.NULL_ADDRESS;
        var expire = Math.floor(Date.now() / 1000) + (60 * 24 * 60 * 60);
        var expirationTimeSeconds = new _0x_js_1.BigNumber(expire * 1000);
        var salt = _0x_js_1.generatePseudoRandomSalt();
        var makerAssetAmount = web3_wrapper_1.Web3Wrapper.toBaseUnitAmount(new _0x_js_1.BigNumber(maker_amount), maker_decimals);
        var takerAssetAmount = web3_wrapper_1.Web3Wrapper.toBaseUnitAmount(new _0x_js_1.BigNumber(taker_amount), taker_decimals);
        var makerAssetData = order_utils_1.assetDataUtils.encodeERC20AssetData(maker_token_addr);
        var takerAssetData = order_utils_1.assetDataUtils.encodeERC20AssetData(taker_token_addr);
        var makerFee = new _0x_js_1.BigNumber(0);
        var takerFee = new _0x_js_1.BigNumber(0);
        let order = {
            exchangeAddress,
            makerAddress,
            takerAddress,
            senderAddress,
            feeRecipientAddress,
            expirationTimeSeconds,
            salt,
            makerAssetAmount,
            takerAssetAmount,
            makerAssetData,
            takerAssetData,
            makerFee,
            takerFee,
        };
        let param = {
            base_token,
            token_symbol,
            wallet_addr,
            trade,
            price,
            amount,
            signature: "",
            maker_token_addr,
            taker_token_addr,
            taker_amount,
            maker_amount,
            expire_date: expire,
            type,
            trade_fee,
        };
        check_balance(res, token, order, param, real_price);
    });
});
router.post('/place_order', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var wallet_addr = req.get('wallet-addr');
        var order_hash = req.body.order_hash;
        var signature = req.body.signature;
        var buildingOrder, detail_id, token_addr;
        var json_data = {
            "status": 'success',
            "result": '',
        };
        if (account_router_1.check_account_auth(req, res) == false) {
            return;
        }
        wallet_addr = wallet_addr.toLowerCase();
        // validate order hash
        if (order_hash == "" || order_hash == null) {
            return response_fail(res, 'invalid order_hash');
        }
        // validate signature
        if (signature == "" || signature == null) {
            return response_fail(res, 'invalid signature');
        }
        buildingOrder = yield dbManager.find_building_order(wallet_addr, order_hash);
        if (buildingOrder == undefined) {
            return response_fail(res, 'failed to find building order');
        }
        buildingOrder.order = JSON.parse(buildingOrder.order);
        buildingOrder.param = JSON.parse(buildingOrder.param);
        const signedOrder = Object.assign({}, buildingOrder.order, { signature: signature, maker_token_addr: buildingOrder.param.maker_token_addr, taker_token_addr: buildingOrder.param.taker_token_addr });
        var orderDetail = yield dbManager.create_order_detail(JSON.stringify(signedOrder), buildingOrder.param.expire_date, buildingOrder.param.taker_amount, buildingOrder.param.maker_amount);
        detail_id = orderDetail.id;
        var order = yield dbManager.create_order(buildingOrder.param.type, 0, buildingOrder.param.base_token, buildingOrder.param.token_symbol, buildingOrder.param.amount, buildingOrder.param.price, order_hash, buildingOrder.param.trade_fee, buildingOrder.param.expire_date, detail_id, buildingOrder.order.makerAddress, buildingOrder.param.amount);
        order_channel_1.orderChannel.perform("broadcast", { order: order, type: "add" });
        if (buildingOrder.param.type == 1) {
            // buy
            token_addr = buildingOrder.param.taker_token_addr;
        }
        else {
            token_addr = buildingOrder.param.maker_token_addr;
        }
        var result = yield batchfillOrder(order, buildingOrder.param.type, buildingOrder.param.price, buildingOrder.param.amount, token_addr, buildingOrder.param.base_token, buildingOrder.param.token_symbol);
        if (result === 'fail') {
            json_data['status'] = 'fail';
        }
        else {
            yield dbManager.delete_building_order(wallet_addr);
            json_data['result'] = result;
        }
        res.send(json_data);
    });
});
router.get('/get_orders', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var wallet_addr = req.get('wallet-addr');
        var market_id = req.query.market_id;
        var page = req.query.page;
        var page_size = req.query.page_size;
        var base_token, token_symbol, market;
        var json_data = {
            "status": 'success',
            "orders": '',
        };
        if (wallet_addr != undefined) {
            // Private API
            if (account_router_1.check_account_auth(req, res) == false) {
                return;
            }
            wallet_addr = wallet_addr.toLowerCase();
        }
        else {
            // Public API
            wallet_addr = null;
        }
        market = market_router_1.parse_market_id(market_id);
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
        }
        else {
            page_size = parseInt(page_size);
            if (page_size <= 0) {
                page_size = global.PAGE_DEFAULT_SIZE;
            }
        }
        if (page == undefined) {
            page = global.PAGE_DEFAULT_NUM;
        }
        else {
            page = parseInt(page);
            if (page < global.PAGE_DEFAULT_NUM) {
                page = global.PAGE_DEFAULT_NUM;
            }
        }
        var my_orders = yield dbManager.find_orders(wallet_addr, base_token, token_symbol, (page - global.PAGE_DEFAULT_NUM) * page_size, page_size);
        if (my_orders.length > 0) {
            var orders = my_orders.map((node) => node.get({ plain: true }));
            for (var i = 0; i < orders.length; i++) {
                market_id = orders[i].token_symbol + "-" + orders[i].base_token;
                orders[i]['market_id'] = market_id;
                orders[i].base_token = undefined;
                orders[i].token_symbol = undefined;
            }
            json_data['orders'] = orders;
        }
        else {
            json_data['status'] = "no_data";
        }
        res.send(json_data);
    });
});
router.post('/delete_order', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var wallet_addr = req.get('wallet-addr');
        var order_id = req.body.order_id;
        var json_data = {
            "status": 'success',
        };
        if (account_router_1.check_account_auth(req, res) == false) {
            return;
        }
        wallet_addr = wallet_addr.toLowerCase();
        // Get order from id
        var order = yield dbManager.find_order(wallet_addr, order_id);
        if (order == undefined) {
            return response_fail(res, 'failed to find order');
        }
        else if (order.state == 1) {
            return response_fail(res, 'failed to delete order');
        }
        else {
            yield dbManager.delete_order(order_id);
            order_channel_1.orderChannel.perform("broadcast", { order: order, type: "remove" });
        }
        res.send(json_data);
    });
});
// Public API
router.get('/get_hash_signature', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var private_key = req.query.private_key;
        var order_hash = req.query.order_hash;
        var json_data = {
            "status": 'success',
        };
        if (private_key == null || private_key == "") {
            response_fail(res, 'invalid private_key');
            return false;
        }
        if (order_hash == null || order_hash == "") {
            response_fail(res, 'invalid order_hash');
            return false;
        }
        const wallet_address = '0x' + ethereumjs_util_1.privateToAddress(private_key).toString("hex");
        const wallet_privatekey = private_key.substring(2); // remove "0x"
        try {
            const pe = new _0x_js_1.Web3ProviderEngine();
            pe.addProvider(new subproviders_1.PrivateKeyWalletSubprovider(wallet_privatekey));
            pe.addProvider(new _0x_js_1.RPCSubprovider('https://ropsten.infura.io'));
            pe.start();
            var signature = yield _0x_js_1.signatureUtils.ecSignHashAsync(pe, order_hash, wallet_address);
            json_data['signature'] = signature;
        }
        catch (e) {
            console.log(e);
            response_fail(res, 'failed to generate the signature');
        }
        res.send(json_data);
    });
});
router.get('/get_orderbook', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var market_id = req.query.market_id;
        var base_token, token_symbol, market;
        var json_data = {
            "status": 'success',
        };
        market = market_router_1.parse_market_id(market_id);
        if (market == null) {
            return response_fail(res, 'failed to parse market_id');
        }
        base_token = market.base_token;
        token_symbol = market.token_symbol;
        // validate base_token
        if (base_token != "WETH" && base_token != "TM" && base_token != "USDC" && base_token != "WBTC") {
            return response_fail(res, 'invalid base_token:' + base_token);
        }
        var my_orders = yield dbManager.find_orders(null, base_token, token_symbol, null, null);
        if (my_orders.length > 0) {
            var orders = my_orders.map((node) => node.get({ plain: true }));
            var asks = [];
            var bids = [];
            for (var i = 0; i < orders.length; i++) {
                var type = orders[i].type;
                orders[i].type = undefined;
                orders[i].detail_id = undefined;
                orders[i].base_token = undefined;
                orders[i].token_symbol = undefined;
                if (type == 1) {
                    // buy
                    bids.push(orders[i]);
                }
                else {
                    asks.push(orders[i]);
                }
            }
            var orderbook = {
                market_id: market_id,
                bids: bids,
                asks: asks,
            };
            json_data['orderbook'] = orderbook;
        }
        else {
            json_data['status'] = "no_data";
        }
        res.send(json_data);
    });
});
// Error handler
router.use(function (err, req, res, next) {
    if (err) {
        res.status(500).send(err);
    }
});
exports.orderRouter = router;
