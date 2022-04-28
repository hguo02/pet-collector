// SQL Server Management
const express = require("express");
const fetch = require("node-fetch-commonjs");
const { config } = require("dotenv");
const { Client } = require("pg");
const { v4 } = require("uuid");

const RollTransaction = require("./models/RollTransaction");
const CardCollectionItem = require("./models/CardCollectionItem");
const User = require("./models/User");
const CoinTransaction = require("./models/CoinTransaction");

const constants = require("./constants");

config();

const app = express();
const db = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

app.use(express.json());

app.listen(4000, () => {
  console.log("Listening on port 4000...");
  initializePostgres();
});

// ==========================
// GET
// ==========================

// Returns the user object.
app.get("/api/users/:userid", async (req, res) => {
  const userID = req.params.userid;

  try {
    res.json(parseResponse(await queryUserByID(userID)));
  } catch (e) {
    res.status(400).send(getErrorMessage(e));
  }
});

app.get("/api/transactions/:userid", async (req, res) => {
  // User can specify the collection id to search for by providing a query string.
  const userID = req.params.userid;
  const collectionID = req.query.collectionid;

  try {
    res.json(
      parseResponse(await queryUserRollTransactions(userID, collectionID))
    );
  } catch (e) {
    res.status(404).send(getErrorMessage(e));
  }
});

app.get("/api/collections/:collectionid", async (req, res) => {
  const collectionID = req.params.collectionid;
  const cardID = req.query.cardid;
  const shouldGetDuplicates =
    !req.query.duplicates || req.query.duplicates == "true";

  try {
    res.json(
      parseResponse(
        await queryCollectedCards(collectionID, cardID, shouldGetDuplicates)
      )
    );
  } catch (e) {
    res.status(404).send(getErrorMessage(e));
  }
});

// Returns all cards available to be rolled.
app.get("/api/cards", async (req, res) => {
  try {
    res.json(parseResponse(await getAllRollableCards()));
  } catch (e) {
    res.status(400).send(getErrorMessage(e));
  }
});

// Returns the card with id [cardid].
app.get("/api/cards/:cardid", async (req, res) => {
  const cardID = req.params.cardid;

  try {
    res.json(await queryCardByID(cardID));
  } catch (e) {
    res.status(400).send(getErrorMessage(e));
  }
});

// Rolls a random card.
app.get("/api/roll", async (req, res) => {
  try {
    const user = await queryUserByID(req.query.userid).then(
      (result) => result[0]
    );
    const rolledCard = await getRandomCard();
    const transactionID = generateUUIDv4();
    const collectionID = user.current_collection_id;
    const isNewToCollection = await queryCollectedCards(
      collectionID,
      rolledCard.card_id,
      true
    ).then((result) => result.length === 0);

    const transactionRecord = new RollTransaction({
      transaction_id: transactionID,
      card_id: rolledCard.card_id,
      requested_by: user.user_id,
      collection_id: collectionID,
      timestamp: getTimestampAsString(),
    });

    const collectionRecord = new CardCollectionItem(
      Object.assign({}, rolledCard, {
        transaction_id: transactionID,
        collection_id: collectionID,
        new_addition: isNewToCollection,
      })
    );

    let promises = [
      createRollTransactionRecord(transactionRecord),
      createCardCollectionRecord(collectionRecord),
    ];

    if (!isNewToCollection) {
      const coinTransactionRecord = new CoinTransaction({
        transaction_id: generateUUIDv4(),
        roll_transaction_id: transactionID,
        amount: constants.DEFAULT_DUPLICATE_REWARD,
        payor: constants.COIN_AWARDER,
        payee: user.user_id,
        timestamp: getTimestampAsString(),
      });

      promises.push(
        updateUserCoinBalance(constants.DEFAULT_DUPLICATE_REWARD, user.user_id),
        createCoinTransactionRecord(coinTransactionRecord)
      );
    }

    await Promise.all(promises);

    // Return only the card (client doesn't need to know any more than the card).
    res.json({
      card: rolledCard,
      new_addition: isNewToCollection,
      rewarded: isNewToCollection ? 0 : constants.DEFAULT_DUPLICATE_REWARD,
    });
  } catch (e) {
    res.status(400).send(getErrorMessage(e));
  }
});

