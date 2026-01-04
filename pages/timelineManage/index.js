Page({
  data: {
    activeTab: 'own',
    ownerList: [],
    collabList: [],
    loading: false
  },

  onLoad() {
    this.fetch();
  },

  async fetch() {
    this.setData({ loading: true });
  
    try {
      const res = await wx.cloud.callFunction({
        name: 'get-manage-timelines'
      });
      console.log("get manage timelines res:", res);
      if (res.result?.code === 0) {
        const data = res.result.data || {};
  
        this.setData({
          ownerList: Array.isArray(data.owner) ? data.owner : [],
          collabList: Array.isArray(data.collab) ? data.collab : []
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onTabChange(e) {
    this.setData({ activeTab: e.detail.value });
  },

  createTimeline() {
    wx.navigateTo({ url: '/pages/timeline-create/index' });
  },

  editTimeline(e) {
    wx.navigateTo({ url: `/pages/timeline-edit/index?id=${e.currentTarget.dataset.id}` });
  },

  manageMembers(e) {
    wx.navigateTo({ url: `/pages/timeline-members/index?id=${e.currentTarget.dataset.id}` });
  }
});