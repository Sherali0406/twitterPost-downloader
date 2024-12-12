const axios = require("axios");
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const sharp = require("sharp"); // Rasm o'lchamlarini olish uchun
const TwitterData = require("./schemas/twitter.schema"); // MongoDB uchun schema
const CategoryData = require("./schemas/category.schema");

  class TwitterDownloader {
    constructor(tokens) {
      if (!Array.isArray(tokens) || tokens.length === 0) {
        throw new Error("At least one Bearer Token is required to initialize TwitterDownloader.");
      }
  
      this.tokens = tokens; // List of tokens
      this.tokenIndex = 0;  // Current token index
      this.api = this.createApiClient(this.tokens[this.tokenIndex]);
    }
  
    createApiClient(bearerToken) {
      return axios.create({
        baseURL: "https://api.twitter.com/2",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      });
    }
  
    switchToken() {
      this.tokenIndex = (this.tokenIndex + 1) % this.tokens.length;
      console.log(`Switching to token ${this.tokenIndex + 1}`);
      this.api = this.createApiClient(this.tokens[this.tokenIndex]);
    }
  
    async safeApiCall(callback) {
      for (let attempt = 0; attempt < this.tokens.length; attempt++) {
        try {
          return await callback();
        } catch (error) {
          if (error.response?.status === 429) {
            console.warn("Rate limit exceeded. Switching token...");
            this.switchToken();
          } else {
            throw error;
          }
        }
      }
      throw new Error("All tokens are rate-limited. Please try again later.");
    }
  
    async getTweetInfo(tweetId) {
      return this.safeApiCall(async () => {
        const response = await this.api.get(`/tweets/${tweetId}`, {
          params: {
            expansions: "author_id,attachments.media_keys",
            "media.fields": "url,preview_image_url,type,variants,width,height",
            "user.fields": "profile_image_url,username",
            "tweet.fields": "entities,text",
          },
        });
        return response.data;
      });
    }

  async getImageDimensions(imagePath) {
    try {
      const { width, height } = await sharp(imagePath).metadata();
      return { width, height };
    } catch (error) {
      console.error("Error getting image dimensions:", error.message);
      return null;
    }
  }

  async downloadImage(url, outputPath) {
    return this.safeApiCall(async () => {
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });
      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      console.log(`Downloaded media to: ${outputPath}`);
    });
  }

  async downloadTweetMedia(twitterUrl, title = "", hashtags = [], category) {
    try {
      const tweetIdMatch = twitterUrl.match(/\/status\/(\d+)/);
      if (!tweetIdMatch) {
        throw new Error("Invalid Twitter URL: Tweet ID not found.");
      }
      const tweetId = tweetIdMatch[1];
  
      const tweetInfo = await this.getTweetInfo(tweetId);
      if (!tweetInfo.data) {
        throw new Error("Tweet data not found. The tweet may have been deleted or is private.");
      }
  
      const tweetText = tweetInfo.data.text || "";
      const userInfo = tweetInfo.includes?.users?.[0];
      const username = userInfo?.username || "unknown";
      const profileImageUrl = userInfo?.profile_image_url || null;
  
      const downloadFolder = path.join(__dirname, "downloads", tweetId);
      mkdirp.sync(downloadFolder);
  
      const relativizePath = (fullPath) => {
        if (!fullPath) return null;
        const projectRoot = path.join(__dirname, "../");
        return fullPath.replace(projectRoot, "").replace(/^\//, "");
      };
  
      let profileImagePath = null;
      if (profileImageUrl) {
        try {
          profileImagePath = path.join(downloadFolder, "profile_image.jpg");
          await this.downloadImage(profileImageUrl, profileImagePath);
          profileImagePath = relativizePath(profileImagePath);
        } catch (imageError) {
          console.warn("Failed to download profile image:", imageError.message);
        }
      }
  
      const mediaPaths = [];
      if (tweetInfo.includes?.media) {
        for (const [index, media] of tweetInfo.includes.media.entries()) {
          try {
            console.log(`Processing media ${index + 1} with type: ${media.type}`);
            
            let mediaUrl = null;
      
            // Photo uchun URL aniqlash
            if (media.type === "photo") {
              mediaUrl = media.url.includes("name=")
                ? media.url.replace(/name=\w+$/, "name=orig")
                : media.url;
              console.log(`Photo URL: ${mediaUrl}`);
            } 
            // Video uchun URL aniqlash
            else if (media.type === "video") {
              console.log(`Video media object: ${JSON.stringify(media)}`);
              
              const variants = media.variants || []; // Agar video_info yo'q bo'lsa, variantsni tekshir
              if (variants.length > 0) {
                const mp4Variants = variants.filter(
                  (variant) => variant.content_type === "video/mp4"
                );
                if (mp4Variants.length) {
                  mediaUrl = mp4Variants.sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))[0].url;
                  console.log(`Highest bitrate video URL: ${mediaUrl}`);
                } else {
                  console.warn(`No MP4 variants found for video: ${JSON.stringify(variants)}`);
                }
              } else {
                console.warn(`No video variants available for media: ${JSON.stringify(media)}`);
              }
            }
            
            else {
              console.warn(`Unsupported media type: ${media.type}`);
            }
      
            // Agar mediaUrl topilmasa, jarayonni davom ettirish
            if (!mediaUrl) {
              console.warn(`Media ${index + 1} URL not found. Media type: ${media.type}`);
              continue;
            }
      
            const mediaExtension = media.type === "video" ? ".mp4" : ".jpg";
            const mediaPath = path.join(
              downloadFolder,
              `media_${index + 1}${mediaExtension}`
            );
      
            console.log(`Downloading media from URL: ${mediaUrl} to path: ${mediaPath}`);
            
            // Media faylini yuklash
            await this.downloadImage(mediaUrl, mediaPath);
      
            if (!fs.existsSync(mediaPath)) {
              console.warn(`Downloaded file does not exist: ${mediaPath}`);
              continue;
            }
      
            console.log(`Media downloaded successfully: ${mediaPath}`);
            mediaPaths.push(relativizePath(mediaPath)); // Media massiviga nisbiy yo'lni qo'shamiz
          } catch (mediaError) {
            console.warn(`Error downloading media ${index + 1}:`, mediaError.message);
          }
        }
      }
      
      
  
      const tweetData = {
        tweetId,
        username,
        title: title || tweetText,
        hashtags,
        profileImagePath,
        mediaPaths,
        category,
      };
  
      console.log("Tweet data:", tweetData);
      const savedTweet = await TwitterData.create(tweetData);
      console.log("Tweet data saved to database:", savedTweet);
  
      return {
        message: "Tweet media downloaded and data saved successfully.",
        data: {
          tweetId: tweetData.tweetId,
          username: tweetData.username,
          title: tweetData.title,
          hashtags: tweetData.hashtags,
          mediaPaths: tweetData.mediaPaths,
          profileImagePath: tweetData.profileImagePath,
          category: tweetData.category,
        },
      };
    } catch (error) {
      console.error("Error in downloadTweetMedia:", error.message);
      throw new Error(`Failed to process the tweet: ${error.message}`);
    }
  }
  
}  

module.exports = TwitterDownloader;
