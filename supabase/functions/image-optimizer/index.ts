// Edge Function: Otomatik Resim Sıkıştırma ve Boyutlandırma
// Bu fonksiyon dosya yüklendiğinde otomatik çalışır

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Sharp alternatifi: ImageMagick kullanımı (Deno için)
// Veya deno-image kütüphanesi
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts"

serve(async (req) => {
  try {
    const { record } = await req.json()
    
    // Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Dosya bilgilerini al
    const { id: fileId, name, bucket_id, metadata } = record
    
    // Sadece resim dosyalarını işle
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const mimeType = metadata?.mimetype
    
    if (!imageTypes.includes(mimeType)) {
      console.log(`Skipping non-image file: ${name}`)
      return new Response(JSON.stringify({ message: 'Not an image' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing image: ${name} (${mimeType})`)

    // Orijinal dosyayı indir
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from(bucket_id)
      .download(name)

    if (downloadError) throw downloadError

    // ArrayBuffer'a çevir
    const arrayBuffer = await fileData.arrayBuffer()
    const originalImage = await Image.decode(new Uint8Array(arrayBuffer))

    // BOYUTLANDIRMA STRATEJI
    const compressionStrategy = getCompressionStrategy(metadata?.upload_type || 'general')
    
    // Yeniden boyutlandır
    let resizedImage = originalImage
    if (originalImage.width > compressionStrategy.maxWidth || originalImage.height > compressionStrategy.maxHeight) {
      resizedImage = originalImage.resize(compressionStrategy.maxWidth, compressionStrategy.maxHeight)
    }

    // WebP'ye çevir (en iyi sıkıştırma)
    const compressedBuffer = await resizedImage.encodeWebP(compressionStrategy.quality)

    // Yeni dosya adı (webp uzantılı)
    const newFileName = name.replace(/\.(jpg|jpeg|png)$/i, '.webp')
    const compressedPath = `compressed/${newFileName}`

    // Sıkıştırılmış dosyayı yükle
    const { error: uploadError } = await supabase
      .storage
      .from(bucket_id)
      .upload(compressedPath, compressedBuffer, {
        contentType: 'image/webp',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Orijinal dosyayı sil (opsiyonel - yer tasarrufu için)
    if (compressionStrategy.deleteOriginal) {
      await supabase.storage.from(bucket_id).remove([name])
    }

    // File_uploads tablosunu güncelle
    await supabase
      .from('file_uploads')
      .update({
        storage_path: compressedPath,
        file_size: compressedBuffer.length,
        file_type: 'image/webp',
        metadata: {
          ...metadata,
          original_size: arrayBuffer.byteLength,
          compressed_size: compressedBuffer.length,
          compression_ratio: (1 - compressedBuffer.length / arrayBuffer.byteLength) * 100,
          original_dimensions: { width: originalImage.width, height: originalImage.height },
          compressed_dimensions: { width: resizedImage.width, height: resizedImage.height }
        }
      })
      .eq('file_hash', metadata?.file_hash)

    const compressionRatio = ((1 - compressedBuffer.length / arrayBuffer.byteLength) * 100).toFixed(2)

    console.log(`✅ Image optimized: ${name}`)
    console.log(`📊 Original: ${(arrayBuffer.byteLength / 1024).toFixed(2)}KB → Compressed: ${(compressedBuffer.length / 1024).toFixed(2)}KB`)
    console.log(`🎯 Compression: ${compressionRatio}%`)

    return new Response(JSON.stringify({
      success: true,
      original_size: arrayBuffer.byteLength,
      compressed_size: compressedBuffer.length,
      compression_ratio: `${compressionRatio}%`,
      new_path: compressedPath
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error processing image:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// Sıkıştırma stratejisi
function getCompressionStrategy(uploadType: string) {
  const strategies = {
    avatar: {
      maxWidth: 400,
      maxHeight: 400,
      quality: 80,
      deleteOriginal: true // Orijinali sil
    },
    task_photo: {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 75,
      deleteOriginal: true
    },
    venue_photo: {
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 80,
      deleteOriginal: true
    },
    blueprint: {
      maxWidth: 2000,
      maxHeight: 2000,
      quality: 85,
      deleteOriginal: false // Orijinali sakla (önemli)
    },
    general: {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 75,
      deleteOriginal: true
    }
  }

  return strategies[uploadType as keyof typeof strategies] || strategies.general
}
