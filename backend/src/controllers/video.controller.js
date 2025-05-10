import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    // Fetch when the owner uploaded the video
    const { page = 1, limit = 10, query, sortBy, sortType } = req.query;
    const { userId } = req.params;

    // Default sorting
    let sortField = sortBy || "createdAt";
    let sortOrder = sortType === "asc" ? 1 : -1;

    const options = {
        page: Math.max(1, parseInt(page, 10)),
        limit: Math.max(1, parseInt(limit, 10)),
        sort: { [sortField]: sortOrder },
    };

    // Base match condition
    let matchCondition = {};

    if (query?.trim()) {
        matchCondition = {
            $or: [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
            ]
        };
    } else if (userId) {
        matchCondition = { owner: new mongoose.Types.ObjectId(userId) };
    }

    const aggregateQuery = Video.aggregate([
        { $match: matchCondition },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        { $unwind: "$userDetails" },
        {
            $project: {
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                createdAt: 1 // Include upload date
            }
        }
    ]);

    // Apply pagination
    const result = await Video.aggregatePaginate(aggregateQuery, options);

    return res.status(200).json(new ApiResponse(200, result, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    const { title, description } = req.body

    const videoLocalPath = req.files?.video[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "Video is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    const video = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!video?.secure_url || !video?.duration) {
        throw new ApiError(500, "Failed to upload video to Cloudinary");
    }

    if (!thumbnail?.secure_url) {
        throw new ApiError(500, "Failed to upload thumbnail to Cloudinary");
    }

    const publishVideo = await Video.create({
        videoFile: video.secure_url,
        thumbnail: thumbnail.secure_url,
        title,
        description,
        duration: video.duration,
        owner: req.user._id
    })

    return res.status(201).json(new ApiResponse(201, publishVideo, "Video published successfully"));
})

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400, "Video ID is required");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video ID");
    }
    if(!(await Video.exists({ _id: videoId }))){
        throw new ApiError(404, "Video doesn't exist");
    }

    const video = await Video.findById(videoId);
    return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const { videoId } = req.params;
    const { title, description } = req.body;

    if(!videoId){
        throw new ApiError(400, "Video ID is required");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video ID");
    }
    if(!(await Video.exists({ _id: videoId }))){
        throw new ApiError(404, "Video doesn't exist");
    }

    let update = {};
    if (title) update.title = title;
    if (description) update.description = description;
    
    if (req.files?.thumbnail) {
        const thumbnailLocalPath = req.files.thumbnail[0]?.path;
        if (thumbnailLocalPath) {
            const uploadResult = await uploadOnCloudinary(thumbnailLocalPath);
            if (uploadResult?.secure_url) {
                update.thumbnail = uploadResult.secure_url;
            }
        }
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        update,
        { new: true, runValidators: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400, "Video ID is required");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video ID");
    }
    if(!(await Video.exists({ _id: videoId }))){
        throw new ApiError(404, "Video doesn't exist");
    }

    const video = await Video.findById(videoId)
    const thumbnailUrl = video.thumbnail;
    await deleteFromCloudinary(thumbnailUrl)

    const videoUrl = video.videoFile;
    await deleteFromCloudinary(videoUrl)

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video doesn't exist");
    }
    
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { isPublished: !video.isPublished },
        { new: true, runValidators: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Publish status toggled successfully"));
});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}