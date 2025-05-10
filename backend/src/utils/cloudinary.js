import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from "../utils/ApiError.js"
import fs from 'fs';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {resource_type: "auto"})
        //file has been uploaded successfully
        console.log("File has been uploaded on cloudinary", response.url)
        // console.log(response)//This response is provided by cloudinary
        fs.unlinkSync(localFilePath)//delete the temporary saved file
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)//delete the temporary saved file because the upload failed
        return null
    }
}

const deleteFromCloudinary = async (fileUrl) => {
    try {
        if (!fileUrl) return null;

        const matches = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\./);
        const publicId = matches ? matches[1] : null;

        if (!publicId) {
            console.error("Failed to extract public ID");
            return null;
        }

        const response = await cloudinary.uploader.destroy(publicId);
        console.log("File deleted from Cloudinary:", response);

        return response;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        return null;
    }
};


export { uploadOnCloudinary, deleteFromCloudinary }

// (async function() {

//     // Configuration
    
    
//     // Upload an image
//      const uploadResult = await cloudinary.uploader
//        .upload(
//            'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
//                public_id: 'shoes',
//            }
//        )
//        .catch((error) => {
//            console.log(error);
//        });
    
//     console.log(uploadResult);
    
//     // Optimize delivery by resizing and applying auto-format and auto-quality
//     const optimizeUrl = cloudinary.url('shoes', {
//         fetch_format: 'auto',
//         quality: 'auto'
//     });
    
//     console.log(optimizeUrl);
    
//     // Transform the image: auto-crop to square aspect_ratio
//     const autoCropUrl = cloudinary.url('shoes', {
//         crop: 'auto',
//         gravity: 'auto',
//         width: 500,
//         height: 500,
//     });
    
//     console.log(autoCropUrl);    
// })();