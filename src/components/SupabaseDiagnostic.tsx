import React, { useEffect, useState } from 'react';
import { supabase, checkSupabaseSession } from '../utils/supabaseClient';
import { collaboratorService } from '../services/collaboratorService';

const SupabaseDiagnostic: React.FC = () => {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [isTablesChecking, setIsTablesChecking] = useState(true);
  const [tablesStatus, setTablesStatus] = useState<{
    profiles: boolean;
    collaborators: boolean;
    invites: boolean;
  }>({ profiles: false, collaborators: false, invites: false });
  const [error, setError] = useState<string | null>(null);
  const [databaseVersion, setDatabaseVersion] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await checkSupabaseSession();
        if (session) {
          setAuthStatus(`✅ Authenticated as ${session.user.email}`);
        } else {
          setAuthStatus('❌ Not authenticated');
        }
      } catch (err) {
        setAuthStatus(`❌ Error checking auth: ${err instanceof Error ? err.message : String(err)}`);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsAuthChecking(false);
      }
    };

    const checkTables = async () => {
      try {
        const tables = await collaboratorService.checkTablesSetup();
        setTablesStatus(tables);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsTablesChecking(false);
      }
    };

    const checkDbVersion = async () => {
      try {
        const { data, error } = await supabase.rpc('get_pg_version');
        if (error) {
          console.error('Error getting DB version:', error);
        } else {
          setDatabaseVersion(data);
        }
      } catch (err) {
        console.error('Error querying DB version:', err);
      }
    };

    checkAuth();
    checkTables();
    checkDbVersion();
  }, []);

  const createTables = async () => {
    try {
      const { data, error } = await supabase.rpc('setup_collaboration_tables');
      if (error) {
        setError(`Error creating tables: ${error.message}`);
      } else {
        const tables = await collaboratorService.checkTablesSetup();
        setTablesStatus(tables);
        alert('Tables created successfully!');
      }
    } catch (err) {
      setError(`Error creating tables: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const runHealthCheck = async () => {
    try {
      // First check if we can get any data at all from Supabase
      const { data: version, error: versionError } = await supabase.from('pg_stat_activity').select('*').limit(1);
      
      if (versionError) {
        setError(`Database connection error: ${versionError.message}`);
        console.error('Database connection error:', versionError);
        return;
      }
      
      // Check tables again
      const tables = await collaboratorService.checkTablesSetup();
      setTablesStatus(tables);
      
      // Check auth status
      const session = await checkSupabaseSession();
      if (session) {
        setAuthStatus(`✅ Authenticated as ${session.user.email}`);
      } else {
        setAuthStatus('❌ Not authenticated');
      }
      
      alert('Health check complete!');
    } catch (err) {
      setError(`Health check error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Supabase Diagnostic</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">
          <h2 className="font-bold">Error:</h2>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        <p className="mb-2">{isAuthChecking ? 'Checking...' : authStatus}</p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Database Tables Status</h2>
        {isTablesChecking ? (
          <p>Checking tables...</p>
        ) : (
          <ul className="list-disc pl-6">
            <li>Profiles table: {tablesStatus.profiles ? '✅ Available' : '❌ Not available'}</li>
            <li>Collaborators table: {tablesStatus.collaborators ? '✅ Available' : '❌ Not available'}</li>
            <li>Collaboration invites table: {tablesStatus.invites ? '✅ Available' : '❌ Not available'}</li>
          </ul>
        )}
      </div>
      
      {databaseVersion && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Database Version</h2>
          <p>{databaseVersion}</p>
        </div>
      )}
      
      <div className="flex space-x-4">
        <button
          onClick={runHealthCheck}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Run Health Check
        </button>
        
        <button
          onClick={createTables}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={tablesStatus.profiles && tablesStatus.collaborators && tablesStatus.invites}
        >
          Create Missing Tables
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">SQL Script for Supabase</h2>
        <p className="mb-2">If the automatic table creation doesn't work, copy and run this script in the Supabase SQL Editor:</p>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {`-- Minimal Collaboration Setup SQL
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
CREATE POLICY "Anyone can read profiles" 
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'edit',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (comic_id, user_id)
);

ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their collaborations" ON public.collaborators;
CREATE POLICY "Users can see their collaborations" 
  ON public.collaborators FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS public.collaboration_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id TEXT NOT NULL,
  inviter_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'edit',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.collaboration_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can see invites" ON public.collaboration_invites;
CREATE POLICY "Anyone can see invites" 
  ON public.collaboration_invites FOR SELECT
  USING (true);
          `}
        </pre>
      </div>
    </div>
  );
};

export default SupabaseDiagnostic; 