app.get("/api/stats/:userid", async (req, res) => {
  // Data to return:
  /*  - roll count for collection
      - number of DISTINCT cards collected
      - total rollable cards
      - collection of DISTINCT cards
      - coin balance
      - last card rolled?
      - TODO: future feature? --> interactive web interface for showing collection
  */

  try {
    const userID = req.params.userid;
    const user = new User((await queryUserByID(userID))[0]);

    const [
      rollableCardCount,
      rollCountForCurrentCollection,
      distinctRolls,
      coinBalance,
      previousRolls,
    ] = await Promise.all([
      getRollableCount(),
      queryUserRollTransactions(userID, user.getCurrentCollectionID()).then(
        (result) => result.length
      ),
      queryCollectedCards(user.getCurrentCollectionID(), null, false),
      getUserCoinBalance(user.getUserID()),
      queryUserRecentRolls(3, user),
    ]);

    const distinctRollCount = distinctRolls.length;

    res.json({
      rollable_card_count: rollableCardCount,
      roll_count_for_current_collection: rollCountForCurrentCollection,
      distinct_roll_count: distinctRollCount,
      coin_balance: coinBalance,
      distinct_rolls: distinctRolls,
      previous_rolls: previousRolls,
    });
  } catch (e) {
    res.status(400).send(getErrorMessage(e));
  }
});

// ==========================
// POST
// ==========================

// Create a new user.
app.post("/api/users", async (req, res) => {
  const userID = req.body.userid;

  try {
    res.json(await createNewUser(userID));
  } catch (e) {
    res.status(400).send(getErrorMessage(e));
  }
});

// Creates a new roll transaction record.
app.post("/api/rolltransactions", async (req, res) => {
  const roll = req.body.roll;

  try {
    res.json(await createRollTransactionRecord(roll));
  } catch (e) {
    res.status(400).send(getErrorMessage(e));
  }
});

// ==========================
// Helper Functions
// ==========================
function initializePostgres() {
  db.connect((err) => {
    if (err) {
      handleDBConnectionFailure(err);
    }
  });
}

function handleDBConnectionFailure(err) {
  console.log(`Error connecting to the database. Error: ${err}`);
  process.exit(1);
}

function getErrorMessage(err) {
  return `Sorry, something went wrong. \nError: ${err.stack}`;
}

// In query, use to_timestamp(val / 1000.0).
function getTimestampAsString() {
  return Date.now().toString();
}

function generateUUIDv4() {
  return v4();
}

function parseResponse(value) {
  return {
    results: value,
  };
}

// ==========================
// Database Functions
// ==========================
async function queryUserByID(userID) {
  try {
    return await db
      .query(
        `
      SELECT * FROM ${constants.USERS} WHERE ${constants.USER_ID} = $1 LIMIT 1
    `,
        [userID]
      )
      .then((result) => result.rows);
  } catch (e) {
    throw e;
  }
}

// Returns an array of all roll transactions made by [userID] under [collectionID].
async function queryUserRollTransactions(userID, collectionID) {
  // Build the query based on parameters provided.
  const userIDFilter = `${constants.USER_ID} = (SELECT userID FROM variables)`;
  const collectionIDFilter = `${constants.COLLECTION_ID} = (SELECT collectionID FROM variables)`;

  let filters = [];

  if (userID) {
    filters.push(userIDFilter);
  }
  if (collectionID && collectionID.trim() !== "") {
    filters.push(collectionIDFilter);
  }

  const toFilter = "".concat("(", filters.join(" AND "), ")");
  const query = `
    WITH variables (userID, collectionID) AS (
      VALUES($1::varchar, $2::uuid)
    )
    SELECT * FROM ${constants.ROLL_TRANSACTIONS} WHERE ${toFilter}
  `;

  try {
    return await db
      .query(query, [userID, collectionID || null])
      .then((result) => result.rows);
  } catch (e) {
    throw e;
  }
}

