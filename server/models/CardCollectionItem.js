class CardCollectionItem {
  constructor(options = {}) {
    ({
      collection_id: this.collection_id,
      transaction_id: this.transaction_id,
      new_addition: this.new_addition,
      card_id: this.card_id,
      image_url: this.image_url
    } = options);
  }

  getCollectionID() {
    return this.collection_id;
  }

  getTransactionID() {
    return this.transaction_id;
  }

  getCardID() {
    return this.card_id;
  }

  getImageUrl() {
    return this.image_url;
  }

  isNewToCollection() {
    return this.new_addition;
  }

  toJSON() {
    return {
      collection_id: this.collection_id,
      transaction_id: this.transaction_id,
      new_addition: this.new_addition,
      card_id: this.card_id,
      image_url: this.image_url
    };
  }
}

module.exports = CardCollectionItem;
