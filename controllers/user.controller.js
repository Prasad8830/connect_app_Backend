import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import connectionRequest from "../models/connections.model.js";



const convertUserDataToPDF = async (userData) =>{
    const doc = new PDFDocument();
    const outputPath = crypto.randomBytes(32).toString("hex") + ".pdf";
    const fullPath = path.join("uploads", outputPath);
    const stream = fs.createWriteStream(fullPath);
    doc.pipe(stream);

    const profileImagePath = path.join("uploads", userData?.userId?.profilePicture || "");
    if (userData?.userId?.profilePicture && fs.existsSync(profileImagePath)) {
        doc.image(profileImagePath, {align: 'center', width: 100});
    }

    doc.fontSize(14).text(`Name: ${userData?.userId?.name || "N/A"}`);
    doc.fontSize(14).text(`Username: ${userData?.userId?.username || "N/A"}`);
    doc.fontSize(14).text(`Email: ${userData?.userId?.email || "N/A"}`);
    doc.fontSize(14).text(`Bio: ${userData?.bio || "N/A"}`);
    doc.fontSize(14).text(`Current Position: ${userData?.currentPost || "N/A"}`);
    doc.fontSize(14).text("Education:");
    (userData?.education || []).forEach((edu) => {
        doc.fontSize(12).text(`${edu.school || ''} ${edu.degree || ''} ${edu.fieldOfStudy ? '('+edu.fieldOfStudy+')' : ''}`.trim());
    });
    doc.moveDown();
    doc.fontSize(14).text("Past Experiences:", {underline: true});
    (userData?.pastWork || []).forEach((work, index) => {
        doc.fontSize(12).text(`Company: ${work.company || ''}`);
        doc.fontSize(12).text(`Years: ${work.years || ''}`);
        doc.fontSize(12).text(`Position: ${work.position || ''}`);
        if(index !== (userData?.pastWork || []).length - 1){
            doc.moveDown();
        }
    });
    doc.end();

    await new Promise((resolve, reject) => {
        stream.on("finish", resolve);
        stream.on("error", reject);
    });
    return outputPath;
}



