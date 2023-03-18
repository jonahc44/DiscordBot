import { Collection, GatewayIntentBits, Events, GuildMember } from 'discord.js';
import { AudioPlayerStatus, VoiceConnectionStatus } from '@discordjs/voice';
import * as Discord from 'discord.js';
import * as fs from 'node:fs';
import * as dotenv from 'dotenv';
import { Button, Queue, MyClient } from './exports.js';
import * as remove from './commands/remove.js';

dotenv.config();

const queue = new Map<string, Queue>();

const client = new MyClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

if (process.env.ENV === 'production')
    client.login(process.env.TOKEN);
else
    client.login(process.env.TEST_TOKEN);

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.ts'));

const addCommands = async () =>  {
    for (const file of commandFiles) {
        const command = await import(`./commands/${file}`);

        if ('data' in command && 'execute' in command)
            client.commands.set(command.data.name, command);
        else
            console.log(`[WARNING] The command at ./commands/${file} is missing a required "data" or "execute" property.`);
    }
}

addCommands();

// Delete previous guilds folder and create new one
if (fs.existsSync('./guilds'))
    fs.rmSync('./guilds', {recursive: true, force: true});

// Create new guilds folder
fs.mkdir('./guilds', function (err) {
    if (err) console.error(err);
});

client.once('ready', () => {
    console.log(`${client?.user?.username} is ready`);
});

// Command interaction listener
client.on(Events.InteractionCreate, async interaction => {
    console.log(`Interaction: ${interaction.type}`);
    if (!interaction.isChatInputCommand()) return;

    const command: any = client.commands.get(interaction.commandName);
    const guild = interaction.guild;

    if (!guild) return;

    const guildId = guild?.id;
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice.channel;
    let serverQueue = queue.get(guildId);

    // Checks if user is connected to a voice channel
    if (!voiceChannel) {
        await interaction.reply({
            content: 'You have to be connected to a voice channel to interact with Music Man',
            ephemeral: true
        });
        return;
    }

    await fs.promises.mkdir(`./guilds/${guildId}`, {recursive: true});

    if (!serverQueue) {
        // Set up buttons
        const shuffleButton = Button.shuffleButton;
        const loopButton = Button.loopButton;
        const playPauseButton = Button.playPauseButton;
        const skipButton = Button.skipButton;

        // Set up rows
        const buttonRow = new Discord.ActionRowBuilder()
            .addComponents(shuffleButton)
            .addComponents(loopButton)
            .addComponents(playPauseButton)
            .addComponents(skipButton)

        const menuRow = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.StringSelectMenuBuilder()
                    .setCustomId('queue')
                    .setPlaceholder('Queue is empty')
                    .setDisabled()
                    .addOptions(
                        {
                            label: 'Queue is empty',
                            description: ':(',
                            value: 'first_option'
                        }
                    )
            );

        // Creating contract for queue
        const queueContract: Queue = {
            textChannel: <Discord.TextBasedChannel>interaction.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            player: null,
            buttonRow: buttonRow,
            menuRow: menuRow,
            message: null,
            messageInt: null,
            webhook: null,
            client: client,
            buttons: {
                skipButton,
                playPauseButton,
                loopButton,
                shuffleButton,
            }
        };

        // Setting the queue using our contract
        queue.set(guildId, queueContract);
        serverQueue = queue.get(guildId);
    } else if (serverQueue.connection && serverQueue?.connection?.state?.status !== VoiceConnectionStatus.Disconnected) {
        if (serverQueue.voiceChannel !== voiceChannel && interaction.commandName !== 'invite') {
            await interaction.reply({
                content: 'Music Man is already connected to another voice channel',
                ephemeral: true
            });
            return;
        }
    } else
        serverQueue.voiceChannel = voiceChannel;
        
    if (!command) return;

    if (serverQueue && !serverQueue.webhook) {
        // Checks to see if channel already has a Music Man webhook
        const channel = <Discord.TextChannel>interaction.channel;

        await channel.fetchWebhooks()
            .then(async hooks => {
                let webhooks: any[] = [];

                for (const hook of hooks) {
                    webhooks.push(hook);
                }
                
                for (let i = 0; i < webhooks.length; i++) {
                    const hookInfo = webhooks[i][1];

                    if (hookInfo.name === 'Music Man' && hookInfo.avatar === 'f371aea96182f7e805a53c8eead416cc') 
                        hookInfo.delete();
                }

                const webhook = await Promise.resolve(
                    channel.createWebhook({
                        name: 'Music Man',
                        avatar: 'https://i.imgur.com/MCVvG73.jpg'
                    })
                );
                
                if (serverQueue)
                    serverQueue.webhook = webhook;
            })
        }
    await command.execute(interaction, serverQueue);
})

// Button interaction listener
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    const guildId = interaction.guild?.id;
    if (!guildId) return;
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;
    const serverQueue = queue.get(guildId);
    if (!serverQueue) return;
    let command: any;

    if (voiceChannel !== serverQueue?.voiceChannel) {
        if (!serverQueue?.connection || !voiceChannel) {
            await interaction.reply({
                content: 'You have to be connected to a voice channel with Music Man to use buttons',
                ephemeral: true
            });
            return;
        } else if (serverQueue?.connection.state.status !== VoiceConnectionStatus.Disconnected) {
            await interaction.reply({
                content: 'Music Man is already connected to another voice channel',
                ephemeral: true
            });
            return;
        }
    }

    if (interaction.customId === 'play/pause') {
        if (serverQueue.player?.state.status === AudioPlayerStatus.Paused) 
            command = client.commands.get('resume');
        else
            command = client.commands.get('pause');
    } else {
        command = client.commands.get(interaction.customId);
    }

    command.execute(interaction, serverQueue);
})

// Select menu interaction listener
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    const guildId = interaction.guild?.id;
    if (!guildId) return;
    const serverQueue = queue.get(guildId);
    if (!serverQueue) return;
    remove.execute(interaction, serverQueue);
})

// Delete audio files when program closes
process.stdin.resume();

process.on('exit', async () => {
    await fs.promises.rm('./guilds', {recursive: true, force: true});
});