async function queryCollectedCards(
  collectionID,
  cardID,
  shouldGetDuplicates = true
) {
  const collectionIDFilter = `${constants.COLLECTION_ID} = (SELECT collectionID FROM variables)`;
  const cardIDFilter = `${constants.CARD_ID} = (SELECT cardID FROM variables)`;
  const duplicatesFilter = `${constants.IS_NEW_TO_COLLECTION} != (SELECT shouldGetDuplicates FROM variables)`;

  // if should get duplicates, no filter
  // if no duplicates, filter for newaddition = true

  const filters = [];

  if (collectionID && collectionID.trim() != "") {
    filters.push(collectionIDFilter);
  }
  if (cardID) {
    filters.push(cardIDFilter);
  }
  if (!shouldGetDuplicates) {
    filters.push(duplicatesFilter);
  }

  const toFilter = "".concat("(", filters.join(" AND "), ")");

  const query = `
    WITH variables (collectionID, cardID, shouldGetDuplicates) AS (
      VALUES($1::uuid, $2::varchar, $3::bool)
    )
    SELECT * FROM ${constants.COLLECTED_CARDS} WHERE ${toFilter}
  `;

  try {
    return db
      .query(query, [collectionID || null, cardID || null, shouldGetDuplicates])
      .then((result) => result.rows);
  } catch (e) {
    throw e;
  }
}

async function queryCardByID(cardID) {
  try {
    return await db
      .query(
        `
      SELECT * FROM ${constants.CARDS_ROLLABLE} WHERE ${constants.CARD_ID} = $1 LIMIT 1`,
        [cardID]
      )
      .then((result) => result.rows[0]);
  } catch (e) {
    throw e;
  }
}

async function queryUserRecentRolls(limit, user) {
  try {
    const rollTransactionIDs = await db
      .query(
        `
      SELECT ${constants.TRANSACTION_ID} FROM ${constants.ROLL_TRANSACTIONS} WHERE
      (${constants.USER_ID} = $1 AND ${constants.COLLECTION_ID} = $2)
      ORDER BY ${constants.TIMESTAMP} DESC LIMIT $3
    `,
        [user.getUserID(), user.getCurrentCollectionID(), limit]
      )
      .then((result) => {
        return result.rows.map((element) => {
          return element.transaction_id;
        });
      });

    return await db
      .query(
        `
      SELECT record.* FROM ${constants.COLLECTED_CARDS} record
      JOIN unnest($1::uuid[]) WITH ORDINALITY x(transaction_id, ord) USING (transaction_id) ORDER BY x.ord;
    `,
        [rollTransactionIDs]
      )
      .then((result) => result.rows);
  } catch (e) {
    throw e;
  }
}

async function createNewUser(userID) {
  return await db
    .query(
      `
      INSERT INTO ${constants.USERS} (${constants.USER_ID}, ${constants.CURRENT_COLLECTION_ID})
      VALUES($1, $2) RETURNING *
    `,
      [userID, generateUUIDv4()]
    )
    .then((result) => result.rows[0]);
}

async function createRollTransactionRecord(roll) {
  try {
    return await db
      .query(
        `
      INSERT INTO ${constants.ROLL_TRANSACTIONS}
      (${constants.TRANSACTION_ID}, ${constants.CARD_ID}, ${constants.COLLECTION_ID},
       ${constants.USER_ID}, ${constants.TIMESTAMP})
      VALUES($1, $2, $3, $4, to_timestamp($5 / 1000.0)) RETURNING *
    `,
        [
          roll.getTransactionID(),
          roll.getCardID(),
          roll.getCollectionID(),
          roll.getRequestedByID(),
          roll.getTimestamp(),
        ]
      )
      .then((result) => result.rows[0]);
  } catch (e) {
    throw e;
  }
}

