import React from 'react';
import DigitalSignature from './components/DigitalSignature';

const App: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h3>Digital Signature Examples</h3>
      
      {/* Basic signature */}
      <DigitalSignature 
        signerName="John Smith"
        date="2024.12.21"
        time="14:30:15"
        timezone="UTC+05:30"
      />
      
      <br />
      
      {/* Signature with custom text */}
      <DigitalSignature 
        signerName="Jane Doe"
        signedBy="Digitally signed by"
        date="2024.12.21"
        time="14:35:22"
      />
    </div>
  );
};

export default App;