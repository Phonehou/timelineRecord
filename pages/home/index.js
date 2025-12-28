//import Message from 'tdesign-miniprogram/message/index';
import request from '~/api/request';

Page({
  data: {
    enable: false,
    swiperList: [],
    cardInfo: [],
    weeks: [], // [{week:"周一", days:[{day:"12.9", events:[...]}, ...]}, ...]
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

  async fetchTimeline() {
    try {
      console.log('callFunction timelines');
      const res = await wx.cloud.callFunction({
        name: 'get-timelines',
        data: { timelineId: 'timeline_001' }
      });
      console.log('receive timelines result', res);
      console.log('weeks first day info:', res.result.data.weeks[0].days[0]);
      console.log('weeks first day images:', res.result.data.weeks[0].days[0].images);
      res.result.data.weeks[0].days[0].imagesList = ['/static/home/card0.png', '/static/home/card1.png'];
      res.result.data.weeks[0].days[1].imagesList = ['/static/home/card2.png'];
      // 云函数已经返回 weeks 结构
      if (res.result && res.result.data) {
        this.setData({
          weeks: res.result.data.weeks,
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
    wx.navigateTo({url:'/pages/release/index'});
  }
  //,
  // goEventDetail(e) {
  //   const { eventId, dayId } = e.currentTarget.dataset;
  
  //   wx.navigateTo({
  //     url: `/pages/dayDetail/index?eventId=${eventId}&dayId=${dayId}`,
  //   });
  // },
});