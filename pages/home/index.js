//import Message from 'tdesign-miniprogram/message/index';
import request from '~/api/request';

Page({
  data: {
    enable: false,
    swiperList: [],
    cardInfo: [],
    weeks: [], // [{week:"周一", days:[{day:"12.9", events:[...]}, ...]}, ...]
    timelineId: [],
     // ===== 我的关注 =====
    followTimelines: [],
    followLoaded: false,   // 是否已加载过
  },

  async onReady() {
    const [cardRes, swiperRes] = await Promise.all([
      request('/home/cards').then((res) => res.data),
      request('/home/swipers').then((res) => res.data),
    ]);

    this.setData({
      cardInfo: cardRes.data,
      focusCardInfo: cardRes.data.slice(0, 3),
      swiperList: swiperRes.data,
    });
  },

  onLoad() {
    this.fetchTimeline();
  },

  onTabChange(e) {
    const { value } = e.detail;
    console.log('tab change:', value);
  
    if (value === 'follow' && !this.data.followLoaded) {
      this.fetchFollowTimelines();
    }
  },

  async fetchFollowTimelines() {
    try {
      wx.showLoading({ title: '加载中...' });
  
      const res = await wx.cloud.callFunction({
        name: 'get-followed-timescales'
      });
  
      if (res.result?.code !== 0) {
        wx.showToast({
          title: res.result?.message || '加载失败',
          icon: 'none'
        });
        return;
      }
  
      this.setData({
        followTimelines: res.result.data || [],
        followLoaded: true
      });
  
    } catch (err) {
      console.error('fetchFollowTimelines error:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  async fetchTimeline() {
    try {
      console.log('callFunction timelines');
      // const res = await wx.cloud.callFunction({
      //   name: 'get-timelines',
      //   data: { timelineId: '8d4e1b05695153900127d4cb2ca36cba' }
      // });
      const res = await wx.cloud.callFunction({
        name: 'get-user-timelines',
      });
      //this.timelineId = res.result.data.timeline._id;
      this.setData({
        timelineId: res.result.data.timeline._id
      });
      console.log('receive timelines result', res);
       // 如果没有返回数据，提前处理
      if (!res.result || !res.result.data) {
        wx.showToast({
          title: res.result?.message || '未找到时间轴',
          icon: 'none'
        });
        return;
      }
      console.log('weeks first day info:', res.result.data.weeks[0].days[0]);
      // console.log('weeks first day images:', res.result.data.weeks[0].days[0].images);
      // res.result.data.weeks[0].days[0].imagesList = ['/static/home/card0.png', '/static/home/card1.png'];
      // res.result.data.weeks[0].days[1].imagesList = ['/static/home/card2.png'];
      // 云函数已经返回 weeks 结构
      if (res.result && res.result.data) {
        this.setData({
          weeks: res.result.data.weeks,
          timelineId: res.result.data.timeline?._id || '' 
        });
      }
    } catch (err) {
      console.error('fetchTimeline error:', err);
    }
  },

  onRefresh() {
    this.fetchTimeline().finally(() => {
      this.setData({ enable: false });
    });
  },

  goRelease() {
    console.log("send to timelineId:", this.data.timelineId);
    wx.navigateTo({url:`/pages/dayPublish/index?timelineId=${this.data.timelineId}`});
  },

  goDayDetail(e) {
    const { dayId, eventId } = e.currentTarget.dataset;
    console.log('dayId: ', e.currentTarget.dataset);
    if (!dayId) {
      console.error('dayId missing', e.currentTarget.dataset);
      wx.showToast({
        title: 'Day 数据异常',
        icon: 'none'
      });
      return;
    }
  
    wx.navigateTo({
      url: `/pages/dayDetail/index?dayId=${dayId}`
    });
  },
});