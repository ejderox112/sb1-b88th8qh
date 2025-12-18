import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';

interface NotificationSettings {
  friend_requests: boolean;
  friend_accepted: boolean;
  chat_messages: boolean;
  group_invites: boolean;
  task_completed: boolean;
  level_up: boolean;
  badge_earned: boolean;
}

export default function NotificationSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState<NotificationSettings>({
    friend_requests: true,
    friend_accepted: true,
    chat_messages: true,
    group_invites: true,
    task_completed: true,
    level_up: true,
    badge_earned: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: me } = await supabase.auth.getUser();
    if (!me?.user?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', me.user.id)
      .single();

    if (error) {
      // Varsayılan ayarlarla oluştur
      if (error.code === 'PGRST116') {
        await supabase.from('notification_settings').insert({
          user_id: me.user.id,
          ...settings,
        });
      }
      setLoading(false);
      return;
    }

    if (data) {
      setSettings({
        friend_requests: data.friend_requests ?? true,
        friend_accepted: data.friend_accepted ?? true,
        chat_messages: data.chat_messages ?? true,
        group_invites: data.group_invites ?? true,
        task_completed: data.task_completed ?? true,
        level_up: data.level_up ?? true,
        badge_earned: data.badge_earned ?? true,
      });
    }
    setLoading(false);
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    const { data: me } = await supabase.auth.getUser();
    if (!me?.user?.id) return;

    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: me.user.id,
        [key]: value,
      });

    if (error) {
      console.error('Ayar kaydedilemedi:', error);
      setMessage('❌ Ayar kaydedilemedi');
      // Geri al
      setSettings((prev) => ({ ...prev, [key]: !value }));
    } else {
      setMessage('✅ Ayar kaydedildi');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    const { data: me } = await supabase.auth.getUser();
    if (!me?.user?.id) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: me.user.id,
        ...settings,
      });

    if (error) {
      setMessage('❌ Ayarlar kaydedilemedi: ' + error.message);
    } else {
      setMessage('✅ Tüm ayarlar kaydedildi!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  };

  const toggleAll = (value: boolean) => {
    setSettings({
      friend_requests: value,
      friend_accepted: value,
      chat_messages: value,
      group_invites: value,
      task_completed: value,
      level_up: value,
      badge_earned: value,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Ayarlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Bildirim Ayarları</Text>
        <Text style={styles.subtitle}>
          Hangi olaylar için bildirim almak istediğinizi seçin
        </Text>
      </View>

      {message ? (
        <View style={[styles.message, message.includes('✅') ? styles.successMsg : styles.errorMsg]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickBtn, styles.enableAll]}
          onPress={() => toggleAll(true)}
        >
          <Text style={styles.quickBtnText}>✓ Tümünü Aç</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, styles.disableAll]}
          onPress={() => toggleAll(false)}
        >
          <Text style={styles.quickBtnText}>✗ Tümünü Kapat</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Arkadaşlık</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Arkadaşlık İstekleri</Text>
            <Text style={styles.settingDesc}>
              Yeni arkadaşlık isteği geldiğinde bildir
            </Text>
          </View>
          <Switch
            value={settings.friend_requests}
            onValueChange={(val) => updateSetting('friend_requests', val)}
            trackColor={{ false: '#ccc', true: '#28a745' }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>İstek Kabul Edildi</Text>
            <Text style={styles.settingDesc}>
              Arkadaşlık isteğiniz kabul edildiğinde bildir
            </Text>
          </View>
          <Switch
            value={settings.friend_accepted}
            onValueChange={(val) => updateSetting('friend_accepted', val)}
            trackColor={{ false: '#ccc', true: '#28a745' }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💬 Sohbet</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Yeni Mesajlar</Text>
            <Text style={styles.settingDesc}>
              Size yeni mesaj geldiğinde bildir
            </Text>
          </View>
          <Switch
            value={settings.chat_messages}
            onValueChange={(val) => updateSetting('chat_messages', val)}
            trackColor={{ false: '#ccc', true: '#28a745' }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Grup</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Grup Davetleri</Text>
            <Text style={styles.settingDesc}>
              Gruba davet edildiğinizde bildir
            </Text>
          </View>
          <Switch
            value={settings.group_invites}
            onValueChange={(val) => updateSetting('group_invites', val)}
            trackColor={{ false: '#ccc', true: '#28a745' }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎮 Görev & İlerleme</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Görev Tamamlandı</Text>
            <Text style={styles.settingDesc}>
              Görev tamamladığınızda bildir
            </Text>
          </View>
          <Switch
            value={settings.task_completed}
            onValueChange={(val) => updateSetting('task_completed', val)}
            trackColor={{ false: '#ccc', true: '#28a745' }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Seviye Atlama</Text>
            <Text style={styles.settingDesc}>
              Yeni seviyeye ulaştığınızda bildir
            </Text>
          </View>
          <Switch
            value={settings.level_up}
            onValueChange={(val) => updateSetting('level_up', val)}
            trackColor={{ false: '#ccc', true: '#28a745' }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Rozet Kazanıldı</Text>
            <Text style={styles.settingDesc}>
              Yeni rozet kazandığınızda bildir
            </Text>
          </View>
          <Switch
            value={settings.badge_earned}
            onValueChange={(val) => updateSetting('badge_earned', val)}
            trackColor={{ false: '#ccc', true: '#28a745' }}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={saveAll}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>
          {saving ? '⏳ Kaydediliyor...' : '💾 Tüm Ayarları Kaydet'}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ℹ️ Bildirimler gerçek zamanlı olarak görünür. Ayarlarınız otomatik kaydedilir.
        </Text>
      </View>
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
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  message: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  successMsg: {
    backgroundColor: '#d4edda',
  },
  errorMsg: {
    backgroundColor: '#f8d7da',
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  enableAll: {
    backgroundColor: '#28a745',
  },
  disableAll: {
    backgroundColor: '#6c757d',
  },
  quickBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
    color: '#6c757d',
  },
  saveBtn: {
    margin: 16,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#ccc',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    paddingTop: 0,
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
