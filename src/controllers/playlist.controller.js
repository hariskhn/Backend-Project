import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const { name, description } = req.body;
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!(name && description)) {
        throw new ApiError(400, "Name or description is missing");
    }

    try {
        const playlist = await Playlist.create({
            name,
            description,
            videos: videoId ? [videoId] : [],
            owner: userId
        });

        return res.status(201).json(new ApiResponse(201, playlist, "Playlist created successfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "An error occurred while creating the playlist");
    }
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists

    if (!userId) {
        throw new ApiError(400, "User id is missing");
    }
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    try {
        const playlists = await Playlist.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId.createFromHexString(userId),
                }
            },
            {
                $unwind: {
                    path: "$videos", // Divides the videos array inside playlist into multiple documents
                    preserveNullAndEmptyArrays: true, // Include playlists without videos
                },
            },
            {
                $lookup: {
                    from: "videos", // Lookup details for each video
                    localField: "videos",
                    foreignField: "_id",
                    as: "videoDetails",
                },
            },
            {
                // Optional: Skip unwinding if no videoDetails
                $addFields: {
                    videoDetails: { $ifNull: ["$videoDetails", []] }, // Ensure it's an empty array if no match
                },
            },
            {
                $unwind: {
                    path: "$videoDetails", // Flatten the videoDetails array
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: "$_id", // Rebuild each playlist
                    name: { $first: "$name" },
                    description: { $first: "$description" },
                    owner: { $first: "$owner" },
                    videos: {
                        $push: "$videoDetails", // Rebuild the videos array in the original order
                    },
                    updatedAt: { $first: "$updatedAt" },
                },
            },
            {
                $sort: {
                    updatedAt: -1,
                },
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    videos: 1,
                    updatedAt: 1,
                },
            },
        ]);
        return res.status(200).json(new ApiResponse(200, playlists, "Playlists fetched successsfully"));
    } catch (error) {
        throw new ApiError(500, error.message || "An error occurred while fetching the playlists");
    }
})

const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    const { playlistId } = req.params

    if (!playlistId) {
        throw new ApiError(400, "Playlist id is missing");
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

   try {
     const playlist = await Playlist.aggregate([
         {
             $match: { _id: new mongoose.Types.ObjectId.createFromHexString(playlistId) }
         },
         {
             $lookup: {
                 from: "videos",
                 localField: "videos",
                 foreignField: "_id",
                 as: "videoDetails",
                 pipeline: [
                     {
                         $project: {
                             _id: 1,
                             title: 1,
                             thumbnail: 1,
                             duration: 1,
                             views: 1,
                             isPublished: 1,
                             createdAt: 1
                         }
                     }
                 ]
             }
         },
         {
             $lookup: {
                 from: "users",
                 localField: "owner",
                 foreignField: "_id",
                 as: "ownerDetails",
                 pipeline: [
                     {
                         $project: {
                             _id: 1,
                             username: 1,
                             fullName: 1,
                             avatar: 1
                         }
                     }
                 ]
             }
         },
         {
             $addFields: {
                 owner: { $arrayElemAt: ["$ownerDetails", 0] } // Convert ownerDetails array to an object
             }
         },
         {
             $project: {
                 _id: 1,
                 name: 1,
                 description: 1,
                 owner: 1,
                 videoDetails: 1,
                 updatedAt: 1
             }
         }
     ]);

     if (!playlist.length) {
        return res.status(404).json(new ApiResponse(404, null, "Playlist not found"));
    }

    return res.status(200).json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"));
   } catch (error) {
    throw new ApiError(500, error.message || "An error occurred while fetching the playlist")
   }
    

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    
    if(!(playlistId && videoId)){
        throw new ApiError(400, "Playlist and video id are required");
    }
    if(!(isValidObjectId(playlistId) && isValidObjectId(videoId))){
        throw new ApiError(400, "Invalid playlist or video id");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist doesn't exist");
    }

    try {
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {$addToSet: {videos: videoId}},
            {new: true}
        );
    
        return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to add video to playlist")
    }
    
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    const { playlistId, videoId } = req.params

    if(!(playlistId && videoId)){
        throw new ApiError(400, "Playlist and video id are required");
    }
    if(!(isValidObjectId(playlistId) && isValidObjectId(videoId))){
        throw new ApiError(400, "Invalid playlist or video id");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist doesn't exist");
    }

    try {
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {$pull: {videos: videoId}},
            {new: true}
        );
    
        return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to remove video from playlist")
    }    
})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const { playlistId } = req.params;

    if(!(playlistId)){
        throw new ApiError(400, "Playlist id is required");
    }
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist doesn't exist");
    }

    try {
        await Playlist.findByIdAndDelete(playlistId);
        return res.status(200).json(new ApiResponse(200, {}, "Playlist deleted successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to delete the playlist");
    }

})

// const updatePlaylist = asyncHandler(async (req, res) => {
//     const { playlistId } = req.params
//     const { name, description } = req.body
//     //TODO: update playlist
// })

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}