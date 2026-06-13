# Analisis Kegunaan Laporan RW CEKAL Untuk Sistem CCAP

Tarikh analisis: 11 Jun 2026

Sumber client:

- `LAPORAN RANCANGAN WILAYAH CEKAL/RINGKASAN EKSEKUTIF RW CEKAL (BM).pdf`
- `LAPORAN RANCANGAN WILAYAH CEKAL/JILID I RW CEKAL - DASAR DAN STRATEGI WILAYAH CEKAL.pdf`
- `LAPORAN RANCANGAN WILAYAH CEKAL/JILID II RW CEKAL - PELAN PENGURUSAN SPATIAL WILAYAH CEKAL.pdf`
- `LAPORAN RANCANGAN WILAYAH CEKAL/JILID III RW CEKAL - MANUAL PENGUKURAN NILAI DAYA TAMPUNG.pdf`
- `LAPORAN RANCANGAN WILAYAH CEKAL/JILID IV RW CEKAL - PANGKALAN DATA GEOSPATIAL.pdf`

## Keputusan Ringkas

Laporan ini sangat berguna untuk CCAP. Ia bukan sekadar dokumen sokongan, tetapi boleh menjadi rujukan utama untuk menaikkan CCAP daripada dashboard demo kepada sistem automasi pengukuran daya tampung yang selari dengan cadangan RW CEKAL.

Nilai paling tinggi datang daripada:

1. Jilid III, kerana ia memberi metodologi rasmi PCC, RCC dan ECC.
2. Jilid IV, kerana ia memberi model pangkalan data geospatial, lapisan GIS, atribut, koordinat dan proses topologi.
3. Jilid I, kerana ia menyebut keperluan sistem automasi pengukuran daya tampung, pangkalan data berpusat, API, dashboard dan pemantauan untuk JPW CEKAL.
4. Jilid II, kerana ia menunjukkan bagaimana output spatial patut digunakan dalam semakan pembangunan, terutama HVI, kesesuaian tanah, kawasan berhalangan/tersedia dan pelan perincian mukim.

## Apa Yang Sistem CCAP Sudah Cover

Sistem sekarang sudah ada asas yang kuat:

- Aplikasi Angular untuk dashboard, peta GIS, analitik populasi, kapasiti, guna tanah dan pengurusan data.
- Backend FastAPI dan PostgreSQL/PostGIS.
- Import workbook kepada jadual `ecc_spk_map`, `zoning_map`, `optimum_map`, `ketepuan` dan `overall_population`.
- Paparan PCC, RCC, ECC, ECC semasa/optimum, populasi, ranking kawasan dan status ringkas.
- Superset sebagai optional BI layer untuk dashboard eksekutif.
- Struktur awal untuk GeoJSON dan spatial point map.

Namun sistem sekarang masih banyak bergantung kepada nilai yang sudah siap dikira dalam workbook. Ia belum menjadi enjin automasi penuh seperti yang dicadangkan dalam laporan.

## Gap Utama Berbanding Laporan Client

### 1. Formula engine belum wujud

Jilid III dan workbook `CEKAL DATABASE - FINALIZED 11_7_2025.xlsx` sudah cukup untuk mengesahkan struktur formula operasi:

- `A_msq = A_ha * 10000`
- `PCC = ROUND((A_msq / Au) * Rf, 0)`
- `RCC = ROUND(PCC * CF, 0)`
- `ECC = ROUND(RCC * MC, 0)`
- `ECC Maksimum = ECC Semasa + ECC Potensi + ECC Komited`

Nota penting: teks Jilid III ada satu bahagian yang boleh dibaca seolah-olah `ECC = PCC x RCC x MC`, tetapi jadual pengiraan dan data Excel menyokong formula `ECC = RCC x MC`, iaitu `(A/Au) x Rf x CF x MC`. Formula `PCC x RCC x MC` akan menghasilkan nilai terlalu besar dan tidak padan dengan workbook.

Semakan workbook:

