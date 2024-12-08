const axios = require("axios");
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const TwitterData = require("./schemas/twitter.schema");
const CategoryData = require("./schemas/category.schema")

class TwitterDownloader {
  constructor(bearerToken) {
    if (!bearerToken) {
      throw new Error(
        "Bearer Token is required to initialize TwitterDownloader."
      );
    }

    this.bearerToken = bearerToken;
    this.api = axios.create({
      baseURL: "https://api.twitter.com/2",
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
      },
    });
  }

  async downloadImage(url, outputPath) {
    try {
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
    } catch (error) {
      console.error(`Failed to download media from ${url}:`, error.message);
      throw new Error(`Media download failed for URL: ${url}`);
    }
  }

  async getTweetInfo(tweetId) {
    try {
      const response = await this.api.get(`/tweets/${tweetId}`, {
        params: {
          expansions: "author_id,attachments.media_keys",
          "media.fields": "url,preview_image_url,type,variants",
          "user.fields": "profile_image_url,username",
          "tweet.fields": "entities,text",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching tweet data:", error.message);
      throw new Error("Failed to fetch tweet information.");
    }
  }

  async downloadTweetMedia(twitterUrl, title = "", hashtags = [],category) {
    try {
      const tweetIdMatch = twitterUrl.match(/\/status\/(\d+)/);
      if (!tweetIdMatch) {
        throw new Error("Invalid Twitter URL: Tweet ID not found.");
      }
      const tweetId = tweetIdMatch[1];
  
      const tweetInfo = await this.getTweetInfo(tweetId);
      if (!tweetInfo.data) {
        throw new Error(
          "Tweet data not found. The tweet may have been deleted or is private."
        );
      }
  
      const tweetText = tweetInfo.data.text || "";
      const userInfo = tweetInfo.includes?.users?.[0];
      const username = userInfo?.username || "unknown";
      const profileImageUrl = userInfo?.profile_image_url || null;
  
      const downloadFolder = path.join(__dirname, "downloads", tweetId);
      console.log("Download folder:", downloadFolder);
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
            let mediaUrl = null;
            console.log("Media object:", media);
  
            if (media.type === "photo") {
              mediaUrl = media.url;
            } else if (media.type === "video" && media.variants) {
              const sortedVariants = media.variants
                .filter((variant) => variant.content_type === "video/mp4")
                .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
              mediaUrl = sortedVariants[0]?.url;
            } else if (media.type === "animated_gif" && media.variants) {
              mediaUrl = media.variants[0]?.url;
            }
  
            if (!mediaUrl) {
              console.warn(`Media URL is missing for media type: ${media.type}`);
              continue;
            }
  
            console.log("Media URL:", mediaUrl);
            const mediaExtension =
              media.type === "video" ? ".mp4" : media.type === "photo" ? ".jpg" : ".gif";
            const mediaPath = path.join(
              downloadFolder,
              `media_${index + 1}${mediaExtension}`
            );
  
            await this.downloadImage(mediaUrl, mediaPath);
  
            if (!fs.existsSync(mediaPath)) {
              throw new Error(
                `Media download failed: ${mediaPath} does not exist.`
              );
            }
  
            mediaPaths.push(relativizePath(mediaPath));
          } catch (mediaError) {
            console.warn(
              `Failed to download or validate media ${index + 1}:`,
              mediaError.message
            );
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
        category
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
