import React from 'react';
import { WalletButton } from '../wallet/WalletButton';
import './LoginDropdown.css';
import { useAuth } from '../../contexts/AuthContext';

interface LoginDropdownProps {
  isNavbar?: boolean;
}

export const LoginDropdown: React.FC<LoginDropdownProps> = ({ isNavbar = false }) => {
  // Try to access auth but handle if not available
  let auth: any = { isAuthenticated: false, user: null };
  try {
    auth = useAuth();
  } catch (error) {
    console.log('Auth context not available in dropdown');
  }
  
  const { isAuthenticated, user } = auth;

  // Display username if available, otherwise don't show anything as the wallet button will show the address
  const authDisplayName = user?.username || '';

  return (
    <div className={`login-dropdown ${isNavbar ? 'navbar' : ''}`}>
      <div className="login-options">
        {isAuthenticated ? (
          <div className="auth-info">
            {authDisplayName && <span className="username">{authDisplayName}</span>}
            <WalletButton />
          </div>
        ) : (
          <WalletButton />
        )}
      </div>
    </div>
  );
};

export default LoginDropdown; 