class RollTransaction {
  constructor(options = {}) {
    ({
      transaction_id: this.transaction_id,
      card_id: this.card_id,
      requested_by: this.requested_by,
      collection_id: this.collection_id,
      timestamp: this.timestamp
    } = options);
  }

  getTransactionID() {
    return this.transaction_id;
  }

  getCardID() {
    return this.card_id;
  }

  getRequestedByID() {
    return this.requested_by;
  }

  getCollectionID() {
    return this.collection_id;
  }

  getTimestamp() {
    return this.timestamp;
  }

  toJSON() {
    return {
      transaction_id: this.transaction_id,
      card_id: this.card_id,
      requested_by: this.requested_by,
      collection_id: this.collection_id,
      timestamp: this.timestamp
    };
  }
}

module.exports = RollTransaction;
