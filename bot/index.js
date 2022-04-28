/// Imports -------->
const { Client, Intents, MessageEmbed } = require("discord.js");
const { config } = require("dotenv");
const fetch = require("node-fetch-commonjs");

const {
  CMD_PREFIX,
  MESSAGE_IMAGE,
  MESSAGE_FOOTER,
  MESSAGE_FOOTER_ICONURL,
} = require("./constants");

// Main Logic -------->
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

initialize();

client.once("ready", () => {
  console.log("Ready!");
});

client.on("messageCreate", async (message) => {
  const messageContents = message.content.trim();

  if (messageContents === CMD_PREFIX + "help") {
    handleHelpCommand(message);
  } else if (messageContents === CMD_PREFIX + "roll") {
    handleRollCommand(message);
  } else if (messageContents === CMD_PREFIX + "viewstats") {
    handleViewStatsCommand(message);
  }
});

/// Helper Functions -------->
function initialize() {
  config();
  client.login(process.env.BOT_TOKEN);
}

function makeFetchPost(body, endpoint) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body,
  });
}

/// Event Handlers -------->
function handleError(err) {
  console.log(`An error occurred. ERROR: ${err}`);
  process.exit(1);
}

function handleHelpCommand(message) {
  const channel = message.channel;
  const response = getMessageTemplate()
    .setColor("#7C77B9")
    .setTitle("**Pet Collector Help**")
    .setDescription(
      "Welcome to the help section! Here are the commands available:"
    )
    .setImage(MESSAGE_IMAGE)
    .addFields({
      name: "**Commands**",
      value: `
          \`!help\` - Get a list of supported commands.
          \`!roll\` - Roll a pet picture.
          \`!viewStats\` - View your stats.
          \`!settings\` - Update your settings.
        `,
    });

  channel.send({ embeds: [response] });
}

async function handleRollCommand(message) {
  const channel = message.channel;
  const user = await getUser(message.author.id);
  const rolledCard = await fetch(
    `http://localhost:4000/api/roll?userid=${message.author.id}`
  ).then((response) => response.json());

  const response = getMessageTemplate()
    .setColor("#7C77B9")
    .setAuthor({ name: "Here you go!" })
    .setDescription(`You rolled #${rolledCard.card.card_id},`)
    .setImage(`${rolledCard.card.image_url}`);

  channel.send({ embeds: [response] });
}

async function handleViewStatsCommand(message) {
  // Look up user. If user doesn't exist, make a new user, then return stats.
  const channel = message.channel;
  const user = await getUser(message.author.id);
  const stats = await getUserStats(message.author.id).then((response) =>
    response.json()
  );

  const response = getMessageTemplate()
    .setURL("http://localhost:4000/")
    .setColor("#7C77B9")
    .setTitle(`Stats for ${message.author.username}`)
    .setThumbnail(message.author.avatarURL())
    .setDescription("Let's see how you're doing so far...\n\u200b")
    .addFields(
      {
        name: "Collected",
        value: `${stats.distinct_roll_count} / ${stats.rollable_card_count}`,
        inline: true,
      },
      {
        name: "Total Rolls",
        value: `${stats.roll_count_for_current_collection}`,
        inline: true,
      },
      { name: "Balance", value: `${stats.coin_balance}`, inline: true }
    );

  channel.send({ embeds: [response] });
}

/// User management -------->

// Set up with ID, new entry in table to store data
async function createNewUser(userID) {
  return await fetch("http://localhost:4000/api/users/", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userID,
    }),
  }).then((response) => response.json());
}

/// Getters -------->
function getMessageTemplate() {
  return new MessageEmbed()
    .setFooter({ text: MESSAGE_FOOTER, iconURL: MESSAGE_FOOTER_ICONURL })
    .setTimestamp();
}

// Check for existence of user. If doesn't exist, create one.
async function getUser(userID) {
  const results = await fetch(`http://localhost:4000/api/users/${userID}`)
    .then((response) => response.json())
    .then((json) => json.results);

  if (results.length === 0) {
    const user = await createNewUser(userID);
    return user;
  } else {
    return results[0];
  }
}

async function getUserStats(userID) {
  return await fetch(`http://localhost:4000/api/stats/${userID}`);
}
