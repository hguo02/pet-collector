class Card {
  constructor(options) {
    Object.assign(this, options);
    // this.cardID = cardID;
    // this.imageURL = imageURL;
  }

  toJSON() {
    return {
      cardid: this.cardID,
      imageurl: this.imageURL
    };
  }
}

module.exports = Card;
