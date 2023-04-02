import { fork } from 'node:child_process';
import { StringSelectMenuBuilder, SelectMenuComponentOptionData, BaseInteraction, ChatInputCommandInteraction } from 'discord.js';
import ytpl from 'ytpl';
import SpotifyWebApi from 'spotify-web-api-node';
import { Song, Spotify, Queue } from './exports.js';


export async function shuffleQueue(queue: Song[], serverQueue: Queue) {
    for (let i = queue.length - 1; i > 1; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    for (let i = 0; i < queue.length; i++) 
        serverQueue.songs.push(queue[i]);
}

export async function addPlaylist(interaction: ChatInputCommandInteraction, serverQueue: Queue) {
    const url = <string>interaction.options.getString('link');
    const queue: Song[] = [];
    let shuffle = false;
    if (interaction.commandName === 'shuffle') shuffle = true;

    if (ytpl.validateID(url)) {
        const playlist = await ytpl(url);
            
        for (let i = 0; playlist.items[i]; i++) {
            const songUrl = playlist.items[i].url;
            const songTitle = playlist.items[i].title;
            const song = new Song(songUrl);
            song.title = songTitle;
            song.playlist = {
                title: playlist.title,
                url: playlist.url
            }

            if (shuffle)
                queue.push(song);
            else
                serverQueue.songs.push(song);
        }
    } else if (url.includes('https://open.spotify.com/album/') || url.includes('https://open.spotify.com/playlist/')) {
        const api: SpotifyWebApi = new SpotifyWebApi({
            clientId: '8aa231d3ed2b44ecbe0d42b215b7bfb7',
            clientSecret: 'e26780c5797f4a3997b5db1dfe2fa3c0',
            redirectUri: 'http://localhost:8888/callback'
        });

        await api.clientCredentialsGrant().then(
            function(data) {
                api.setAccessToken(data.body['access_token'])
            }
        );

        let itemInfo: any;
        let playlist = false;

        if (url.includes('https://open.spotify.com/album/')) {
            const id = url.replace('https://open.spotify.com/album/', '');
            itemInfo = await api.getAlbumTracks(id)
                .catch(err => {
                    console.error(err);
                });
        } else {
            const id = url.replace('https://open.spotify.com/playlist/', '');
            itemInfo = await api.getPlaylistTracks(id)
                .catch(err => {
                    console.error(err);
                });
            playlist = true;
        }

        const tracks = itemInfo.body.tracks.items;
        const item = {
            title: itemInfo.body.name,
            url: url
        }

        // Add each song in album to queue
        let track: any;
        for (let i = 0; tracks[i]; i++) {
            if (!playlist)
                track = tracks[i];
            else
                track = tracks[i].track;

            const song = new Spotify(track.external_urls.spotif);

            song.title = track.name;
            song.artist = track.artists[0].name;
            song.playlist = item;
            song.duration = Math.round(track.duration_ms/1000);

            if (shuffle)
                queue.push(song);
            else
                serverQueue.songs.push(song);
        }
        
    }

    if (shuffle) shuffleQueue(queue, serverQueue);
}


export async function updateMessage(serverQueue: Queue, rm = false) {
    if (!serverQueue.message) return;
    if (!serverQueue?.messageInt?.replied) return;

    let components: any[];

    if (serverQueue.songs.length > 0 && !rm)
        components = [serverQueue.buttonRow, serverQueue.menuRow];
    else    
        components = [];

    if (serverQueue.message.interaction) {
        await serverQueue.messageInt.editReply({components: components})
            .catch((err) => {
                serverQueue.message = null;

                if (err.httpStatus === 404 || err.httpStatus === 401) {
                    console.log('Message no longer exists');
                } else {
                    console.log(err);
                }
            })
    } else if (serverQueue.webhook && serverQueue?.message) {
        await serverQueue.webhook.editMessage(serverQueue.message, {components: components})
            .catch((err) => {
                serverQueue.message = null;

                if (err.httpStatus === 404 || err.httpStatus === 401) {
                    console.log('Message no longer exists');
                } else {
                    console.log(err);
                }
            })
    }
}

export async function updateMenuRow(serverQueue: Queue, update = true) {
    const row = serverQueue.menuRow;
    const component = <StringSelectMenuBuilder>row.components[0];

    if (serverQueue.songs.length > 1) {
        component.setOptions();
        for (let i = 1; i < serverQueue.songs.length && i < 25 ; i++) {
            const option: SelectMenuComponentOptionData = {
                label: `${serverQueue.songs[i].title}`,
                description: `Click to remove`,
                value: `${i}`
            }
            component.addOptions(option);
        }
        
        component.setDisabled(false);
        // component.setOptions(options);
        component.setPlaceholder(`Next: ${serverQueue.songs[1].title}`);
    } else {
        component.setOptions({
            label: 'Queue is empty',
            description: ':(',
            value:'0'
        });
        component.setPlaceholder(`Queue is empty`);
        component.setDisabled(true);
    } 

    if (update) await updateMessage(serverQueue);
}

export async function prepAudio(interaction: BaseInteraction, serverQueue: Queue) {
    // Prepping audio using child labor to improve performance
    const childProcess = fork('./prepAudio.mjs');
    const guildId = interaction.guildId;
    childProcess.send(
        {songs: [serverQueue.songs[0], serverQueue.songs[1]], id: guildId}
    );
}