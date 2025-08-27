require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs-extra");
const multer = require("multer");
// const rateLimit = require("express-rate-limit"); // Commented out - install if needed
const PietarienArchivist = require("./src/modules/pietarien-archivist");
const ReedsyRepairAgent = require("./src/modules/reedsy-repair-agent");
const ChatAutoFiler = require("./src/modules/chat-auto-filer");
const BookQASystem = require("./src/modules/book-qa-system");
const PublishingAssistant = require("./src/modules/publishing-assistant");

const app = express();
const PORT = process.env.PORT || 5000; // Use environment variable or default to 5000

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting - commented out until express-rate-limit is installed
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per window
// });
// app.use(limiter);

// Request Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files (React build and uploads directory)
app.use(express.static(path.join(__dirname, "client/build")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");
    fs.ensureDirSync(uploadPath); // Ensure the directory exists
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// API Routes

// Health Check Route
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// File management routes
app.get("/api/files", async (req, res, next) => {
  try {
    const files = await fs.readdir(path.join(__dirname, "uploads"));
    res.json({ files });
  } catch (error) {
    next(error);
  }
});

// Pietarien Archivist routes
app.post("/api/organize", async (req, res, next) => {
  try {
    const config = require("./config/settings.json");
    const archivist = new PietarienArchivist(config);
    const result = await archivist.organizePietarien();
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

// Reedsy Repair routes
app.post("/api/repair-reedsy", async (req, res, next) => {
  try {
    const config = require("./config/settings.json");
    const repairAgent = new ReedsyRepairAgent(config);
    const result = await repairAgent.repair();
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

// Chat Auto-Filer routes
app.post("/api/file-chats", async (req, res, next) => {
  try {
    const config = require("./config/settings.json");
    const chatFiler = new ChatAutoFiler(config);
    const result = await chatFiler.file(req.body);
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

// Book QA routes
app.post("/api/book/ingest", upload.single("file"), async (req, res, next) => {
  try {
    const config = require("./config/settings.json");
    const bookQA = new BookQASystem(config);
    const result = await bookQA.ingest(req.file);
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/book/ask", async (req, res, next) => {
  try {
    const config = require("./config/settings.json");
    const bookQA = new BookQASystem(config);
    const result = await bookQA.ask(req.body);
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

// Publishing Assistant routes
app.post("/api/publish/outreach", async (req, res, next) => {
  try {
    const config = require("./config/settings.json");
    const assistant = new PublishingAssistant(config);
    const result = await assistant.outreach(req.body);
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

// Status endpoint
app.get("/api/status", (req, res) => {
  res.json({ status: "Server is running", port: PORT });
});

// Catch-all handler for React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  process.exit();
});