async function createCardCollectionRecord(record) {
  try {
    return await db
      .query(
        `
      INSERT INTO ${constants.COLLECTED_CARDS}
      (${constants.TRANSACTION_ID}, ${constants.COLLECTION_ID}, ${constants.IS_NEW_TO_COLLECTION},
       ${constants.CARD_ID}, ${constants.IMAGE_URL})
      VALUES($1, $2, $3, $4, $5) RETURNING *
    `,
        [
          record.getTransactionID(),
          record.getCollectionID(),
          record.isNewToCollection(),
          record.getCardID(),
          record.getImageUrl(),
        ]
      )
      .then((result) => result.rows[0]);
  } catch (e) {
    throw e;
  }
}

async function createCoinTransactionRecord(record) {
  try {
    return await db
      .query(
        `
      INSERT INTO ${constants.COIN_TRANSACTIONS}
      (${constants.TRANSACTION_ID}, ${constants.ROLL_TRANSACTION_ID}, ${constants.COIN_AMOUNT},
       ${constants.PAYOR}, ${constants.PAYEE}, ${constants.TIMESTAMP})
      VALUES($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0)) RETURNING *
    `,
        [
          record.getTransactionID(),
          record.getRollTransactionID(),
          record.getAmount(),
          record.getPayor(),
          record.getPayee(),
          record.getTimestamp(),
        ]
      )
      .then((result) => result.rows[0]);
  } catch (e) {
    throw e;
  }
}

async function updateUserCoinBalance(amount, userid) {
  try {
    const prevBalanceQuery = db
      .query(
        `
      SELECT ${constants.COIN_BALANCE} FROM ${constants.USERS} WHERE ${constants.USER_ID} = $1
    `,
        [userid]
      )
      .then((result) => result.rows[0].coin_balance);

    const updateQuery = db
      .query(
        `
      UPDATE ${constants.USERS} SET ${constants.COIN_BALANCE} =  ${constants.COIN_BALANCE} + $1
      WHERE ${constants.USER_ID} = $2 RETURNING *
    `,
        [amount, userid]
      )
      .then((result) => result.rows[0]);

    const [prevBalance, updatedResult] = await Promise.all([
      prevBalanceQuery,
      updateQuery,
    ]);

    console.log(prevBalance, updatedResult);

    return Object.assign({}, updatedResult, {
      previous_coin_balance: prevBalance,
    });
  } catch (e) {
    throw e;
  }
}

async function getRandomCard() {
  try {
    const totalCardRecords = await getRollableCount();
    const rand = Math.floor(Math.random() * totalCardRecords);

    return await db
      .query(`SELECT * FROM ${constants.CARDS_ROLLABLE} LIMIT 1 OFFSET $1`, [
        rand,
      ])
      .then((result) => result.rows[0]);
  } catch (e) {
    throw e;
  }
}

async function getRollableCount() {
  try {
    return await db
      .query(`SELECT COUNT(*) FROM ${constants.CARDS_ROLLABLE}`)
      .then((result) => result.rows[0].count);
  } catch (e) {
    throw e;
  }
}

async function getAllRollableCards() {
  try {
    return await db
      .query(`SELECT * FROM ${constants.CARDS_ROLLABLE}`)
      .then((result) => result.rows);
  } catch (e) {
    throw e;
  }
}

async function getUserCoinBalance(userID) {
  try {
    return await db
      .query(
        `
      SELECT ${constants.COIN_BALANCE} FROM ${constants.USERS} WHERE ${constants.USER_ID} = $1
    `,
        [userID]
      )
      .then((result) => result.rows[0].coin_balance);
  } catch (e) {
    throw e;
  }
}
