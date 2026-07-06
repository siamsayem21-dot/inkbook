import { assertDbEnv } from "./helpers";

// Fail fast with a clear message rather than a wall of confusing connection
// errors if someone runs `npm run test:db` without a local Supabase instance.
assertDbEnv();
