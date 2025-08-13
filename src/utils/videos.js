import fs from 'fs';
import path from 'path';

/**
 * Video Manager for Panoptical
 * Handles video file operations and cleanup
 */
export class VideoManager {
  constructor() {
    this.artifactsDir = './artifacts';
    this.videosDir = './artifacts/videos';
    this.failuresDir = path.join(this.videosDir, 'failures');
    this.ensureVideosDir();
  }

  /**
   * Ensure videos directory exists
   */
  ensureVideosDir() {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
    if (!fs.existsSync(this.videosDir)) {
      fs.mkdirSync(this.videosDir, { recursive: true });
    }
    if (!fs.existsSync(this.failuresDir)) {
      fs.mkdirSync(this.failuresDir, { recursive: true });
    }
  }

  /**
   * Get video file path
   * @param {string} filename - Video filename
   * @returns {string} Full path to video file
   */
  getVideoPath(filename) {
    return path.join(this.failuresDir, filename);
  }

  /**
   * List all failure videos
   * @returns {string[]} Array of video filenames
   */
  listVideos() {
    if (!fs.existsSync(this.failuresDir)) {
      return [];
    }
    
    const files = fs.readdirSync(this.failuresDir);
    return files.filter(f => f.endsWith('.mp4') || f.endsWith('.webm'));
  }

  /**
   * List all videos (including temporary ones)
   * @returns {string[]} Array of all video filenames
   */
  listAllVideos() {
    const allVideos = [];
    
    // Check failures directory
    if (fs.existsSync(this.failuresDir)) {
      const failureFiles = fs.readdirSync(this.failuresDir);
      allVideos.push(...failureFiles.filter(f => f.endsWith('.mp4') || f.endsWith('.webm')));
    }
    
    // Check main videos directory for temporary files
    if (fs.existsSync(this.videosDir)) {
      const mainFiles = fs.readdirSync(this.videosDir);
      const tempFiles = mainFiles.filter(f => (f.endsWith('.mp4') || f.endsWith('.webm')) && !f.includes('failures'));
      allVideos.push(...tempFiles);
    }
    
    return allVideos;
  }

  /**
   * Clean old videos, keeping only the most recent ones
   * @param {number} maxFiles - Maximum number of files to keep
   */
  cleanOldVideos(maxFiles = 10) {
    const videos = this.listVideos();
    
    if (videos.length <= maxFiles) {
      return;
    }

    const sortedVideos = videos
      .map(filename => ({
        filename,
        path: this.getVideoPath(filename),
        mtime: fs.statSync(this.getVideoPath(filename)).mtime
      }))
      .sort((a, b) => a.mtime - b.mtime);

    const videosToRemove = sortedVideos.slice(0, videos.length - maxFiles);
    
    videosToRemove.forEach(video => {
      try {
        fs.unlinkSync(video.path);
      } catch (error) {
        console.warn(`Could not remove video ${video.filename}: ${error.message}`);
      }
    });

    console.log(`Cleaned up ${videosToRemove.length} old videos`);
  }

  /**
   * Force cleanup all videos
   */
  forceCleanup() {
    const videos = this.listVideos();
    const allVideos = this.listAllVideos();
    
    if (allVideos.length === 0) {
      console.log('No videos to clean up');
      return;
    }

    // Clean up failure videos
    videos.forEach(filename => {
      try {
        const videoPath = this.getVideoPath(filename);
        fs.unlinkSync(videoPath);
        console.log(`Removed failure video: ${filename}`);
      } catch (error) {
        console.warn(`Could not remove video ${filename}: ${error.message}`);
      }
    });

    // Clean up temporary videos in main directory
    const tempVideos = allVideos.filter(f => !videos.includes(f));
    tempVideos.forEach(filename => {
      try {
        const videoPath = path.join(this.videosDir, filename);
        fs.unlinkSync(videoPath);
        console.log(`Removed temporary video: ${filename}`);
      } catch (error) {
        console.warn(`Could not remove temporary video ${filename}: ${error.message}`);
      }
    });

    console.log(`Cleaned up ${allVideos.length} videos total`);
  }

  /**
   * Clean videos older than specified days
   * @param {number} daysOld - Remove videos older than this many days
   */
  cleanByAge(daysOld = 1) {
    const videos = this.listVideos();
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    let removedCount = 0;
    
    videos.forEach(filename => {
      try {
        const videoPath = this.getVideoPath(filename);
        const stats = fs.statSync(videoPath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(videoPath);
          console.log(`Removed old video: ${filename}`);
          removedCount++;
        }
      } catch (error) {
        console.warn(`Could not process video ${filename}: ${error.message}`);
      }
    });

    if (removedCount === 0) {
      console.log(`No videos older than ${daysOld} day(s) found`);
    } else {
      console.log(`Cleaned up ${removedCount} videos older than ${daysOld} day(s)`);
    }
  }

  /**
   * Get video statistics
   * @returns {Object} Video statistics
   */
  getStats() {
    const videos = this.listVideos();
    let totalSize = 0;
    
    videos.forEach(filename => {
      try {
        const videoPath = this.getVideoPath(filename);
        const stats = fs.statSync(videoPath);
        totalSize += stats.size;
      } catch (error) {
        // Skip files that can't be stat'd
      }
    });

    return {
      count: videos.length,
      totalSize: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      directory: this.failuresDir
    };
  }
}
