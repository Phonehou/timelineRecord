// app.js
import config from './config';
import Mock from './mock/index';
import createBus from './utils/eventBus';
import { connectSocket, fetchUnreadNum } from './mock/chat';

if (config.isMock) {
  Mock();
}

App({
  onLaunch() {
    /** ===============================
     *  云开发初始化（必须最先执行）
     * =============================== */
    if (wx.cloud) {
      wx.cloud.init({
        env: 'timeline-8gl4rpkx2302cfad', 
        traceUser: true,
      });
    } else {
      console.error('当前基础库不支持云开发');
    }

    /** ===============================
     *  小程序更新机制
     * =============================== */
    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate(() => {});

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        },
      });
    });

    /** ===============================
     *  业务初始化
     * =============================== */
    this.getUnreadNum();
    this.connect();
  },

  globalData: {
    userInfo: null,
    unreadNum: 0, // 未读消息数量
    socket: null, // SocketTask 对象
  },

  /** 全局事件总线 */
  eventBus: createBus(),

  /** 初始化 WebSocket */
  connect() {
    const socket = connectSocket();
    socket.onMessage((data) => {
      data = JSON.parse(data);
      if (data.type === 'message' && !data.data.message.read) {
        this.setUnreadNum(this.globalData.unreadNum + 1);
      }
    });
    this.globalData.socket = socket;
  },

  /** 获取未读消息数量 */
  getUnreadNum() {
    fetchUnreadNum().then(({ data }) => {
      this.globalData.unreadNum = data;
      this.eventBus.emit('unread-num-change', data);
    });
  },

  /** 设置未读消息数量 */
  setUnreadNum(unreadNum) {
    this.globalData.unreadNum = unreadNum;
    this.eventBus.emit('unread-num-change', unreadNum);
  },
});