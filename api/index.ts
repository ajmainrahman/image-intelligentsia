/**
 * Vercel Serverless Function entry point.
 * This file wraps the Express app for Vercel's Node.js runtime.
 *
 * Vercel automatically discovers this file and serves it at /api/*
 * The rewrites in vercel.json route all /api/* traffic here.
 */
import app from "../artifacts/api-server/src/app.js";

export default app;