- Sheet `ECC SPK MAP`: PCC padan formula 449 daripada 453 baris yang boleh diuji, iaitu 99.12%.
- Sheet `ZONING MAP`: PCC padan 171 daripada 176 baris, iaitu 97.16%. Mismatch utama berada pada beberapa baris Lojing dan nampak seperti data manual/outlier.
- Sheet `OPTIMUM MAP`: PCC padan 64 daripada 64 baris, iaitu 100%.
- Sheet `KETEPUAN`: PCC padan 270 daripada 272 baris, iaitu 99.26%.

Workbook hampir tidak menyimpan formula Excel aktif untuk PCC/RCC/ECC. Ia menyimpan nilai akhir sebagai static values. Satu formula aktif yang ditemui ialah `Keluasan Kawasan_msq = Keluasan Kawasan_Ha * 10000`. Jadi formula rasmi boleh disahkan melalui padanan nilai, tetapi sistem masih perlu membina formula engine sendiri.

Faktor `CF` dan `MC` tidak wujud sebagai kolum eksplisit dalam workbook. Ia boleh diinfer daripada nilai sedia ada:

- `CF = RCC / PCC`
- `MC = ECC / RCC`

Nilai faktor median yang diinfer mengikut kawasan:

| Kawasan | CF median | MC median |
| --- | ---: | ---: |
| Batang Padang | 0.1428 | 0.7519 |
| Cameron Highland | 0.1666 | 0.6450 |
| Kampar | 0.1429 | 0.6951 |
| Kinta | 0.1429 | 0.7026 |
| Lipis | 0.1997 | 0.4766 |
| Lojing | 0.1665 | 0.4646 |

Kesan kepada sistem: kita sudah boleh bina calculation engine versi pertama berdasarkan formula di atas. Tetapi `CF` dan `MC` mesti dimodelkan sebagai master data/parameter metodologi, bukan hardcode satu nilai global.

Status implementasi v1: formula ini dijadikan asas `capacity_methodologies`, `capacity_factors`, `capacity_calculation_runs` dan `capacity_calculation_results`. Sistem mengira semula nilai sebagai audit layer dan tidak overwrite nilai workbook sehingga client sahkan calculated values sebagai authoritative.

Nilai PCC/RCC/ECC workbook masih disimpan sebagai kolum import dan kekal sebagai source value. Formula engine v1 mengira semula nilai daripada `A`, `Au`, `Rf`, `CF` dan `MC` untuk audit, tetapi belum mengira `CF` dan `MC` terus daripada indikator penuh seperti alam sekitar, HVI, utiliti, tadbir urus, ekonomi dan pelancongan.

Kesan kepada sistem: CCAP bergerak daripada dashboard nilai siap kepada audit/calculation layer v1, tetapi belum lagi menjadi sistem automasi pengukuran daya tampung penuh sehingga indikator pembentuk `CF` dan `MC` dimodelkan.

### 2. Subparameter dan indikator belum dimodelkan

Jilid III menyenaraikan indikator sekunder dan primer seperti:

- keluasan semasa, komited dan potensi
- suhu, curahan hujan, hari hujan, kualiti air, paras bunyi, HVI
- KDNK, nilai ekonomi pertanian, tenaga buruh, kadar perbandaran, indeks kebahagiaan
- kapasiti air, elektrik, kumbahan, sisa pepejal, telekomunikasi, WiFi, tandas awam
- penguatkuasaan, pengurusan bencana, kawalan pembangunan, bajet, kakitangan dan dasar
- kepuasan penduduk dan pelancong
- kadar penginapan dan pengurusan pelancongan

Sistem sekarang belum ada jadual normal untuk indikator ini. Kebanyakannya hanya mungkin tersimpan dalam `raw_data` atau tidak wujud langsung.

Kesan kepada sistem: sukar untuk audit kenapa ECC sesuatu kawasan tinggi/rendah. Dashboard boleh tunjuk skor, tetapi belum boleh jawab "apa input yang menyebabkan skor ini".

### 3. GIS masih point-based, sedangkan laporan perlukan polygon/layer model

