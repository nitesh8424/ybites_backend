const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema({
  email: String,
  title: String,
  message: String,
});

module.exports = mongoose.model("Notifications", notificationSchema);
