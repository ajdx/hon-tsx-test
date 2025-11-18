import React, { useEffect, useState } from 'react';
import { mediaService } from '../utils/mediaService';

export const CloudinaryTester: React.FC = () => {
  const [uploadResult, setUploadResult] = useState<string>('');
  const [configResult, setConfigResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('');

  // Test the configuration
  const testConfig = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName) {
      setConfigResult('❌ VITE_CLOUDINARY_CLOUD_NAME is missing');
      return;
    }
    
    if (!uploadPreset) {
      setConfigResult('❌ VITE_CLOUDINARY_UPLOAD_PRESET is missing');
      return;
    }
    
    setConfigResult('✅ Configuration looks good - API key is server-side only for security');
  };

  // Function to upload using mediaService (secure proxy)
  const uploadWithSecureProxy = async (file: File) => {
    setIsLoading(true);
    setUploadResult('Uploading via secure proxy...');
    
    try {
      const url = await mediaService.upload(file);
      setUploadResult(`✅ Secure upload successful: ${url}`);
    } catch (error) {
      setUploadResult(`❌ Secure upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy direct upload function (for testing purposes only - NOT recommended for production)
  const tryDirectUpload = async (file: File, preset: string) => {
    setIsLoading(true);
    setActivePreset(preset);
    setUploadResult(`Testing direct upload with preset: ${preset}...`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', preset);
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setUploadResult(`⚠️ Direct upload with preset ${preset} successful: ${data.secure_url} (NOT secure for production)`);
      } else {
        const errorData = await response.text();
        setUploadResult(`❌ Direct upload with preset ${preset} failed (${response.status}): ${errorData}`);
      }
    } catch (error) {
      setUploadResult(`❌ Error with preset ${preset}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      setActivePreset('');
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h2 className="text-2xl font-bold mb-4">Cloudinary Configuration Tester</h2>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Configuration</h3>
        <div className="mb-2 p-3 bg-gray-100 rounded">
          <p>Cloud Name: <code>{import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'Not set'}</code></p>
          <p>Upload Preset: <code>{import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'Not set'}</code></p>
          <p>API Key: <code>🔒 Server-side only (secure)</code></p>
        </div>
        <div className="p-3 bg-gray-100 rounded">
          <p>Configuration Test Result: <span className={configResult.includes('✅') ? 'text-green-600' : 'text-red-600'}>{configResult}</span></p>
        </div>
        <button 
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50" 
          onClick={testConfig}
          disabled={isLoading}
        >
          Test Configuration
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">🔒 Secure Upload Test (Recommended)</h3>
        <p className="text-sm text-gray-600 mb-3">This uses the secure proxy endpoint that keeps your API key safe on the server.</p>
        <input 
          type="file" 
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              uploadWithSecureProxy(file);
            }
          }}
          disabled={isLoading}
          className="mb-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">⚠️ Direct Upload Test (Development Only)</h3>
        <p className="text-sm text-red-600 mb-3">These bypass the secure proxy and may fail due to CORS or missing API keys. Only for testing unsigned presets.</p>
        
        <input 
          type="file" 
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const testPresets = ['unsigned_upload', 'ml_default'];
              testPresets.forEach(preset => {
                setTimeout(() => tryDirectUpload(file, preset), 100);
              });
            }
          }}
          disabled={isLoading}
          className="mb-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
        />
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Upload Results</h3>
        <div className="p-3 bg-gray-100 rounded min-h-[60px]">
          <pre className="whitespace-pre-wrap text-sm">{uploadResult || 'No upload attempted yet'}</pre>
        </div>
      </div>

      {isLoading && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">
            {activePreset ? `Testing ${activePreset}...` : 'Processing...'}
          </p>
        </div>
      )}
    </div>
  );
}; 