Jilid IV menerangkan model geospatial yang lebih lengkap:

- guna tanah semasa, zoning dan komited
- persempadanan negeri, daerah, mukim, PBT, BP, BPK dan kawasan kajian
- utiliti, pengangkutan, alam sekitar, sungai, topo, tanah tanih
- penduduk, maklumat tanah, ekonomi, sosial, analisis dan cadangan sektoral
- mineral/geologi, cerun, fault, geologi, geotapak, kuari, litologi
- hidrologi, flood hazard, lembangan sungai, tadahan, CFS
- DTM/DSM dan data sokongan lain

Sistem sekarang ada PostGIS, tetapi model yang aktif lebih kepada titik latitude/longitude. Untuk selari dengan Jilid IV, CCAP perlu menyokong polygon layers, metadata layer, topology validation dan spatial overlay.

Kesan kepada sistem: peta sekarang berguna untuk marker dan ringkasan, tetapi belum cukup untuk semakan cadangan pembangunan berasaskan lot/kawasan.

### 4. Workflow semakan pembangunan belum wujud

Jilid I dan II meletakkan CC sebagai alat pemantauan serta rujukan untuk PBT, PLANMalaysia Negeri, Unit RW dan JPW. Jilid II juga menunjukkan maklumat projek patut dinilai bersama:

- pelan kerentanan
- pelan kerapuhan
- pelan kesesuaian tanah
- projek pembangunan
- tahap HVI
- tahap CC
- ulasan/syarat

Sistem sekarang belum ada modul permohonan/cadangan pembangunan yang membenarkan pengguna masukkan projek, pilih lokasi polygon, semak overlap dengan HVI/KSAS/kawasan berhalangan, lalu kira impak kepada ECC.

Kesan kepada sistem: CCAP sekarang ialah analytics platform, belum lagi decision workflow untuk OSC/PBT/JPW.

### 5. Status dan threshold perlu berasaskan ketepuan

Rule MVP lama yang menanda `Kritikal` berdasarkan purata ECC kawasan tidak sesuai kerana ECC tinggi membawa maksud kapasiti lebih tinggi, bukan semestinya tekanan lebih tinggi. Status v1 diganti kepada logik ketepuan:

- `capacity_load = MAX(bil_penduduk) + MAX(bil_pengunjung)`
- `capacity = SUM(ECC)`
- `saturation_pct = capacity_load / capacity * 100`
- `Sesuai`: bawah 70%
- `Sederhana`: 70% hingga bawah 100%
- `Kritikal`: 100% dan ke atas

Kesan kepada sistem: status kini lebih audit-friendly kerana ia membandingkan beban semasa dengan kapasiti kawasan. Ambang 70%/100% masih perlu disahkan client sebagai dasar operasi rasmi, tetapi ia tidak lagi menggunakan logik dummy purata ECC 900/1,800.

## Apa Yang Paling Berguna Untuk Dibuat Dalam Sistem

### Priority 1: Formula dan audit trail PCC/RCC/ECC

Tambah calculation engine yang boleh:

- simpan input asas `A`, `Au`, `Rf`, `CF`, `MC`
- kira `A_msq`, PCC, RCC dan ECC secara terbitan
- simpan versi formula dan sumber indikator
- tunjuk breakdown "kenapa ECC jadi begitu"
- bezakan ECC semasa, potensi, komited, maksimum, zoning RT dan optimum
- kesan outlier workbook, contohnya beberapa baris Zoning Lojing yang tidak padan formula PCC

Ini paling penting kerana laporan client memang meminta sistem automasi pengukuran daya tampung, bukan sekadar dashboard nilai siap.

### Priority 2: Model data indikator

Tambah jadual seperti:

- `capacity_parameters`
- `capacity_indicators`
- `capacity_indicator_values`
- `management_capability_scores`
- `correction_factors`
- `capacity_scenarios`
- `capacity_calculation_runs`

Setiap nilai perlu ada tahun, kawasan, sumber agensi, status semakan, dan metadata import.

