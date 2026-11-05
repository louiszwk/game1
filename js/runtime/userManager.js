/**
 * 用户管理器 (User Manager) —— 用户体系与微信云开发持久化
 *
 * 【需求 2.0 —— 云端用户体系与全域跨端持久化】
 * 1. 基于 _openid 的自动化无感用户建档，跨设备登录自动漫游。
 * 2. 离线优先（Local-First）：本地 Storage 0ms 极速读写，云端异步增量节流同步。
 * 3. 微信小游戏 原生授权按钮（wx.createUserInfoButton）无缝同步玩家头像与昵称。
 * 4. 彻底的无云环境静默降级（Graceful Degradation），无云开发时不崩溃、不报错。
 */

import eventBus from '../base/eventBus';

let instance;

const USER_STORAGE_KEY = 'animal_vs_alien_user_v2';
const DEFAULT_CLOUD_ENV = 'animal-vs-alien-prod'; // 默认云开发环境标识（可在 wx.cloud 开通后替换）

export default class UserManager {
  constructor() {
    if (instance) return instance;
    instance = this;

    // 用户基础数据档案
    this.user = {
      userId: this._generateFallbackId(),
      openid: null,
      nickname: '星际特工 #' + Math.floor(1000 + Math.random() * 9000),
      avatarUrl: '',
      isAuthorized: false,
      createTime: Date.now(),
      lastLoginTime: Date.now(),
      totalPlayCount: 0,
      totalPlaySeconds: 0,
    };

    this.cloudReady = false;
    this.cloudDb = null;
    this.authBtn = null;
    this._saveTimer = null;
    this._sessionStartTime = Date.now();

    // 1. 本地立即恢复
    this.loadLocal();

    // 2. 尝试无感连接微信云开发
    this.initCloud();

    // 3. 监听切后台自动存盘
    try {
      if (typeof wx !== 'undefined' && wx.onHide) {
        wx.onHide(() => this.flushSync());
      }
    } catch (e) {}
  }

