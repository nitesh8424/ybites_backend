const express = require("express");
const admin = require("firebase-admin");
const mongoose = require("mongoose");

const cors = require("cors");
require("dotenv").config();
const User = require("./models/User");

const app = express();

const port = process.env.PORT || 5000;
const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;
const database = process.env.DATABASE;

// Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json");
const Notification = require("./models/Notification");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

mongoose.connect(
  `mongodb+srv://${username}:${password}@cluster0.uttybej.mongodb.net/${database}?retryWrites=true&w=majority`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
app.use(cors());
app.use(express.json());

app.post("/api/register", async (req, res) => {
  const { email, displayName, fcmToken } = req.body;
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const newUser = new User({
      email: userRecord.email,
      displayName: displayName,
      fcmToken: fcmToken,
    });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/send-notification", async (req, res) => {
  const { email, title, message } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      const notification = {
        notification: {
          title: title,
          body: message,
        },
      };
      const SaveNotification = new Notification({
        email: email,
        title: title,
        message: message,
      });
      const response = await admin
        .messaging()
        .sendToDevice(user.fcmToken, notification);

      if (response) {
        await SaveNotification.save();
        res
          .status(200)
          .json({ message: "Notification send & saved successfully" });
      } else {
        res.status(500).json({ message: "Notification sending failed" });
      }
    }
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ error: "Notification failed" });
  }
});

app.get("/api/get-notifications", async (req, res) => {
  const email = req.query;
  try {
    const notifications = await Notification.find(email);
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.post("/api/notificationPreferences", async (req, res) => {
  try {
    const { email, notificationEnabled } = req.body;
    await User.findOneAndUpdate(
      { email },
      { notificationEnabled },
      { new: true }
    )
      .then((user) => {
        res.json(user);
      })
      .catch((error) => {
        console.error("Error updating notification preferences:", error);
        res
          .status(500)
          .json({ error: "Failed to update notification preferences" });
      });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    res
      .status(500)
      .json({ error: "Failed to update notification preferences" });
  }
});

app.get("/api/getUser", async (req, res) => {
  const email = req.query.email;
  try {
    const result = await User.findOne({ email });
    res.json(result);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
