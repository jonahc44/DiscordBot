import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, bold, TextChannel, Message } from 'discord.js';
import {
joinVoiceChannel,
createAudioResource,
AudioPlayerStatus,
VoiceConnectionStatus,
createAudioPlayer,
StreamType
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import * as fs from 'node:fs';
import { 
    Queue, 
    Song, 
    Spotify, 
    prepAudio, 
    updateMenuRow,
    updateMessage, 
    addPlaylist,
    delay 
} from '../exports.js';

export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays Youtube and Spotify links')
    .addStringOption(option =>
        option
            .setName('link')
            .setDescription('Paste the link to your song here')
            .setRequired(true),
    )

async function rmCurrentSong(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    const audio = `./guilds/${guildId}/audio.mp4`;

    if (fs.existsSync(audio)) 
        await fs.promises.unlink(audio)
}

async function rmGuildSongs(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    const nextAudio = `./guilds/${guildId}/next_audio.mp4`;

    await rmCurrentSong(interaction);
    
    if (fs.existsSync(nextAudio))
            await fs.promises.unlink(nextAudio)
}

async function setup(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    const guild = interaction.guild;
    const guildId = guild?.id;
    const voiceId = (interaction.member as GuildMember).voice.channel?.id;
    const voiceAdapter = guild?.voiceAdapterCreator;

    if (voiceId && guildId && voiceAdapter) {
        try {
            if (serverQueue.connection) serverQueue.connection.removeAllListeners();

            const connection = joinVoiceChannel({
                guildId: guildId,
                channelId: voiceId,
                adapterCreator: voiceAdapter,
                selfDeaf: false
            });

            serverQueue.connection = connection;

            // Cleanup after disconnect from vc
            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                serverQueue.songs = [];

                await updateMessage(serverQueue, true);

                serverQueue.player?.removeAllListeners();
                serverQueue.connection?.removeAllListeners();
                serverQueue.player = null;
                serverQueue.connection = null;
                
                await rmGuildSongs(interaction);
            })

            if (serverQueue.player) serverQueue.player.removeAllListeners();

            const player = createAudioPlayer();
            serverQueue.player = player;
            serverQueue.connection?.subscribe(player);

            // --------------------------------- Player listeners ------------------------------- //

            // Auto play
            serverQueue.player.on(AudioPlayerStatus.Idle, async () => {
                const songs = serverQueue.songs;

                // Shift the song
                if (!songs[0].getLoop()) {
                    songs.shift();
                    songs.filter(x => x !== undefined);

                    if (songs.length > 0) {
                        if (songs.length < 4 && !serverQueue.buttons.shuffleButton.data.disabled)
                            serverQueue.buttons.shuffleButton.setDisabled();

                        await play(interaction, serverQueue);
                    } else {
                        await updateMessage(serverQueue);
                        await rmGuildSongs(interaction);
                    }
                    await delay(250);
                } else {
                    await play(interaction, serverQueue);
                }
            })

            serverQueue.player.on(AudioPlayerStatus.Idle || AudioPlayerStatus.Paused || AudioPlayerStatus.AutoPaused, async () => {
                // Auto disconnects after 45 minutes of inactivity
                let i = 0;

                if (connection.state.status !== VoiceConnectionStatus.Disconnected) {
                    console.log('Starting timer...');
                    const timer = setInterval(autoDisconnect, 1000);           

                    async function autoDisconnect() {
                        i++;

                        if (serverQueue?.player?.state?.status === AudioPlayerStatus.Playing) {
                            console.log('Cancelling timer...');
                            clearInterval(timer);
                            i = 0;
                            return;
                        }

                        if (i >= 60 * 45) {
                            connection.disconnect();
                            clearInterval(timer);
                            i = 0;
                            return;
                        }

                        return;
                    }
                }})
        } catch(err) {
            console.error(err);
            return interaction.editReply('An unexpected error occured');
        } 

        console.log('Playing song...');
        await play(interaction, serverQueue);
    }
}

