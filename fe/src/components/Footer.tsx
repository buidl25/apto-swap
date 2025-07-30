
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer style={{ padding: '20px', borderTop: '1px solid #ccc', textAlign: 'center', marginTop: '20px' }}>
      <p>&copy; 2025 Cross-Chain Swap. All rights reserved.</p>
      <div style={{ marginTop: '10px' }}>
        <a href="#" style={{ margin: '0 10px' }}>Privacy Policy</a>
        <a href="#" style={{ margin: '0 10px' }}>Terms of Service</a>
        <a href="#" style={{ margin: '0 10px' }}>Support</a>
      </div>
    </footer>
  );
};

export default Footer;
