import * as WebBrowser from 'expo-web-browser';

// Required for expo-auth-session on web.
// Handles the /--/expo-auth-session redirect and closes the popup window.
WebBrowser.maybeCompleteAuthSession();

export default function ExpoAuthSession() {
  return null;
}
