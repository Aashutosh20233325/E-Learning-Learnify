import express from "express";
import dotenv from "dotenv";
import connectDB from "./database/db.js";
import userRoute from "./routes/user.route.js"; 
dotenv.config();
import  cookieParser from "cookie-parser";
import cors from "cors";
import courseRoute from "./routes/course.route.js"
import mediaRoute from "./routes/media.route.js"
import purchaseRoute from "./routes/purchaseCourse.Route.js"
import quizRoute from "./routes/quiz.route.js"
import courseProgressRoute from "./routes/courseProgress.route.js"
//call database connnection here
connectDB();
const app = express();
//const PORT = 8080
const PORT = process.env.PORT || 3000;
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl} and  ${req.url} `);
  next();
});
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}));
app.use("/api/v1/user",userRoute);
app.use("/api/v1/course",courseRoute);
app.use("/api/v1/media",mediaRoute);
app.use("/api/v1/purchase",purchaseRoute);
app.use("/api/v1/progress",courseProgressRoute);
app.use("/api/v1/quizzes",quizRoute);


app.get("/home",(_,res)=>{
     res.status(200).json({
        success:true,
        message:"hello i m coming from backend"
     })

})
app.listen(PORT , () =>{
    console.log(`Server listen at port ${PORT}`);
});