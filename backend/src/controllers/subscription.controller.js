import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
    const {channelId} = req.params;
    const user = req.user._id;

    if(!channelId){
        throw new ApiError(400, "Channel id is required");
    }
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id");
    }

    const channel = await User.findById(channelId);
    if(!channel){
        throw new ApiError(404, "Channel not found");
    }

    const alreadySubscribed = await Subscription.findOne({
        subscriber: user,
        channel: channelId
    });

    if(alreadySubscribed){
        await Subscription.findOneAndDelete({ 
            subscriber: user, 
            channel: channelId 
        });
        return res.status(200).json(new ApiResponse(200, {}, "Subscription removed successfully"));
    }

    const createSubscription = await Subscription.create(
        {
            subscriber: user,
            channel: channelId
        }
    )
    return res.status(200).json(new ApiResponse(200, createSubscription, "Subscription added successfully"));
})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // controller to return subscriber list of a channel
    const {channelId} = req.params

    if(!channelId){
        throw new ApiError(400, "Channel id is required");
    }
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id");
    }

    const channel = await User.findById(channelId);
    if(!channel){
        throw new ApiError(404, "Channel not found");
    }

    const subscriberList = await Subscription.aggregate([
        {
            $match: {channel: new mongoose.Types.ObjectId.createFromHexString(channelId)}
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers",
                pipeline:[
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$subscribers"
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, subscriberList, "Subscriber list fetched successfully"));
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
    // controller to return channel list to which user has subscribed
    const { subscriberId } = req.params

    if(!subscriberId){
        throw new ApiError(400, "Subscriber ID is required");
    }
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid subscriber ID");
    }

    const subscriber = await User.findById(subscriberId);
    if(!subscriber){
        throw new ApiError(404, "User not found");
    }

    const channelList = await Subscription.aggregate([
        {
            $match: {subscriber: new mongoose.Types.ObjectId.createFromHexString(subscriberId)}
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channels",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$channels"
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, channelList, "Channel list fetched successfully"));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}