import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    bold, 
    ButtonInteraction, 
    TextChannel, 
    ButtonStyle 
} from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import { updateMenuRow, Queue } from "../exports.js";

export const data = new SlashCommandBuilder()
.setName('skip')
.setDescription('Skips the current audio')
.addIntegerOption(option => 
    option
        .setName('number')
        .setDescription('Number of songs you want to skip')
        .setRequired(false)
);

export async function execute(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    if (!serverQueue?.songs[0] || !serverQueue?.player) 
        return await interaction.reply({
            content: "There are no songs currently queued",
            ephemeral: true
        });

    const num = interaction.options?.getInteger('number');
    const song = serverQueue.songs[0];

    if (num) {
        if (num <= serverQueue.songs.length || num < 1) {
            for (let i = 1; i < num; i++) {
                serverQueue.songs.shift();
                serverQueue.songs.filter(x => x !== undefined);
            }

            if (song.getLoop()) song.switchLoop();
            serverQueue.player.stop();
            
            await updateMenuRow(serverQueue);
            return await interaction.reply(`${num} songs were skipped`);
        } else {
            return await interaction.reply({
                content: 'You input an invalid number',
                ephemeral: true
            });
        }
    }

    await updateMenuRow(serverQueue);

    if (interaction.isButton()) {
        const int = interaction as ButtonInteraction;
        int.reply(`${bold(song.title)} has been skipped`);
    } else
        await interaction.reply(`${bold(song.title)} has been skipped`);

    if (song.getLoop()) {
        let button = serverQueue.buttons.loopButton;
        button = button.setStyle(ButtonStyle.Secondary);
        song.switchLoop();
    }

    if (serverQueue.player.state.status === AudioPlayerStatus.Paused)
        serverQueue.player.unpause();
    
    serverQueue.buttons.playPauseButton.setEmoji('⏸️');
    serverQueue.player.stop();
}