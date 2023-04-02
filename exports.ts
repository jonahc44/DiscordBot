import { Collection, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction } from 'discord.js';
import * as Discord from 'discord.js';
import * as Voice from '@discordjs/voice';
import { Song } from './SongClass.js';

export const delay = async (ms: number | undefined) => new Promise(resolve => setTimeout(resolve, ms));

export class MyClient extends Discord.Client {
    constructor(options: Discord.ClientOptions) {
        super(options);
    }

    commands: Collection<unknown, unknown>;
}

export class Button extends ButtonBuilder {
    static shuffleButton = new Button()
        .setCustomId('shuffle')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    static loopButton = new Button()
        .setCustomId('loop')
        .setEmoji('🔁')
        .setStyle(ButtonStyle.Secondary);

    static playPauseButton = new Button()
        .setCustomId('play/pause')
        .setEmoji('⏸️')
        .setStyle(ButtonStyle.Primary);

    static skipButton = new Button()
        .setCustomId('skip')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Danger);
}

export interface Queue {
    textChannel: Discord.TextBasedChannel,
    voiceChannel: Discord.VoiceBasedChannel,
    connection: null | Voice.VoiceConnection,
    songs: Array<Song>,
    volume: number,
    player: null | Voice.AudioPlayer,
    buttonRow: Discord.ActionRowBuilder,
    menuRow: Discord.ActionRowBuilder,
    message: null | Discord.Message,
    messageInt: null | ChatInputCommandInteraction,
    webhook: null | Discord.Webhook,
    client: MyClient,
    buttons: {
        skipButton: Button,
        playPauseButton: Button,
        loopButton: Button,
        shuffleButton: Button
    }
}

export * from './SongClass.js';
export * from './HelpfulScripts.js';