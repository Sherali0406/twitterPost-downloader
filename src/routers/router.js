const express = require('express');
const TwitterDownloader = require('../twitterDownloader');
const TwitterData = require('../schemas/twitter.schema');
const authController = require('../controllers/authController');
const { createCategory } = require('../controllers/categoryController');
const categorySchema = require('../schemas/category.schema');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const router = express.Router();

const BEARER_TOKEN = process.env.BEARER_TOKEN;
const downloader = new TwitterDownloader(BEARER_TOKEN);


router.post('/download', async (req, res) => {
    const { twitterUrl, title, hashtags,category } = req.body;

    if (!twitterUrl) {
        return res.status(400).json({ error: 'Twitter URL is required.' });
    }

    if (!category) {
        return res.status(400).json({ error: 'Category is required.' });
    }

    try {
        // Ensure hashtags is an array or set to empty if not provided
        const parsedHashtags = Array.isArray(hashtags) ? hashtags : [];
        const result = await downloader.downloadTweetMedia(twitterUrl, title, parsedHashtags,category);
        console.log('result of download: ',result);
        res.status(200).json({
            message: 'Download completed successfully!',
            tweetId: result.data.tweetId,
            username: result.data.username,
            title: result.data.title,
            hashtags: result.data.hashtags,
            mediaPaths: result.data.mediaPaths,
            profileImagePath: result.data.profileImagePath,
            category: result.data.category,
        });
    } catch (error) {
        console.error('Error in /download:', error.message);
        res.status(500).json({ error: 'Failed to download media.', details: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { title, category } = req.query; 
        const query = {};

        if (title) {
            query.title = { $regex: title, $options: 'i' }; // Case-insensitive title search
        }

        if (category) {
            // Find the category by its name
            const categoryDoc = await categorySchema.findOne({ name: { $regex: category, $options: 'i' } });
            if (categoryDoc) {
                query.category = categoryDoc._id; // Use the category's ObjectId
            } else {
                return res.status(404).json({ error: 'Category not found' });
            }
        }

        const tweets = await TwitterData.find(query).populate('category'); // Populate category details
        res.status(200).json(tweets);
    } catch (error) {
        console.error('Error fetching tweets:', error);
        res.status(500).json({ error: 'An error occurred while fetching tweets.' });
    }
});

router.get('/category', async (req, res) => {
    try {
        const { name } = req.query; 
        const query = {};

        if (name) {
            query.name = { $regex: name, $options: 'i' };
        }

        const tweets = await categorySchema.find(query);
        res.status(200).json(tweets);
    } catch (error) {
        console.error('Xatolik tweetlarni olishda:', error);
        res.status(500).json({ error: 'Tweetlarni olishda xatolik yuz berdi.' });
    }
});

router.put('/:id', async (req, res) => {
    // Update tweet by _id
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedTweet = await TwitterData.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedTweet) {
            return res.status(404).json({ error: 'Tweet not found' });
        }

        res.status(200).json({
            message: 'Tweet updated successfully',
            tweet: updatedTweet,
        });
    } catch (error) {
        console.error('Error updating tweet:', error.message);
        res.status(500).json({ error: 'Failed to update tweet', details: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(id);

        const deletedTweet = await TwitterData.findByIdAndDelete(id);
        if (!deletedTweet) {
            return res.status(404).json({ error: 'Tweet not found' });
        }

        res.status(200).json({
            message: 'Tweet deleted successfully',
            tweet: deletedTweet,
        });
    } catch (error) {
        console.error('Error deleting tweet:', error.message);
        res.status(500).json({ error: 'Failed to delete tweet', details: error.message });
    }
});

router.post('/category', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const category = await createCategory(name);
        return res.status(200).json({
            message: 'Category created successfully',
            category,
        });
    } catch (error) {
        console.error('Error creating category:', error.message);
        res.status(500).json({ error: 'Failed to create category.', details: error.message });
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
router.post('/verify-token', authController.verifyToken);


module.exports = router;