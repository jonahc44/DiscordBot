import fs from 'node:fs';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import search from 'yt-search';

process.on('message', async (args) => {
    await prepAudio(args.id, args.songs);
    process.exit();
})

async function getStream(song) {
    if (ytdl.validateURL(song.url) || ytpl.validateID(song.url))
        return ytdl(song.url, {quality: 'highestaudio', filter: 'audioonly'});
    else {
        console.log(`Searching for: ${song.title} ${song.artist}`)
        const results = await search(`${song.title} ${song.artist}`);
        const videos = results.videos;

        let video = null;

        for (let i = 0; i < 5 || i < videos.length; i++) {
            if (video) {
                const difference = Math.abs(videos[i].seconds - song.duration);
                if (difference < Math.abs(video.seconds - song.duration)) {
                    video = videos[i];
                }
            } else {
                video = videos[i];
            }
        }

        console.log(song.duration);
        console.log(video.seconds);
        return ytdl(video.url, {quality: 'highestaudio', filter: 'audioonly'});
    }
}

async function prepAudio(id, songs) {
    const delay = async (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const audioFile = `./guilds/${id}/audio.mp4`;
    const nextAudio = `./guilds/${id}/next_audio.mp4`;
    let file;
    let song;

    if (!fs.existsSync(audioFile)) {
         file = audioFile;
         song = songs[0];
    } else if (!fs.existsSync(nextAudio)) { 
        file = nextAudio;
        song = songs[1];
    } else 
        return;

    const stream = await getStream(song);
    stream.pipe(fs.createWriteStream(file));
    await delay(2750);
}