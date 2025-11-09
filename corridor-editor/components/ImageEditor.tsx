
import React, { useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

const LoadingSpinner = () => (
    <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center rounded-md">
        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
    </div>
);

const ImageEditor: React.FC<{ lineColor: string }> = ({ lineColor }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File, base64: string } | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setOriginalImage({ file, base64: reader.result as string });
                setEditedImage(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const generateEditedImage = async (editPrompt: string) => {
        if (!originalImage) {
            setError('Please upload an image first.');
            return;
        }
        if (!process.env.API_KEY) {
            setError('API key is not configured. This feature is disabled.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Data = originalImage.base64.split(',')[1];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: originalImage.file.type } },
                        { text: editPrompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            
            let foundImage = false;
            if (response.candidates && response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        const base64ImageBytes: string = part.inlineData.data;
                        const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                        setEditedImage(imageUrl);
                        foundImage = true;
                        break;
                    }
                }
            }

            if (!foundImage) {
                setError('The model did not return an image. Try a different prompt.');
            }

        } catch (e) {
            console.error('Error editing image with Gemini:', e);
            setError('An error occurred while editing the image. Please check the console for details.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCustomEdit = () => {
        if (!prompt.trim()) {
            setError('Please provide an editing instruction.');
            return;
        }
        generateEditedImage(prompt);
    };

    const handleAutoEnhance = () => {
        const autoPrompt = "Auto-enhance this image: improve lighting, color balance, and sharpness for a more professional and vibrant look, while keeping the result natural.";
        setPrompt(autoPrompt); // Set the prompt in the textarea so user sees what's happening
        generateEditedImage(autoPrompt);
    };

    return (
        <div className="animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-300 mb-2">Image Studio</h2>
            <div className="p-4 bg-gray-900/50 rounded-md border border-gray-600 space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <h3 className="text-sm font-semibold text-gray-400 mb-2 text-center">Original</h3>
                        {originalImage ? (
                            <img src={originalImage.base64} alt="Original" className="w-full h-auto rounded-md object-contain max-h-64 bg-black/20" />
                        ) : (
                            <div className="w-full h-48 bg-gray-800 rounded-md flex items-center justify-center text-gray-500 text-center p-4">
                                Upload an image to start
                            </div>
                        )}
                    </div>
                     <div className="relative">
                        <h3 className="text-sm font-semibold text-gray-400 mb-2 text-center">Edited</h3>
                        <div className="w-full h-48 bg-gray-800 rounded-md flex items-center justify-center text-gray-500 text-center p-4 overflow-hidden">
                        {editedImage ? (
                             <img src={editedImage} alt="Edited" className="w-full h-full rounded-md object-contain" />
                        ) : (
                            <span>Your edited image will appear here</span>
                        )}
                        </div>
                        {isLoading && <LoadingSpinner />}
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <div>
                        <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-1">1. Upload Image</label>
                        <input
                            id="image-upload"
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleImageUpload}
                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-800/50 file:text-blue-300 hover:file:bg-blue-800/80 cursor-pointer"
                        />
                    </div>

                    <div>
                        <label htmlFor="edit-prompt" className="block text-sm font-medium text-gray-300 mb-1">2. Describe Your Edit</label>
                        <textarea
                            id="edit-prompt"
                            rows={3}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Add a retro filter, make the sky purple..."
                            className="w-full p-2 bg-gray-800 rounded-md border border-gray-500 focus:ring-2 focus:outline-none focus:border-current"
                            style={{color: lineColor, '--tw-ring-color': lineColor} as React.CSSProperties}
                            disabled={!originalImage || isLoading}
                        />
                    </div>
                    
                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleAutoEnhance}
                            disabled={!originalImage || isLoading}
                            className="w-full p-3 bg-indigo-800/50 hover:bg-indigo-800/80 border border-indigo-600 rounded-md text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Auto-enhance the image with a single click"
                        >
                            ✨ Auto-Enhance
                        </button>
                        <button
                            onClick={handleCustomEdit}
                            disabled={!originalImage || !prompt.trim() || isLoading}
                            className="w-full p-3 bg-green-800/50 hover:bg-green-800/80 border border-green-600 rounded-md text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Editing...' : 'Apply Edit'}
                        </button
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;
