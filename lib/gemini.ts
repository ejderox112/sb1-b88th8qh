import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  async getDirections(from: string, to: string, floor: number): Promise<string> {
    const prompt = `
    Bir ${floor}. katta ${from} konumundan ${to} konumuna nasıl gidileceği hakkında kısa ve net yön tarifi ver.
    Türkçe olarak, maksimum 2-3 cümle ile açıkla.
    Örnek: "Asansörden çıktıktan sonra sağa dönün ve 50 metre düz gidin. Mağaza sol tarafınızda olacak."
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API hatası:', error);
      return 'Yön tarifi şu anda kullanılamıyor.';
    }
  }

  async suggestPOIName(type: string, description: string): Promise<string> {
    const prompt = `
    Bir ${type} için uygun bir isim öner. Açıklama: ${description}
    Sadece ismi ver, başka açıklama yapma. Türkçe olsun.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Gemini API hatası:', error);
      return `Yeni ${type}`;
    }
  }
}