const ActionCable = require('actioncable-nodejs');

// const cable_url = 'ws://localhost:3000/cable';
const cable_url = 'wss://dev.tokenmom.com/cable';
var cable;
var orderChannel, tradeChannel, rewardChannel;

function connect() {
  cable = new ActionCable(cable_url, {
    // If you validate the origin on the server, you can set that here
    // origin: 'http://localhost:3000',
    origin: 'https://tokenmom.com',

    // Using headers with an API key for auth is recommended
    // because we dont have the normal browser session to authenticate with
    headers: {
      'X-Api-Key': 'someexampleheader'
    }
  });

  orderChannel = cable.subscribe('OrderChannel', {
    connected() {
      console.log("connected");
    },

    disconnected(err) {
      console.log(err);
      console.log("disconnected");
      setTimeout(connect, 5000);
    },

    rejected(err) {
      console.log(err);
      console.log("rejected");
      setTimeout(connect, 5000);
    },

    received(data) {
      console.log("received");
      console.log(data);
    }
  });

  tradeChannel = cable.subscribe('TradeChannel', {
    connected() {
    },

    disconnected(err) {
    },

    rejected(err) {
    },

    received(data) {
      console.log("received");
      console.log(data);
    }
  });

  rewardChannel = cable.subscribe('RewardChannel', {
    connected() {
    },

    disconnected(err) {
    },

    rejected(err) {
    },

    received(data) {
      console.log("received");
      console.log(data);
    }
  });
}

connect();
export {orderChannel, tradeChannel, rewardChannel};
