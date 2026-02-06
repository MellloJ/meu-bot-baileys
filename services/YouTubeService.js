// services/YouTubeService.js
const yts = require('yt-search');
const axios = require('axios');

class YouTubeService {
    async search(query) {
        const result = await yts(query);
        return result.videos[0];
    }

    async getDownloadUrl(videoUrl) {
        const res = await axios.get(`https://api.dreaded.site/api/ytdl/video?url=${videoUrl}`);
        return res.data.result.download.url;
    }
}
module.exports = new YouTubeService(); // Singleton