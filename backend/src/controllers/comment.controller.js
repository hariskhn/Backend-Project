import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const options = {
        page: Math.max(1, parseInt(page, 10)),  // Ensure page is at least 1
        limit: Math.max(1, parseInt(limit, 10)), // Ensure limit is at least 1
        sort: { createdAt: -1 }
    };

    const aggregateQuery = Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId.createFromHexString(videoId) } },
        { 
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            } 
        },
        { $unwind: "$ownerDetails" }, 
        { 
            $project: { 
                content: 1, 
                createdAt: 1, 
                "ownerDetails.username": 1, 
                "ownerDetails.avatar": 1 
            } 
        }
    ]);

    const comments = await Comment.aggregatePaginate(aggregateQuery, options);

    return res.status(200).json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { content } = req.body;
    const { videoId } = req.params;
    const userId = req.user._id;

    if(!videoId){
        throw new ApiError(400, "Video ID is required");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video ID");
    }
    if(!(await Video.exists({_id: videoId}))){
        throw new ApiError(404, "Video not found");
    }
    if(!content?.trim()){
        throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: userId
    })

    return res.status(201).json(new ApiResponse(201, comment, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { content } = req.body;
    const { commentId } = req.params;

    if(!commentId){
        throw new ApiError(400, "Comment ID is required");
    }
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment ID");
    }
    if(!(await Comment.exists({_id: commentId}))){
        throw new ApiError(404, "Comment not found");
    }
    if(!content?.trim()){
        throw new ApiError(400, "Content is required");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { content: content.trim() },
        { new: true, runValidators: true }
    )

    return res.status(200).json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    if(!commentId){
        throw new ApiError(400, "Comment ID is required");
    }
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment ID");
    }
    if(!(await Comment.exists({_id: commentId}))){
        throw new ApiError(404, "Comment not found");
    }

    await Comment.findByIdAndDelete(
        commentId
    )

    return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }