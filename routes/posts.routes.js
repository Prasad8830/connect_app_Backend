import { Router } from "express";
import { activeCheck, createPost, getAllPosts, deletePost, commentOnPost, getCommentsForPost, deleteComment, incrementLikes} from "../controllers/posts.controller.js";
import multer from "multer";
import { authenticateToken } from "../middlewares/auth.middleware.js";


const router = Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    }
    ,
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });


router.route("/").get(activeCheck);
router.route("/create_post").post(upload.single("media"), authenticateToken, createPost);
router.route("/get_all_posts").get(authenticateToken, getAllPosts);
router.route("/delete_post").post(authenticateToken, deletePost);
router.route("/comment_on_post").post(authenticateToken, commentOnPost);
router.route("/get_comments_for_post").get(authenticateToken, getCommentsForPost);
router.route("/delete_comment").post(authenticateToken, deleteComment);
router.route("/increment_likes").post(authenticateToken, incrementLikes);


export default router;
