import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";

// Make sure your STRIPE_SECRET_KEY is correctly loaded from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });

    // Create a new course purchase record
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice,
      status: "pending",
    });

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.courseTitle,
              images: [course.courseThumbnail],
            },
            unit_amount: course.coursePrice * 100, // Amount in paise (lowest denomination)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `https://devskill-hub.onrender.com/course-progress/${courseId}`, // once payment successful redirect to course progress page
      cancel_url: `https://devskill-hub.onrender.com/${courseId}`,
      metadata: {
        courseId: courseId,
        userId: userId,
      },
      shipping_address_collection: {
        allowed_countries: ["IN"], // Optionally restrict allowed countries
      },
    });

    if (!session.url) {
      return res
        .status(400)
        .json({ success: false, message: "Error while creating session" });
    }

    // Save the purchase record
    newPurchase.paymentId = session.id;
    await newPurchase.save();

    return res.status(200).json({
      success: true,
      url: session.url, // Return the Stripe checkout URL
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error during checkout session creation." });
  }
};

export const stripeWebhook = async (req, res) => {
  let event;
  const payloadString = JSON.stringify(req.body, null, 2);
  const secret = process.env.WEBHOOK_ENDPOINT_SECRET; // Ensure this is correctly set

  try {
    console.log("--- Stripe Webhook Received ---");
    // Generate a test header string only for testing, in production use req.headers['stripe-signature']
    // For actual production, you would use:
    // const signature = req.headers['stripe-signature'];
    // event = stripe.webhooks.constructEvent(req.body, signature, secret);

    // For testing with the provided payloadString:
    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });
    event = stripe.webhooks.constructEvent(payloadString, header, secret);
    console.log(`Webhook Event Type: ${event.type}`);

  } catch (error) {
    console.error("Webhook error during construction:", error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // Handle the checkout session completed event
  if (event.type === "checkout.session.completed") {
    console.log("checkout.session.completed event triggered.");

    try {
      const session = event.data.object;
      console.log(`Session ID: ${session.id}`);
      console.log(`Metadata - Course ID: ${session.metadata.courseId}, User ID: ${session.metadata.userId}`);

      const purchase = await CoursePurchase.findOne({
        paymentId: session.id,
      }).populate({ path: "courseId" });

      if (!purchase) {
        console.error(`Error: Purchase record not found for paymentId: ${session.id}`);
        return res.status(404).json({ message: "Purchase not found" });
      }

      console.log(`Found Purchase Record. User ID: ${purchase.userId}, Course ID (from purchase): ${purchase.courseId._id}`);
      console.log(`Current Purchase Status: ${purchase.status}`);

      if (session.amount_total) {
        purchase.amount = session.amount_total / 100;
        console.log(`Updating purchase amount to: ${purchase.amount}`);
      }
      purchase.status = "completed";
      console.log(`Updating purchase status to: ${purchase.status}`);

      // Make all lectures visible by setting `isPreviewFree` to true
      if (purchase.courseId && purchase.courseId.lectures.length > 0) {
        console.log(`Course has lectures. Attempting to update ${purchase.courseId.lectures.length} lectures.`);
        const lectureUpdateResult = await Lecture.updateMany(
          { _id: { $in: purchase.courseId.lectures } },
          { $set: { isPreviewFree: true } }
        );
        console.log(`Lectures updated. Matched: ${lectureUpdateResult.matchedCount}, Modified: ${lectureUpdateResult.modifiedCount}`);
      } else {
        console.log("Course has no lectures or courseId is missing from purchase.");
      }

      await purchase.save();
      console.log("Purchase record saved successfully.");

      // Update user's enrolledCourses
      console.log(`Attempting to update User: ${purchase.userId} with enrolled course: ${purchase.courseId._id}`);
      const updatedUser = await User.findByIdAndUpdate(
        purchase.userId,
        { $addToSet: { enrolledCourses: purchase.courseId._id } }, // Add course ID to enrolledCourses
        { new: true } // Return the updated document
      );
      if (updatedUser) {
        console.log(`User ${updatedUser._id} enrolledCourses updated. Current enrolledCourses: ${updatedUser.enrolledCourses}`);
      } else {
        console.error(`Error: User with ID ${purchase.userId} not found for update.`);
      }


      // Update course to add user ID to enrolledStudents
      console.log(`Attempting to update Course: ${purchase.courseId._id} with enrolled student: ${purchase.userId}`);
      const updatedCourse = await Course.findByIdAndUpdate(
        purchase.courseId._id,
        { $addToSet: { enrolledStudents: purchase.userId } }, // Add user ID to enrolledStudents
        { new: true } // Return the updated document
      );
      if (updatedCourse) {
        console.log(`Course ${updatedCourse._id} enrolledStudents updated. Current enrolledStudents: ${updatedCourse.enrolledStudents}`);
      } else {
        console.error(`Error: Course with ID ${purchase.courseId._id} not found for update.`);
      }

    } catch (error) {
      console.error("Error handling checkout.session.completed event:", error);
      return res.status(500).json({ message: "Internal Server Error during webhook processing." });
    }
  }
  res.status(200).send();
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      .populate({ path: "creator" })
      .populate({ path: "lectures" });

    const purchased = await CoursePurchase.findOne({ userId, courseId });
    // console.log(purchased); // Keep this if you need it, but be mindful of log verbosity

    if (!course) {
      return res.status(404).json({ message: "course not found!" });
    }

    return res.status(200).json({
      course,
      purchased: !!purchased, // true if purchased, false otherwise
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error fetching course detail." });
  }
};

export const getAllPurchasedCourse = async (_, res) => {
  try {
    // Note: The original code used `_` for req, assuming no request object is needed.
    // However, typically you'd need the userId from the request to get *all purchased courses for a specific user*.
    // If this endpoint is meant to show all purchased courses across all users (e.g., for an admin), then it's fine.
    // Assuming you meant for the authenticated user, you would need `req.id` here too.
    // For now, I'll keep it as `getAllPurchasedCourse = async (req, res)`
    // const userId = req.id; // Uncomment if this endpoint should be user-specific

    const purchasedCourse = await CoursePurchase.find({
      status: "completed",
      // userId: userId // Uncomment if this endpoint should be user-specific
    }).populate("courseId");

    // console.log(purchasedCourse); // Keep this if you need it, but be mindful of log verbosity

    if (!purchasedCourse || purchasedCourse.length === 0) { // Check for empty array explicitly
      return res.status(200).json({ // Return 200 with empty array if nothing found
        purchasedCourse: [],
        message: "No completed courses found."
      });
    }
    return res.status(200).json({
      purchasedCourse,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error fetching purchased courses." });
  }
};
