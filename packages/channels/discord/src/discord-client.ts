import type {
  DiscordRuntimeClient,
  IncomingDiscordMessage,
  SentDiscordMessage,
} from "./types.js";

export async function createDiscordClient(): Promise<DiscordRuntimeClient> {
  const discord = await import("discord.js");
  const client = new discord.Client({
    intents: [
      discord.GatewayIntentBits.DirectMessages,
      discord.GatewayIntentBits.GuildMessages,
      discord.GatewayIntentBits.MessageContent,
    ],
    partials: [discord.Partials.Channel],
  });

  return {
    async destroy() {
      await client.destroy();
    },
    getSelfId() {
      return client.user?.id ?? null;
    },
    async login(token) {
      await client.login(token);
    },
    onMessage(listener) {
      client.on(discord.Events.MessageCreate, (message) => {
        void listener(toIncomingDiscordMessage(message as Parameters<typeof toIncomingDiscordMessage>[0]));
      });
    },
  };
}

function toIncomingDiscordMessage(message: {
  author: { bot: boolean; id: string; username: string };
  channel: { send(content: string): Promise<{ edit(content: string): Promise<void> }> };
  channelId: string;
  content: string;
  inGuild(): boolean;
  mentions: { users: { has(userId: string): boolean } };
}): IncomingDiscordMessage {
  return {
    authorId: message.author.id,
    authorName: message.author.username,
    content: message.content,
    isBot: message.author.bot,
    isDirectMessage: !message.inGuild(),
    sourceLabel: message.inGuild() ? `channel:${message.channelId}` : "dm",
    isMentioned(userId: string) {
      return message.mentions.users.has(userId);
    },
    async send(content: string): Promise<SentDiscordMessage> {
      const sent = await message.channel.send(content);
      return {
        async edit(nextContent: string) {
          await sent.edit(nextContent);
        },
      };
    },
  };
}
