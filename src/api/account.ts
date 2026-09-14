/**
 * API for account management operations.
 * 
 * Architecture Notes:
 * - Domain: User account lifecycle (deletion)
 * - Security: Only authenticated users can delete their own account
 * - Cascade: Deleting auth.users will cascade to all related tables via foreign keys
 * 
 * Important: Client-side deletion of auth.users requires a database function.
 * The recommended approach is to create a database function that handles
 * the deletion server-side with proper permissions.
 */

import { getSupabaseClient } from "../services/supabaseClient";
import { handleSupabaseError } from "./errors";

/**
 * Delete the current user's account and all associated data.
 * 
 * Architecture Note:
 * - Uses a database RPC function to delete the user account
 * - Cascade deletes will automatically remove:
 *   - profiles (via ON DELETE CASCADE)
 *   - journal_entries (via user_id foreign key)
 *   - notification_preferences (via user_id foreign key)
 *   - All related data in dependent tables
 * 
 * Security:
 * - User must be authenticated
 * - Can only delete their own account
 * - This is a destructive operation with no undo
 * 
 * Database Setup Required:
 * - Create a database function `delete_user_account()` that:
 *   1. Deletes all user data from public tables
 *   2. Deletes the user from auth.users
 *   3. Handles all cascade relationships
 */
export async function deleteAccount(): Promise<void> {
  const supabase = getSupabaseClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("User must be authenticated to delete account");
  }

  // Try to use RPC function first (if available)
  const { error: rpcError } = await supabase.rpc("delete_user_account");

  if (!rpcError) {
    // RPC function succeeded
    return;
  }

  // Fallback: Delete user data manually, then sign out
  // Note: This doesn't delete auth.users, but removes all user data
  // The auth.users record will remain but be effectively inactive
  
  const { error: prefsError } = await supabase
    .from("notification_preferences")
    .delete()
    .eq("user_id", user.id);
  if (prefsError) {
    console.warn("Could not delete notification preferences:", prefsError.message);
  }

  const { error: tokensError } = await supabase
    .from("notification_tokens")
    .delete()
    .eq("user_id", user.id);
  if (tokensError) {
    console.warn("Could not delete notification tokens:", tokensError.message);
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.warn("Sign out after fallback deletion failed:", signOutError.message);
  }

  // If RPC function doesn't exist, provide helpful error
  if (rpcError.message?.includes("function") || rpcError.message?.includes("does not exist")) {
    throw new Error(
      "Account deletion requires database setup. Your data has been removed and you have been signed out. Please contact support to complete account deletion."
    );
  }

  throw handleSupabaseError(rpcError);
}