  _generateFallbackId() {
    return 'anon_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * 本地读取
   */
  loadLocal() {
    try {
      let saved = null;
      if (typeof wx !== 'undefined' && wx.getStorageSync) {
        saved = wx.getStorageSync(USER_STORAGE_KEY);
      } else if (typeof localStorage !== 'undefined') {
        const str = localStorage.getItem(USER_STORAGE_KEY);
        saved = str ? JSON.parse(str) : null;
      }

      if (saved && typeof saved === 'object') {
        this.user.userId = saved.userId || this.user.userId;
        this.user.openid = saved.openid || this.user.openid;
        this.user.nickname = saved.nickname || this.user.nickname;
        this.user.avatarUrl = saved.avatarUrl || this.user.avatarUrl;
        this.user.isAuthorized = Boolean(saved.isAuthorized);
        this.user.createTime = saved.createTime || this.user.createTime;
        this.user.lastLoginTime = Date.now();
        this.user.totalPlayCount = saved.totalPlayCount || 0;
        this.user.totalPlaySeconds = saved.totalPlaySeconds || 0;
      }
    } catch (e) {}
  }

  /**
   * 本地保存
   */
  saveLocal() {
    try {
      if (typeof wx !== 'undefined' && wx.setStorageSync) {
        wx.setStorageSync(USER_STORAGE_KEY, this.user);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.user));
      }
    } catch (e) {}
  }

  /**
   * 初始化微信云开发（纯静默、零打扰、失败无缝降级）
   */
  async initCloud() {
    try {
      if (typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.init !== 'function') {
        return;
      }

      wx.cloud.init({
        env: DEFAULT_CLOUD_ENV,
        traceUser: true,
      });

      this.cloudDb = wx.cloud.database();
      this.cloudReady = true;

      // 异步拉取云端用户信息与成就档案
      await this.syncFromCloud();
    } catch (err) {
      // 云开发环境未开通或断网，静默使用纯本地模式
      this.cloudReady = false;
    }
  }

  /**
   * 从云端拉取用户档案并合并
   */
  async syncFromCloud() {
    if (!this.cloudReady || !this.cloudDb) return;
    try {
      const res = await this.cloudDb.collection('users').limit(1).get();
      if (res && res.data && res.data.length > 0) {
        const cloudUser = res.data[0];
        if (cloudUser._openid) this.user.openid = cloudUser._openid;
        // 如果云端已有授权信息，合并至本地
        if (cloudUser.isAuthorized && cloudUser.nickname) {
          this.user.nickname = cloudUser.nickname;
          this.user.avatarUrl = cloudUser.avatarUrl || '';
          this.user.isAuthorized = true;
        }
        // 局数与时长取本地与云端最大值
        this.user.totalPlayCount = Math.max(this.user.totalPlayCount, cloudUser.totalPlayCount || 0);
        this.user.totalPlaySeconds = Math.max(this.user.totalPlaySeconds, cloudUser.totalPlaySeconds || 0);
        this.saveLocal();
      } else {
        // 云端尚无记录，首次写入用户主档
        await this.cloudDb.collection('users').add({
          data: {
            nickname: this.user.nickname,
            avatarUrl: this.user.avatarUrl,
            isAuthorized: this.user.isAuthorized,
            createTime: this.cloudDb.serverDate ? this.cloudDb.serverDate() : new Date(),
            lastLoginTime: this.cloudDb.serverDate ? this.cloudDb.serverDate() : new Date(),
            totalPlayCount: this.user.totalPlayCount,
            totalPlaySeconds: this.user.totalPlaySeconds,
          },
        });
      }
    } catch (e) {
      // 容错处理
    }
  }

  /**
   * 记录一局完成（局数 + 1，累加本次游玩时长秒数）
   * @param {number} playSeconds 本局时长（秒）
   */
  recordBattleFinished(playSeconds = 0) {
    this.user.totalPlayCount++;
    this.user.totalPlaySeconds += Math.max(1, Math.round(playSeconds));
    this.saveLocal();
    this.saveCloudThrottled();
  }

  /**
   * 节流异步上传云端
   */
  saveCloudThrottled() {
    if (!this.cloudReady || !this.cloudDb) return;
    if (this._saveTimer) return;

    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.flushSync();
    }, 3000);
  }

  /**
   * 立即冲刷同步至云端
   */
  async flushSync() {
    if (!this.cloudReady || !this.cloudDb) return;
    try {
      const _ = this.cloudDb.command;
      const updateData = {
        lastLoginTime: this.cloudDb.serverDate ? this.cloudDb.serverDate() : new Date(),
        totalPlayCount: this.user.totalPlayCount,
        totalPlaySeconds: this.user.totalPlaySeconds,
        nickname: this.user.nickname,
        avatarUrl: this.user.avatarUrl,
        isAuthorized: this.user.isAuthorized,
      };

      // 尝试更新已有记录
      const res = await this.cloudDb.collection('users').where({}).update({
        data: updateData,
      });

      // 若未匹配到记录则新增
      if (res && res.stats && res.stats.updated === 0) {
        await this.cloudDb.collection('users').add({ data: updateData });
      }
    } catch (e) {}
  }

  /**
   * 创建微信小游戏原生用户信息授权按钮
   * @param {number} x Canvas x
   * @param {number} y Canvas y
   * @param {number} w Width
   * @param {number} h Height
   * @param {Function} onAuthorized 授权成功回调
   */
  createAuthButton(x, y, w, h, onAuthorized) {
    this.destroyAuthButton();

    try {
      if (typeof wx === 'undefined' || typeof wx.createUserInfoButton !== 'function') {
        return;
      }

      this.authBtn = wx.createUserInfoButton({
        type: 'text',
        text: '',
        style: {
          left: Math.round(x),
          top: Math.round(y),
          width: Math.round(w),
          height: Math.round(h),
          lineHeight: Math.round(h),
          backgroundColor: '#00000000', // 全透明，覆盖在 Canvas 自绘按钮上
          color: '#ffffff',
          textAlign: 'center',
          fontSize: 14,
          borderRadius: 6,
          borderWidth: 0,
        },
      });

      this.authBtn.onTap((res) => {
        if (res && res.userInfo) {
          const info = res.userInfo;
          this.user.nickname = info.nickName || this.user.nickname;
          this.user.avatarUrl = info.avatarUrl || this.user.avatarUrl;
          this.user.isAuthorized = true;
          this.saveLocal();
          this.flushSync();

          try {
            eventBus.emit('user:authorized', {
              nickname: this.user.nickname,
              avatarUrl: this.user.avatarUrl,
            });
          } catch (err) {}

          if (typeof onAuthorized === 'function') {
            onAuthorized(this.user);
          }
        }
        this.destroyAuthButton();
      });
    } catch (e) {
      this.destroyAuthButton();
    }
  }

  /**
   * 销毁原生授权按钮（面板关闭时调用）
   */
  destroyAuthButton() {
    if (this.authBtn) {
      try {
        this.authBtn.destroy();
      } catch (e) {}
      this.authBtn = null;
    }
  }

  /**
   * 获取当前展示用的用户信息
   */
  getUserProfile() {
    return {
      userId: this.user.userId,
      openid: this.user.openid,
      nickname: this.user.nickname,
      avatarUrl: this.user.avatarUrl,
      isAuthorized: this.user.isAuthorized,
      playCount: this.user.totalPlayCount,
      playHours: (this.user.totalPlaySeconds / 3600).toFixed(1),
    };
  }
}

