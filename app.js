import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import fetch from 'node-fetch';
import commands from './commands.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import session from 'express-session';

const TICKETS_FILE = 'tickets.json';
let tickets = [];

function loadTickets() {
  if (fs.existsSync(TICKETS_FILE)) {
    tickets = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf-8'));
  }
}
function saveTickets() {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}
loadTickets();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(session({
  secret: process.env.SESSION_SECRET || 'kekse-clan-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 Tage "Angemeldet bleiben"
  }
}));

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let authData = { dashboardPasswordHash: null, ownerId: '1151971830983311441' };
function loadAuth() {
  if (fs.existsSync('auth.json')) {
    authData = JSON.parse(fs.readFileSync('auth.json', 'utf-8'));
  }
}
function saveAuth() {
  fs.writeFileSync('auth.json', JSON.stringify(authData, null, 2));
}
loadAuth();

const isAdmin = (req, res, next) => {
  if (req.session.isLoggedIn) return next();
  res.status(401).json({ error: 'Nicht eingeloggt' });
};

app.post('/api/login', express.json(), async (req, res) => {
  const { password, stayLoggedIn } = req.body;
  if (!authData.dashboardPasswordHash) return res.status(400).json({ error: 'Kein Passwort gesetzt. Nutze /setup_dashboard auf Discord.' });
  const match = await bcrypt.compare(password, authData.dashboardPasswordHash);
  if (match) {
    req.session.isLoggedIn = true;
    if (stayLoggedIn) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      req.session.cookie.expires = false; // Session cookie
    }
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Falsches Passwort' });
  }
});

