const mongoose = require('mongoose');

const TwitterSchema = new mongoose.Schema({
    tweetId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    title: { type: String },
    hashtags: { type: [String] },
    mediaPaths: { type: [String] },
    profileImagePath: { type: String },
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'CategoryData', 
        required: true
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TwitterData', TwitterSchema);
