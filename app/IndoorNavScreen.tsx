import { useMemo, useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import IndoorChatScreen from './IndoorChatScreen';
import AddFriendScreen from './AddFriendScreen';
import { TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, Alert } from 'react-native';
import { findRoute } from '@/lib/indoor/pathfinder';
import { getNearbyDoorSigns } from '@/lib/indoor/signage';
import { getActiveVenue, getDoorSigns } from '@/lib/indoor/store';
import { notifyFriendAccepted } from '@/lib/notifications';

interface FriendRequest {
  id: string;
  requester_id: string;
  created_at: string;
  requester?: {
    nickname: string;
    email?: string;
    user_code?: string;
  };
}

function FriendRequestsSection() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchRequests = async () => {
    const { data: me } = await supabase.auth.getUser();
    if (!me?.user?.id) return;

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        requester_id,
        created_at,
        requester:user_profiles!requester_id(nickname, email, user_code)
      `)
      .eq('receiver_id', me.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('İstek yükleme hatası:', error);
      setMessage('İstekler yüklenemedi');
      return;
    }

    setRequests(data || []);
  };

  useEffect(() => {
    fetchRequests();
    
    // Realtime dinleme - yeni istek geldiğinde otomatik güncelle
    const channel = supabase
      .channel('friend_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAccept = async (requestId: string, requesterId: string) => {
    setLoading(true);
    const { data: me } = await supabase.auth.getUser();
    if (!me?.user?.id) {
      setLoading(false);
      return;
    }

    // İsteği kabul et
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) {
      setMessage('Kabul edilemedi: ' + updateError.message);
      setLoading(false);
      return;
    }

    // Friends tablosuna ekle (çift yönlü)
    const { error: insertError } = await supabase.from('friends').insert([
      { user_id: me.user.id, friend_id: requesterId },
      { user_id: requesterId, friend_id: me.user.id },
    ]);

    if (insertError) {
      setMessage('Arkadaş eklenemedi: ' + insertError.message);
      setLoading(false);
      return;
    }

    // Kabul edene bildirim gönder (id / user_id fallback)
    const tryProfile = async (column: 'id' | 'user_id') => supabase
      .from('user_profiles')
      .select('nickname')
      .eq(column, me.user.id)
      .maybeSingle();
    let myProfileRes = await tryProfile('id');
    if (!myProfileRes.data) myProfileRes = await tryProfile('user_id');
    const myProfile = myProfileRes.data;
    
    await notifyFriendAccepted(
      requesterId,
      myProfile?.nickname || 'Bir kullanıcı'
    );

    setMessage('✅ Arkadaşlık isteği kabul edildi!');
    fetchRequests();
    setLoading(false);
  };

  const handleReject = async (requestId: string) => {
    setLoading(true);
    
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) {
      setMessage('Reddedilemedi: ' + error.message);
      setLoading(false);
      return;
    }

    setMessage('❌ İstek reddedildi');
    fetchRequests();
    setLoading(false);
  };

  if (requests.length === 0) {
    return (
      <View style={styles.requestsEmpty}>
        <Text style={styles.emptyText}>📭 Bekleyen arkadaşlık isteği yok</Text>
      </View>
    );
  }

  return (
    <View style={styles.requestsContainer}>
      <Text style={styles.requestsTitle}>
        🔔 Arkadaşlık İstekleri ({requests.length})
      </Text>
      {message ? (
        <Text style={[styles.requestMessage, message.includes('✅') ? styles.successMsg : styles.errorMsg]}>
          {message}
        </Text>
      ) : null}
      <FlatList
        data={requests}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const requester = Array.isArray(item.requester) ? item.requester[0] : item.requester;
          return (
            <View style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>
                  {requester?.nickname || 'Kullanıcı'}
                </Text>
                {requester?.email && (
                  <Text style={styles.requestEmail}>{requester.email}</Text>
                )}
                {requester?.user_code && (
                  <Text style={styles.requestCode}>Kod: {requester.user_code}</Text>
                )}
                <Text style={styles.requestTime}>
                  {new Date(item.created_at).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.requestBtn, styles.acceptBtn]}
                  onPress={() => handleAccept(item.id, item.requester_id)}
                  disabled={loading}
                >
                  <Text style={styles.acceptBtnText}>✓ Kabul Et</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.requestBtn, styles.rejectBtn]}
                  onPress={() => handleReject(item.id)}
                  disabled={loading}
                >
                  <Text style={styles.rejectBtnText}>✗ Reddet</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

export default function IndoorNavScreen() {
  const isDev = true; // Debug mesajlarını aç (redirectUri ve auth request/logları konsola yazılacak)
  // Profil ekleme formu için state
  const [profileName, setProfileName] = useState('');
  const [profileNick, setProfileNick] = useState('');
  const [profileInfo, setProfileInfo] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [profile, setProfile] = useState<any>(null);
  let request: any = null;
  let response: any = null;
  let promptAsync: any = async () => setErrorMsg('Google login not configured');

  const hasAndroidClient = !!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const hasExpoClient = !!process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;

  // Profil bilgilerini Supabase'den çek (id ve user_id kolonlarına göre)
  const fetchProfile = async () => {
    const { data: me } = await supabase.auth.getUser();
    const userId = me?.user?.id;
    if (!userId) return;

    const tryFetch = async (column: 'id' | 'user_id') => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq(column, userId)
        .maybeSingle();
      return { data, error };
    };

    let res = await tryFetch('id');
    if (!res.data) res = await tryFetch('user_id');

    if (res.data) {
      setProfile(res.data);
      setIsLoggedIn(true);
    } else if (res.error && res.error.code !== 'PGRST116') {
      setErrorMsg('Profil yüklenemedi: ' + res.error.message);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  try {
    // Wrap the hook call so a missing platform client id doesn't crash the whole screen.
    // Build a redirect URI that is explicit for web to match Google Console entries.
    // For web we want the exact `/--/expo-auth-session` path so expo-auth-session
    // can catch the token/code. For native (or when using the Expo proxy) use
    // the proxy redirect which uses auth.expo.io.
    const webRedirectUri = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? `${window.location.origin}/--/expo-auth-session`
      : undefined;

    // Use the hardcoded Expo auth proxy URL since makeRedirectUri ignores useProxy
    // and returns exp:// URLs with underscores which Google rejects.
    // This must match the redirect URI added to Google Console.
    const projectSlug = 'bolt-expo-nativewind';
    const forcedExpoProxyRedirect = `https://auth.expo.io/@ejderhaox112/${projectSlug}`;

    const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const androidClientId =
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ||
      'MISSING_ANDROID_CLIENT_ID';
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;
    const isWeb = Platform.OS === 'web';
    // Revert to authorization code (PKCE) flow for web/native and force the
    // Expo proxy redirect on web so behavior matches the previously working setup.
    const responseTypeForPlatform = 'code';
    const tuple = Google.useAuthRequest({
      expoClientId,
      androidClientId,
      iosClientId,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      // Use authorization code + PKCE flow to satisfy Google's security requirements
      // Web'de Google token endpoint'ine tarayıcıdan code exchange yapmak CORS vb.
      // sebeplerle sorun çıkarabildiği için web'de implicit (id_token) akışını tercih ediyoruz.
      // Native/Expo Go'da ise PKCE + code akışı güvenli ve stabil.
      responseType: responseTypeForPlatform,
      scopes: ['openid', 'profile', 'email'],
      // Request offline access and force consent so Google shows the consent
      // screen. Use PKCE for all platforms. For web we force the Expo proxy
      // redirect so the auth flow matches the previous working setup.
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
      },
      redirectUri: forcedExpoProxyRedirect,
      usePKCE: true,
      useProxy: true,
      projectNameForProxy: projectSlug,
    });
    request = tuple[0];
    response = tuple[1];
    promptAsync = tuple[2];
    try {
      // Log the actual request object so we can see which redirectUri was attached
      // to the outgoing OAuth request (helps diagnose why exp:// appears).
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] forcedExpoProxyRedirect=', forcedExpoProxyRedirect);
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] request object =', request);
      // Some platforms attach redirectUri inside request.url or request.redirectUri
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] request.url =', request?.url);
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] request.redirectUri =', request?.redirectUri || request?.redirect_uri);
    } catch (e) {
      // ignore
    }
    try {
      // Debug: print which client IDs and redirect URIs are being used so we can
      // diagnose redirect_uri_mismatch / exp:// vs auth.expo.io issues.
      // These logs are safe to leave temporarily during debugging.
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] Platform.OS =', Platform.OS);
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] expoClientId=', expoClientId);
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] androidClientId=', androidClientId);
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] iosClientId=', iosClientId);
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] webClientId=', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] redirectUri (proxy)=', makeRedirectUri({ useProxy: true, projectNameForProxy: 'bolt-expo-nativewind' }));
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] redirectUri (no proxy)=', makeRedirectUri({ useProxy: false }));
    } catch (e) {
      // ignore logging errors
    }
  } catch (e: any) {
    // If expo-auth-session throws because a required client id is missing, fall back
    // to a no-op prompt that surfaces a helpful message for the developer/user.
    // This prevents the app from crashing when environment vars are not provided.
    // Keep values defined so the rest of the component can render.
    request = null;
    response = null;
    promptAsync = async () => setErrorMsg(
      Platform.OS === 'android' && !hasAndroidClient
        ? 'Android Google client id not configured (EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID)'
        : 'Google login not configured'
    );
    console.warn('Google.useAuthRequest failed to initialize:', e?.message || e);
  }

  // Kullanıcı login kontrolü
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (isDev) {
        console.log('[IndoorNavScreen] Initial user check:', data?.user?.id);
      }
      setIsLoggedIn(!!data?.user?.id);
    };
    checkUser();

    // Auth durumunu dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isDev) {
        console.log('[IndoorNavScreen] Auth state changed:', event, session?.user?.id);
      }
      setIsLoggedIn(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Log auth request/response to the browser console for debugging
  useEffect(() => {
    if (!isDev) return;
    try {
      console.log('[IndoorNavScreen] Google auth request object:', request);
      console.log('[IndoorNavScreen] Google auth response object:', response);
    } catch (e) {
      console.warn('[IndoorNavScreen] Failed to log Google auth objects', e);
    }
  }, [isDev, request, response]);

  // Log the redirect URI used by expo-auth-session so we can verify it in Google Console
  useEffect(() => {
    if (!isDev) return;
    try {
      const uri = makeRedirectUri({ useProxy: false });
      console.log('[IndoorNavScreen] Auth redirect URI (makeRedirectUri):', uri);
    } catch (e) {
      console.warn('[IndoorNavScreen] Failed to compute redirect URI', e);
    }
  }, [isDev]);

  // Web fallback: If expo-auth-session did not populate `response` (e.g. static export 404
  // on /--/expo-auth-session without SPA fallback), manually parse hash for id_token.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Fallback logic removed to avoid conflict with _layout.tsx which handles popup closing
  }, [response]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication, params } = response as any;
      (async () => {
        try {
          // If expo-auth-session returned an ID token (implicit flow), use it.
          if (authentication?.idToken) {
            await supabase.auth.signInWithIdToken({ provider: 'google', token: authentication.idToken });
            setIsLoggedIn(true);
            setInfoMsg('Giriş başarılı!');
            setErrorMsg('');
            await fetchProfile();
            return;
          }

          // Otherwise, if we received an authorization code, exchange it for tokens.
          const code = params?.code;
          if (!code) {
            setErrorMsg('Google auth: no id_token or code received');
            return;
          }

          // Recompute client id and redirect (must match request)
          const expoClientIdLocal = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
          const webClientIdLocal = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
          const clientIdForExchange = Platform.OS === 'web'
            ? (webClientIdLocal || expoClientIdLocal)
            : expoClientIdLocal;
          const projectSlug = 'bolt-expo-nativewind';
          const redirectUriLocal = (Platform.OS === 'web' && typeof window !== 'undefined' && window.location && window.location.origin)
            ? `${window.location.origin}/--/expo-auth-session`
            : `https://auth.expo.io/@ejderhaox112/${projectSlug}`;

          // code_verifier should be available on the request object created earlier
          const codeVerifier = (request as any)?.codeVerifier || (request as any)?.code_verifier || '';

          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              client_id: clientIdForExchange,
              redirect_uri: redirectUriLocal,
              code_verifier: codeVerifier,
            } as any).toString(),
          });

          const tokenJson = await tokenRes.json();
          if (!tokenRes.ok) {
            console.error('Token exchange failed', tokenJson);
            setErrorMsg('Token exchange failed: ' + (tokenJson.error_description || tokenJson.error || 'unknown'));
            return;
          }

          const idToken = tokenJson.id_token || tokenJson.idToken;
          if (!idToken) {
            setErrorMsg('Token exchange did not return id_token');
            return;
          }

          await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
          setIsLoggedIn(true);
          setInfoMsg('Giriş başarılı!');
          setErrorMsg('');
          await fetchProfile();
        } catch (e: any) {
          console.error('Auth exchange error', e);
          setErrorMsg('Google ile giriş başarısız: ' + (e.message || e));
        }
      })();
    }
  }, [response]);

  const addProfile = async () => {
    if (!profileName.trim() || !profileNick.trim()) {
      setProfileInfo('İsim ve nick zorunlu');
      return;
    }
    const user = await supabase.auth.getUser();
    if (!user?.data?.user?.id) {
      setProfileInfo('Profil eklemek için önce giriş yapmalısınız.');
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: user.data.user.id, display_name: profileName, nickname: profileNick });
    if (error) setProfileInfo('Kayıt başarısız: ' + error.message);
    else setProfileInfo('Profil başarıyla eklendi');
    setProfileName('');
    setProfileNick('');
  };
  const venue = getActiveVenue('izmir-sehir-hastanesi');
  if (!venue) return <View style={styles.container}><Text>Venue bulunamadı</Text></View>;
  const startId = 'entrance';
  const [targetId, setTargetId] = useState<string>('room112');
  const [routeNodeIds, setRouteNodeIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<{ nodeId: string; instruction: string }[]>([]);
  const [distance, setDistance] = useState<number>(0);
  const [idx, setIdx] = useState(0);

  const currentNodeId = routeNodeIds[idx];
  const currentSigns = useMemo(() => {
    if (!currentNodeId) return [] as Array<any>;
    return getNearbyDoorSigns(venue, getDoorSigns(venue.id), currentNodeId, 15);
  }, [currentNodeId]);

  const buildRoute = () => {
    const res = findRoute(venue, startId, targetId);
    if (res) {
      setRouteNodeIds(res.path);
      setSteps(res.steps);
      setDistance(res.distanceMeters);
      setIdx(0);
    }
  };

  const stepForward = () => {
    setIdx(i => Math.min(i + 1, Math.max(0, routeNodeIds.length - 1)));
  };
  const stepBack = () => {
    setIdx(i => Math.max(i - 1, 0));
  };

  const MiniMap = () => {
    if (!routeNodeIds.length) return null;
    const nodesMap = new Map(venue.nodes.map(n => [n.id, n]));
    const pts = routeNodeIds.map(id => nodesMap.get(id)!).map(n => ({ x: n.pos.x, y: n.pos.y, floorId: n.floorId }));
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 10;
    const W = 260, H = 140;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const sx = (W - pad * 2) / spanX;
    const sy = (H - pad * 2) / spanY;
    const s = Math.min(sx, sy);

    const themeByFloor: Record<string, string> = {
      F0: '#8ecae6',
      F3: '#ffb703',
    };
    const curNodeId = routeNodeIds[idx];
    const curNode = nodesMap.get(curNodeId!);
    const themeColor = curNode ? (themeByFloor[curNode.floorId] || '#007AFF') : '#007AFF';

    const items = pts.map((p, i) => ({
      left: pad + (p.x - minX) * s,
      top: pad + (p.y - minY) * s,
      active: i === idx,
      floorId: p.floorId,
    }));

    const colorByKind: Record<string, string> = {
      walk: themeColor,
      elevator: '#9b5de5',
      stairs: '#8d99ae',
      escalator: '#2a9d8f',
    };
    const segments = items.slice(1).map((pt, i) => {
      const a = items[i];
      const b = pt;
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const ux = dx / len;
      const uy = dy / len;
      const fromId = routeNodeIds[i];
      const toId = routeNodeIds[i + 1];
      const edge = venue.edges.find(e => (e.from === fromId && e.to === toId) || (e.to === fromId && e.from === toId));
      const segKind = edge?.kind ?? 'walk';
      const segColor = colorByKind[segKind] ?? themeColor;
      return { x: (a.left + b.left) / 2, y: (a.top + b.top) / 2, len, angle, segColor, segKind, ax: a.left, ay: a.top, bx: b.left, by: b.top, ux, uy };
    });

    return (
      <View style={styles.mapBox}>
        {/* lines */}
        {segments.map((sg, i) => {
          if (sg.segKind === 'stairs') {
            const dash = 8;
            const gap = 6;
            const total = sg.len;
            const count = Math.max(1, Math.floor((total + gap) / (dash + gap)));
            const elems = [] as JSX.Element[];
            for (let k = 0; k < count; k++) {
              const offset = k * (dash + gap);
              if (offset > total) break;
              const midOffset = Math.min(offset + dash / 2, total);
              const cx = sg.ax + sg.ux * midOffset;
              const cy = sg.ay + sg.uy * midOffset;
              elems.push(
                <View
                  key={`seg-${i}-dash-${k}`}
                  style={{
                    position: 'absolute',
                    left: cx - dash / 2,
                    top: cy - 2,
                    width: dash,
                    height: 4,
                    backgroundColor: sg.segColor,
                    opacity: 0.7,
                    transform: [{ rotate: `${sg.angle}deg` }],
                    borderRadius: 2,
                  }}
                />
              );
            }
            return elems;
          }
          const height = sg.segKind === 'elevator' ? 6 : 4;
          return (
            <View
              key={'seg-' + i}
              style={{
                position: 'absolute',
                left: sg.x - sg.len / 2,
                top: sg.y - height / 2,
                width: sg.len,
                height,
                backgroundColor: sg.segColor,
                opacity: 0.6,
                transform: [{ rotate: `${sg.angle}deg` }],
                borderRadius: 3,
              }}
            />
          );
        })}
        {/* nodes */}
        {items.map((it, i) => (
          <View
            key={'pt-' + i}
            style={{
              position: 'absolute',
              left: it.left - (it.active ? 6 : 4),
              top: it.top - (it.active ? 6 : 4),
              width: it.active ? 12 : 8,
              height: it.active ? 12 : 8,
              borderRadius: 8,
              backgroundColor: it.active ? '#d00000' : '#1d3557',
              borderWidth: it.active ? 2 : 1,
              borderColor: it.active ? '#fff' : '#fff',
            }}
          />
        ))}
        {/* node icons/labels for interest points */}
        {routeNodeIds.map((nid, i) => {
          const n = nodesMap.get(nid)!;
          const it = items[i];
          if (!n || !it) return null;
          const icon = n.type === 'brand' ? '🏢' : n.type === 'room' ? '🚪' : n.type === 'elevator' ? '⬆️' : '';
          if (!icon) return null;
          return (
            <Text key={'icon-' + i} style={{ position: 'absolute', left: it.left + 6, top: it.top - 16, fontSize: 12 }}>
              {icon}
            </Text>
          );
        })}
        {/* legend */}
        <View style={{ position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', marginBottom: 4 }}>Açıklama</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ width: 14, height: 4, backgroundColor: colorByKind.walk, borderRadius: 2, marginRight: 6 }} />
            <Text style={{ fontSize: 11 }}>Yürüme</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ width: 14, height: 6, backgroundColor: colorByKind.elevator, borderRadius: 3, marginRight: 6 }} />
            <Text style={{ fontSize: 11 }}>Asansör</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ width: 14, height: 0, borderTopWidth: 2, borderColor: colorByKind.stairs, borderStyle: 'dashed', marginRight: 6 }} />
            <Text style={{ fontSize: 11 }}>Merdiven</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ width: 14, height: 4, backgroundColor: colorByKind.escalator, borderRadius: 2, marginRight: 6 }} />
            <Text style={{ fontSize: 11 }}>Yürüyen Merdiven</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ fontSize: 12, marginRight: 8 }}>🚪 Oda</Text>
            <Text style={{ fontSize: 12, marginRight: 8 }}>🏢 Marka</Text>
            <Text style={{ fontSize: 12 }}>⬆️ Asansör</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>İç Mekan Navigasyon</Text>

      {isLoggedIn ? (
        <View style={styles.profileBox}>
          <Text style={styles.sectionHeader}>Hoşgeldiniz 👋</Text>
          {profile ? (
            <>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                {profile.nickname || profile.email || 'Kullanıcı'}
              </Text>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                📧 {profile.email || 'Email bulunamadı'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: '#007AFF' }}>⭐ Level {profile.level || 1}</Text>
                <Text style={{ fontSize: 13, color: '#28a745' }}>🎯 {profile.xp || 0} XP</Text>
              </View>
            </>
          ) : (
            <Text style={{ marginBottom: 12 }}>Başarıyla giriş yaptınız.</Text>
          )}
          <TouchableOpacity 
            style={[styles.primary, { backgroundColor: '#dc3545' }]} 
            onPress={async () => {
              await supabase.auth.signOut();
              setIsLoggedIn(false);
              setProfile(null);
            }}
          >
            <Text style={styles.primaryText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Mevcut kullanıcı girişi */}
          <View style={styles.profileBox}>
            <Text style={styles.sectionHeader}>Mevcut Kullanıcı/Admin Girişi</Text>
            <TouchableOpacity
              style={[styles.primary, (!hasAndroidClient && Platform.OS === 'android') ? { backgroundColor: '#9aa4b2' } : null]}
              onPress={() => {
                try {
                  const promise = promptAsync();
                  promise.catch(e => {
                    console.error('Google login popup failed', e);
                    setErrorMsg('Google girişi için pencere açılamadı. Lütfen açılır pencere engelleyicisini kapatıp tekrar deneyin.');
                  });
                } catch (e) {
                  console.error('Google login handler crashed', e);
                  setErrorMsg('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
                }
              }}
              disabled={!hasAndroidClient && Platform.OS === 'android'}
            >
              <Text style={styles.primaryText}>Google ile Giriş Yap</Text>
            </TouchableOpacity>
            {(!hasAndroidClient && Platform.OS === 'android') ? (
              <Text style={{ color: '#d00', marginTop: 8, fontSize: 13 }}>
                Android için `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` yapılandırılmamış — Google Girişi devre dışı.
              </Text>
            ) : null}
            <Text style={{ color: '#888', marginTop: 6, fontSize: 13 }}>
              Zaten hesabınız veya admin yetkiniz varsa, buradan giriş yapabilirsiniz.
            </Text>
            {errorMsg ? <Text style={{ color: 'red', marginTop: 8 }}>{errorMsg}</Text> : null}
            {infoMsg ? <Text style={{ color: 'green', marginTop: 8 }}>{infoMsg}</Text> : null}
          </View>

          {/* Yeni kullanıcı ekleme formu */}
          <View style={styles.profileBox}>
            <Text style={styles.sectionHeader}>Yeni Kullanıcı Oluştur</Text>
            <TextInput
              style={styles.input}
              value={profileName}
              onChangeText={setProfileName}
              placeholder="İsim"
            />
            <TextInput
              style={styles.input}
              value={profileNick}
              onChangeText={setProfileNick}
              placeholder="Nick"
            />
            <TouchableOpacity style={styles.primary} onPress={addProfile}>
              <Text style={styles.primaryText}>Profil Ekle</Text>
            </TouchableOpacity>
            {profileInfo ? <Text style={styles.info}>{profileInfo}</Text> : null}
          </View>
        </>
      )}

      {/* Sohbet ve Arkadaş Ekle bölümleri */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionHeader}>Sohbet</Text>
        {isLoggedIn ? (
          <IndoorChatScreen />
        ) : (
          <Text style={{ color: '#888', fontStyle: 'italic', marginTop: 8 }}>
            Sohbet için önce giriş yapmalısınız.
          </Text>
        )}
      </View>
      
      {/* Arkadaşlık İstekleri */}
      {isLoggedIn && (
        <View style={styles.sectionBox}>
          <FriendRequestsSection />
        </View>
      )}
      
      <View style={styles.sectionBox}>
        <Text style={styles.sectionHeader}>Arkadaş Ekle</Text>
        {isLoggedIn ? (
          <AddFriendScreen />
        ) : (
          <Text style={{ color: '#888', fontStyle: 'italic', marginTop: 8 }}>
            Arkadaş eklemek için önce giriş yapmalısınız.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  profileBox: { backgroundColor: '#f8f8f8', padding: 12, borderRadius: 10, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 },
  info: { marginTop: 8, color: '#007AFF', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  destRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  destButton: { paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  destButtonActive: { backgroundColor: '#eef5ff', borderColor: '#007AFF' },
  destText: { fontSize: 14 },
  primary: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  panel: { flex: 1, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  subTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  ctrlBtn: { padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 },
  stepInfo: { fontSize: 13, color: '#333' },
  mapBox: { alignSelf: 'center', width: 260, height: 140, backgroundColor: '#f8f9fa', borderRadius: 10, marginVertical: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  stepRow: { paddingVertical: 6 },
  stepActive: { backgroundColor: '#f6fbff' },
  stepText: { fontSize: 14, color: '#333' },
  signRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  signSponsored: { backgroundColor: '#fff9e6' },
  signText: { fontSize: 14 },
  empty: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  sectionBox: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  requestsContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  requestsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#007AFF',
  },
  requestsEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  requestCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  requestInfo: {
    marginBottom: 10,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requestEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  requestCode: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#28a745',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectBtn: {
    backgroundColor: '#dc3545',
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  requestMessage: {
    fontSize: 13,
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  successMsg: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  errorMsg: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
});
