import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const InviteHandler: React.FC = () => {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleInvite = async () => {
      if (!inviteId) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        // Check if the invite exists
        const { data: invite, error: inviteError } = await supabase
          .from('invites')
          .select('*')
          .eq('id', inviteId)
          .single();

        if (inviteError || !invite) {
          setError('Invitation not found or has expired');
          setLoading(false);
          return;
        }

        // If user is authenticated, process the invite
        if (isAuthenticated) {
          // Process the invite (e.g., add user to a project, etc.)
          console.log('Processing invite:', invite);
          
          // Navigate to the appropriate page
          navigate('/feed');
        } else {
          // Store the invite ID in session storage and redirect to login
          sessionStorage.setItem('pendingInvite', inviteId);
          navigate('/');
        }
      } catch (err) {
        console.error('Error processing invite:', err);
        setError('Failed to process invitation');
      } finally {
        setLoading(false);
      }
    };

    handleInvite();
  }, [inviteId, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Processing invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-white text-xl font-bold mb-4">Invitation Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}; 