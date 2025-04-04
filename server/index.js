import express from "express";
import dotenv from "dotenv";
import connectDB from "./database/db.js";
import userRoute from "./routes/user.route.js"; 
import path from "path";
dotenv.config();
import  cookieParser from "cookie-parser";
import cors from "cors";
import courseRoute from "./routes/course.route.js"
import mediaRoute from "./routes/media.route.js"
import purchaseRoute from "./routes/purchaseCourse.Route.js"
import courseProgressRoute from "./routes/courseProgress.route.js"
//call database connnection here
connectDB();
const app = express();
//const PORT = 8080
const PORT = process.env.PORT || 3000;

const _dirname = path.resolve();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"https://e-learning-learnify.onrender.com",
    credentials:true
}));
app.use("/api/v1/user",userRoute);
app.use("/api/v1/course",courseRoute);
app.use("/api/v1/media",mediaRoute);
app.use("/api/v1/purchase",purchaseRoute);
app.use("/api/v1/progress",courseProgressRoute);
app.get("/home",(_,res)=>{
     res.status(200).json({
        success:true,
        message:"hello i m coming from backend"
     })

})
app.use(express.static(path.join(_dirname,"/client/E-learning/dist")))
app.get('*',(_,res) =>{
    res.sendFile(path.resolve(_dirname,'client/E-learning','dist','index.html'));
})
app.listen(PORT , () =>{
    console.log(`Server listen at port ${PORT}`);
});