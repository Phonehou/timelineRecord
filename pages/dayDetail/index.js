// pages/day-detail/index.js

Page({
  data: {
    dayId: '',
    mode: 'view', // view | edit

    // ===== Day 数据 =====
    originFiles: [],
    summary: '',
    tags: [],
    location: '',
    events: [],

    // ===== UI 配置（复用发布页）=====
    gridConfig: {
      column: 4,
      width: 160,
      height: 160,
    },
  },

  onLoad(options) {
    console.log('day-detail options:', options);
    const { dayId } = options;
    this.setData({ dayId });
    this.fetchDayDetail(dayId);
  },

  /** 拉取 Day 详情 */
  async fetchDayDetail(dayId) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'get-day-detail',
      data: { dayId },
    });

    const result = res.result;

    // 关键：先判断 code
    if (!result || result.code !== 0) {
      wx.showToast({
        title: result?.message || '加载失败',
        icon: 'none',
      });
      return;
    }

    const day = result.data || {};

    this.setData({
      originFiles: (day.images || []).map(i => ({
        url: i.url,
        name: '',
        type: i.type || 'image',
      })),
      summary: day.summary || '',
      tags: day.tags || [],
      location: day.location || '',
      events: day.events || [],
    });
    } catch (err) {
      console.error('fetchDayDetail error:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none',
      });
    }
  },

  /** 切换编辑模式 */
  toggleEdit() {
    this.setData({
      mode: this.data.mode === 'view' ? 'edit' : 'view',
    });
  },

  /** 上传相关（复用发布页） */
  handleSuccess(e) {
    this.setData({ originFiles: e.detail.files });
  },

  handleRemove(e) {
    const files = this.data.originFiles;
    files.splice(e.detail.index, 1);
    this.setData({ originFiles: files });
  },

  onSummaryChange(e) {
    this.setData({ summary: e.detail.value });
  },

  gotoMap() {
    wx.showToast({ title: '选择位置', icon: 'none' });
  },

  enterEdit() {
    this._backup = JSON.parse(JSON.stringify(this.data))
    this.setData({ mode: 'edit' })
  },

  cancelEdit() {
    this.setData({
      ...this._backup,
      mode: 'view'
    })
    this._backup = null
  },

  hasChanged() {
    return JSON.stringify(this.data) !== JSON.stringify(this._backup)
  },
  buildEventsForSubmit(events) {
    return events
      .filter(e => !e._local?.isDeleted)
      .map((e, index) => ({
        _id: e._id,              // 已有事件才有
        title: e.title || '',
        description: e.description || '',
        time: e.time || '',
        status: e.status || 'todo',
        order: index
      }))
  },
  /** 保存修改 */
  async saveEditDayInfo() {
    await wx.cloud.callFunction({
      name: 'update-day',
      data: {
        dayId: this.data.dayId,
        summary: this.data.summary,
        images: this.data.originFiles.map((f, index) => ({
          url: f.url,
          type: f.type || 'image',
          order: index,
        })),
      },
    });

    wx.showToast({ title: '已保存' });
    this.setData({ mode: 'view' });
  },

  async saveEdit() {
    if (!this.hasChanged()) {
      wx.showToast({ title: '未修改内容', icon: 'none' })
      this.setData({ mode: 'view' })
      return
    }
    if (this._saving) return
    this._saving = true
  
    wx.showLoading({ title: '保存中...' })
  
    try {
      const { dayId, summary, location, originFiles, events } = this.data
  
      const payload = {
        dayId,
        summary,
        location,
        images: originFiles,
        events: this.buildEventsForSubmit(events)
      }
  
      await wx.cloud.callFunction({
        name: 'update-day-with-events',
        data: payload
      })
  
      wx.showToast({ title: '已保存', icon: 'success' })
  
      this.setData({ mode: 'view' })
      this._backup = null
  
    } catch (err) {
      console.error(err)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
      this._saving = false
    }
  },

  addEvent() {
    const events = this.data.events;
  
    events.push({
      title: '',
      description: '',
      time: '',
      _local: { isNew: true }
    });
  
    this.setData({ events });
  },
  // 软删除
  removeEvent(e) {
    const index = e.currentTarget.dataset.index;
    const events = this.data.events;
  
    if (events[index]._id) {
      events[index]._local = {
        ...events[index]._local,
        isDeleted: true
      };
    } else {
      events.splice(index, 1);
    }
  
    this.setData({ events });
  },
  // 标记修改（脏标记）
  onEventTitleChange(e) {
    const index = e.currentTarget.dataset.index;
    const events = this.data.events;
  
    events[index].title = e.detail.value;
    events[index]._local = {
      ...events[index]._local,
      isDirty: true
    };
  
    this.setData({ events });
  }
});