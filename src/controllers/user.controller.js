import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } 
  catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh token");
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const {username, email, fullName, password} = req.body;
  console.log(`Registering user: ${username} with email: ${email}`);
  // console.log(req.body);// req.body is from the form data sent from the client, but it doesn't contain the files because the files are sent as multipart form data which means they are sent as separate requests

  if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const userExisted = await User.findOne({ $or: [{ email }, { username }] });

  if (userExisted) {
    throw new ApiError(409, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // console.log(req.files)
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;

  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully")
  )

});

const loginUser = asyncHandler(async (req, res) => {
  const {email, username, password} = req.body;

  if(!email && !username){
    throw new ApiError(400, "Email or username is required"); // Throw error if both email and username are not provided 
  }

  const user = await User.findOne({ $or: [{ email }, { username }] }); // Find user by email or username

  if(!user){
    throw new ApiError(404, "User does not exist"); // Throw error if user does not exist
  }

  const isPasswordValid = await user.ispasswordCorrect(password); // Check if the password is correct using the custom method that we made in user.model.js

  if(!isPasswordValid){
    throw new ApiError(401, "Invalid user credentials"); // Throw error if password is incorrect
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id); // Generate access and refresh tokens

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken"); // Creating a new variable because the old one has password and refresh token

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"));

});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {refreshToken: undefined}
    },
    {
      new: true
    }
  );

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged out"));
});

export {
  registerUser,
  loginUser,
  logoutUser
};