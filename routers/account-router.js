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
const _0x_js_1 = require("0x.js");
const contract_addresses_1 = require("@0x/contract-addresses");
const subproviders_1 = require("@0x/subproviders");
const ethereumjs_util_1 = require("ethereumjs-util");
const Web3 = require("web3");
const global = require("../global/global");
const dbManager = require("../db/dbManager");
const providerEngine = new _0x_js_1.Web3ProviderEngine();
providerEngine.addProvider(new subproviders_1.NonceTrackerSubprovider());
providerEngine.addProvider(new _0x_js_1.RPCSubprovider('https://ropsten.infura.io'));
providerEngine.start();
const web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/'));
const contractAddresses = contract_addresses_1.getContractAddressesForNetworkOrThrow(global.NETWORK_ID);
const contractWrappersConfig = { networkId: global.NETWORK_ID, contractAddresses: contractAddresses };
const contractWrappers = new _0x_js_1.ContractWrappers(providerEngine, contractWrappersConfig);
const router = express.Router();
/*-------------------------------------------------------------------------------
                            API functions
-------------------------------------------------------------------------------*/
var preAction = function (req, res, next) {
    next();
};
function response_fail(res, error) {
    var json_data = {
        "status": 'fail',
        "error": error,
    };
    res.send(json_data);
}
function check_account_auth(req, res) {
    const VALID_PERIOD = (3 * 60 * 1000); // unit: ms, 3 minutes.
    var tm_auth = req.get('tm-auth');
    var wallet_addr = req.get('wallet-addr');
    var address;
    // validate wallet address
    if (wallet_addr == null || wallet_addr == "") {
        response_fail(res, 'invalid wallet-addr');
        return false;
    }
    wallet_addr = wallet_addr.toLowerCase();
    // validate tm_auth value
    if (tm_auth == null || tm_auth == "") {
        response_fail(res, 'no signature for authentication');
        return false;
    }
    var fields = tm_auth.split("#");
    if (fields.length != 2) {
        response_fail(res, 'invalid tm-auth value');
        return false;
    }
    var message = fields[0];
    var signature = fields[1];
    try {
        const sha = ethereumjs_util_1.hashPersonalMessage(ethereumjs_util_1.toBuffer(message));
        const vrs = ethereumjs_util_1.fromRpcSig(signature);
        let pubkey = ethereumjs_util_1.ecrecover(sha, vrs.v, vrs.r, vrs.s);
        address = '0x' + ethereumjs_util_1.publicToAddress(pubkey).toString('hex');
    }
    catch (e) {
        console.log(e);
        response_fail(res, 'failed to parse the tm-auth');
        return false;
    }
    if (address != wallet_addr) {
        response_fail(res, 'failed to auth with tm-auth');
        return false;
    }
    let now = Date.now();
    if (VALID_PERIOD < (now - parseInt(message))) {
        response_fail(res, 'It is old request');
        return false;
    }
    return true;
}
exports.check_account_auth = check_account_auth;
router.get('/get_balance', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var wallet_addr = req.get('wallet-addr');
        var token_symbol = req.query.token_symbol;
        var token_addr, token;
        var balance_status, balance;
        var json_data = {
            "status": 'success',
            "amount": '',
        };
        if (check_account_auth(req, res) == false) {
            return;
        }
        wallet_addr = wallet_addr.toLowerCase();
        // get token info
        token = yield dbManager.find_token(token_symbol);
        if (token == undefined) {
            return response_fail(res, 'invalid token_symbol:' + token_symbol);
        }
        if (token_symbol == "WETH") {
            token_addr = contractAddresses.etherToken;
            balance_status = yield contractWrappers.erc20Token.getBalanceAsync(token_addr, wallet_addr);
            balance = web3.fromWei(balance_status.toNumber(), "ether");
        }
        else if (token_symbol == "TM") {
            token_addr = global.tm_token_addr;
            balance_status = yield contractWrappers.erc20Token.getBalanceAsync(token_addr, wallet_addr);
            balance = parseFloat((balance_status.toNumber() / Math.pow(10, global.DECIMALS)).toFixed(6));
        }
        else {
            token_addr = token.contract_address;
            let token_decimals = token.token_decimals;
            balance_status = yield contractWrappers.erc20Token.getBalanceAsync(token_addr, wallet_addr);
            balance = (balance_status.toNumber() / Math.pow(10, token_decimals));
        }
        json_data['amount'] = balance;
        res.send(json_data);
    });
});
// Public API
router.get('/get_auth_signature', preAction, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var private_key = req.query.private_key;
        var json_data = {
            "status": 'success',
        };
        if (private_key == null || private_key == "") {
            response_fail(res, 'invalid private_key');
            return false;
        }
        try {
            const Address = '0x' + ethereumjs_util_1.privateToAddress(private_key).toString("hex");
            const Timestamp = Date.now().toString();
            const sha = ethereumjs_util_1.hashPersonalMessage(ethereumjs_util_1.toBuffer(Timestamp));
            const ecdsaSignature = ethereumjs_util_1.ecsign(sha, ethereumjs_util_1.toBuffer(private_key));
            const Signature = ethereumjs_util_1.toRpcSig(ecdsaSignature.v, ecdsaSignature.r, ecdsaSignature.s);
            json_data['wallet-addr'] = Address;
            json_data['tm-auth'] = Timestamp + "#" + Signature;
        }
        catch (e) {
            console.log(e);
            response_fail(res, 'failed to generate the signature');
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
exports.accountRouter = router;
