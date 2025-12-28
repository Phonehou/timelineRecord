const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { dayId, summary, images, location } = event;

  if (!dayId) {
    return { code: 400, message: 'dayId required' };
  }

  /* 1️⃣ 构造更新对象（防止覆盖未传字段） */
  const updateData = {
    updatedAt: new Date()
  };

  if (typeof summary === 'string') {
    updateData.summary = summary;
  }

  if (Array.isArray(images)) {
    updateData.images = images.map((img, index) => ({
      url: img.url,
      type: img.type || 'image',
      order: img.order ?? index,
      width: img.width,
      height: img.height
    }));
  }

  if (typeof location === 'string') {
    updateData.location = location;
  }

  /* 2️⃣ 执行更新 */
  await db
    .collection('days')
    .doc(dayId)
    .update({
      data: updateData
    });

  return {
    code: 0,
    message: 'Day updated'
  };
};