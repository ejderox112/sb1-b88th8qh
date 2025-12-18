const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cwbwxidnarcklxtsxtkf.supabase.co';
const supabaseKey = 'sb_publishable_Am3FgbmbhgKA4_Z76gTXoQ_t9gkcU4Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySetup() {
  console.log('🔍 Ücretsiz Supabase Kurulum Kontrolü\n');

  try {
    // 1. Tabloları say
    console.log('1️⃣ Tablo kontrolü...');
    
    const tables = {
      'locations': 0,
      'user_profiles': 0,
      'business_ads': 0,
      'indoor_photos': 0,
      'content_reports': 0,
      'venue_suggestions': 0
    };

    for (const table of Object.keys(tables)) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        tables[table] = count || 0;
        console.log(`   ✅ ${table}: ${count || 0} kayıt`);
      }
    }

    // 2. Pending durumları
    console.log('\n2️⃣ Admin panel istatistikleri...');
    
    const { count: pendingAds } = await supabase
      .from('business_ads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    console.log(`   ⏳ Bekleyen reklamlar: ${pendingAds || 0}`);

    const { count: pendingPhotos } = await supabase
      .from('indoor_photos')
      .select('*', { count: 'exact', head: true })
      .eq('moderation_status', 'pending');
    console.log(`   📸 Bekleyen fotoğraflar: ${pendingPhotos || 0}`);

    const { count: pendingVenues } = await supabase
      .from('venue_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    console.log(`   📍 Bekleyen mekanlar: ${pendingVenues || 0}`);

    const { count: urgentReports } = await supabase
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('priority', 'urgent');
    console.log(`   🚨 Acil raporlar: ${urgentReports || 0}`);

    // 3. Sonuç
    console.log('\n✅ KURULUM DURUMU:');
    const totalRecords = Object.values(tables).reduce((a, b) => a + b, 0);
    
    if (totalRecords === 0) {
      console.log('⚠️  Tablolar boş! DEMO_DATA_UCRETSIZ.sql çalıştır.');
    } else {
      console.log(`✅ Toplam ${totalRecords} kayıt bulundu!`);
      console.log('✅ Admin panel hazır!');
      console.log('\n🎯 Şimdi yapman gerekenler:');
      console.log('   1. expo start ile uygulamayı aç');
      console.log('   2. ejderha112@gmail.com ile giriş yap');
      console.log('   3. Profile → Admin butonuna tıkla');
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

verifySetup();
