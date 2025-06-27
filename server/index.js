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
import courseProgressRoute from "./routes/courseProgress.route.js"
import errorHandler from "./middlewares/errorHandler.js";
import quizRoute from "./routes/quiz.route.js";
import path from "path";
//call database connnection here
connectDB();
const app = express();
//const PORT = 8080
const PORT = process.env.PORT || 3000;
// app.use((req, res, next) => {
//   console.log(`[${req.method}] ${req.originalUrl} and  ${req.url} `);
//   next();
// });

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"https://devskill-hub.onrender.com",
    credentials:true
}));
app.use("/api/v1/user",userRoute);
app.use("/api/v1/course",courseRoute);
app.use("/api/v1/media",mediaRoute);
app.use("/api/v1/purchase",purchaseRoute);
app.use("/api/v1/progress",courseProgressRoute);
app.use("/api/v1/quizzes",quizRoute);
app.use(errorHandler);

app.get("/home",(_,res)=>{
     res.status(200).json({
        success:true,
        message:"hello i m coming from backend"
     })

})


const __dirname = path.resolve();

// ✅ Correct relative path to dist folder
const staticPath = path.join(__dirname, "../E-learning-learnify/client/E-learning/dist");
const indexPath = path.join(staticPath, "index.html");

console.log("Static Path:", staticPath);
console.log("Index Path:", indexPath);

app.use(express.static(staticPath));

app.get("*", (_, res) => {
  res.sendFile(indexPath);
});


app.listen(PORT , () =>{
    console.log(`Server listen at port ${PORT}`);
});