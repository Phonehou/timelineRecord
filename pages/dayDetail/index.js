// pages/day-detail/index.js

Page({
  data: {
    dayId: '',
    mode: 'view', // view | edit

    // ===== Day 数据 =====
    originFiles: [],
    summary: '',
    tags: [],
    location: null,
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

  // computeWeekIndex(dateStr) {
  //   const date = new Date(dateStr);
  //   const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  //   const dayOfYear = Math.floor((date - firstDayOfYear) / (24*60*60*1000)) + 1;
  //   return Math.ceil(dayOfYear / 7);
  // },

  computeWeekIndex(dateStr) {
    const date = new Date(dateStr);
    const d = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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

    // 保存快照
    this._backup = {
      day: { ...day },
      events: day.events.map(e => ({ ...e }))
    };

    this.setData({
      originFiles: (day.images || []).map(i => ({
        url: i.url,
        name: '',
        type: i.type || 'image',
      })),
      summary: day.summary || '',
      tags: day.tags || [],
      location: day.location || null,
      date: day.date || '',
      //weekIndex: day.weekIndex || 0,
      weekIndex: day.weekIndex || this.computeWeekIndex(day.date),
      dayLabel: day.dayLabel || '',
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

  // async uploadImages(files) {
  //   const uploads = files.map((file, index) => {
  //     const ext = file.url.match(/\.\w+$/)?.[0] || '.jpg';
  //     const cloudPath = `days/${Date.now()}_${index}${ext}`;
  
  //     return wx.cloud.uploadFile({
  //       cloudPath,
  //       filePath: file.url,
  //     });
  //   });
  
  //   const res = await Promise.all(uploads);
  //   return res.map(r => r.fileID);
  // },

  uploadImages(files) {
    const tasks = files.map((file, index) => {
      const ext = file.url.match(/\.\w+$/)?.[0] || '.jpg';
      const cloudPath = `days/${Date.now()}_${index}${ext}`;
  
      return wx.cloud.uploadFile({
        cloudPath,
        filePath: file.url
      });
    });
  
    return Promise.all(tasks).then(res =>
      res.map(r => r.fileID)
    );
  },

  getNeedUploadFiles(files) {
    return files.filter(f => f.url.startsWith('http://tmp'));
  },

  async buildDayDiff() {
    const { summary, location, originFiles } = this.data;
    const dayDiff = {};
    const backup = this._backup?.day || {};
  
    if (summary !== backup.summary) dayDiff.summary = summary;
    // if (location !== backup.location) dayDiff.location = location;
    if (JSON.stringify(location) !== JSON.stringify(backup.location)) {
      dayDiff.location = location
    }
    // const imageFileIds = await this.uploadImages(originFiles);
    // if (JSON.stringify(originFiles) !== JSON.stringify(backup.images)) {
      // dayDiff.images = originFiles.map((f, index) => ({
      //   url: f.url,
      //   type: f.type || 'image',
      //   order: index
      // }));
    //  
     // ===== images =====

    // 1️⃣ 旧图片 cloud url 列表
    const oldUrls = (backup.images || []).map(img => img.url);

    // 2️⃣ 当前图片：区分 tmp / cloud
    const needUpload = originFiles.filter(f => f.url.startsWith('http://tmp'));
    const alreadyUploaded = originFiles.filter(f => f.url.startsWith('cloud://'));
    
    // 3️⃣ 上传新图片（只上传 tmp）
    let uploadedFileIds = [];
    if (needUpload.length > 0) {
      uploadedFileIds = await this.uploadImages(needUpload);
    }

      // 4️⃣ 组装最终 url 列表（保持顺序）
    const finalUrls = originFiles.map(f => {
      if (f.url.startsWith('cloud://')) return f.url;
      return uploadedFileIds.shift(); // 按顺序消费
    });
    // 5️⃣ diff 判断（核心）
    if (JSON.stringify(finalUrls) !== JSON.stringify(oldUrls)) {
      dayDiff.images = finalUrls.map((url, index) => ({
        url,
        type: 'image',
        order: index
      }));
    }

    return dayDiff;
  },
  
  buildEventDiff() {
    const { events } = this.data;
    const backupEvents = this._backup?.events || [];
  
    const updates = [];
    const deletes = [];
  
    events.forEach((e, index) => {
      if (e._local?.isDeleted) {
        if (e._id) deletes.push(e._id);
        return;
      }
  
      if (e._local?.isNew) {
        // 新增事件
        updates.push({
          _local: true,
          title: e.title || '',
          description: e.description || '',
          time: e.time || '',
          status: e.status || 'todo',
          order: index
        });
        return;
      }
  
      // 对比已有事件
      const backup = backupEvents.find(b => b._id === e._id);
      if (!backup) return;
  
      const changed = {};
      if (e.title !== backup.title) changed.title = e.title;
      if (e.description !== backup.description) changed.description = e.description;
      if (e.time !== backup.time) changed.time = e.time;
      if (e.status !== backup.status) changed.status = e.status;
      if (index !== backup.order) changed.order = index;
  
      if (Object.keys(changed).length) {
        updates.push({ _id: e._id, ...changed });
      }
    });
  
    return { updates, deletes };
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

  // gotoMap() {
  //   wx.showToast({ title: '选择位置', icon: 'none' });
  // },
  gotoMap() {
    wx.chooseLocation({
      type: 'wgs84', // 默认为 wgs84 坐标
      success: (res) => {
        // res 包含 name, address, latitude, longitude
        console.log('选中位置:', res);
        this.setData({
          location: {
            name: res.name || '',
            address: res.address || '',
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
        wx.showToast({
          title: '位置已选择',
          icon: 'success',
          duration: 1500
        });
      },
      fail: (err) => {
        console.error('选择位置失败', err);
        wx.showToast({
          title: '取消选择',
          icon: 'none'
        });
      }
    });
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
    const dayUpdates = await this.buildDayDiff();
    const { updates: eventUpdates, deletes: eventDeletes } = this.buildEventDiff();

    if (!Object.keys(dayUpdates).length && !eventUpdates.length && !eventDeletes.length) {
      wx.showToast({ title: '没有修改内容', icon: 'none' });
      this.setData({ mode: 'view' });
      return;
    }
    //if (!this.hasChanged()) {
    //   wx.showToast({ title: '未修改内容', icon: 'none' })
    //   this.setData({ mode: 'view' })
    //   return
    // }
    //if (this._saving) return
    //this._saving = true
  
    wx.showLoading({ title: '保存中...' })
  
    try {
      // const { dayId, summary, location, originFiles, events } = this.data
  
      // const payload = {
      //   dayId,
      //   summary,
      //   location,
      //   images: originFiles,
      //   events: this.buildEventsForSubmit(events)
      // }
  
      await wx.cloud.callFunction({
        name: 'update-day-with-events',
        //data: payload
        data: { dayId: this.data.dayId, dayUpdates, eventUpdates, eventDeletes }
      })
  
      wx.showToast({ title: '已保存', icon: 'success' })
  
      this.setData({ mode: 'view' })
      this._backup = null  // 清理快照
  
    } catch (err) {
      console.error(err)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
      //this._saving = false
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
  // 事件字段修改
  onEventTitleChange(e) {
    const index = e.currentTarget.dataset.index;
    const events = this.data.events;
  
    events[index].title = e.detail.value;
    events[index]._local = {
      ...events[index]._local,
      isDirty: true
    };
  
    this.setData({ events });
  },
  onEventDescChange(e) {
    const index = e.currentTarget.dataset.index;
    const events = this.data.events;
    events[index].description = e.detail.value;
    events[index]._local = { ...events[index]._local, isDirty: true };
    this.setData({ events });
  },
  onEventTimeChange(e) {
    const index = e.currentTarget.dataset.index;
    const events = this.data.events;
    events[index].time = e.detail.value;
    events[index]._local = { ...events[index]._local, isDirty: true };
    this.setData({ events });
  }
});