### Priority 3: GIS polygon dan layer catalog

Tambah sokongan untuk:

- polygon guna tanah semasa/zoning/komited
- sempadan pentadbiran dan kawasan kajian
- HVI, KSAS, flood hazard, cerun, hidrologi
- layer metadata mengikut Jilid IV
- transformasi koordinat GDM 2000 MRSO kepada web map 4326/3857
- topology checks seperti `must not overlap` dan `must not have gaps`

Ini akan menjadikan Peta GIS lebih bernilai untuk analisis spatial sebenar.

### Priority 4: Modul semakan cadangan pembangunan

Tambah modul "Cadangan Pembangunan" yang membolehkan pengguna:

- masukkan projek baharu atau komited
- pilih lokasi/polygon
- pilih guna tanah, keluasan, fasa dan status
- semak HVI/KSAS/kesesuaian tanah/kawasan berhalangan
- kira impak kepada PCC/RCC/ECC
- keluarkan ulasan/syarat awal untuk PBT/JPW

Ini sangat selari dengan Jilid I dan II.

### Priority 5: Dashboard pemantauan JPW/PLANMalaysia

Dashboard sedia ada boleh diubah supaya lebih ikut laporan:

- ECC semasa vs ECC maksimum vs penduduk + pengunjung
- tahap ketepuan mengikut kawasan, bukan purata ECC semata-mata
- senario zoning RT dan optimum
- watchlist kawasan menghampiri tepu
- status input data mengikut agensi
- tarikh kemas kini dan tahap kelengkapan indikator

Superset boleh kekal sebagai BI/admin layer, tetapi dashboard rasmi pengguna masih patut berada dalam Angular.

## Peranan Superset Selepas Laporan Ini

Laporan client tidak membuat Superset wajib. Ia meminta pangkalan data, automasi, API, dashboard dan pemantauan.

Untuk CCAP:

- Angular kekal sebagai sistem rasmi.
- Superset kekal sebagai optional BI/admin dashboard.
- Formula engine dan workflow pembangunan perlu berada di backend CCAP, bukan Superset.
- Superset boleh baca view rasmi daripada backend/database untuk laporan dalaman.

## Risiko Kalau Kita Abaikan Laporan Ini

Jika sistem kekal seperti sekarang:

- CCAP nampak cantik sebagai dashboard, tetapi sukar dipertahankan sebagai sistem automasi pengukuran rasmi.
- Nilai PCC/RCC/ECC tidak boleh diaudit daripada input asal.
- GIS tidak cukup untuk semakan spatial lot/polygon.
- Client mungkin tanya kenapa formula dalam Jilid III tidak wujud dalam sistem.
- Status kawasan boleh dipersoalkan jika threshold ketepuan 70%/100% belum disahkan sebagai dasar rasmi.

## Risiko Kalau Kita Terus Implement Semua

Implement semua sekaligus juga berisiko:

- skop jadi terlalu besar
- perlukan data agensi yang belum tersedia
- perlu sahkan formula yang ada sedikit konflik/ketidakjelasan dalam teks PDF
- perlu shapefile/geodatabase sebenar, bukan PDF sahaja
- perlu governance untuk siapa boleh upload/approve indikator

Jadi pendekatan terbaik ialah phased implementation.

## Roadmap Cadangan

### Fasa 1: Selaraskan Metodologi

- Kemaskini dokumentasi semantic layer berdasarkan Jilid III.
- Sahkan formula operasi `PCC = (A/Au) x Rf`, `RCC = PCC x CF`, `ECC = RCC x MC` dengan client.
- Sahkan sama ada outlier workbook ialah manual override atau ralat data.
- Tentukan definisi status: ketepuan, sesuai, sederhana, kritikal.
- Tandakan semua formula dan threshold dengan versi metodologi.

### Fasa 2: Calculation Engine

- Bina backend service untuk kira PCC/RCC/ECC.
- Tambah jadual indikator, correction factor dan management capability.
- Papar calculation breakdown dalam Angular.
- Simpan calculation run untuk audit.