app.get('/api/check-auth', (req, res) => {
  res.json({ loggedIn: !!req.session.isLoggedIn });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

let consoleLogs = [];
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
  consoleLogs.push({ type: 'log', message: msg, timestamp: new Date().toLocaleTimeString() });
  if (consoleLogs.length > 100) consoleLogs.shift();
  originalLog.apply(console, args);
};

console.error = (...args) => {
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
  consoleLogs.push({ type: 'error', message: msg, timestamp: new Date().toLocaleTimeString() });
  if (consoleLogs.length > 100) consoleLogs.shift();
  originalError.apply(console, args);
};

app.get('/api/logs', isAdmin, (req, res) => {
  res.json(consoleLogs);
});

app.get('/api/stats', isAdmin, async (req, res) => {
  let idsData = {};
  if (fs.existsSync('ids.json')) {
    idsData = JSON.parse(fs.readFileSync('ids.json', 'utf-8'));
  }
  
  let guildInfo = {
    name: 'Unbekannt',
    memberCount: 0,
    onlineCount: 0,
    icon: null
  };

  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    guildInfo = {
      name: guild.name,
      memberCount: guild.memberCount,
      onlineCount: guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size,
      icon: guild.iconURL()
    };
  } catch (err) {
    console.error('Failed to fetch guild info for stats:', err);
  }

  const stats = {
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
    commands: commands.length,
    counting: countingData,
    warningsCount: warnings.length,
    uptime: process.uptime(),
    ids: idsData,
    guildInfo: guildInfo,
    leaderboard: Object.entries(countingData.scoreboard || {})
      .map(([id, score]) => {
        const member = client.users.cache.get(id);
        return {
          id,
          username: member ? member.username : 'Unbekannter User',
          score
        };
      })
      .sort((a, b) => b.score - a.score)
  };
  res.json(stats);
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const MOD_CHANNEL_ID = '1423413348220796991';

app.post('/interactions', async (req, res) => {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  if (!signature || !timestamp) {
    return res.status(401).send('Missing signature or timestamp');
  }

  // Use a promise to handle raw body collection manually for reliable verification
  const bodyBuffer = await new Promise((resolve) => {
    let chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

  try {
    const { verifyKey } = await import('discord-interactions');
    const isValidRequest = verifyKey(bodyBuffer, signature, timestamp, PUBLIC_KEY);

    if (!isValidRequest) {
      console.error('[VERIFY] Invalid request signature.');
      return res.status(401).send('Invalid request signature');
    }

    const interaction = JSON.parse(bodyBuffer.toString());

    if (interaction.type === 1) { // InteractionType.PING
      return res.send({ type: 1 }); // InteractionResponseType.PONG
    }

    req.body = interaction;
    return handleInteraction(req, res);
  } catch (err) {
    console.error('Interaction error:', err);
    return res.status(400).send('Bad Request');
  }
});

async function handleInteraction(req, res) {
  const interaction = req.body;

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const { custom_id, values } = interaction.data;

    if (custom_id === 'ticket_category_select') {
      const category = values[0];
      let categoryDisplay = 'Support';
      let emoji = '⚙️';
      let parentId = '1423413348065611953';

      const guild = await client.guilds.fetch(interaction.guild_id);
      const user = interaction.member.user;
      const MOD_ROLE_ID = '1424020019070898186';

      const existingTicket = tickets.find(t => t.userId === user.id && t.status === 'open');
      if (existingTicket) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: '❌ Du hast bereits ein offenes Ticket!', flags: 64 }
        });
      }

      res.send({ 
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, 
        data: { content: '⌛ Dein Ticket wird erstellt...', flags: 64 } 
      });

      if (category === 'giveaway') {
        emoji = '🎉';
        categoryDisplay = 'Abholung';
      } else if (category === 'bewerbung') {
        emoji = '✉️';
        categoryDisplay = 'Bewerbung';
        parentId = '1434277752982474945';
      }

      const ticketId = Date.now().toString().slice(-4);
      const channelName = `${emoji}-${user.username.toLowerCase()}-${ticketId}`;

      try {
        const channel = await guild.channels.create({
          name: channelName,
          type: 0,
          parent: parentId,
          permissionOverwrites: [
            { id: guild.id, deny: [GatewayIntentBits.ViewChannel] },
            { id: user.id, allow: [GatewayIntentBits.ViewChannel, GatewayIntentBits.SendMessages, GatewayIntentBits.ReadMessageHistory] },
            { id: MOD_ROLE_ID, allow: [GatewayIntentBits.ViewChannel, GatewayIntentBits.SendMessages, GatewayIntentBits.ReadMessageHistory] }
          ]
        });

        tickets.push({
          id: ticketId,
          userId: user.id,
          channelId: channel.id,
          status: 'open',
          category: category,
          createdAt: new Date().toISOString()
        });
        saveTickets();

        const welcomeEmbed = {
          title: `🎫 ${categoryDisplay}-Ticket`,
          description: `Hallo <@${user.id}>, danke für dein Interesse im Bereich **${categoryDisplay}**.\nDas Team wurde benachrichtigt.\n\n**Deine Ticket-ID:** ${ticketId}\n**Thema:** ${categoryDisplay}\n\nNutze \`/close\`, um dieses Ticket zu schließen.`,
          color: 0xffffff
        };

        const closeButton = {
          type: 1,
          components: [{
            type: 2,
            label: 'Ticket schließen',
            style: 4,
            custom_id: 'ticket_close_confirm',
            emoji: { name: '🔒' }
          }]
        };

        await discordRequest(`/channels/${channel.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ content: `<@${user.id}> | <@&${MOD_ROLE_ID}>`, embeds: [welcomeEmbed], components: [closeButton] })
        });

        await discordRequest(`/webhooks/${process.env.APP_ID}/${interaction.token}/messages/@original`, {
          method: 'PATCH',
          body: JSON.stringify({ content: `✅ Dein ${categoryDisplay}-Ticket wurde erfolgreich erstellt: <#${channel.id}>`, flags: 64 })
        });
      } catch (err) {
        console.error('Failed to create ticket channel:', err);
        await discordRequest(`/webhooks/${process.env.APP_ID}/${interaction.token}/messages/@original`, {
          method: 'PATCH',
          body: JSON.stringify({ content: '❌ Fehler beim Erstellen des Tickets.', flags: 64 })
        });
      }
      return;
    }

    if (custom_id === 'ticket_close_confirm') {
      const channelId = interaction.channel_id;
      const channel = await client.channels.fetch(channelId);
      const ticket = tickets.find(t => t.channelId === channelId);
      if (ticket) {
        ticket.status = 'closed';
        saveTickets();
      }
      await channel.send('🔒 Ticket wird in 5 Sekunden geschlossen...');
      setTimeout(async () => {
        try { await channel.delete(); } catch (err) { console.error(err); }
      }, 5000);
      return res.send({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE });
    }

    if (custom_id.startsWith('giveaway_join_')) {
      const giveawayId = custom_id.replace('giveaway_join_', '');
      const giveaway = giveaways.get(giveawayId);
      if (!giveaway || giveaway.isEnded) {
        return res.send({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Dieses Giveaway existiert nicht mehr oder ist beendet.', flags: 64 } });
      }
      const userId = interaction.member.user.id;
      if (giveaway.participants.includes(userId)) {
        return res.send({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Du nimmst bereits teil!', flags: 64 } });
      }
      giveaway.participants.push(userId);
      return res.send({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: `✅ Du nimmst teil! (${giveaway.participants.length} Teilnehmer)`, flags: 64 } });
    }
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = interaction.data;
    const ADMIN_USER_ID = '1151971830983311441';
    const MOD_ROLE_ID = '1424020019070898186';
    const isOwner = interaction.member.user.id === ADMIN_USER_ID;
    const hasModRole = interaction.member.roles && interaction.member.roles.includes(MOD_ROLE_ID);
    const isServerAdmin = (BigInt(interaction.member.permissions) & BigInt(0x8)) === BigInt(0x8);
    const canMod = isOwner || hasModRole || isServerAdmin;

    if (name === 'ticket') {
      const embed = {
        title: 'Wähle den passenden Ticket-Button für dein Anliegen.\nFolge dann den weiteren Schritten im Ticket.',
        description: 'Ein Mitglied der Administration wird sich so schnell wie möglich um dein Anliegen kümmern. Bitte habe etwas Gedult, schließlich sind wir nicht 24/7 online.\n\n**Support:**\nAllgemeine Anliegen oder Meldungen\n\n**Abholung:**\nAbholung von gewonnenen Giveaways\n\n**Bewerbung:**\nBewerbungen für den KEKSE Clan',
        color: 0xffffff
      };
      const components = {
        type: 1,
        components: [{
          type: 3,
          custom_id: 'ticket_category_select',
          options: [
            { label: 'Support', value: 'support', description: 'Allgemeine Anliegen oder Meldungen', emoji: { name: '⚙️' } },
            { label: 'Abholung', value: 'giveaway', description: 'Abholung von gewonnenen Giveaways', emoji: { name: '🎉' } },
            { label: 'Bewerbung', value: 'bewerbung', description: 'Bewerbungen für den KEKSE Clan', emoji: { name: '✉️' } }
          ],
          placeholder: 'Wähle eine Ticket-Kategorie...'
        }]
      };
      discordRequest(`/channels/${interaction.channel_id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ embeds: [embed], components: [components] })
      }).catch(err => console.error(err));
      return res.send({ type: 4, data: { content: '✅ Ticket-Panel wurde erstellt!', flags: 64 } });
    }

    if (name === 'ping') {
      return res.send({ type: 4, data: { content: 'Pong!' } });
    }

    if (name === 'clear') {
      const amount = options.find(o => o.name === 'amount')?.value || 10;
      try {
        const channel = await client.channels.fetch(interaction.channel_id);
        await channel.bulkDelete(amount);
        return res.send({ type: 4, data: { content: `${amount} Nachrichten wurden gelöscht.`, flags: 64 } });
      } catch (err) {
        return res.send({ type: 4, data: { content: 'Fehler beim Löschen.', flags: 64 } });
      }
    }
    
    return res.send({ type: 4, data: { content: 'Befehl ausgeführt.', flags: 64 } });
  }
}

app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel]
});

client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  
  // Create/Update IDs document
  try {
    const guildId = process.env.GUILD_ID;
    const guild = await client.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    const members = await guild.members.fetch();

    const idsData = {
      guild: { id: guild.id, name: guild.name },
      channels: channels.map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: c.type,
        typeName: c.constructor.name 
      })),
      roles: guild.roles.cache.map(r => ({ id: r.id, name: r.name })),
      members: members.map(m => ({ id: m.id, username: m.user.username, tag: m.user.tag }))
    };

    fs.writeFileSync('ids.json', JSON.stringify(idsData, null, 2));
    console.log('✅ IDs document (ids.json) updated with all channel types');
  } catch (err) {
    console.error('Failed to update IDs document:', err);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (countingData.channelId && message.channel.id === countingData.channelId) {
    const numberMatch = message.content.trim().match(/^\d+/);
    if (!numberMatch) return;
    const number = parseInt(numberMatch[0]);
    if (message.author.id === countingData.lastUserId || number !== countingData.currentNumber + 1) {
      countingData.currentNumber = 0;
      countingData.lastUserId = null;
      saveCounting();
      await message.react('❌');
      await message.channel.send('❌ Fehler beim Zählen! Neustart bei 1.');
    } else {
      countingData.currentNumber = number;
      countingData.lastUserId = message.author.id;
      if (!countingData.scoreboard) countingData.scoreboard = {};
      countingData.scoreboard[message.author.id] = (countingData.scoreboard[message.author.id] || 0) + 1;
      saveCounting();
      await message.react('✅');
    }
  }
});

client.login(BOT_TOKEN);

let warnings = [];
let giveaways = new Map();
let countingData = { channelId: null, currentNumber: 0, lastUserId: null, scoreboard: {} };

function loadCounting() {
  if (fs.existsSync('counting.json')) {
    countingData = JSON.parse(fs.readFileSync('counting.json', 'utf-8'));
  }
}
function saveCounting() {
  fs.writeFileSync('counting.json', JSON.stringify(countingData, null, 2));
}
function loadWarnings() {
  if (fs.existsSync('warnings.json')) {
    warnings = JSON.parse(fs.readFileSync('warnings.json', 'utf-8'));
  }
}
function saveWarnings() {
  fs.writeFileSync('warnings.json', JSON.stringify(warnings, null, 2));
}

loadCounting();
loadWarnings();

async function discordRequest(endpoint, options = {}) {
  const url = `https://discord.com/api/v10${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) throw new Error(`Discord API Error: ${response.status}`);
  return response.json();
}

app.listen(PORT, () => console.log(`🚀 Bot listening on port ${PORT}`));
