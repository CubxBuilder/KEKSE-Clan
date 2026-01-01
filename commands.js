export default [
  { 
    name: 'send',
    description: 'Sendet eine Nachricht in den Channel',
    options: [
      { name: 'channel', description: 'Zielchannel', type: 7, required: true },
      { name: 'text', description: 'Nachricht', type: 3, required: true }
    ]
  },
  { 
    name: 'embed',
    description: 'Sendet ein Embed in den Channel (Admin-only)',
    options: [
      { name: 'channel', description: 'Zielchannel', type: 7, required: true },
      { name: 'title', description: 'Titel', type: 3, required: true },
      { name: 'description', description: 'Beschreibung', type: 3, required: true },
      { name: 'color', description: 'Farbe (Hex)', type: 3, required: false }
    ]
  },
  { name: 'ban', description: 'Bannt einen User vom Server', options: [
    { name: 'user', description: 'User zum bannen', type: 6, required: true },
    { name: 'reason', description: 'Grund', type: 3, required: false },
    { name: 'delete_messages', description: 'Sollen alle Nachrichten des Users gelöscht werden?', type: 5, required: false }
  ]},
  { name: 'kick', description: 'Kickt einen User vom Server', options: [
    { name: 'user', description: 'User zum kicken', type: 6, required: true },
    { name: 'reason', description: 'Grund', type: 3, required: false }
  ]},
  { name: 'timeout', description: 'Setzt einen User auf Timeout', options: [
    { name: 'user', description: 'User zum muten', type: 6, required: true },
    { name: 'duration', description: 'Dauer in Minuten', type: 4, required: true },
    { name: 'reason', description: 'Grund', type: 3, required: false }
  ]},
  { name: 'untimeout', description: 'Entfernt einen Timeout von einem User', options: [
    { name: 'user', description: 'User', type: 6, required: true }
  ]},
  { name: 'unban', description: 'Entsperrt einen User', options: [
    { name: 'user', description: 'User-ID', type: 3, required: true }
  ]},
  { name: 'warn', description: 'Verteilt eine Warnung an einen User', options: [
    { name: 'user', description: 'User', type: 6, required: true },
    { name: 'reason', description: 'Grund', type: 3, required: true }
  ]},
  { name: 'warns', description: 'Zeigt alle Warnungen eines Users an', options: [
    { name: 'user', description: 'User', type: 6, required: true }
  ]},
  { name: 'warn_remove', description: 'Entfernt eine Verwarnung von einem User', options: [
    { name: 'user', description: 'User', type: 6, required: true },
    { name: 'number', description: 'Nummer der zu löschenden Verwarnung', type: 4, required: false }
  ]},
  { name: 'giveaway', description: 'Erstellt ein Giveaway', options: [
    { name: 'channel', description: 'Channel für das Giveaway', type: 7, required: true },
    { name: 'duration', description: 'Dauer (z.B. 10m, 1h)', type: 3, required: true },
    { name: 'prize', description: 'Gewinn', type: 3, required: true },
    { name: 'winners', description: 'Anzahl der Gewinner (default: 1)', type: 4, required: false },
    { name: 'blacklist', description: 'Blacklist User-IDs (komma-getrennt)', type: 3, required: false },
    { name: 'whitelist_role', description: 'Nur User mit dieser Rolle dürfen mitmachen', type: 8, required: false },
    { name: 'description', description: 'Beschreibung', type: 3, required: false }
  ]},
  { name: 'clear', description: 'Löscht Nachrichten aus einem Channel', options: [
    { name: 'amount', description: 'Anzahl der zu löschenden Nachrichten', type: 4, required: true },
    { name: 'channel', description: 'Channel, in dem gelöscht werden soll', type: 7, required: true },
    { name: 'user', description: 'Nur Nachrichten dieses Users löschen (User-ID)', type: 3, required: false }
  ]},
  { name: 'ping', description: 'Zeigt den aktuellen Ping des Bots an', options: [] },
  { name: 'delcounting', description: 'Beendet das Counting-Spiel in diesem Channel', options: [] },
  { name: 'forcecount', description: 'Überprüft die letzten Zahlen und korrigiert den Spielstand', options: [] },
  { name: 'setcounting', description: 'Legt den Channel für das Counting-Spiel fest', options: [
    { name: 'channel', description: 'Channel für Counting', type: 7, required: true }
  ]},
  {
    name: 'counting',
    description: 'Verwaltet das Counting-Spiel',
    options: [
      {
        name: 'set',
        description: 'Setzt den aktuellen Spielstand (Nur Owner)',
        type: 1,
        options: [
          { name: 'number', description: 'Die neue Zahl', type: 4, required: true }
        ]
      }
    ]
  },
  {
    name: 'ticket',
    description: 'Erstellt eine Ticket-Nachricht mit Auswahlmenü',
    options: []
  },
  {
    name: 'close',
    description: 'Schließt das aktuelle Ticket',
    options: []
  },
  {
    name: 'add',
    description: 'Fügt einen User zum Ticket hinzu',
    options: [
      { name: 'user', description: 'User zum Hinzufügen', type: 6, required: true }
    ]
  },
  {
    name: 'remove',
    description: 'Entfernt einen User aus dem Ticket',
    options: [
      { name: 'user', description: 'User zum Entfernen', type: 6, required: true }
    ]
  },
  { name: 'admin_help', description: 'Zeigt alle Admin/Moderator Commands an', options: [] },
  { name: 'help', description: 'Zeigt allgemeine Informationen über den Server an', options: [] },
  { 
    name: 'score', 
    description: 'Zeigt dein oder das Scoreboard eines anderen Users an', 
    options: [
      { name: 'user', description: 'Der User, dessen Score du sehen willst', type: 6, required: false }
    ]
  },
  {
    name: 'top',
    description: 'Zeigt die Top 10 Counting Rangliste an',
    options: []
  },
  {
    name: 'auth',
    description: 'Generiert dein Dashboard-Passwort (einmalig)',
    options: [
      { name: 'password', description: 'Dein neues Passwort', type: 3, required: true }
    ]
  }
];
