import { Collection, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction } from 'discord.js';
import * as Discord from 'discord.js';
import * as Voice from '@discordjs/voice';
import * as Builder from '@discordjs/builders';
import ytdl from 'ytdl-core';
import search from 'yt-search';
import SpotifyWebApi from 'spotify-web-api-node';
import fs from 'node:fs';
import cluster from 'node:cluster';

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

export class Song {
    private loop = false;
    protected url: string;
    title: string;
    artist: string | null;
    playlist: {
        title: string | null,
        url: string | null
    }
    duration: number;

    constructor(url: string) {
        this.url = url;
    }

    switchLoop() {
        if (!this.loop)
            this.loop = true;
        else
            this.loop = false;
    }

    getLoop() { return this.loop; }
    getUrl() { return this.url };

    async addItem(serverQueue: Queue) {
        const songInfo = await ytdl.getInfo(this.url);

        this.title = songInfo.videoDetails.title;
        serverQueue.songs.push(this);
    }

    async getStream() {
        return ytdl(this.url, {quality: 'highestaudio', filter: 'audioonly'});
    }
}

export class Spotify extends Song {
    constructor(url: string) {
        super(url);
    }

    async addItem(serverQueue: Queue): Promise<any> {  
        try {
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

            if (this.url.includes('https://open.spotify.com/track/')) {
                const id = this.url.replace('https://open.spotify.com/track/', '');

                const songInfo: any = await api.getTrack(id)
                    .catch(err => {
                        console.error(err);
                    });

                // Set this song's values
                this.title = songInfo.body.name;
                this.artist = songInfo.body.artists[0].name;
                this.duration = Math.round(songInfo.body.duration_ms/1000);

                serverQueue.songs.push(this);
            } else if (this.url.includes('https://open.spotify.com/album/')) {
                const id = this.url.replace('https://open.spotify.com/album/', '');

                const albumInfo: any = await api.getAlbumTracks(id)
                    .catch(err => {
                        console.error(err);
                    });

                const albumTracks = albumInfo.body.tracks.items;
                this.playlist = {
                    title: albumInfo.body.name,
                    url: this.url
                }

                // Add each song in album to queue
                for (let i = 0; albumTracks[i]; i++) {
                    const track = albumTracks[i];
                    
                    this.title = track.name;
                    this.artist = track.artists[0].name;
                    this.url = track.external_urls.spotify;
                    this.duration = Math.round(track.duration_ms/1000);

                    serverQueue.songs.push(this);
                }
                
            } else if (this.url.includes('https://open.spotify.com/playlist/')) {
                const id = this.url.replace('https://open.spotify.com/playlist/', '');

                const playlistInfo: any = await api.getPlaylistTracks(id)
                    .catch(err => {
                        console.error(err);
                    });

                const playlistTracks = playlistInfo.body.tracks.items;
                this.playlist = {
                    title: playlistInfo.body.name,
                    url: this.url
                }

                // Add each song in album to queue
                for (let i = 0; playlistTracks[i]; i++) {
                    const track = playlistTracks[i];
                    
                    this.title = track.name;
                    this.artist = track.artists[0].name;
                    this.url = track.external_urls.spotify;
                    this.duration = Math.round(track.duration_ms/1000);

                    serverQueue.songs.push(this);
                }
            }
        } catch(err) {
            throw new Error('Unable to find spotify item');
        }
    }

    async getStream() {
        const results = await search(`${this.title} ${this.artist} audio`);
        const videos = results.videos;

        let video = null;

        for (let i = 0; i < 4 || i < videos.length; i++) {
            if (video) {
                const difference = Math.abs(videos[i].seconds - this.duration);
                if (difference < Math.abs(video.seconds - this.duration)) {
                    video = videos[i];
                }
            } else {
                video = videos[i];
            }
        }

        return ytdl((video as search.VideoSearchResult).url, {quality: 'highestaudio', filter: 'audioonly'});
    }
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
    let row = serverQueue.menuRow;
    let options: any = [];
    const component = <Builder.SelectMenuBuilder>row.components[0];

    if (serverQueue.songs.length > 1) {
        for (let i = 1; i < serverQueue.songs.length && i < 25 ; i++) {
            options.push({
                label: serverQueue.songs[i].title,
                description: `Click to remove`,
                value: `${i}`
            })
        }
        
        component.setDisabled(false);
        component.setOptions(options);
        component.setPlaceholder(`Next: ${serverQueue.songs[1].title}`);
    } else {
        options = [{
            label: 'Queue is empty',
            description: ':(',
            value:'0'
    }];
        component.setOptions(options);
        component.setPlaceholder(`Queue is empty`);
        component.setDisabled(true);
    } 

    if (update) await updateMessage(serverQueue);
}

export async function prepAudio(interaction: Discord.BaseInteraction, serverQueue: Queue) {
    if (!fs.existsSync(`./guilds/${interaction.guild?.id}/next_audio.mp4`) && fs.existsSync(`./guilds/${interaction.guild?.id}/audio.mp4`)) {
        const song = serverQueue.songs[1];
        const stream = await song.getStream();
        stream.pipe(fs.createWriteStream(`./guilds/${interaction.guild?.id}/next_audio.mp4`));

    }
}