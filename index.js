const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class Lydown extends EventEmitter {
  download(url, options = {}) {
    const client = new URL(url).protocol === 'https:' ? https : http;
    const outputPath = path.join(options.folder || '.', options.filename || path.basename(url));
    
    const fileStream = fs.createWriteStream(outputPath);
    client.get(url, (response) => {
      const { statusCode } = response;
      const contentLength = parseInt(response.headers['content-length'], 10);
      let receivedBytes = 0;
      const startTime = new Date();
      
      if (statusCode !== 200) {
        this.emit('error', `Request failed. Status code: ${statusCode}`);
        return
      }
      
      response.on('data', (chunk) => {
        receivedBytes += chunk.length;
        const currentTime = new Date();
        
        const elapsed = (currentTime - startTime) / 1000;
        const speed = receivedBytes / elapsed;
        const eta = (contentLength - receivedBytes) / speed;
        const percentage = Math.round((receivedBytes * 100) / contentLength);
        const status = {
          total: humanReadableSize(contentLength),
          receive: humanReadableSize(receivedBytes),
          percent: percentage + '%',
          speed: humanReadableSize(speed) + '/s',
          elapsed: formatTime(elapsed),
          eta: formatTime(eta)
        };
        this.emit('progress', status);
        fileStream.write(chunk);
      });
      response.on('error', (err) => {
        this.emit('error', `Error while downloading: ${err.message}`);
      });
      fileStream.on('error', (err) => {
        this.emit('error', `Error while writing: ${err.message}`);
      });
      response.on('end', () => {
        fileStream.end();
        const status = {
          name: outputPath,
          size: humanReadableSize(contentLength),
          elapsed: formatTime(elapsed)
        };
        this.emit('end', status);
      });
    });
  }
}

function humanReadableSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1000 && unitIndex < units.length - 1) {
    size /= 1000;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatTime(seconds) {
  // Fungsi untuk mengonversi waktu dalam detik menjadi format HH:mm:ss
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

module.exports = Lydown;