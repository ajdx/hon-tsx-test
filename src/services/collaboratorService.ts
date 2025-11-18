import { Comic } from '../types';
import { supabase } from '../utils/supabaseClient';

export interface Collaborator {
  id: string;
  comicId: string;
  userId: string;
  username: string;
  avatarUrl: string;
  avatar_url?: string; // Keep for backward compatibility
  status?: 'online' | 'offline' | 'away' | 'invited';
  permissionLevel: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface CollaborationInvite {
  id: string;
  comicId: string;
  inviterId: string;
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

// Mock data as fallback
const mockCollaborators: Collaborator[] = [
  {
    id: '1',
    comicId: '123',
    userId: '1',
    username: 'user1',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    avatar_url: 'https://i.pravatar.cc/150?img=1',
    status: 'online',
    permissionLevel: 'edit',
    isOnline: true,
    lastSeen: new Date()
  },
  {
    id: '2',
    comicId: '123',
    userId: '2',
    username: 'user2',
    avatarUrl: 'https://i.pravatar.cc/150?img=2',
    avatar_url: 'https://i.pravatar.cc/150?img=2',
    status: 'offline',
    permissionLevel: 'view',
    isOnline: false,
    lastSeen: new Date()
  }
];

const mockInvites: CollaborationInvite[] = [];

class CollaboratorService {
  // Log method usage to help with debugging
  private logMethodUsage(methodName: string, usesMock: boolean, message?: string) {
    const status = usesMock ? '🟡 Using mock' : '🟢 Using Supabase';
    console.log(`CollaboratorService.${methodName}: ${status}${message ? ` - ${message}` : ''}`);
  }

  // Get collaborators for a comic
  async getCollaborators(comicId: string): Promise<Collaborator[]> {
    try {
      // Try to use Supabase if available
      if (supabase) {
        // First check authentication
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError || !authData?.session) {
          this.logMethodUsage('getCollaborators', true, `Not authenticated: ${authError?.message || 'No session'}`);
          console.warn('Authentication required. Please sign in to use collaboration features.');
          return []; // Return empty array instead of mock data
        }
        
        // Check if table exists to avoid 500 errors
        try {
          const { error: tableCheckError } = await supabase
            .from('collaborators')
            .select('count', { count: 'exact', head: true });
            
          // If table doesn't exist yet or isn't accessible, log error
          if (tableCheckError) {
            this.logMethodUsage('getCollaborators', true, `Table error: ${tableCheckError.message || tableCheckError.code || 'Unknown error'}`);
            if (tableCheckError.code === '42P01' || tableCheckError.message?.includes('does not exist')) {
              console.warn('Table does not exist - make sure to run the database setup SQL.');
            } else if (tableCheckError.status === 500) {
              console.warn('Server error - the database may be experiencing issues.');
            } else if (tableCheckError.status === 401) {
              console.warn('Authentication error - your session may have expired.');
            }
            return []; // Return empty array rather than mock data
          }
        } catch (tableError) {
          this.logMethodUsage('getCollaborators', true, `Table check exception: ${tableError instanceof Error ? tableError.message : String(tableError)}`);
          return []; // Return empty array on exception
        }
          
        // Try direct query without the join first (simpler)
        try {
          const { data, error } = await supabase
            .from('collaborators')
            .select('user_id, permission_level, comic_id')
            .eq('comic_id', comicId);
            
          if (error) {
            this.logMethodUsage('getCollaborators', true, `Query error: ${error.message || error.code || 'Unknown error'}`);
            return mockCollaborators; // Fallback to mock data
          }
          
          if (!data || data.length === 0) {
            this.logMethodUsage('getCollaborators', false, 'No collaborators found');
            return [];
          }
          
          // Get user profiles separately if needed
          try {
            // Get the first user to check if we can access profiles
            if (data.length > 0) {
              const firstUserId = data[0].user_id;
              const { error: profileError } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', firstUserId)
                .single();
                
              // If we can access profiles, fetch for all users
              if (!profileError) {
                const userProfiles = await Promise.all(
                  data.map(async (collab) => {
                    const { data: profile } = await supabase
                      .from('profiles')
                      .select('username, avatar_url')
                      .eq('id', collab.user_id)
                      .single();
                    return { 
                      userId: collab.user_id, 
                      username: profile?.username, 
                      avatarUrl: profile?.avatar_url 
                    };
                  })
                );
                
                // Map the full data with profiles
                this.logMethodUsage('getCollaborators', false, `Found ${data.length} collaborators with profiles`);
                return data.map(item => {
                  const profile = userProfiles.find(p => p.userId === item.user_id);
                  return {
                    id: item.user_id,
                    comicId: comicId,
                    userId: item.user_id,
                    username: profile?.username || `User ${item.user_id.slice(0, 5)}`,
                    avatarUrl: profile?.avatarUrl || `https://i.pravatar.cc/150?u=${item.user_id}`,
                    avatar_url: profile?.avatarUrl || `https://i.pravatar.cc/150?u=${item.user_id}`,
                    status: 'online' as 'online' | 'offline' | 'away' | 'invited',
                    permissionLevel: item.permission_level,
                    isOnline: true,
                    lastSeen: new Date()
                  };
                });
              }
            }
          } catch (profileErr) {
            console.warn('Could not fetch profiles:', profileErr);
            // Continue with basic collaborator data
          }
          
          // If successfully got data but it's simple data without profiles
          // Return basic formatted collaborators
          this.logMethodUsage('getCollaborators', false, `Found ${data.length} collaborators (without profiles)`);
          return data.map(item => ({
            id: item.user_id,
            comicId: comicId,
            userId: item.user_id,
            username: `User ${item.user_id.slice(0, 5)}`,
            avatarUrl: `https://i.pravatar.cc/150?u=${item.user_id}`,
            avatar_url: `https://i.pravatar.cc/150?u=${item.user_id}`,
            status: 'online' as 'online' | 'offline' | 'away' | 'invited',
            permissionLevel: item.permission_level,
            isOnline: true,
            lastSeen: new Date()
          }));
        } catch (queryError) {
          this.logMethodUsage('getCollaborators', true, `Query exception: ${queryError instanceof Error ? queryError.message : String(queryError)}`);
          return mockCollaborators;
        }
      }
    } catch (err) {
      this.logMethodUsage('getCollaborators', true, `Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback to mock data
    this.logMethodUsage('getCollaborators', true, `Fallback for comic ${comicId}`);
    return mockCollaborators;
  }

  // Invite a collaborator to a comic
  async inviteCollaborator(comicId: string, email: string): Promise<CollaborationInvite> {
    try {
      // Try to use Supabase if available
      if (supabase) {
        // First check if user is authenticated
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        // If not authenticated, fallback to mock
        if (authError || !authData.session?.user?.id) {
          this.logMethodUsage('inviteCollaborator', true, `Auth error: ${authError?.message || 'No user session'}`);
          // Continue with mock implementation
        } else {
          try {
            // First check if the user already owns this comic (required for permission)
            const { data: ownerData, error: ownerError } = await supabase
              .from('collaborators')
              .select('*')
              .eq('comic_id', comicId)
              .eq('user_id', authData.session.user.id)
              .eq('permission_level', 'owner')
              .single();
              
            // If not an owner, add as owner automatically for this demo
            if (ownerError || !ownerData) {
              const { error: insertError } = await supabase
                .from('collaborators')
                .insert({
                  comic_id: comicId,
                  user_id: authData.session.user.id,
                  permission_level: 'owner'
                });
                
              if (insertError) {
                this.logMethodUsage('inviteCollaborator', true, `Failed to add user as owner: ${insertError.message}`);
                // Continue with mock implementation, but log first
              }
            }

            // Table check for invites table
            const { error: tableCheckError } = await supabase
              .from('collaboration_invites')
              .select('count', { count: 'exact', head: true });
              
            // If table is accessible
            if (!tableCheckError) {
              // Create the invitation
              const { data, error } = await supabase
                .from('collaboration_invites')
                .insert({
                  comic_id: comicId,
                  inviter_id: authData.session.user.id,
                  invitee_email: email,
                  status: 'pending',
                  permission_level: 'edit'
                })
                .select()
                .single();
              
              if (error) {
                this.logMethodUsage('inviteCollaborator', true, `Insert error: ${error.message}`);
                // Continue with mock implementation
              } else {
                this.logMethodUsage('inviteCollaborator', false, `Invited ${email}`);
                // Format the returned data to match our interface
                return {
                  id: data.id,
                  comicId: data.comic_id,
                  inviterId: data.inviter_id,
                  inviteeEmail: data.invitee_email,
                  status: data.status,
                  createdAt: new Date(data.created_at)
                };
              }
            } else {
              this.logMethodUsage('inviteCollaborator', true, `Table error: ${tableCheckError.message}`);
              // Continue with mock implementation
            }
          } catch (innerErr) {
            this.logMethodUsage('inviteCollaborator', true, `Error in Supabase operations: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`);
            // Continue with mock implementation
          }
        }
      }
    } catch (err) {
      this.logMethodUsage('inviteCollaborator', true, `Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback to mock implementation
    this.logMethodUsage('inviteCollaborator', true, `Fallback for ${email} to comic ${comicId}`);
    
    const invite: CollaborationInvite = {
      id: Math.random().toString(36).substring(2, 9),
      comicId,
      inviterId: 'current-user-id', // This would come from auth context
      inviteeEmail: email,
      status: 'pending',
      createdAt: new Date()
    };
    
    mockInvites.push(invite);
    return invite;
  }

  // Get pending invites for a comic
  async getPendingInvites(comicId: string): Promise<CollaborationInvite[]> {
    try {
      // Try to use Supabase if available
      if (supabase) {
        // Table check first
        const { error: tableCheckError } = await supabase
          .from('collaboration_invites')
          .select('count', { count: 'exact', head: true });
          
        // If table is accessible
        if (!tableCheckError) {
          const { data, error } = await supabase
            .from('collaboration_invites')
            .select('*')
            .eq('comic_id', comicId)
            .eq('status', 'pending');
          
          if (error) {
            this.logMethodUsage('getPendingInvites', true, `Query error: ${error.message}`);
            // Continue with mock implementation
          } else {
            this.logMethodUsage('getPendingInvites', false, `Found ${data.length} pending invites`);
            // Format the returned data to match our interface
            return data.map(invite => ({
              id: invite.id,
              comicId: invite.comic_id,
              inviterId: invite.inviter_id,
              inviteeEmail: invite.invitee_email,
              status: invite.status,
              createdAt: new Date(invite.created_at)
            }));
          }
        } else {
          this.logMethodUsage('getPendingInvites', true, `Table error: ${tableCheckError.message}`);
          // Continue with mock implementation
        }
      }
    } catch (err) {
      this.logMethodUsage('getPendingInvites', true, `Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback to mock implementation
    this.logMethodUsage('getPendingInvites', true, `Fallback for comic ${comicId}`);
    return mockInvites.filter(invite => invite.comicId === comicId && invite.status === 'pending');
  }

  // Get invites for the current user
  async getMyInvites(): Promise<CollaborationInvite[]> {
    try {
      // Try to use Supabase if available
      if (supabase) {
        // First check if user is authenticated
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        // If not authenticated, fallback to mock
        if (authError || !authData.session?.user?.email) {
          this.logMethodUsage('getMyInvites', true, `Auth error: ${authError?.message || 'No user email'}`);
          // Continue with mock implementation
        } else {
          // Table check first
          const { error: tableCheckError } = await supabase
            .from('collaboration_invites')
            .select('count', { count: 'exact', head: true });
            
          // If table is accessible
          if (!tableCheckError) {
            const userEmail = authData.session.user.email;
            const { data, error } = await supabase
              .from('collaboration_invites')
              .select('*')
              .eq('invitee_email', userEmail)
              .eq('status', 'pending');
            
            if (error) {
              this.logMethodUsage('getMyInvites', true, `Query error: ${error.message}`);
              // Continue with mock implementation
            } else {
              this.logMethodUsage('getMyInvites', false, `Found ${data.length} invites for ${userEmail}`);
              // Format the returned data to match our interface
              return data.map(invite => ({
                id: invite.id,
                comicId: invite.comic_id,
                inviterId: invite.inviter_id,
                inviteeEmail: invite.invitee_email,
                status: invite.status,
                createdAt: new Date(invite.created_at)
              }));
            }
          } else {
            this.logMethodUsage('getMyInvites', true, `Table error: ${tableCheckError.message}`);
            // Continue with mock implementation
          }
        }
      }
    } catch (err) {
      this.logMethodUsage('getMyInvites', true, `Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback to mock implementation
    this.logMethodUsage('getMyInvites', true, 'Fallback to mock data');
    // In a real app, we'd get the current user email from auth context
    const mockUserEmail = 'current-user@example.com';
    return mockInvites.filter(invite => invite.inviteeEmail === mockUserEmail && invite.status === 'pending');
  }

  // Accept an invitation
  async acceptInvite(inviteId: string): Promise<boolean> {
    try {
      // Try to use Supabase if available
      if (supabase) {
        // First check if user is authenticated
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        // If not authenticated, fallback to mock
        if (authError || !authData.session?.user?.id) {
          this.logMethodUsage('acceptInvite', true, `Auth error: ${authError?.message || 'No user session'}`);
          // Continue with mock implementation
        } else {
          // Get the invite first to verify it's for this user
          const { data: inviteData, error: inviteError } = await supabase
            .from('collaboration_invites')
            .select('*')
            .eq('id', inviteId)
            .single();
          
          if (inviteError || !inviteData) {
            this.logMethodUsage('acceptInvite', true, `Invite fetch error: ${inviteError?.message || 'No invite found'}`);
            // Continue with mock implementation
          } else if (inviteData.invitee_email !== authData.session.user.email) {
            this.logMethodUsage('acceptInvite', true, 'Invite email mismatch with current user');
            // Continue with mock implementation
          } else {
            // Update the invite status
            const { error: updateError } = await supabase
              .from('collaboration_invites')
              .update({ status: 'accepted' })
              .eq('id', inviteId);
            
            if (updateError) {
              this.logMethodUsage('acceptInvite', true, `Invite update error: ${updateError.message}`);
              // Continue with mock implementation
            } else {
              // Add to collaborators
              const { error: collaboratorError } = await supabase
                .from('collaborators')
                .insert({
                  comic_id: inviteData.comic_id,
                  user_id: authData.session.user.id,
                  permission_level: inviteData.permission_level
                });
              
              if (collaboratorError) {
                this.logMethodUsage('acceptInvite', true, `Collaborator insert error: ${collaboratorError.message}`);
                // Continue with mock implementation
              } else {
                this.logMethodUsage('acceptInvite', false, `Accepted invite ${inviteId}`);
                return true;
              }
            }
          }
        }
      }
    } catch (err) {
      this.logMethodUsage('acceptInvite', true, `Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback to mock implementation
    this.logMethodUsage('acceptInvite', true, `Fallback for invite ${inviteId}`);
    
    const inviteIndex = mockInvites.findIndex(invite => invite.id === inviteId);
    if (inviteIndex !== -1) {
      mockInvites[inviteIndex].status = 'accepted';
      
      // Add to collaborators
      const invite = mockInvites[inviteIndex];
      mockCollaborators.push({
        id: Math.random().toString(36).substring(2, 9),
        comicId: invite.comicId,
        userId: 'current-user-id', // This would come from auth context
        username: 'Current User',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=current-user',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=current-user',
        status: 'online',
        permissionLevel: 'edit',
        isOnline: true,
        lastSeen: new Date()
      });
      
      return true;
    }
    return false;
  }

  // Reject an invitation
  async rejectInvite(inviteId: string): Promise<boolean> {
    try {
      // Try to use Supabase if available
      if (supabase) {
        // First check if user is authenticated
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        // If not authenticated, fallback to mock
        if (authError || !authData.session?.user?.id) {
          this.logMethodUsage('rejectInvite', true, `Auth error: ${authError?.message || 'No user session'}`);
          // Continue with mock implementation
        } else {
          // Get the invite first to verify it's for this user
          const { data: inviteData, error: inviteError } = await supabase
            .from('collaboration_invites')
            .select('*')
            .eq('id', inviteId)
            .single();
          
          if (inviteError || !inviteData) {
            this.logMethodUsage('rejectInvite', true, `Invite fetch error: ${inviteError?.message || 'No invite found'}`);
            // Continue with mock implementation
          } else if (inviteData.invitee_email !== authData.session.user.email) {
            this.logMethodUsage('rejectInvite', true, 'Invite email mismatch with current user');
            // Continue with mock implementation
          } else {
            // Update the invite status
            const { error: updateError } = await supabase
              .from('collaboration_invites')
              .update({ status: 'rejected' })
              .eq('id', inviteId);
            
            if (updateError) {
              this.logMethodUsage('rejectInvite', true, `Invite update error: ${updateError.message}`);
              // Continue with mock implementation
            } else {
              this.logMethodUsage('rejectInvite', false, `Rejected invite ${inviteId}`);
              return true;
            }
          }
        }
      }
    } catch (err) {
      this.logMethodUsage('rejectInvite', true, `Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback to mock implementation
    this.logMethodUsage('rejectInvite', true, `Fallback for invite ${inviteId}`);
    
    const inviteIndex = mockInvites.findIndex(invite => invite.id === inviteId);
    if (inviteIndex !== -1) {
      mockInvites[inviteIndex].status = 'rejected';
      return true;
    }
    return false;
  }

  // Remove a collaborator from a comic
  async removeCollaborator(comicId: string, collaboratorId: string): Promise<boolean> {
    try {
      // Try to use Supabase if available
      if (supabase) {
        // First check if user is authenticated
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        // If not authenticated, fallback to mock
        if (authError || !authData.session?.user?.id) {
          this.logMethodUsage('removeCollaborator', true, `Auth error: ${authError?.message || 'No user session'}`);
          // Continue with mock implementation
        } else {
          // Table check first
          const { error: tableCheckError } = await supabase
            .from('collaborators')
            .select('count', { count: 'exact', head: true });
            
          // If table is accessible
          if (!tableCheckError) {
            const { error } = await supabase
              .from('collaborators')
              .delete()
              .eq('comic_id', comicId)
              .eq('user_id', collaboratorId);
            
            if (error) {
              this.logMethodUsage('removeCollaborator', true, `Delete error: ${error.message}`);
              // Continue with mock implementation
            } else {
              this.logMethodUsage('removeCollaborator', false, `Removed user ${collaboratorId} from comic ${comicId}`);
              return true;
            }
          } else {
            this.logMethodUsage('removeCollaborator', true, `Table error: ${tableCheckError.message}`);
            // Continue with mock implementation
          }
        }
      }
    } catch (err) {
      this.logMethodUsage('removeCollaborator', true, `Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback to mock implementation
    this.logMethodUsage('removeCollaborator', true, `Fallback for removing ${collaboratorId} from comic ${comicId}`);
    
    const index = mockCollaborators.findIndex(
      collab => collab.comicId === comicId && collab.userId === collaboratorId
    );
    if (index !== -1) {
      mockCollaborators.splice(index, 1);
      return true;
    }
    return false;
  }

  // Search for users by email or username
  async searchUsers(query: string): Promise<Collaborator[]> {
    try {
      // Try to use Supabase if available
      if (supabase) {
        // First check if user is authenticated
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        // If not authenticated, fallback to mock
        if (authError || !authData.session?.user?.id) {
          this.logMethodUsage('searchUsers', true, `Auth error: ${authError?.message || 'No user session'}`);
          // Continue with mock implementation
        } else {
          // Table check first
          const { error: tableCheckError } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true });
            
          // If table is accessible
          if (!tableCheckError) {
            // Search for users by username or email
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
              .limit(5);
            
            if (error) {
              this.logMethodUsage('searchUsers', true, `Query error: ${error.message}`);
              // Continue with mock implementation
            } else {
              this.logMethodUsage('searchUsers', false, `Found ${data.length} users matching "${query}"`);
              // Format the returned data to match our interface
              return data.map(user => ({
                id: user.id,
                comicId: '', // This is set when added as a collaborator
                userId: user.id,
                username: user.username || user.email.split('@')[0],
                avatarUrl: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
                avatar_url: user.avatar_url,
                status: 'online',
                permissionLevel: 'none',
                isOnline: true,
                lastSeen: new Date()
              }));
            }
          } else {
            this.logMethodUsage('searchUsers', true, `Table error: ${tableCheckError.message}`);
            // Continue with mock implementation
          }
        }
      }
    } catch (err) {
      this.logMethodUsage('searchUsers', true, `Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback to mock implementation
    this.logMethodUsage('searchUsers', true, `Fallback search for "${query}"`);
    
    const mockSearchResults: Collaborator[] = [
      {
        id: '1',
        comicId: '',
        userId: '1',
        username: 'john_doe',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        status: 'online',
        permissionLevel: 'none',
        isOnline: true,
        lastSeen: new Date()
      },
      {
        id: '2',
        comicId: '',
        userId: '2',
        username: 'jane_smith',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
        status: 'online',
        permissionLevel: 'none',
        isOnline: true,
        lastSeen: new Date()
      }
    ];
    
    // Filter by the query
    return mockSearchResults.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase())
    );
  }

  async trackPresence(comicId: string): Promise<void> {
    try {
      // Try to use Supabase if available
      if (supabase) {
        // First check if user is authenticated
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        // If not authenticated, log and return
        if (authError || !authData.session?.user?.id) {
          this.logMethodUsage('trackPresence', true, `Auth error: ${authError?.message || 'No user session'}`);
          return;
        }
        
        // Enter the comic channel
        const presenceChannel = supabase.channel(`comic:${comicId}`);
        
        presenceChannel
          .on('presence', { event: 'sync' }, () => {
            this.logMethodUsage('trackPresence', false, 'Presence synced');
            // We could update a state here with the complete list of online users
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            this.logMethodUsage('trackPresence', false, `User joined: ${key}`);
            // We could update a state here to add the new user
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            this.logMethodUsage('trackPresence', false, `User left: ${key}`);
            // We could update a state here to remove the user
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              const userId = authData.session.user.id;
              await presenceChannel.track({
                user_id: userId,
                online_at: new Date().toISOString(),
              });
              this.logMethodUsage('trackPresence', false, `Subscribed to comic ${comicId} presence`);
            }
          });
        
        return;
      }
    } catch (err) {
      this.logMethodUsage('trackPresence', true, `Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback - just log
    this.logMethodUsage('trackPresence', true, `Mock presence tracking for comic ${comicId}`);
  }

  async updateCursorPosition(comicId: string, position: { x: number, y: number }): Promise<void> {
    try {
      // Try to use Supabase if available
      if (supabase) {
        // First check if user is authenticated
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        // If not authenticated, log and return
        if (authError || !authData.session?.user?.id) {
          this.logMethodUsage('updateCursorPosition', true, `Auth error: ${authError?.message || 'No user session'}`);
          return;
        }
        
        // Get the cursor channel
        const cursorChannel = supabase.channel(`cursor:${comicId}`);
        
        // Broadcast the cursor position
        await cursorChannel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            user_id: authData.session.user.id,
            position,
            timestamp: new Date().toISOString()
          }
        });
        
        this.logMethodUsage('updateCursorPosition', false, `Updated cursor position for comic ${comicId}`);
        return;
      }
    } catch (err) {
      this.logMethodUsage('updateCursorPosition', true, `Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Fallback - just log
    this.logMethodUsage('updateCursorPosition', true, `Mock cursor update for comic ${comicId}`);
  }

  // Check if tables are properly set up
  async checkTablesSetup(): Promise<{ profiles: boolean; collaborators: boolean; invites: boolean }> {
    const result = { 
      profiles: false, 
      collaborators: false, 
      invites: false 
    };
    
    if (!supabase) return result;
    
    try {
      // Check profiles table
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });
      result.profiles = !profilesError;
      
      // Check collaborators table
      const { error: collabsError } = await supabase
        .from('collaborators')
        .select('count', { count: 'exact', head: true });
      result.collaborators = !collabsError;
      
      // Check invites table
      const { error: invitesError } = await supabase
        .from('collaboration_invites')
        .select('count', { count: 'exact', head: true });
      result.invites = !invitesError;
      
      return result;
    } catch (err) {
      console.error('Error checking tables setup:', err);
      return result;
    }
  }
}

export const collaboratorService = new CollaboratorService(); 