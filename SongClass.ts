import ytdl from 'ytdl-core';
import search from 'yt-search';
import SpotifyWebApi from 'spotify-web-api-node';
import { Queue } from './exports.js';

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
        if (ytdl.validateURL(this.url)) {
            const songInfo = await ytdl.getInfo(this.url);

            this.title = songInfo.videoDetails.title;
            serverQueue.songs.push(this);
        } 
    }

    // async getStream() {
    //     return ytdl(this.url, {quality: 'highestaudio', filter: 'audioonly'});
    // }
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
        } catch(err) {
            throw new Error('Unable to find spotify item');
        }
    }

    // async getStream() {
    //     const results = await search(`${this.title} ${this.artist}`);
    //     const videos = results.videos;

    //     let video: null | search.VideoSearchResult = null;

    //     for (let i = 0; i < 4 || i < videos.length; i++) {
    //         if (video) {
    //             const difference = Math.abs(videos[i].seconds - this.duration);
    //             if (difference < Math.abs(video.seconds - this.duration)) {
    //                 video = videos[i];
    //             }
    //         } else {
    //             video = videos[i];
    //         }
    //         console.log(video);
    //     }

    //     return ytdl((<search.VideoSearchResult>video).url, {quality: 'highestaudio', filter: 'audioonly'});
    // }
}