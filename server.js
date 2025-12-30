import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";


import postsRoutes from "./routes/posts.routes.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());
app.use("/api/posts", postsRoutes);
app.use("/api/user", userRoutes);
app.use('/uploads', express.static('uploads'));

mongoose.connect(MONGO_URI).then(() => {
    console.log("Connected to MongoDB");
    
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error("Error connecting to MongoDB:", error);
});