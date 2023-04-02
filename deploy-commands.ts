import fs from 'node:fs';
import {REST} from '@discordjs/rest';
import {Routes} from 'discord-api-types/v10';
import dotenv from 'dotenv';
dotenv.config();

const commands: any[] = [];    
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.ts'));

const guildId = `${process.env.GUILD_ID}`;

(async () => {
    try {
        for (const file of commandFiles) {
            const command = await import(`./commands/${file}`);
            commands.push(command.data.toJSON());
        }

        if (process.env.ENV === 'production') {
            const rest = new REST({version: '10'}).setToken(`${process.env.TOKEN}`);

            console.log('Started refreshing (/) commands globally...');
            const clientId = `${process.env.CLIENT_ID}`;

            await rest.put(
                Routes.applicationCommands(clientId),
                {body: commands}
            );

        } else {
            const rest = new REST({version: '10'}).setToken(`${process.env.TEST_TOKEN}`);

            console.log('Started refreshing (/) commands...');
            const clientId = `${process.env.TEST_CLIENT_ID}`;

            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                {body: commands}
            );
        }
            console.log('Successfully reloaded application (/) commands');
        } catch (error) {
            console.error(error);
        }
})();      
