import Post from "../models/posts.model.js";
import Comment from "../models/comments.model.js";


export const activeCheck = async (req, res) =>{
    return res.status(200).json({message: "API is running"});
}


export const createPost = async (req, res) => {
    try {
        const user = req.user;
        const post = new Post({
            userId: user._id,
            body : req.body.body,
            media : req.file ? req.file.filename : "",
            fileType : req.file ? req.file.mimetype : ""
        });
        await post.save();
        res.status(201).json({ message: "Post created successfully", post });   
    } catch (error) {
        console.error("Error in createPost controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};  


export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("userId", "name username email profilePicture")
            .sort({ createdAt: -1 });

        // Attach latest comment counts so UI can show counts without extra fetches
        const postsWithCounts = await Promise.all(posts.map(async (post) => {
            const commentsCount = await Comment.countDocuments({ postId: post._id });
            return { ...post.toObject(), commentsCount };
        }));

        return res.status(200).json({ posts: postsWithCounts });
    } catch (error) {
        console.error("Error in getAllPosts controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}; 


export const deletePost = async (req, res) => {
    try {
        const user = req.user;
        const postId = req.body.postId;
        const post = await Post.findOne({ _id: postId, userId: user._id });
        
        if (!post) {
            return res.status(404).json({ message: "Post not found or you are not authorized to delete this post" });
        }
        await Post.deleteOne({ _id: postId });
        res.status(200).json({ message: "Post deleted successfully" }); 
    } catch (error) {
        console.error("Error in deletePost controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};


export const commentOnPost = async (req, res) => {
    const user = req.user;
    const { postId, body } = req.body;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
       const comment = new Comment({
            userId: user._id,
            postId: post._id,
            body: body,
       });
       await comment.save();
        res.status(200).json({ message: "Comment added successfully", comment });
    } catch (error) {
        console.error("Error in commentOnPost controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getCommentsForPost = async (req, res) => {
    const postId = req.query.postId || req.body.postId;
    try {
        const comments = await Comment.find({ postId }).populate("userId", "name username email profilePicture").sort({ createdAt: -1 });
        res.status(200).json({ comments });
    } catch (error) {
        console.error("Error in getCommentsForPost controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteComment = async (req, res) => {
    const user = req.user;
    const {comment_id} = req.body;
    try {
        const comment = await Comment.findOne({ _id: comment_id, userId: user._id });
        if (!comment) {
            return res.status(404).json({ message: "Comment not found or you are not authorized to delete this comment" });
        }
        await Comment.deleteOne({ _id: comment_id });
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        console.error("Error in deleteComment controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }   
};

export const incrementLikes = async (req, res) => {
    try {
        const { postId } = req.body;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        post.likes += 1;
        await post.save();
        res.status(200).json({ message: "Like incremented", likes: post.likes });
    } catch (error) {
        console.error("Error in incrementLikes controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }   
};