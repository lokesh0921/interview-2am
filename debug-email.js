// Debug script to test Supabase email functionality
// Run with: node debug-email.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://auxozhqevneiwqudtjsz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eG96aHFldm5laXdxdWR0anN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNzAxNjYsImV4cCI6MjA3Mzg0NjE2Nn0.Feafb0gzpHQgF6-AagvpSEkHohkIGHTxk4T9d89TFnE";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailSending() {
  console.log("🧪 Testing Supabase Email Functionality...\n");

  const testEmail = "lokeshpawar721@gmail.com"; // Replace with your test email

  try {
    console.log(`📧 Sending magic link to: ${testEmail}`);

    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        emailRedirectTo: "https://interview-2am.vercel.app",
        shouldCreateUser: false,
      },
    });

    if (error) {
      console.error("❌ Error sending email:", error.message);
      console.error("Error details:", error);

      // Common error solutions
      if (error.message.includes("Invalid login credentials")) {
        console.log(
          "\n💡 Solution: User might not exist. Try with shouldCreateUser: true"
        );
      } else if (error.message.includes("signup not allowed")) {
        console.log(
          "\n💡 Solution: Check Supabase dashboard → Authentication → Settings"
        );
      } else if (error.message.includes("email not confirmed")) {
        console.log(
          "\n💡 Solution: Check email templates in Supabase dashboard"
        );
      }
    } else {
      console.log("✅ Email sent successfully!");
      console.log("📨 Check your email inbox (and spam folder)");
      console.log("🔗 Click the magic link to complete authentication");
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

async function checkSupabaseConfig() {
  console.log("🔍 Checking Supabase Configuration...\n");

  try {
    // Test basic connection
    const { data, error } = await supabase
      .from("_supabase_migrations")
      .select("*")
      .limit(1);

    if (error && error.code === "PGRST116") {
      console.log(
        "✅ Supabase connection working (migrations table not accessible is normal)"
      );
    } else if (error) {
      console.log("⚠️  Supabase connection issue:", error.message);
    } else {
      console.log("✅ Supabase connection working");
    }

    console.log("\n📋 Configuration Summary:");
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
    console.log(`   Project: auxozhqevneiwqudtjsz`);
  } catch (err) {
    console.error("❌ Configuration check failed:", err);
  }
}

// Run the tests
async function main() {
  await checkSupabaseConfig();
  console.log("\n" + "=".repeat(50) + "\n");
  await testEmailSending();

  console.log("\n📚 Next Steps:");
  console.log("1. Check Supabase dashboard → Authentication → Email Templates");
  console.log("2. Verify SMTP settings are configured");
  console.log("3. Check Site URL and Redirect URLs");
  console.log("4. Test with different email providers");
}

main().catch(console.error);