async function play(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    const guildId = interaction.guildId;
    const song = serverQueue.songs[0];
    const audioFile = `./guilds/${guildId}/audio.mp4`;
    let resource = createAudioResource(audioFile, {
        inputType: StreamType.Raw
    });

    if (!guildId) return;

    if (!song.getLoop()) {
        const nextAudio = `./guilds/${guildId}/next_audio.mp4`;
        
        if (fs.existsSync(nextAudio)) {
            await rmCurrentSong(interaction);
            fs.rename(nextAudio, audioFile, function (err) {
                if (err) console.error(err);
            })
        } else {
            await prepAudio(interaction, serverQueue);
            await delay(2750);
        }

        resource = createAudioResource(audioFile, {
            inputType: StreamType.Raw
        });
    }

    serverQueue.player?.play(resource);

    if (song.getLoop()) return;

    if (serverQueue.buttons.shuffleButton.data.disabled && serverQueue.songs.length > 3) 
        serverQueue.buttons.shuffleButton.setDisabled(false);
    
    if (!interaction.replied) {
        await updateMenuRow(serverQueue, false);

        const buttonRow: any = serverQueue.buttonRow;
        await interaction.editReply({
            content: `\nNow playing: [${bold(song.title)}](${song.getUrl()})\n`,
            components: [buttonRow, serverQueue.menuRow]
        }).then(async (message: Message<boolean> | null) => {
            if (serverQueue.message)
                await updateMessage(serverQueue, true);

            serverQueue.messageInt = interaction;
            serverQueue.message = message;
        })
    } else {
        const channel = await serverQueue.textChannel.fetch();
        const webhooks: any = await (channel as TextChannel).fetchWebhooks();
        let webhook = webhooks.find((wh: { token: any; }) => wh.token);

        if (!webhook) {
            for (let i = 0; i < webhooks.length; i++) {
                const hookInfo = webhooks[i][1];

                if (hookInfo.name === 'Music Man' && hookInfo.avatar === 'f371aea96182f7e805a53c8eead416cc') 
                    hookInfo.delete();
            }

            const newWebhook = await Promise.resolve(
                (channel as TextChannel).createWebhook({
                    name: 'Music Man',
                    avatar: 'https://i.imgur.com/MCVvG73.jpg'
                })
            );
            
            serverQueue.webhook = newWebhook;
            webhook = newWebhook;
        }

        await updateMenuRow(serverQueue, false);
        await webhook.send({
            content: `\nNow playing: [**${song.title}**](${song.getUrl()})\n`,
            components: [serverQueue.buttonRow, serverQueue.menuRow],
        }).then(async (message: Message<boolean> | null) => {
            await updateMessage(serverQueue, true);
            serverQueue.message = message;
        })
    }

    // Get next song ready for improved performance
    if (serverQueue.songs.length > 1) await prepAudio(interaction, serverQueue);
}

export async function execute(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    const arg = <string>interaction.options.getString('link');
    let song: Song;
    let newQueue = false;

    if (serverQueue.songs.length === 0)
        newQueue = true;

    if (ytdl.validateURL(arg) || arg.includes('https://open.spotify.com/track/'))  {
        if (ytdl.validateURL(arg)) song = new Song(arg);
        else song = new Spotify(arg);

        await song.addItem(serverQueue)
        .catch(err => {
            interaction.reply({
                content: 'Invalid link, please try again',
                ephemeral: true
            })
            console.error(err);
        });
    } else if (ytpl.validateID(arg) || arg.includes('https://open.spotify.com/album/') || arg.includes('https://open.spotify.com/playlist/')) {
        await addPlaylist(interaction, serverQueue);
    } else 
        return await interaction.reply({
            content: 'Invalid url, please try again',
            ephemeral: true
        });

    console.log(interaction.commandName);

    const lastSong = serverQueue.songs[serverQueue.songs.length - 1];

    if (!newQueue) {
        if (serverQueue.songs.length >= 4 && serverQueue.buttons.shuffleButton.data.disabled) {
            let buttons = serverQueue.buttons;
            buttons.shuffleButton = buttons.shuffleButton.setDisabled();
        }

        await prepAudio(interaction, serverQueue);
        await updateMenuRow(serverQueue);

        if (lastSong.playlist?.url && lastSong.playlist?.title)
            return await interaction.reply(`[${bold(lastSong.playlist.title)}](${lastSong.playlist.url}) has been added to the queue`);
        else
            return await interaction.reply(`${bold(lastSong.title)} has been added to the queue`);
    } else {
        await interaction.deferReply();

        if (!serverQueue.connection)
            setup(interaction, serverQueue);
        else
            play(interaction, serverQueue);
    }
}
