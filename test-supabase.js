// Test Supabase bağlantısı
import { supabase } from './lib/supabase';

async function testSupabaseConnection() {
  console.log('🔍 Supabase bağlantısı test ediliyor...\n');

  try {
    // 1. Auth kontrolü
    console.log('1️⃣ Auth user kontrolü...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log('User:', userData?.user?.email || 'Giriş yapılmamış');
    if (userError) console.error('Auth error:', userError);

    // 2. Tabloları listele
    console.log('\n2️⃣ Tabloları kontrol et...');
    const { data: tables, error: tableError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    console.log('user_profiles tablosu:', tables ? '✅ Erişilebilir' : '❌ Erişilemez');
    if (tableError) console.error('Table error:', tableError);

    // 3. Business ads kontrolü
    console.log('\n3️⃣ Business ads kontrolü...');
    const { data: ads, error: adsError } = await supabase
      .from('business_ads')
      .select('*')
      .limit(5);
    console.log('business_ads tablosu:', ads ? `✅ ${ads.length} kayıt` : '❌ Erişilemez');
    if (adsError) console.error('Ads error:', adsError);

    // 4. Indoor photos kontrolü
    console.log('\n4️⃣ Indoor photos kontrolü...');
    const { data: photos, error: photosError } = await supabase
      .from('indoor_photos')
      .select('*')
      .limit(5);
    console.log('indoor_photos tablosu:', photos ? `✅ ${photos.length} kayıt` : '❌ Erişilemez');
    if (photosError) console.error('Photos error:', photosError);

    // 5. Content reports kontrolü
    console.log('\n5️⃣ Content reports kontrolü...');
    const { data: reports, error: reportsError } = await supabase
      .from('content_reports')
      .select('*')
      .limit(5);
    console.log('content_reports tablosu:', reports ? `✅ ${reports.length} kayıt` : '❌ Erişilemez');
    if (reportsError) console.error('Reports error:', reportsError);

    // 6. Locations kontrolü
    console.log('\n6️⃣ Locations kontrolü...');
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .limit(5);
    console.log('locations tablosu:', locations ? `✅ ${locations.length} kayıt` : '❌ Erişilemez');
    if (locationsError) console.error('Locations error:', locationsError);

    console.log('\n✅ Test tamamlandı!');
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
  }
}

testSupabaseConnection();
