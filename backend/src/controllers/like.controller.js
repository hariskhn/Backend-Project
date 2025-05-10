import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { Tweet } from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on video
  const { videoId } = req.params
  const userId = req.user._id

  if (!videoId) {
    throw new ApiError(400, "Video id is missing!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(500, `Video with id ${videoId} does not exist`);
  }

  const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id }); //if the like existes this will remove the entire schema and thus the like
    return res.status(200).json(new ApiResponse(200, {}, "Video like removed"));
  } else {
    const like = await Like.create({
      video: videoId,
      likedBy: userId
    })
    return res.status(200).json(new ApiResponse(200, like, "Video like added"));
  }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on comment
  const { commentId } = req.params
  const { userId } = req.user._id
  if (!commentId) {
    throw new ApiError(400, "Comment id is missing");
  }

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(500, `Comment with id ${commentId} does not exist`);
  }

  const existingLike = await Like.findOne({ comment: commentId, likedBy: userId });
  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res.status(200).json(new ApiResponse(200, {}, "Comment like removed"));
  } else {
    const like = Like.create({
      comment: commentId,
      likedBy: userId
    })
    return res.status(200).json(new ApiResponse(200, like, "Comment like added"));
  }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on tweet
  const { tweetId } = req.params;
  const { userId } = req.user._id;

  if (!tweetId) {
    throw new ApiError(400, "Tweet id is missing");
  }

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(500, `Tweet with id ${tweetId} does not exist`)
  }

  const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });
  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return res.status(200).json(new ApiResponse(200, {}, "Tweet like removed"))
  } else {
    const like = await Like.create({
      tweet: tweetId,
      likedBy: userId
    })
    return res.status(200).json(new ApiResponse(200, like, "Tweet like added"))
  }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const { userId } = req.user._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User Id");
  }

  const pipeline = [
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId.createFromHexString(userId),
        video: { $ne: null }
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
          {
            $project: {
              thumbnail: 1,
              duration: 1,
              views: 1,
              title: 1,
              createdAt: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: {
          $first: "$video",
        },
      },
    },
    {
      $group: {
        _id: null,
        video: {
          $push: "$video",
        },
      },
    },
    {
      $project: {
        video: 1,
        _id: 0,
      },
    },
  ];

  const likedVideos = await Like.aggregate(pipeline);

  if (!likedVideos.length) {
    throw new ApiError(404, "No liked videos found");
  }

  return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
})

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos
}