export const register = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        if(!name || !username || !email || !password){
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ email });
        if(user){
            return  res.status(400).json({ message: "User already exists" });
        }   

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            username,
            email,
            password: hashedPassword,
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });

        const profile = new Profile({
            userId: newUser._id,
        });
        await profile.save();
    
    } catch (error) {
        console.error("Error in register controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }   
};


export const login = async (req, res) => {
    try{
        const { email, password } = req.body;
        if(!email || !password){
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ email });
        if(!user){
            return res.status(400).json({ message: "User does not exists" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).json({ message: "Invalid credentials" });
        }   

        const token = crypto.randomBytes(16).toString("hex");
        await User.updateOne({ _id: user._id }, { $set: { token } });

        return res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        console.error("Error in login controller:", error.message);
        res.status(500).json({ message: "Server error" });  
    }
}


export const uploadProfilePicture = async (req, res) => {
    try {
        const user = req.user;

        user.profilePicture = req.file.filename;
        await user.save();
        res.status(200).json({ message: "Profile picture uploaded successfully", profilePicture: user.profilePicture });

    } catch (error) {
        console.error("Error in uploadProfilePicture controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};


export const updateUserProfile = async (req, res) => {
    const { token, ...newUserData} = req.body; 
    try {
        const user = req.user;

        const {username, email} = newUserData;

        if(username){
            const existingUser = await User.findOne({ username });
            if(existingUser && existingUser._id.toString() !== user._id.toString()){
                return res.status(400).json({ message: "Username already taken" });
            }   
            Object.assign(user, newUserData);
            await user.save();
        }

        res.status(200).json({ message: "Profile updated successfully", user });
    } catch (error) {
        console.error("Error in updateUserProfile controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};


export const getUserAndProfile = async (req, res) => {
    try {
        const user = req.user;
        const profile = await Profile.findOne({ userId: user._id })
            .populate("userId", "name username email profilePicture");

        res.status(200).json({ user, profile });
    } catch (error) {
        console.error("Error in getUserAndProfile controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateProfileData = async (req, res) => {
    const { token, ...newProfileData} = req.body;

    try {
        const user = req.user;
        const profile = await Profile.findOne({ userId: user._id });

        Object.assign(profile, newProfileData);
        await profile.save();
        res.status(200).json({ message: "Profile updated successfully", profile });
    } catch (error) {
        console.error("Error in updateProfileData controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};


export const getAllUserProfiles = async (req, res) => {
    try {
        const profiles = await Profile.find().populate("userId", "name username email profilePicture");
        return res.status(200).json({ profiles });
    } catch (error) {
        console.error("Error in getAllUserProfiles controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};


export const downloadProfile = async (req, res) =>{
    const user_id = req.query.id;

    const userProfile = await Profile.findOne({userId: user_id}).populate("userId", "name username email profilePicture");
    
    let outputPath = await convertUserDataToPDF(userProfile);
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${outputPath}`;
    return res.status(200).json({ url: fileUrl, filename: outputPath });
}



export const sendConnectionRequest = async (req, res) => {
    const { token, ConnectionId } = req.body;
    try {
        const user = req.user;
        
        // Prevent user from sending connection request to themselves
        if (user._id.toString() === ConnectionId.toString()) {
            return res.status(400).json({ message: "You cannot send connection request to yourself" });
        }
        
        // Logic to send connection request goes here
        const connectionUser = await User.findById(ConnectionId);
        if (!connectionUser) {
            return res.status(404).json({ message: "User to connect not found" });
        }

        const existingRequest = await connectionRequest.findOne({ userId: user._id, connectionId: ConnectionId });
        if (existingRequest) {
            return res.status(400).json({ message: "Connection request already sent" });
        }


        const newConnectionRequest = new connectionRequest({
            userId: user._id,
            connectionId: ConnectionId,
        });
        await newConnectionRequest.save();
        res.status(200).json({ message: "Connection request sent successfully" });
    } catch (error) {
        console.error("Error in sendConnectionRequest controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};



export const getMyConnectionRequests = async (req, res) => {
    try {
        const user = req.user;
        // Get requests sent TO me (where I am the connectionId and status is null/pending)
        const requests = await connectionRequest.find({ connectionId: user._id, status_accepted: null })
            .populate("userId", "name username email profilePicture");
        res.status(200).json({ requests });
    } catch (error) {
        console.error("Error in getMyConnectionRequests controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const myConnections = async (req, res) => {
    try {
        const user = req.user;
        // Get all accepted connections where user is either sender or receiver
        const connectionsAsReceiver = await connectionRequest.find({ connectionId: user._id, status_accepted: true })
            .populate("userId", "name username email profilePicture");
        
        const connectionsAsSender = await connectionRequest.find({ userId: user._id, status_accepted: true })
            .populate("connectionId", "name username email profilePicture");
        
        // Combine and format the connections
        const allConnections = [
            ...connectionsAsReceiver.map(conn => ({
                _id: conn._id,
                user: conn.userId,
                connectedAt: conn.createdAt
            })),
            ...connectionsAsSender.map(conn => ({
                _id: conn._id,
                user: conn.connectionId,
                connectedAt: conn.createdAt
            }))
        ];
        
        res.status(200).json({ connections: allConnections });
    } catch (error) {
        console.error("Error in myConnections controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};


export const respondToConnectionRequest = async (req, res) => {
    const { token, requestId, action_type } = req.body;
    try {
        const user = req.user;
        const request = await connectionRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: "Connection request not found" });
        }   
        if(action_type === "accept"){
            request.status_accepted = true;
        } else if(action_type === "reject"){
            request.status_accepted = false;
        } else{
            return res.status(400).json({ message: "Invalid action type" });
        }
        await request.save();
        res.status(200).json({ message: "Connection request updated successfully" });
    } catch (error) {
        console.error("Error in respondToConnectionRequest controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};


export const getUserProfileById = async (req, res) => {
    const user_id = req.query.userId;
    try {
        const profile = await Profile.findOne({ userId: user_id })
            .populate("userId", "name username email profilePicture");
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.status(200).json({ profile });
    } catch (error) {
        console.error("Error in getUserProfileById controller:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};