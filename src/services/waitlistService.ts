import { supabase } from '../utils/supabaseClient';

export interface WaitlistEntry {
  id?: string;
  email: string;
  role?: string;
  created_at?: string;
  source?: string;
}

export const waitlistService = {
  /**
   * Add an email to the waitlist
   * @param email The email to add
   * @param role The user's role/description
   * @param source Optional source tracking parameter 
   * @returns {Promise<{ success: boolean, error?: any }>}
   */
  async addToWaitlist(email: string, role: string = '', source: string = 'landing_page'): Promise<{ success: boolean; error?: any }> {
    try {
      // Check if table exists, create it if it doesn't
      await this.ensureTableExists();
      
      // Try to check if email already exists - handle both schema variations
      let existingEntries = null;
      try {
        const { data } = await supabase
          .from('waitlist')
          .select('email')
          .eq('email', email)
          .limit(1);
        existingEntries = data;
      } catch (selectError) {
        console.log('Could not check existing entries, proceeding with insert...');
        // Continue to insert attempt
      }
      
      if (existingEntries && existingEntries.length > 0) {
        // Email already exists, just return success
        console.log('Email already in waitlist, returning success');
        return { success: true };
      }
      
      // Try to add entry with all fields first
      let insertData: any = { email, source };
      if (role) {
        insertData.role = role;
      }
      
      const { error } = await supabase
        .from('waitlist')
        .insert([insertData]);
      
      // Handle specific error cases
      if (error) {
        console.error('Insert error:', error);
        
        // If it's a constraint violation (email already exists), treat as success
        if (error.code === '23505' || 
            error.message?.includes('already exists') || 
            error.message?.includes('duplicate') ||
            error.message?.includes('violates unique constraint') ||
            error.details?.includes('already exists')) {
          console.log('Email already exists (constraint violation), treating as success');
          return { success: true };
        }
        
        // If role column doesn't exist, try without role
        if (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('role')) {
          console.log('Role column not found, trying without role...');
          try {
            const { error: fallbackError } = await supabase
              .from('waitlist')
              .insert([{ email, source }]);
            
            if (fallbackError) {
              // Handle constraint violation for fallback too
              if (fallbackError.code === '23505' || 
                  fallbackError.message?.includes('already exists') || 
                  fallbackError.message?.includes('duplicate') ||
                  fallbackError.message?.includes('violates unique constraint') ||
                  fallbackError.details?.includes('already exists')) {
                console.log('Email already exists (fallback), treating as success');
                return { success: true };
              }
              throw fallbackError;
            }
          } catch (fallbackException) {
            // If fallback also fails with duplicate, still treat as success
            if (fallbackException?.code === '23505' || 
                fallbackException?.message?.includes('already exists') || 
                fallbackException?.message?.includes('duplicate')) {
              console.log('Email already exists (fallback exception), treating as success');
              return { success: true };
            }
            throw fallbackException;
          }
        } else {
          throw error;
        }
      }
      
      console.log('Successfully added to waitlist');
      return { success: true };
    } catch (error: any) {
      console.error('Error adding to waitlist:', error);
      
      // Handle HTTP 409 Conflict (duplicate email) at the network level
      if (error?.status === 409 || 
          error?.code === '23505' || 
          error?.message?.includes('already exists') ||
          error?.message?.includes('duplicate') ||
          error?.message?.includes('violates unique constraint')) {
        console.log('Duplicate email detected at network level, treating as success');
        return { success: true };
      }
      
      return { success: false, error };
    }
  },
  
  /**
   * Ensure the waitlist table exists in the database
   * This is a convenience method for development and can be removed in production
   */
  async ensureTableExists(): Promise<void> {
    try {
      // Check if the table exists
      const { error } = await supabase
        .from('waitlist')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') { // Table doesn't exist
        // Create the table using SQL - requires admin privileges
        // In production, this should be done through migrations
        console.log('Attempting to create waitlist table...');
        
        // Use RPC call to a function that should be created in Supabase
        const { error: rpcError } = await supabase.rpc('create_waitlist_table');
        
        if (rpcError) {
          console.error('Failed to create table via RPC:', rpcError);
          // Fail silently but log the error
        }
      }
    } catch (error) {
      console.error('Error ensuring table exists:', error);
      // Fail silently
    }
  }
};

// Add this SQL function to your Supabase database:
/*
CREATE OR REPLACE FUNCTION create_waitlist_table()
RETURNS void AS $$
BEGIN
  -- Check if table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'waitlist'
  ) THEN
    -- Create the waitlist table
    CREATE TABLE public.waitlist (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT NOT NULL UNIQUE,
      role TEXT,
      source TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Set up RLS policies
    ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
    
    -- Allow insert from anyone (anonymous users can join waitlist)
    CREATE POLICY "Allow anonymous insert" ON public.waitlist
      FOR INSERT TO anon
      WITH CHECK (true);
    
    -- Only allow service role and authenticated users to select
    CREATE POLICY "Allow select for authenticated users" ON public.waitlist
      FOR SELECT TO authenticated
      USING (true);

    -- Create a secure function to handle email notifications
    CREATE OR REPLACE FUNCTION notify_waitlist_signup()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Insert into a separate notifications queue table
      INSERT INTO waitlist_notifications (waitlist_entry_id, email, role, processed)
      VALUES (NEW.id, NEW.email, NEW.role, false);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create notifications queue table
    CREATE TABLE IF NOT EXISTS waitlist_notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      waitlist_entry_id UUID REFERENCES waitlist(id),
      email TEXT NOT NULL,
      role TEXT,
      processed BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      processed_at TIMESTAMP WITH TIME ZONE
    );

    -- Create trigger for new signups
    CREATE TRIGGER waitlist_signup_notification
    AFTER INSERT ON waitlist
    FOR EACH ROW
    EXECUTE FUNCTION notify_waitlist_signup();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/ 