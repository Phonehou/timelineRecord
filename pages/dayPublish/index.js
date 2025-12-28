// pages/day-publish/index.js
Page({
  data: {
    // ===== Day 数据 =====
    timescaleId: '',
    originFiles: [],
    summary: '',
    tags: [],
    tagInput: '',
    location: null,
    date: '',           // 新增日期字段
    weekIndex: 0,       // 第几周
    dayLabel: '',       // 周一 / Mon
    events: [],
    mode: 'edit', 
    // t-date-time-picker 控制
    pickerVisible: false,
    pickerStart: '2020-01-01',    // 可选起始日期
    pickerEnd: '2030-12-31',      // 可选结束日期
    pickerValue: '',               // 选中的值
    // ===== UI 配置（复用发布页）=====
    gridConfig: { column: 4, width: 160, height: 160 }
  },

  onLoad() {},

  /** 上传图片 */
  handleSuccess(e) {
    this.setData({ originFiles: e.detail.files });
  },
  handleRemove(e) {
    const files = this.data.originFiles;
    files.splice(e.detail.index, 1);
    this.setData({ originFiles: files });
  },

  /** 总结输入 */
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

  /** 添加事件 */
  addEvent() {
    const events = this.data.events;
    events.push({ title: '', description: '', time: '', status: 'todo', _local: { isNew: true } });
    this.setData({ events });
  },

  removeEvent(e) {
    const index = e.currentTarget.dataset.index;
    const events = this.data.events;
    events.splice(index, 1);
    this.setData({ events });
  },

  onTagInputChange(e) {
    this.setData({
      tagInput: e.detail.value.trim()
    });
  },

  addTag() {
    const { tagInput, tags } = this.data;
    if (!tagInput) return;
  
    if (tags.includes(tagInput)) {
      wx.showToast({ title: '标签已存在', icon: 'none' });
      return;
    }
  
    this.setData({
      tags: [...tags, tagInput],
      tagInput: ''
    });
  },

  removeTag(e) {
    const index = e.currentTarget.dataset.index;
    const tags = [...this.data.tags];
    tags.splice(index, 1);
    this.setData({ tags });
  },

  onEventTitleChange(e) {
    const index = e.currentTarget.dataset.index;
    const events = this.data.events;
    events[index].title = e.detail.value;
    this.setData({ events });
  },
  onEventDescChange(e) {
    const index = e.currentTarget.dataset.index;
    const events = this.data.events;
    events[index].description = e.detail.value;
    this.setData({ events });
  },
  onEventTimeChange(e) {
    const index = e.currentTarget.dataset.index;
    const events = this.data.events;
    events[index].time = e.detail.value;
    this.setData({ events });
  },
  onDateChange(e) {
    const date = e.detail.value; // yyyy-mm-dd
    const weekIndex = this.computeWeekIndex(date);
    const dayLabel = this.computeDayLabel(date);
  
    this.setData({ date, weekIndex, dayLabel });
  },
  
  // 显示选择器
  showPicker() {
    if (this.data.mode !== 'edit') return;
    this.setData({
      pickerVisible: true,
      pickerValue: this.data.date
    });
  },

  // 隐藏选择器
  hidePicker() {
    this.setData({ pickerVisible: false });
  },

  // 选择器确认/改变事件
  onPickerChange(e) {
    const date = e.detail.value;   // yyyy-mm-dd
    const weekIndex = this.computeWeekIndex(date);
    const dayLabel = this.computeDayLabel(date);

    this.setData({
      date,
      weekIndex,
      dayLabel,
      pickerVisible: false
    });
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
  computeDayLabel(dateStr) {
    const days = ['日','一','二','三','四','五','六'];
    const date = new Date(dateStr);
    return `周${days[date.getDay()]}`;
  },
  /** 提交 Day + Events */
  async publishDay() {
    const { timescaleId, summary, originFiles, location, events, tags, date,
      weekIndex,
      dayLabel } = this.data;
    if (!date) {
        wx.showToast({ title: '请选择日期', icon: 'none' });
        return;
    }
    if (!summary && originFiles.length === 0 && events.length === 0) {
      wx.showToast({ title: '请填写内容', icon: 'none' });
      return;
    }
    let loadingShown = false;
    
    try {
      wx.showLoading({ title: '发布中...' });
      loadingShown = true;
      const payload = {
        timescaleId: this.data.timelineId || '',
        date,
        weekIndex,
        dayLabel,
        summary,
        location,
        tags,
        images: originFiles.map((f, index) => ({
          url: f.url,
          type: f.type || 'image',
          order: index
        })),
        events: events.map((e, index) => ({
          title: e.title,
          description: e.description,
          time: e.time,
          status: e.status || 'todo',
          order: index
        }))
      };

      const res = await wx.cloud.callFunction({
        name: 'add-day-with-events',
        data: payload
      });

      if (res.result?.code === 0) {
        wx.showToast({ title: '发布成功', icon: 'success' });
        wx.navigateBack();
      } else {
        wx.showToast({ title: res.result?.message || '发布失败', icon: 'error' });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '发布失败', icon: 'error' });
    } finally {
      if (loadingShown) {
        wx.hideLoading();
      }
    }
  }
});