import { ChatInputCommandInteraction, ButtonStyle, SlashCommandBuilder, bold } from 'discord.js';
import { Queue, updateMessage } from '../exports.js';


export const data = new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Loops the current audio')
export async function execute(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    if (!serverQueue || serverQueue?.songs?.length === 0) 
        return interaction.reply({
            content: 'There are no songs playing',
            ephemeral: true
        });

    const song = serverQueue.songs[0];
    let loopButton = serverQueue.buttons.loopButton;

    song.switchLoop();

    if (song.getLoop()) {
        loopButton = loopButton.setStyle(ButtonStyle.Success);
        await interaction.reply(`Now looping ${bold(song.title)}`);
    } else {
        loopButton = loopButton.setStyle(ButtonStyle.Primary);
        await interaction.reply(`No longer looping ${bold(song.title)}`);
    }

    await updateMessage(serverQueue);
}