const fs = require('fs-extra');
const path = require('path');

const source = path.join(__dirname, '.next', 'static');
const target = path.join(__dirname, 'out');

async function copyToOut() {
  try {
    console.log('🚀 Menyalin file ke folder out untuk Nginx...');
    
    // Buat folder out jika belum ada
    await fs.ensureDir(target);
    
    // Copy static files
    if (await fs.pathExists(source)) {
      await fs.copy(source, target, { overwrite: true });
      console.log('✅ Folder out berhasil dibuat dan diisi dengan file static.');
    } else {
      console.log('⚠️ Folder .next/static tidak ditemukan. Build mungkin gagal.');
    }
    
    // Copy public folder jika ada
    const publicDir = path.join(__dirname, 'public');
    if (await fs.pathExists(publicDir)) {
      await fs.copy(publicDir, target, { overwrite: true });
      console.log('✅ File dari public folder juga disalin.');
    }
    
    console.log('🎉 Selesai! Folder out siap digunakan di Nginx.');
  } catch (err) {
    console.error('❌ Error saat membuat folder out:', err.message);
    process.exit(1);
  }
}

copyToOut();
