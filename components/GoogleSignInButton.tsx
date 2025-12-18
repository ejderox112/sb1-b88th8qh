import React, { useEffect, useState } from 'react';
import { View, Text, Button, Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { getClientIdForPlatform } from '../lib/googleConfig';

export default function GoogleSignInButton() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const clientId = getClientIdForPlatform();

  useEffect(() => {
    if (!clientId) {
      setErrorMsg(
        Platform.OS === 'android'
          ? 'Android için Google Client ID yapılandırılmadı. `.env.local` veya app.json.extra içine ekleyin.'
          : 'Google Web/iOS Client ID yapılandırılmadı.'
      );
    } else {
      setErrorMsg(null);
    }
  }, [clientId]);

  const redirectUri = makeRedirectUri({ useProxy: true });
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: clientId ?? undefined,
    redirectUri,
  });

  useEffect(() => {
    try {
      const proxyUri = makeRedirectUri({ useProxy: true, projectNameForProxy: 'bolt-expo-nativewind' });
      const noProxyUri = makeRedirectUri({ useProxy: false });
      console.log('[AuthDebug] Google redirectUri (proxy)=', proxyUri);
      console.log('[AuthDebug] Google redirectUri (no proxy)=', noProxyUri);
    } catch (e) {
      console.warn('[AuthDebug] Failed to compute redirect URIs', e);
    }
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      // handle success (exchange code / get token)
      // left as an exercise to the app flow (supabase/auth etc.)
    }
  }, [response]);

  return (
    <View>
      {errorMsg ? <Text style={{ color: 'red', marginBottom: 8 }}>{errorMsg}</Text> : null}
      <Button
        title="Google ile Giriş"
        onPress={() => {
          if (!clientId) {
            setErrorMsg('Google client ID eksik — yapılandırın.');
            return;
          }
          promptAsync();
        }}
        disabled={!clientId}
      />
    </View>
  );
}
