import fs from 'node:fs';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import search from 'yt-search';

process.on('message', async (args) => {
    console.log(args.guild);
    await prepAudio(args.id, args.song);
    process.exit();
})

async function getStream(song) {
    if (ytdl.validateURL(song.url) || ytpl.validateID(song.url))
        return ytdl(song.url, {quality: 'highestaudio', filter: 'audioonly'});
    else {
        const results = await search(`${song.title} ${song.artist} audio`);
        const videos = results.videos;

        let video = null;

        for (let i = 0; i < 4 || i < videos.length; i++) {
            if (video) {
                const difference = Math.abs(videos[i].seconds - song.duration);
                if (difference < Math.abs(video.seconds - song.duration)) {
                    video = videos[i];
                }
            } else {
                video = videos[i];
            }
        }

        return ytdl(video.url, {quality: 'highestaudio', filter: 'audioonly'});
    }
}

async function prepAudio(id, song) {
    const delay = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

    console.log(id);

    if (!fs.existsSync(`.guilds/${id}/next_audio.mp4`) && fs.existsSync(`./guilds/${id}/audio.mp4`)) {
        console.log('Creating new audio file...');
        const stream = await getStream(song);
        stream.pipe(fs.createWriteStream(`./guilds/${id}/next_audio.mp4`));
        await delay(2750);
    }
}