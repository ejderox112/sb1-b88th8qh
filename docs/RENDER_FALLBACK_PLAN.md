# Render Fallback Plan (nav_nodes/nav_edges tabanlı)

Amaç: Kamera istemeyen kullanıcılar için aynı indoor graf verisini (floors/nav_nodes/nav_edges/pois) kullanarak 2D/3D render ve rota gösterimi. corridor-render (React/Three) ve mobil/web ekranlar ortak veri kaynağını kullanacak.

## Veri akışı
- Kaynak: Supabase `floors`, `nav_nodes`, `nav_edges`, `pois` (opsiyonel cache/rehydrate).
- İstemci çekim:
  - Kat seçme → `floors` kaydı ile `origin_lat/lng`, `origin_heading`, `scale` alınır.
  - `nav_nodes` + `nav_edges` ilgili `floor_id` ile fetch.
  - `pois` alınır (oda/kapı etiketleri, descriptions[locale]).
- Rota: A* veya Dijkstra `nav_edges` üzerinde; `is_accessible` filtrelenebilir.

## Render pipeline
- 2D (React Native / web):
  - node’ları dünya koordinatına scale/rotate: `x,y` * scale, `origin_heading` ile döndür.
  - edges’i çiz, kapı/oda node’larını ikonla göster; POI etiketlerini billboard/tooltip.
- 3D (corridor-render):
  - Aynı graph’tan corridor mesh üretimi: edges’i ince şerit, kapıları/düğümleri küçük kutu; z varsayılan 0.
  - Rota highlight: path edges’i farklı renk/şeffaflık; breadcrumb partikülleri.

## Cache / offline
- Kat başına graph + POI local storage (JSON). `updated_at` alanlarıyla invalidation.
- Prefetch: kat listesi/graph seçildiğinde arka planda indir.

## API/SDK sözleşmesi (öneri)
```ts
interface FloorGraph {
  floor: { id: string; name: string; level_index: number; origin_heading?: number; scale?: number };
  nodes: Array<{ id: string; type: string; x: number; y: number; z?: number; metadata?: any }>;
  edges: Array<{ id: string; from_node: string; to_node: string; bidirectional: boolean; weight?: number; width?: number; is_accessible?: boolean }>;
  pois: Array<{ id: string; node_id: string | null; label: string; category?: string; metadata?: any }>;
}
```

## corridor-editor entegrasyonu (web)
- `corridor-editor/` tarafında Supabase client ekle veya build-time fetch.
- "Import from Supabase" butonu: floor seç → graph JSON’u doldur.
- "Export to Supabase" butonu: local edit edilen node/edge/poi’yi Supabase `nav_nodes/nav_edges/pois`a yaz (revizyon opsiyonu için `floor_revisions`).

## Mobil/web ekran entegrasyonu
- Yeni hook: `useFloorGraph(floorId)` → Supabase fetch + cache; error/loading state.
- 2D mini-map: `hooks/useFloorGraph` çıktısını çiz, rota overlay’i `findRoute` ile hesapla.
- AR ile ortak kaynak: aynı graph; AR hizalaması marker veya heading; render fallback’ı grafiği düz ekranda gösterir.

## Görevler
- [ ] Supabase fetch + cache eden `useFloorGraph(floorId)` hook’u ekle.
- [ ] Rota hesaplama fonksiyonunu `nav_edges` ile uyumlu hale getir (A* / mevcut pathfinder’ı adapte et).
- [ ] Mobil/web 2D mini-map bileşenini nav_nodes/nav_edges/pois verisiyle besle.
- [ ] corridor-editor’a Supabase import/export butonları ekle.
- [ ] Optional: offline cache/invalidasyon; accessible route filtresi.
