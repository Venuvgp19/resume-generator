'use client';

import { useState } from 'react';
import { Camera, Upload, X, CheckCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function PhotoUploader() {
  const { resumeData, setResumeData, setActiveTab } = useApp();
  const [preview, setPreview] = useState<string>(resumeData?.personalInfo?.photo || '');

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      if (resumeData) {
        setResumeData({
          ...resumeData,
          personalInfo: { ...resumeData.personalInfo, photo: base64 },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Camera className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Candidate Photo</h2>
        </div>
        <p className="text-gray-500">
          Optional. Upload a professional headshot. It will appear on the resume preview and PDF export.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-white hover:border-blue-400 transition"
      >
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {preview ? (
          <div className="relative inline-block">
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 shadow"
            />
            <button
              onClick={() => {
                setPreview('');
                if (resumeData) {
                  setResumeData({
                    ...resumeData,
                    personalInfo: { ...resumeData.personalInfo, photo: undefined },
                  });
                }
              }}
              className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label htmlFor="photo-upload" className="cursor-pointer block">
            <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="font-medium text-gray-700">Drag & drop or click to upload photo</p>
            <p className="text-sm text-gray-400 mt-1">JPG, PNG up to 5MB</p>
          </label>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('job')}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
        >
          Back
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
