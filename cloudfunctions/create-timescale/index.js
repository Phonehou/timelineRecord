const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { title = '我的时间轴', description = '' } = event;

  const now = db.serverDate();

  // 1. 创建 timescale
  const res = await db.collection('timescale').add({
    data: {
      title,
      description,
      creatorId: OPENID,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  });

  const timescaleId = res._id;

  // 2. 创建 owner 成员
  await db.collection('timescale_members').add({
    data: {
      timescaleId,
      userId: OPENID,
      role: 'owner',
      joinedAt: now
    }
  });

  return {
    code: 0,
    data: { timescaleId }
  };
};