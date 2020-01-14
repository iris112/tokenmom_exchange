import * as Sequelize from 'sequelize';
const sequelize = new Sequelize('token_mom_development', 'root', 'root', {
  dialect: 'mysql'
});

/* order model define */
const Order = sequelize.define('orders', {
  type: Sequelize.INTEGER,
  state: Sequelize.INTEGER,
  base_token: Sequelize.STRING,
  expire: Sequelize.BIGINT,
  detail_id: Sequelize.BIGINT,
  token_symbol: Sequelize.STRING,
  maker_address: Sequelize.STRING,
  amount: Sequelize.DECIMAL(21, 10),
  price: Sequelize.DECIMAL(21, 10),
  fee: Sequelize.DECIMAL(21, 10),
  order_hash: Sequelize.STRING,
  total_amount: Sequelize.DECIMAL(21, 10)
}, {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/* order model define */
const OrderDetail = sequelize.define('order_details', {
  signedorder: Sequelize.TEXT,
  expire: Sequelize.BIGINT,
  taker_amount: Sequelize.DECIMAL(21, 10),
  maker_amount: Sequelize.DECIMAL(21, 10),
}, {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/* trade history define */
const TradeHistory = sequelize.define('trade_histories', {
  type: Sequelize.INTEGER,
  base_token: Sequelize.STRING,
  token_symbol: Sequelize.STRING,
  maker_address: Sequelize.STRING,
  taker_address: Sequelize.STRING,
  txHash: Sequelize.STRING,
  amount: Sequelize.DECIMAL(21, 10),
  price: Sequelize.DECIMAL(21, 10),
  reward_status: Sequelize.BOOLEAN,
  total_amount: Sequelize.DECIMAL(21, 10),
  taker_total_amount: Sequelize.DECIMAL(21, 10),
}, {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/* trade history define */
const PendingTrade = sequelize.define('pending_trades', {
  type: Sequelize.INTEGER,
  base_token: Sequelize.STRING,
  token_symbol: Sequelize.STRING,
  maker_address: Sequelize.STRING,
  taker_address: Sequelize.STRING,
  txHash: Sequelize.STRING,
  amount: Sequelize.DECIMAL(21, 10),
  price: Sequelize.DECIMAL(21, 10),
  reward_status: Sequelize.BOOLEAN,
}, {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/* tokens model define */
const Token = sequelize.define('tokens', {
  symbol: Sequelize.STRING,
  name: Sequelize.STRING,
  contract_address: Sequelize.STRING,
  token_decimals: Sequelize.BIGINT,
  on_hold: Sequelize.TINYINT,
  tm_field: Sequelize.TINYINT,
  usdc_field: Sequelize.TINYINT,
  wbtc_field: Sequelize.TINYINT,
  weth_token: Sequelize.TINYINT
}, {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/* rewardmanager model define */
const RewardManager = sequelize.define('reward_managers', {
  wallet_address: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  amount: Sequelize.DECIMAL(21, 10),
  approved: Sequelize.BOOLEAN,
  status: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
  },
  txHash: Sequelize.STRING,
}, {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/* referralmanager model define */
const ReferralManager = sequelize.define('referral_managers', {
  wallet_address: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  amount: Sequelize.DECIMAL(21, 10),
  approved: Sequelize.BOOLEAN,
  status: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
  },
  referral_id: Sequelize.STRING,
  txHash: Sequelize.STRING,
}, {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/* user model define */
const User = sequelize.define('users', {
  wallet_address: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  nick_name: {
    type: Sequelize.STRING,
    defaultvalue: 'Account',
  },
  banned: Sequelize.BOOLEAN,
  referral_id: Sequelize.STRING,
  recommended_id: Sequelize.STRING,
}, {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/* building order model define */
const BuildingOrder = sequelize.define('building_orders', {
  wallet_addr: Sequelize.STRING,
  order_hash: Sequelize.STRING,
  order: Sequelize.TEXT,
  param: Sequelize.TEXT,
}, {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

function create_order(type, state, base_token, token_symbol, amount, token_price, order_hash, trade_fee, expire, detail_id, maker_address, total_amount) {
  return Order.create({
      type: type,
      state: state,
      base_token: base_token,
      token_symbol: token_symbol,
      amount: amount,
      price: token_price,
      order_hash: order_hash,
      fee: trade_fee,
      expire: expire,
      detail_id: detail_id,
      maker_address: maker_address,
      total_amount: total_amount
  });
}

function create_order_detail(signed_order, expire_date, taker_amount, maker_amount) {
  return OrderDetail.create({
      signedorder: signed_order,
      expire: expire_date,
      taker_amount: taker_amount,
      maker_amount: maker_amount,
  });
}

function find_create_order(base_token, token_symbol, price, type) {
  return Order.findOne({
        where: {
            base_token: base_token,
            token_symbol: token_symbol,
            price: price,
            type: type
        }
  });
}

function find_order_detail(detail_id) {
  return OrderDetail.findOne({
      where: {
          id: detail_id,
      }
  });
}

function find_matching_orders(base_token, token_symbol, price, type) {
  if (type == 1) {
    return Order.findAll({
        where: {
            base_token: base_token,
            token_symbol: token_symbol,
            state: 0,
            price: {
              [Sequelize.Op.gte]: price
            },
            type: type
        },
        order: [['price', 'DESC'], ['created_at', 'ASC']]
    });
  } else {
    return Order.findAll({
        where: {
            base_token: base_token,
            token_symbol: token_symbol,
            state: 0,
            price: {
              [Sequelize.Op.lte]: price
            },
            type: type
        },
        order: [['price', 'ASC'], ['created_at', 'ASC']]
    });
  }
}

function find_orders(wallet_addr, base_token, token_symbol, offset, limit) {
  var where = {
    base_token: base_token,
    token_symbol: token_symbol,
  };

  if (wallet_addr != null) {
    where['maker_address'] = wallet_addr;
  }

  var query_param = {
    where: where,
    order: [['created_at', 'ASC']]
  };

  if (offset != null) {
    query_param['offset'] = offset;
  }
  if (limit != null) {
    query_param['limit'] = limit;
  }

  return Order.findAll(query_param);
}

function find_order(wallet_addr, order_id) {
  if (wallet_addr != null)
    return Order.findOne({
        where: {
          maker_address: wallet_addr,
          id: order_id,
        },
        order: [['created_at', 'ASC']]
    });
  else
    return Order.findOne({
      where: {
        id: order_id,
      },
      order: [['created_at', 'ASC']]
    });
}

async function delete_order(order_id) {
  var order = await Order.findOne({
                where: {
                    id: order_id,
                }
              });
  var detail_id = order.detail_id;
  await OrderDetail.destroy({
                where: {
                    id: detail_id,
                }
              });
  await Order.destroy({
            where: {
                id: order_id,
            }
          });
}

function update_order(id, amount) {
  return Order.update({
        amount: amount,
      }, {
        where: {
          id: id,
        }
      });
}

function update_status_order(id, state) {
  return Order.update({
        state: state,
      }, {
        where: {
          id: id,
        }
      });
}

function count_orders(maker_address) {
  var where = {
    maker_address: maker_address,
  };

  return Order.count({
    where: where
  });
}

function create_pending_trades(symbol, type, maker_address, taker_address, price, amount, base_token, txHash) {
  // Save Data to TradeHistory table
  return PendingTrade.create({
      base_token: base_token,
      token_symbol: symbol,
      type: type,
      maker_address: maker_address,
      taker_address: taker_address,
      price: price,
      amount: amount,
      txHash: txHash,
  });
}

function create_trade_histories(symbol, type, maker_address, taker_address, price, amount, base_token, total_amount, taker_total_amount, txHash) {
  // Save Data to TradeHistory table
  return TradeHistory.create({
      base_token: base_token,
      token_symbol: symbol,
      type: type,
      maker_address: maker_address,
      taker_address: taker_address,
      price: price,
      amount: amount,
      total_amount: total_amount,
      taker_total_amount: taker_total_amount,
      txHash: txHash,
  });
}

function find_trade_histories(base_token, token_symbol, wallet_address, created_at, create_at_after, offset, limit) {
  var where = {
    base_token: base_token,
    reward_status: {
      [Sequelize.Op.eq]: null
    },
  };

  if (token_symbol != null) {
    where['token_symbol'] = token_symbol;
  }

  if (created_at != null) {
    if (create_at_after == true) {
      where['created_at'] = {
        [Sequelize.Op.gt]: created_at
      };
    } else {
      where['created_at'] = {
        [Sequelize.Op.lt]: created_at
      };
    }
  }

  if (wallet_address != null) {
    where = {
      ...where,
      [Sequelize.Op.or]: [
        {
          maker_address: wallet_address
        },
        {
          taker_address: wallet_address
        }
      ],
    };
    // where['taker_address'] = wallet_address;
  }

  var query_param = {
    where: where,
    order: [['created_at', 'ASC']]
  };

  if (offset != null) {
    query_param['offset'] = offset;
  }
  if (limit != null) {
    query_param['limit'] = limit;
  }

  return TradeHistory.findAll(query_param);
}

function find_latest_trade_history(base_token, token_symbol) {
  var where = {};

  if (base_token != null) {
    where['base_token'] = base_token;
  }
  if (token_symbol != null) {
    where['token_symbol'] = token_symbol;
  }

  var query_param = {
    where: where,
    order: [['created_at', 'DESC']]
  };

  return TradeHistory.findOne(query_param);
}

function find_reward(wallet_address) {
  return RewardManager.findOne({
        where: {
            wallet_address: wallet_address,
        },
        order: [['created_at', 'DESC']]
    });
}

function create_reward_manager(wallet_address, amount) {
  return RewardManager.create({
          wallet_address: wallet_address,
          amount: amount,
          approved: false,
          status: false,
    });
}

function find_user_by_wallet(wallet_address) {
  return User.findOne({
        where: {
            wallet_address: wallet_address,
        }
    });
}

function find_user_by_referral(referral_id) {
  return User.findOne({
        where: {
            referral_id: referral_id,
        }
    });
}

function create_referral_manager(wallet_address, amount, referral_id) {
  return ReferralManager.create({
          wallet_address: wallet_address,
          amount: amount,
          referral_id: referral_id,
          approved: false,
          status: false,
    });
}

function find_token(token_symbol) {
  return Token.findOne({
      where: {
          symbol: token_symbol,
      }
  });
}

function find_tokens() {
  return Token.findAll({
      where: {
      },
      order: [['symbol', 'ASC']]
  });
}

function create_building_order(wallet_addr, order_hash, order, param) {
  return BuildingOrder.create({
      wallet_addr: wallet_addr,
      order_hash: order_hash,
      order: order,
      param: param,
  });
}

function delete_building_order(wallet_addr) {
  return BuildingOrder.destroy({
      where: {
          wallet_addr: wallet_addr,
      }
  });
}

function find_building_order(wallet_addr, order_hash) {
  return BuildingOrder.findOne({
      where: {
          wallet_addr: wallet_addr,
          order_hash: order_hash,
      }
  });
}

export {
  Order,
  OrderDetail,
  create_order,
  create_order_detail,
  find_create_order,
  find_order_detail,
  find_matching_orders,
  find_orders,
  find_order,
  delete_order,
  update_order,
  update_status_order,
  count_orders,
  create_pending_trades,
  create_trade_histories,
  find_trade_histories,
  find_latest_trade_history,
  find_reward,
  create_reward_manager,
  find_user_by_wallet,
  find_user_by_referral,
  create_referral_manager,
  find_token,
  find_tokens,
  create_building_order,
  delete_building_order,
  find_building_order
};
