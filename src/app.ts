import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import customersRoute from "./routes/customers.js";
import authRoute from "./routes/auth.js";
import settingsRoute from "./routes/settings.js";

const app = express();

app.use(express.json());
// Configure CORS selectively: don't enable it globally to avoid opening all endpoints.
// Define allowed origins (adjust or read from process.env as needed).
const allowedOrigins = [
   
    "http://127.0.0.1:3000",
    "https://example.com",
    "http://localhost:3000"
];

const corsOptions = {
    origin: function (origin: any, callback: any) {
        // allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
};

app.use(helmet());
app.use(compression());

const prefix = "/api/v1/auth/";

// Apply CORS only to routes that need browser access.
app.use("/api/v1", cors(corsOptions), authRoute);

// customers endpoints are internal / server-to-server — no browser CORS applied here.
app.use(prefix + "customers", customersRoute);
app.use(prefix + "settings", cors(corsOptions), settingsRoute);

export default app;
