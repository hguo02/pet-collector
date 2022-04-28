class User {
  constructor(options = {}) {
    ({
      user_id: this.user_id,
      current_collection_id: this.current_collection_id
    } = options);
  }

  getUserID() {
    return this.user_id;
  }

  getCurrentCollectionID() {
    return this.current_collection_id;
  }

  toJSON() {
    return {
      user_id: this.user_id,
      current_collection_id: this.current_collection_id
    };
  }
}

module.exports = User;
