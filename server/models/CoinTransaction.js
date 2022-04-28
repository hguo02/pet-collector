// TODO: Add a field which relates to the purchase made.

// TODO: This will likely become a base class which is overidden, becoming:
// * ShopTransactionRecord
// * RewardTransactionRecord

// Intent: To add details about which roll is related to the coin transaction for rewards,
//         and to add details about what item is purchased when purchasing from the shop.

class CoinTransaction {
  constructor(options = {}) {
    ({
      transaction_id: this.transaction_id,
      roll_transaction_id: this.roll_transaction_id,
      amount: this.amount,
      payor: this.payor,
      payee: this.payee,
      timestamp: this.timestamp
    } = options);

    // purchaseDetails: this.purchaseDetails -> Add when starting to deal with shop items
    // TODO: Note, purchase details should be a link to whatever item was purchased
  }

  getTransactionID() {
    return this.transaction_id;
  }

  getRollTransactionID() {
    return this.roll_transaction_id;
  }

  getAmount() {
    return this.amount;
  }

  getPayor() {
    return this.payor;
  }

  getPayee() {
    return this.payee;
  }

  getTimestamp() {
    return this.timestamp;
  }

  toJSON() {
    return {
      transaction_id: this.transaction_id,
      roll_transaction_id: this.roll_transaction_id,
      amount: this.amount,
      payor: this.payor,
      payee: this.payee,
      timestamp: this.timestamp
    };

    // purchaseDetails: this.purchaseDetails
  }
}

module.exports = CoinTransaction;
