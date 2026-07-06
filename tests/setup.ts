// Plain `??=` isn't enough here: CI sets several of these via
// `${{ secrets.SOME_UNSET_SECRET }}`, which GitHub Actions renders as an empty
// string (not unset) when the secret hasn't been added. An empty string is
// neither null nor undefined, so `??=` would leave it as "" and routes that
// check `if (!process.env.X)` would treat that as "not configured". Fall back
// on any falsy value instead.
function defaultEnv(key: string, value: string) {
  if (!process.env[key]) process.env[key] = value;
}

defaultEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
defaultEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
defaultEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
defaultEnv("CRON_SECRET", "test-cron-secret");
defaultEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
defaultEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
defaultEnv("STRIPE_WEBHOOK_SECRET", "whsec_billing_dummy");
defaultEnv("STRIPE_DEPOSIT_WEBHOOK_SECRET", "whsec_deposit_dummy");
defaultEnv("NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID", "price_solo");
defaultEnv("NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID", "price_studio");
defaultEnv("NEXT_PUBLIC_STRIPE_PRO_PRICE_ID", "price_pro");
