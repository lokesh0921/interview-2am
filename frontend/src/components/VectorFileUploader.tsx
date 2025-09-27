import { useState, useRef } from "react";
import { useSupabase } from "../supabase/SupabaseProvider";
import { apiFetch } from "../lib/api";
import { Button } from "./ui/button";
import { useToast } from "../hooks/use-toast";

interface VectorFileUploaderProps {
  onUploadSuccess?: (result: any) => void;
  onUploadError?: (error: string) => void;
}

export default function VectorFileUploader({
  onUploadSuccess,
  onUploadError,
}: VectorFileUploaderProps) {
  const { session } = useSupabase();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // Only handle single file upload for now
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    if (!session) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await apiFetch("/vector-search/upload", {
        method: "POST",
        body: formData,
      });

      toast({
        title: "Upload Successful",
        description: `File "${file.name}" has been uploaded and processed successfully`,
      });

      onUploadSuccess?.(result.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      console.error("Upload error:", error);

      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });

      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.tiff"
          onChange={handleFileInputChange}
          disabled={isUploading}
        />

        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isUploading ? "Uploading and processing..." : "Upload Document"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isUploading
                ? "Please wait while we process your document with AI"
                : "Drag and drop your document here, or click to browse"}
            </p>
          </div>

          {!isUploading && (
            <Button onClick={openFileDialog} className="mt-4">
              Choose File
            </Button>
          )}

          <div className="text-xs text-gray-400 dark:text-gray-500">
            <p>Supported formats: PDF, DOCX, TXT, Images (JPEG, PNG, TIFF)</p>
            <p>Maximum file size: 50MB</p>
          </div>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Processing document with AI...</span>
          </div>
        </div>
      )}
    </div>
  );
}
