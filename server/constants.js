// Database Tables
const CARDS_ROLLABLE = 'cardsrollable';
const COLLECTED_CARDS = 'collectedcards';
const ROLL_TRANSACTIONS = 'rolltransactions';
const COIN_TRANSACTIONS = 'cointransactions';
const USERS = 'users';

// Table Field Names
const USER_ID = 'user_id';
const CURRENT_COLLECTION_ID = 'current_collection_id';
const COIN_BALANCE = 'coin_balance';
const TRANSACTION_ID = 'transaction_id';
const CARD_ID = 'card_id';
const IMAGE_URL = 'image_url';
const TIMESTAMP = 'timestamp';
const COLLECTION_ID = 'collection_id';
const IS_NEW_TO_COLLECTION = 'new_addition';
const ROLL_TRANSACTION_ID = 'roll_transaction_id';
const COIN_AMOUNT = 'amount';
const PAYOR = 'payor';
const PAYEE = 'payee'

// Config
const COIN_AWARDER = 'REWARDED';
const DEFAULT_DUPLICATE_REWARD = 10;

module.exports = {
  CARDS_ROLLABLE,
  COLLECTED_CARDS,
  ROLL_TRANSACTIONS,
  COIN_TRANSACTIONS,
  USERS,
  USER_ID,
  CURRENT_COLLECTION_ID,
  COIN_BALANCE,
  TRANSACTION_ID,
  CARD_ID,
  IMAGE_URL,
  TIMESTAMP,
  COLLECTION_ID,
  IS_NEW_TO_COLLECTION,
  ROLL_TRANSACTION_ID,
  COIN_AMOUNT,
  PAYOR,
  PAYEE,
  COIN_AWARDER,
  DEFAULT_DUPLICATE_REWARD
};
