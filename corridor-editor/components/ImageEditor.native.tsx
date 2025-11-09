
import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GoogleGenerativeAI } from '@google/generative-ai';

const ImageEditor: React.FC<{ lineColor: string }> = ({ lineColor }) => {
    const [originalImage, setOriginalImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    const handleImageUpload = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please grant permission to access the photo library.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
            base64: true, // We need base64 data for the API
        });

        if (!result.canceled) {
            setOriginalImage(result.assets[0]);
            setEditedImage(null);
        }
    };

    const generateEditedImage = async (editPrompt: string) => {
        if (!originalImage?.base64) {
            Alert.alert('Error', 'Please upload an image first.');
            return;
        }
        if (!apiKey) {
            Alert.alert('Error', 'API key is not configured. This feature is disabled.');
            return;
        }

        setIsLoading(true);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            // NOTE: Gemini API for image editing is not directly available in the same way.
            // This is a conceptual implementation using a generative model.
            // The actual model name and request format might differ for pure image editing.
            const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

            const imagePart = {
                inlineData: {
                    data: originalImage.base64,
                    mimeType: originalImage.mimeType || 'image/jpeg',
                },
            };

            const result = await model.generateContent([editPrompt, imagePart]);
            const response = await result.response;
            // Assuming the model responds with text that might contain an image URL or description.
            // Direct image generation in response is not a standard feature of gemini-pro-vision.
            // This part of the code is illustrative and may need a different model (e.g., a dedicated image editing API).
            Alert.alert("AI Response", response.text());

        } catch (e) {
            console.error('Error editing image with Gemini:', e);
            Alert.alert('Error', 'An error occurred while editing the image.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Image Studio</Text>
            <View style={styles.imageContainer}>
                <Image 
                    source={{ uri: originalImage?.uri || undefined }} 
                    style={styles.image} 
                    resizeMode="contain"
                />
            </View>
            <Button title="Upload Image" onPress={handleImageUpload} color={lineColor} />
            
            {originalImage && (
                <View style={{marginTop: 20}}>
                   <Text style={styles.title}>Edited Image will appear here</Text>
                   {isLoading && <ActivityIndicator size="large" color={lineColor} />}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 10, alignItems: 'center' },
    title: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    imageContainer: { width: 200, height: 150, backgroundColor: '#333', marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: '100%' }
});

export default ImageEditor;
