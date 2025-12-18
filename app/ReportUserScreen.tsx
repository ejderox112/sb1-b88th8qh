import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const REPORT_CATEGORIES = [
  { value: 'harassment', label: '😡 Taciz', desc: 'Rahatsız edici, taciz içerikli davranış' },
  { value: 'offensive_language', label: '🤬 Küfür/Hakaret', desc: 'Küfür, hakaret, aşağılayıcı dil' },
  { value: 'spam', label: '📧 Spam', desc: 'İstenmeyen tekrarlı mesajlar' },
  { value: 'threat', label: '⚠️ Tehdit', desc: 'Tehdit, şiddet içerikli mesajlar' },
  { value: 'inappropriate_content', label: '🔞 Uygunsuz İçerik', desc: 'Cinsel, şiddet içerikli paylaşım' },
  { value: 'fake_profile', label: '👤 Sahte Profil', desc: 'Kimliğe bürünme, sahte hesap' },
  { value: 'impersonation', label: '🎭 Kimliğe Bürünme', desc: 'Başkası gibi davranma' },
  { value: 'other', label: '📝 Diğer', desc: 'Yukarıdakilerin dışında' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: '🟢 Düşük', color: '#28a745' },
  { value: 'medium', label: '🟡 Orta', color: '#ffc107' },
  { value: 'high', label: '🟠 Yüksek', color: '#fd7e14' },
  { value: 'critical', label: '🔴 Kritik', color: '#dc3545' },
];

export default function ReportUserScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const reportedUserId = params.userId as string;
  const reportedUserName = params.userName as string;
  
  const [category, setCategory] = useState<string>('');
  const [severity, setSeverity] = useState<string>('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submitReport = async () => {
    if (!category) {
      setMessage('❌ Lütfen şikayet kategorisi seçin');
      return;
    }

    if (!description.trim()) {
      setMessage('❌ Lütfen şikayet detayını yazın');
      return;
    }

    if (description.trim().length < 20) {
      setMessage('❌ Şikayet detayı en az 20 karakter olmalı');
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData?.user) {
        setMessage('❌ Giriş yapmalısınız');
        setLoading(false);
        return;
      }

      // Kendi kendini şikayet edemez
      if (userData.user.id === reportedUserId) {
        setMessage('❌ Kendinizi şikayet edemezsiniz');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: userData.user.id,
          reported_user_id: reportedUserId,
          report_category: category,
          description: description.trim(),
          severity: severity,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('24 saat içinde en fazla 3 kez')) {
          setMessage('⏳ Bu kullanıcıyı 24 saat içinde en fazla 3 kez şikayet edebilirsiniz');
        } else {
          setMessage('❌ Şikayet gönderilemedi: ' + error.message);
        }
        setLoading(false);
        return;
      }

      Alert.alert(
        '✅ Şikayet Gönderildi',
        'Şikayetiniz adminlerimiz tarafından incelenecek. Geri dönüş için bildirim alacaksınız.',
        [
          {
            text: 'Tamam',
            onPress: () => router.back(),
          },
        ]
      );

      setLoading(false);
    } catch (error) {
      setMessage('❌ Beklenmeyen hata: ' + (error as Error).message);
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚨 Kullanıcı Şikayeti</Text>
        <Text style={styles.subtitle}>
          Şikayet Edilen: {reportedUserName || 'Bilinmeyen'}
        </Text>
      </View>

      {message ? (
        <View style={[
          styles.messageBox,
          message.includes('✅') ? styles.successBox : styles.errorBox
        ]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>Şikayet Kategorisi *</Text>
        <View style={styles.categoryGrid}>
          {REPORT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryCard,
                category === cat.value && styles.categoryCardActive,
              ]}
              onPress={() => setCategory(cat.value)}
            >
              <Text
                style={[
                  styles.categoryLabel,
                  category === cat.value && styles.categoryLabelActive,
                ]}
              >
                {cat.label}
              </Text>
              <Text style={styles.categoryDesc}>{cat.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Öncelik Seviyesi</Text>
        <View style={styles.severityRow}>
          {SEVERITY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.severityBtn,
                severity === level.value && {
                  backgroundColor: level.color,
                  borderColor: level.color,
                },
              ]}
              onPress={() => setSeverity(level.value)}
            >
              <Text
                style={[
                  styles.severityText,
                  severity === level.value && styles.severityTextActive,
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Şikayet Detayı * (Min 20 karakter)</Text>
        <TextInput
          style={[styles.textArea]}
          placeholder="Ne oldu? Detaylı açıklayın. Mesajlar, davranışlar, tarih/saat vb."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={8}
          maxLength={1000}
        />
        <Text style={styles.charCount}>{description.length}/1000</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Bilgilendirme</Text>
        <Text style={styles.infoText}>
          • Şikayetiniz 24-48 saat içinde incelenir{'\n'}
          • Yalan şikayet yaparsanız hesabınız kısıtlanabilir{'\n'}
          • Aynı kullanıcıyı 24 saatte en fazla 3 kez şikayet edebilirsiniz{'\n'}
          • Sonuç hakkında bildirim alacaksınız
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={submitReport}
        disabled={loading}
      >
        <Text style={styles.submitBtnText}>
          {loading ? '⏳ Gönderiliyor...' : '📨 Şikayeti Gönder'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelBtnText}>İptal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#dc3545',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  messageBox: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryGrid: {
    gap: 12,
  },
  categoryCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  categoryCardActive: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  categoryLabelActive: {
    color: '#dc3545',
  },
  categoryDesc: {
    fontSize: 12,
    color: '#666',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  severityBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  severityText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: '#666',
  },
  severityTextActive: {
    color: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0d47a1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1565c0',
    lineHeight: 20,
  },
  submitBtn: {
    margin: 16,
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    marginHorizontal: 16,
    marginBottom: 30,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
