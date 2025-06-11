import mongoose from 'mongoose';
const connectDB = async () =>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB conneected");
    }catch(error){
        console.log("error aaya h ");
        console.log("error",error);
    }
}
export default connectDB;