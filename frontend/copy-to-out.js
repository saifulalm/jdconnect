const fs = require('fs-extra');
const path = require('path');

const source = path.join(__dirname, '.next', 'static');
const target = path.join(__dirname, 'out');

async function copyToOut() {
  try {
    console.log('🚀 Menyalin file static ke folder out untuk Nginx...');
    
    if (fs.existsSync(source)) {
      await fs.copy(source, target, { overwrite: true });
      console.log('✅ Folder out berhasil dibuat dan diisi!');
      
      // Buat index.html sederhana jika belum ada
      const indexPath = path.join(target, 'index.html');
      if (!fs.existsSync(indexPath)) {
        await fs.writeFile(indexPath, '<h1>Frontend berhasil di-build untuk Nginx</h1>');
        console.log('📄 File index.html contoh dibuat');
      }
    } else {
      console.log('⚠️ Folder .next/static tidak ditemukan. Jalankan npm run build terlebih dahulu.');
    }
  } catch (err) {
    console.error('❌ Error saat membuat folder out:', err.message);
    process.exit(1);
  }
}

copyToOut();
