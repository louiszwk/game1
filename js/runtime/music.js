let instance;

/**
 * 统一的音效管理器
 */
export default class Music {
  constructor() {
    if (instance) return instance;

    instance = this;

    const createAudio = () => {
      try {
        if (typeof wx !== 'undefined' && wx.createInnerAudioContext) {
          return wx.createInnerAudioContext();
        }
      } catch (e) {}
      return null;
    };

    this.bgmAudio = createAudio();
    this.shootAudio = createAudio();
    this.boomAudio = createAudio();

    if (this.bgmAudio) {
      this.bgmAudio.loop = true;
      this.bgmAudio.autoplay = true;
      this.bgmAudio.src = 'audio/bgm.mp3';
    }
    if (this.shootAudio) {
      this.shootAudio.src = 'audio/bullet.mp3';
    }
    if (this.boomAudio) {
      this.boomAudio.src = 'audio/boom.mp3';
    }
  }

  playBgm() {
    try {
      if (this.bgmAudio) this.bgmAudio.play();
    } catch (e) {}
  }

  playShoot() {
    try {
      if (this.shootAudio) {
        this.shootAudio.currentTime = 0;
        this.shootAudio.play();
      }
    } catch (e) {}
  }

  playExplosion() {
    try {
      if (this.boomAudio) {
        this.boomAudio.currentTime = 0;
        this.boomAudio.play();
      }
    } catch (e) {}
  }
}
