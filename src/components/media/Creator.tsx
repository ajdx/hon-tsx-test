import React from 'react';
import { useMediaService } from '../../hooks/useMedia';

export const Creator: React.FC = () => {
  const { uploadMedia } = useMediaService();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const url = await uploadMedia(file);
        console.log('Uploaded:', url);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Create Comic</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Upload Pages</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-500 file:text-white
                  hover:file:bg-blue-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};