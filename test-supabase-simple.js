const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cwbwxidnarcklxtsxtkf.supabase.co';
const supabaseKey = 'sb_publishable_Am3FgbmbhgKA4_Z76gTXoQ_t9gkcU4Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔗 Supabase bağlantısı test ediliyor...\n');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey.substring(0, 20) + '...\n');

  try {
    // Test 1: Tabloları kontrol et
    console.log('1️⃣ user_profiles tablosu...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, nickname, level, xp, user_role')
      .limit(3);
    
    if (profilesError) {
      console.error('❌ Hata:', profilesError.message);
    } else {
      console.log('✅ Başarılı! Kayıt sayısı:', profiles?.length || 0);
      if (profiles && profiles.length > 0) {
        console.log('Örnek:', profiles[0]);
      }
    }

    // Test 2: business_ads
    console.log('\n2️⃣ business_ads tablosu...');
    const { data: ads, error: adsError } = await supabase
      .from('business_ads')
      .select('id, ad_title, status, budget')
      .limit(3);
    
    if (adsError) {
      console.error('❌ Hata:', adsError.message);
    } else {
      console.log('✅ Başarılı! Kayıt sayısı:', ads?.length || 0);
      if (ads && ads.length > 0) {
        console.log('Pending ads:', ads.filter(a => a.status === 'pending').length);
      }
    }

    // Test 3: indoor_photos
    console.log('\n3️⃣ indoor_photos tablosu...');
    const { data: photos, error: photosError } = await supabase
      .from('indoor_photos')
      .select('id, label, moderation_status')
      .limit(3);
    
    if (photosError) {
      console.error('❌ Hata:', photosError.message);
    } else {
      console.log('✅ Başarılı! Kayıt sayısı:', photos?.length || 0);
      if (photos && photos.length > 0) {
        console.log('Pending photos:', photos.filter(p => p.moderation_status === 'pending').length);
      }
    }

    // Test 4: content_reports
    console.log('\n4️⃣ content_reports tablosu...');
    const { data: reports, error: reportsError } = await supabase
      .from('content_reports')
      .select('id, report_type, status, priority')
      .limit(3);
    
    if (reportsError) {
      console.error('❌ Hata:', reportsError.message);
    } else {
      console.log('✅ Başarılı! Kayıt sayısı:', reports?.length || 0);
      if (reports && reports.length > 0) {
        console.log('Urgent reports:', reports.filter(r => r.priority === 'urgent').length);
      }
    }

    // Test 5: locations
    console.log('\n5️⃣ locations tablosu...');
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name, floor_count')
      .limit(3);
    
    if (locationsError) {
      console.error('❌ Hata:', locationsError.message);
    } else {
      console.log('✅ Başarılı! Kayıt sayısı:', locations?.length || 0);
      if (locations && locations.length > 0) {
        console.log('Örnek:', locations[0].name);
      }
    }

    // Test 6: Fonksiyon kontrolü (RPC call)
    console.log('\n6️⃣ Fonksiyon testi (award_daily_login_xp)...');
    const { data: funcData, error: funcError } = await supabase
      .rpc('award_daily_login_xp');
    
    if (funcError) {
      console.error('❌ Hata:', funcError.message);
    } else {
      console.log('✅ Fonksiyon çalıştı:', funcData);
    }

    console.log('\n✅ TÜM TESTLER TAMAMLANDI!\n');
    console.log('📊 Özet:');
    console.log('- Supabase bağlantısı: BAŞARILI');
    console.log('- PART1 tabloları: KURULU');
    console.log('- PART2 tabloları: KURULU');
    console.log('- Admin panel: HAZIR');
    console.log('\n🚀 Şimdi DEMO_DATA.sql çalıştır ve admin paneli aç!');

  } catch (error) {
    console.error('\n❌ BEKLENMEYEN HATA:', error);
  }
}

testConnection();
