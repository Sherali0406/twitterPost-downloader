const express = require('express');
const TwitterDownloader = require('../twitterDownloader');
const TwitterData = require('../schemas/twitter.schema');
const authController = require('../controllers/authController');

const router = express.Router();

const BEARER_TOKEN = process.env.BEARER_TOKEN;
const downloader = new TwitterDownloader(BEARER_TOKEN);

router.post('/download', async (req, res) => {
    const { twitterUrl, title, hashtags } = req.body;

    if (!twitterUrl) {
        return res.status(400).json({ error: 'Twitter URL is required.' });
    }

    try {
        // Ensure hashtags is an array or set to empty if not provided
        const parsedHashtags = Array.isArray(hashtags) ? hashtags : [];
        const result = await downloader.downloadTweetMedia(twitterUrl, title, parsedHashtags);
        console.log('result of download: ',result);
        res.status(200).json({
            message: 'Download completed successfully!',
            tweetId: result.data.tweetId,
            username: result.data.username,
            title: result.data.title,
            hashtags: result.data.hashtags,
            mediaPaths: result.data.mediaPaths,
            profileImagePath: result.data.profileImagePath,
        });
    } catch (error) {
        console.error('Error in /download:', error.message);
        res.status(500).json({ error: 'Failed to download media.', details: error.message });
    }
});


router.get('/', async (req, res) => {
    try {
        const { title } = req.query; 
        const query = {};

        if (title) {
            query.title = { $regex: title, $options: 'i' };
        }

        const tweets = await TwitterData.find(query);
        res.status(200).json(tweets);
    } catch (error) {
        console.error('Xatolik tweetlarni olishda:', error);
        res.status(500).json({ error: 'Tweetlarni olishda xatolik yuz berdi.' });
    }
});


router.get('/tweets/:tweetId', async (req, res) => {
    try {
        const tweet = await TwitterData.findOne({ tweetId: req.params.tweetId });
        if (!tweet) {
            return res.status(404).json({ error: 'Tweet not found' });
        }
        res.status(200).json(tweet);
    } catch (error) {
        console.error('Error fetching tweet:', error.message);
        res.status(500).json({ error: 'Failed to fetch tweet', details: error.message });
    }
});

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);

module.exports = router;