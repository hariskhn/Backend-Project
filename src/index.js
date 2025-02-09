// require("dotenv").config({path: './.env'})
import dotenv from "dotenv" 
import connectDB from "./db/index.js"

dotenv.config({path: './.env'});

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on port ${process.env.PORT}`)
        })

        app.on("error", (error) => {
            console.log("Error", error)
            throw error
        })
    })
    .catch((error) => {
        console.log("MongoDB Connection Error", error)
    })









/* import express from "express"

const app = express()

(async () => {
    try{
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("Error", error)
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`)
        })

    } catch (error) {
        console.error("Error", error)
    }
})() */