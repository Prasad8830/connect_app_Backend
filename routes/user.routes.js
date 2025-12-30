import { Router } from "express";
import { register, login, uploadProfilePicture, updateUserProfile, getUserAndProfile, updateProfileData, getAllUserProfiles, downloadProfile, sendConnectionRequest, getMyConnectionRequests, myConnections, respondToConnectionRequest, getUserProfileById} from "../controllers/user.controller.js";
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

router.route("/upload_profile_picture").post(authenticateToken, upload.single("profile_picture"), uploadProfilePicture);
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/user_update").post(authenticateToken, updateUserProfile);
router.route("/get_user_and_profile").get(authenticateToken, getUserAndProfile);
router.route("/update_profile_data").post(authenticateToken, updateProfileData);
router.route("/get_all_users").get(getAllUserProfiles);
router.route("/get_user_by_id").get(authenticateToken, getUserProfileById);
router.route("/download_resume").get(downloadProfile);
router.route("/send_connection_request").post(authenticateToken, sendConnectionRequest);
router.route("/my_connection_requests").get(authenticateToken, getMyConnectionRequests);
router.route("/my_connections").get(authenticateToken, myConnections);
router.route("/respond_to_connection_request").post(authenticateToken, respondToConnectionRequest);

export default router;
