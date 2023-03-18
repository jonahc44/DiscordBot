import { VoiceConnectionStatus } from '@discordjs/voice';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Queue } from '../exports.js';

export const data = new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription("Disconnects Music Man from the voice channel")

export async function execute(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    const connection = serverQueue.connection;

    if (!connection) {
        return await interaction.reply({
            content: 'Music Man is already disconnected',
            ephemeral: true
        });
    } else if (connection.state.status === VoiceConnectionStatus.Disconnected) {
        return await interaction.reply({
            content: 'Music Man is already disconnected',
            ephemeral: true
        });
    }

    connection.disconnect();
    return await interaction.reply('Music man has been disconnected');
}