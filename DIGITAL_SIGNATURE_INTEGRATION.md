# Digital Signature Template Integration Guide

## Overview
All signature uploads have been replaced with automatic digital signature template generation. Users no longer need to upload signature images manually.

## For Developers: How to Use Digital Signatures

### 1. Replace Signature Upload Components

**Old way (manual upload):**
```tsx
<Upload>
  <Button>Upload Signature</Button>
</Upload>
```

**New way (automatic template):**
```tsx
import AutoSignature from '@/components/AutoSignature';

<AutoSignature
  onSignatureGenerated={(url) => {
    // Use the signature URL
    setSignatureUrl(url);
  }}
  onSignatureFile={(file) => {
    // Use the signature file for form uploads
    setSignatureFile(file);
  }}
  buttonText="Generate My Signature"
/>
```

### 2. Using the Hook Directly

```tsx
import { useDigitalSignature } from '@/features/user/hooks/useDigitalSignature';

const MyComponent = () => {
  const { generateSignature, loading } = useDigitalSignature();
  
  const handleSign = async () => {
    const signatureUrl = await generateSignature();
    if (signatureUrl) {
      // Use the signature URL in your document
      console.log('Signature generated:', signatureUrl);
    }
  };
  
  return (
    <Button loading={loading} onClick={handleSign}>
      Sign Document
    </Button>
  );
};
```

### 3. Backend API Endpoints

- **Generate signature**: `POST /authentication/signature/generate/`
- **Get template info**: `GET /authentication/signature/template/data/`
- **Create template**: `POST /authentication/signature/template/create/`
- **Regenerate template**: `PUT /authentication/signature/template/regenerate/`

### 4. Template Features

- ✅ **50% logo transparency** (configurable)
- ✅ **Automatic date/time filling**
- ✅ **Professional Adobe DSC-style layout**
- ✅ **Company branding integration**
- ✅ **No manual uploads required**

## What Was Changed

1. **Backend**: All existing signature uploads replaced with template-generated signatures
2. **Frontend**: New `AutoSignature` component and `useDigitalSignature` hook
3. **Templates**: Configurable logo transparency (currently set to 50%)
4. **Automation**: Templates auto-created when users complete their profiles

## Migration Status

- ✅ **49 user signatures** replaced with template-generated versions
- ✅ **23 admin signatures** using template system
- ✅ **Logo transparency** fixed at 50%
- ✅ **Frontend components** ready for integration

## Next Steps for Developers

1. **Replace signature upload forms** with `AutoSignature` component
2. **Update document signing flows** to use `useDigitalSignature` hook
3. **Remove old signature upload fields** from forms
4. **Test signature generation** in your modules

## Example Integration

```tsx
// In your document signing component
import AutoSignature from '@/components/AutoSignature';

const DocumentSigningForm = () => {
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  
  return (
    <Form>
      {/* Other form fields */}
      
      <Form.Item label="Digital Signature">
        <AutoSignature
          onSignatureFile={setSignatureFile}
          buttonText="Sign This Document"
        />
      </Form.Item>
      
      <Button 
        type="primary" 
        disabled={!signatureFile}
        onClick={() => submitFormWithSignature(signatureFile)}
      >
        Submit Document
      </Button>
    </Form>
  );
};
```

This ensures consistent, professional digital signatures across the entire Athens EHS system.