### Fasa 3: GIS Layer Upgrade

- Import layer polygon sebenar.
- Bina layer catalog dan metadata.
- Tambah map overlay HVI, KSAS, guna tanah, zoning, komited dan kawasan berhalangan/tersedia.
- Tambah spatial query untuk semakan lokasi.

### Fasa 4: Development Review Workflow

- Modul projek/cadangan pembangunan.
- Semakan automatik HVI/KSAS/kesesuaian/CC.
- Output ulasan awal dan syarat.
- Audit trail keputusan.

### Fasa 5: Observatory/JPW Reporting

- Dashboard pemantauan rasmi.
- Data freshness mengikut agensi.
- Export laporan mesyuarat.
- API integration ke MUO/SUO/LUO jika diperlukan.

## TODO Rujukan Pantas

Status rujukan pada 12 Jun 2026.

### Sudah siap atau sudah ada asas

- [x] Formula audit v1 untuk `PCC`, `RCC` dan `ECC` sudah dibina sebagai audit layer.
- [x] Jadual audit utama sudah ada: `capacity_methodologies`, `capacity_factors`, `capacity_calculation_runs`, `capacity_calculation_results`.
- [x] API untuk methodology, factor, recalculate, run history dan audit results sudah ada.
- [x] Paparan Angular untuk formula aktif, audit run summary, audit table dan faktor `CF/MC` sudah ada.
- [x] Status kapasiti v1 sudah ditukar kepada logik ketepuan area-level.
- [x] Peta sudah ada polygon overlay asas melalui GeoJSON kawasan kajian.

### Masih perlu dibuat

- [ ] Model data indikator penuh seperti `capacity_indicators`, `capacity_indicator_values`, `management_capability_scores`, `correction_factors` dan `capacity_scenarios`.
- [ ] Pengiraan `CF` dan `MC` terus daripada indikator metodologi penuh, bukan hanya factor master data awal.
- [ ] Layer polygon sebenar untuk guna tanah semasa, zoning, komited dan lapisan analisis spatial lain.
- [ ] Layer catalog, metadata layer, topology validation dan spatial overlay yang selari dengan Jilid IV.
- [ ] Modul `Cadangan Pembangunan` untuk semakan projek, polygon, HVI, KSAS, kesesuaian tanah dan impak kepada kapasiti.
- [ ] Workflow ulasan/syarat awal untuk PBT, JPW dan semakan pembangunan.
- [ ] Dashboard pemantauan rasmi yang fokus kepada watchlist ketepuan, data freshness dan kelengkapan indikator.

### Masih perlu pengesahan client atau data sumber

- [ ] Sahkan formula operasi muktamad `PCC`, `RCC` dan `ECC`, termasuk konflik kecil dalam teks Jilid III.
- [ ] Sahkan sama ada outlier workbook, terutama beberapa baris Zoning Lojing, ialah manual override atau ralat data.
- [ ] Sahkan sama ada threshold ketepuan `70%` dan `100%` diterima sebagai dasar operasi rasmi.
- [ ] Dapatkan shapefile atau geodatabase sebenar, bukan hanya rujukan PDF.
- [ ] Dapatkan data agensi untuk indikator alam sekitar, utiliti, tadbir urus, ekonomi, pelancongan dan lain-lain.
- [ ] Tetapkan governance untuk siapa boleh upload, semak dan luluskan indikator.

## Kesimpulan

Laporan client sangat berguna dan patut dijadikan blueprint metodologi. Sistem CCAP kita sekarang sudah berada pada landasan yang betul, tetapi masih pada tahap analytics/dashboard berasaskan data siap import. Untuk benar-benar selari dengan RW CEKAL, fokus seterusnya patut beralih kepada formula engine, data indikator, GIS polygon layer, dan workflow semakan pembangunan.

Cadangan praktikal: jangan buang sistem sedia ada. Jadikan Angular + backend + PostGIS sebagai core, kemudian tambah calculation engine dan GIS layer secara berfasa. Superset kekal sebagai BI tambahan sahaja.
