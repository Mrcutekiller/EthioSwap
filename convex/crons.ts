import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "delete-old-chat-messages",
  { hourUTC: 2, minuteUTC: 0 }, // Run daily at 2:00 AM UTC
  api.messages.deleteOldMessages
);

crons.interval(
  "record-hourly-rate-snapshot",
  { minutes: 60 },
  api.listings.recordRateSnapshot
);

export default crons;
