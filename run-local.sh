#!/bin/bash

echo "🌳 Memulai Silsilah Keluarga (Mode Lokal)"
echo "=========================================="

# Hentikan proses yang mungkin masih berjalan
echo "🔄 Membersihkan proses lama..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f vite 2>/dev/null || true
pkill -f uvicorn 2>/dev/null || true
sleep 2

# Jalankan frontend
echo "🚀 Menjalankan aplikasi..."
cd /root/keluarga/frontend
npm run dev &

echo ""
echo "✅ Aplikasi siap!"
echo "📱 Buka browser: http://localhost:1420"
echo ""
echo "📝 Catatan:"
echo "- Data disimpan di browser (localStorage)"
echo "- Tidak memerlukan backend/server"
echo "- Semua data tersimpan di komputer Anda"
echo ""
echo "Tekan Ctrl+C untuk menghentikan aplikasi"

# Tunggu sampai user menekan Ctrl+C
wait